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
