# Backend (NestJS on AWS Lambda)

NestJS + SQLite (better-sqlite3) backend intended to run on AWS Lambda behind API Gateway HTTP API. The Lambda entrypoint is `dist/lambda.handler` and SQLite lives on EFS by default (`/mnt/efs/todo.db`).

## 前提
- Node.js 20 / npm 10（Node 20 に同梱の npm を利用）
- AWS 資格情報は `infra/` 側の CDK が利用（CDK の README 参照）
- better-sqlite3 はネイティブモジュールなので **Linux x86_64 でビルドされた node_modules** をパッケージに含めること（macOS/Windows は後述の Docker 手順を利用）
- Lambda で必要な環境変数  
  - 必須: `FIREBASE_PROJECT_ID`, `FRONTEND_ORIGIN`（CDK で渡す想定）  
  - 任意: `SQLITE_PATH`（既定 `/mnt/efs/todo.db`）、`LAMBDA_HANDLER`（既定 `dist/lambda.handler`）、`LAMBDA_CODE_PATH`（既定 `../backend/deploy`）

## セットアップ（ローカル動作確認）
1) 依存をインストール  
```bash
cd backend
npm install
```
better-sqlite3 がローカル環境向けにビルドされる。Lambda 用バイナリが必要な場合は次節のデプロイ手順を使う。

2) 必要なら `.env` を作成  
- 既定では `backend/db/todo.sqlite` を利用。別パスを使う場合は `SQLITE_PATH=/absolute/or/relative/path/to.sqlite` を設定。

3) API を起動  
```bash
npm run start:dev     # ts-node で 3000 番ポートに起動
# またはビルド済み dist で動かす場合
npm run build && npm start
```

4) テスト（任意）  
```bash
npm test
```

## マイグレーション（EFS 上の SQLite）
- 対象: `db/migration/*.sql`（なければ `db/drizzle/*.sql`）を順番に適用し、`db/migration/migration_history.csv` に履歴を追記（履歴はパッケージ内ではなく `/tmp` に生成される）
- 実行主体: マイグレーション用 Lambda（`todo-migration`）。EFS をマウントし、`SQLITE_PATH` を参照して apply します。
- 実行方法  
 1) デプロイ済みの Lambda に対して AWS CLI が使える環境で  
    ```bash
    cd backend
    export MIGRATION_FUNCTION_NAME=todo-migration   # .env でも可
    npm run migrate
    ```  
    ※ `aws` CLI の資格情報が必要。出力は `MIGRATION_OUTPUT_FILE`（既定 `/tmp/migration-output.json`）に保存されます。
 2) デプロイ前提: `infra` で CDK を実行し、`MigrationFunctionName` 出力を確認
- 仕組み  
  - Lambda ハンドラー: `dist/migration.handler`（ソース `src/migration.ts`）  
  - 環境変数:  
    - `SQLITE_PATH`（既定 `/mnt/efs/todo.db`）  
    - `MIGRATION_SOURCE_DIR`（既定 `/var/task/db/migration` があればそこ、なければ `/var/task/db/drizzle` を参照）  
    - `MIGRATION_HISTORY_PATH`（既定 `/tmp/db/migration/migration_history.csv`。相対パス指定時も `/tmp` 配下に解決）  
  - 未適用の SQL ファイルのみ実行し、成功後に `migration_history.csv` に `migration_name,migrated_date` 形式で追記

## ローカルマイグレーション（Drizzle Kit）
- 目的: ローカル SQLite（既定 `./db/todo.sqlite`。`.env` の `SQLITE_PATH` で変更可）に対して Drizzle Kit でマイグレーションを生成・適用する。
- 前提: dev 依存に `drizzle-kit` を追加し、`backend/drizzle.config.ts` を用意する。
  ```bash
  cd backend
  npm install --save-dev drizzle-kit
  cat > drizzle.config.ts <<'EOF'
  import { defineConfig } from 'drizzle-kit';

  export default defineConfig({
    schema: './src/schemas/**/*.ts',
    out: './db/drizzle',
    dialect: 'sqlite',
    dbCredentials: { url: process.env.SQLITE_PATH ?? './db/todo.sqlite' },
  });
  EOF
  ```
