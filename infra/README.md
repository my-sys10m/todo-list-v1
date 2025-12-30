# Infrastructure (AWS CDK v2)

TypeScript CDK app that provisions the serverless backend defined in `todo_spec.md` (HTTP API + Lambda + EFS + VPC with no NAT). Constructs for each AWS service live under `lib/` so they can be reused across stacks.

## Prerequisites
- AWS credentials configured (account/region set via environment or `cdk.json`)
- Node.js 18+ and npm installed

## セットアップ（初回のみ）
1) 依存をインストール  
```bash
cd infra
npm install
# リポジトリルートから実行する場合: npm --prefix infra install
```

2) CDK Bootstrap（まだのアカウント/リージョンなら一度だけ）  
```bash
export AWS_PROFILE=your-profile              # 任意
export CDK_DEFAULT_REGION=ap-northeast-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npm run cdk -- bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION
```

## Manual deploy
1) Backend の成果物を用意（`backend/README.md` を参照）

2) 必須の環境変数/コンテキストを設定  
- FIREBASE_PROJECT_ID: Firebase プロジェクト ID  
- FRONTEND_ORIGIN: 許可するフロントエンドのオリジン（カンマ区切り可）  
- 任意: SQLITE_PATH (既定 `/mnt/efs/todo.db`), LAMBDA_CODE_PATH (既定 `../backend/deploy`), LAMBDA_HANDLER (既定 `dist/lambda.handler`)  
環境変数または `cdk deploy --context key=value`（例: `--context firebaseProjectId=xxx --context frontendOrigin=yyy`）で指定可能。

3) AWS アカウント/リージョンを設定  
- 標準: `aws configure` でデフォルトプロファイルをセットすると `CDK_DEFAULT_ACCOUNT`/`CDK_DEFAULT_REGION` が自動で反映されます。  
- 明示指定したい場合:  
```bash
export AWS_PROFILE=your-profile    # 任意
export CDK_DEFAULT_REGION=ap-northeast-1
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
```

4) CDK を synth/deploy  
```bash
export FIREBASE_PROJECT_ID=your-firebase-project
export FRONTEND_ORIGIN=https://your-frontend.example
# デフォルトで ../backend/deploy を参照します。変えたい場合のみ上書き
# export LAMBDA_CODE_PATH=../backend/deploy

npm run synth    # テンプレート確認
npm run deploy   # スタック作成/更新
```
デプロイ時は `LAMBDA_CODE_PATH` のディレクトリがアセット化され、`LAMBDA_HANDLER`（デフォルト: dist/lambda.handler）をエントリとして Lambda が作成されます。実際のエントリに合わせて必要に応じて上書きしてください。

### ワークスペース（リポジトリルート）からの実行例
```bash
cd /path/to/repo-root
# backend の deploy/ を最新化（backend/README.md の手順 1 を実行）
# 必要な環境変数をセット
export FIREBASE_PROJECT_ID=your-firebase-project
export FRONTEND_ORIGIN=https://your-frontend.example
npm --prefix infra install
npm --prefix infra run deploy
```

### Stack outputs
- `HttpApiEndpoint`: invoke URL of the HTTP API protected by the Firebase JWT authorizer.
