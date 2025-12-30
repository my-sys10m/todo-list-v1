todo バックエンド仕様

1. 機能概要
• TODO 管理機能を提供する専用 API。登録・一覧取得・更新・削除の各操作をサーバレス上で実行する。
• フロントエンドからの呼び出しを前提に、Firebase ID Token（JWT）を用いた認証を通過したリクエストのみ処理する。
• AWS Lambda（NestJS 実装）を実行環境とし、Amazon API Gateway（HTTP API）経由で外部公開する。
• 永続化は Amazon EFS 上の SQLite を利用し、ユーザー単位でデータを分離する（JWT の sub を所有者 ID として扱う）。

2. 技術スタック
• ランタイム/ホスティング: AWS Lambda（NestJS）
• ストレージ: Amazon EFS + SQLite
• ORM/クエリ: drizzle
• バンドラ/ビルド: Vite
• テスト: Vitest
• スキーマ検証: zod
• API 仕様: OpenAPI（Swagger UI 提供）
• Lint/整形: ESLint, Prettier
• パッケージマネージャー: npm
• CI/CD: （未定／別途定義）※既存の IaC/パイプラインに合わせて追加

3. バックエンド内のフォルダ構成（feature-based, NestJS 標準に準拠）
backend/
 ├─ src/
 │   ├─ main.ts                  # エントリポイント
 │   ├─ app.module.ts            # ルートモジュール
 │   ├─ config/                  # 環境変数/設定ロジック
  │   ├─ schemas/                # drizzle 用スキーマ定義（アプリコードと同居）
 │   ├─ common/                  # 共通フィルタ・パイプ・ガード・インターセプタ
 │   └─ features/
 │       └─ todos/               # TODO 機能に関するモジュール一式（layer を細分化せず同階層に配置）
 │           ├─ todos.module.ts
 │           ├─ todos.controller.ts
 │           ├─ todos.service.ts
 │           ├─ todos.repository.ts
 │           ├─ todos.dto.ts      # zod or class-validator ベースの DTO
 │           ├─ todos.entity.ts   # drizzle スキーマとマッピング
 │           └─ todos.spec.ts     # vitest 向けユニット/統合テスト
├─ db/                          # SQLite ファイル配置場所（EFS マウントを想定）
 │   └─ drizzle/                 # マイグレーション管理
 ├─ package.json / package-lock.json
 └─ .eslintrc.js / .prettierrc   # Lint/整形設定

4. 前提・補足
• ネットワーク: Lambda は VPC 内で実行し、EFS にマウントする。NAT Gateway は利用しない。
• 認証: API Gateway の JWT Authorizer で Firebase ID Token を検証し、認可情報を NestJS 側で伝搬する。
• スケール: 個人利用を想定し、同時実行は限定的。SQLite の排他制御に配慮しつつ単純構成を優先する。