- よく使うコマンド  
  - マイグレーション生成: `cd backend && npx drizzle-kit generate:sqlite`  
    - `src/schemas` の差分から `db/drizzle/*.sql` を生成し、`meta/_journal.json` も更新。  
  - ローカル DB へ適用: `cd backend && npx drizzle-kit push:sqlite`  
    - `SQLITE_PATH` で指定した SQLite に適用される。  
  - 差分確認（任意）: `cd backend && npx drizzle-kit studio`
- 生成された `db/drizzle` 配下は AWS のマイグレーション Lambda にも同梱するので、リポジトリにコミットする。

## 手動デプロイ（Lambda 用アセットを一発で作る）
### 1) Linux/x64 で `deploy/` を作成（better-sqlite3 を Lambda 向けにビルド）
Linux ホストならそのまま、macOS/Windows は次の Docker 例を使う。

```bash
cd backend
rm -rf node_modules deploy
npm install                       # dev 依存も含めて Linux 向けにネイティブビルド
npm run build                     # dist/ 生成

mkdir deploy
cp package.json deploy/
[ -f package-lock.json ] && cp package-lock.json deploy/
cp -R dist deploy/
cp -R db deploy/                  # マイグレーション SQL (db/migration or db/drizzle) を Lambda に同梱する
npm ci --omit=dev --prefix deploy # runtime 依存だけを deploy/node_modules に展開（package-lock.json 前提）
```

Docker で Linux バイナリを作る場合（Lambda と同じ Amazon Linux 2023 / x86_64 上でビルド）:
```bash
cd backend
docker run --rm \
  --platform=linux/amd64 \
  --entrypoint bash \
  -v "$PWD/..":/app \
  -w /app/backend \
  public.ecr.aws/lambda/nodejs:20 \
  -lc '
    set -euo pipefail
    if command -v dnf >/dev/null; then
      dnf install -y python3 make gcc gcc-c++
    elif command -v microdnf >/dev/null; then
      microdnf install -y python3 make gcc gcc-c++
    else
      echo "No dnf/microdnf available" >&2; exit 1
    fi
    export npm_config_arch=x64 npm_config_platform=linux
    rm -rf node_modules deploy
    npm ci
    npm run build
    mkdir deploy
    cp package.json package-lock.json deploy/
    cp -R dist deploy/
    cp -R db deploy/
    npm ci --omit=dev --prefix deploy
    npm rebuild better-sqlite3 --prefix deploy --build-from-source
    file deploy/node_modules/better-sqlite3/build/Release/better_sqlite3.node
  '
```
`deploy/` には Lambda がそのまま読める `dist/` と Linux/x64 の runtime 依存だけが入る。CDK は `LAMBDA_CODE_PATH` で指定したディレクトリを自動で zip 化してアップロードするため、そのまま渡せる。

### 2) `infra/` から Lambda をデプロイ
```bash
cd infra
npm install

export FIREBASE_PROJECT_ID=your-firebase-project
export FRONTEND_ORIGIN=https://your-frontend.example
export LAMBDA_CODE_PATH=../backend/deploy
export LAMBDA_HANDLER=dist/lambda.handler          # 変更した場合のみ上書き
# 任意: export SQLITE_PATH=/mnt/efs/todo.db        # EFS 上の SQLite ファイルパス

npm run synth    # 生成物確認
npm run deploy   # スタック作成/更新
```
初回実行時は Lambda が `/mnt/efs/todo.db` を自動生成する。ローカルで試す場合は `.env` の `SQLITE_PATH` を `backend/db/todo.sqlite` などに変えて動かせる。
