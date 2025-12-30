TODO アプリ 要件定義

1. 概要

個人利用を想定したシンプルな TODO 管理アプリを開発する。
フロントエンドは Firebase Hosting 上の React アプリ、バックエンドは AWS のサーバレス構成で提供する。
ユーザー認証には Firebase Authentication（Google ログイン）を利用する。

⸻

2. システム構成（前提）
   • フロントエンド
   • React（Firebase Hosting）
   • Firebase Authentication（Google Sign-In）
   • バックエンド
   • Amazon API Gateway（HTTP API）
   • AWS Lambda（NestJS）
   • Amazon EFS + SQLite
   • 認証方式
   • Firebase ID Token（JWT）
   • API Gateway JWT Authorizer による検証
   • ネットワーク
   • Lambda + EFS は VPC（Private Subnet）
   • NAT Gateway は利用しない

⸻

3. 機能要件

3.1 ユーザー認証
• Google アカウントによるログインができること
• フロントエンドは Firebase Auth で認証を行うこと
• API 呼び出し時、Firebase ID Token を Authorization ヘッダに付与すること
• API Gateway にて JWT の検証を行うこと

3.2 TODO 管理機能
• TODO を登録できること
• TODO の一覧を取得できること
• TODO を更新できること
• TODO を削除できること

3.3 データ管理
• TODO は SQLite に保存されること
• TODO はユーザー単位で管理されること
• JWT の sub（Firebase UID）を所有者 ID として利用する
• 他ユーザー（想定外）からのデータ参照・操作は不可とする

⸻

4. 非機能要件

4.1 パフォーマンス
• 個人利用（1 日数回アクセス）を前提とする
• 同時アクセスは基本的に 1 ユーザーのみと想定する
• 書き込み競合は発生しにくい前提とする

4.2 可用性
• AWS マネージドサービスを利用し、サーバ管理は不要とする
• Lambda のスケールアウトは許容するが、SQLite の特性上高負荷用途は想定しない

4.3 セキュリティ
• API は外部公開するが、全エンドポイントで JWT 認証を必須とする
• API Gateway で不正リクエストを遮断する
• VPC 外部から EFS へ直接アクセスできないこと

4.4 コスト
• 個人利用を前提とし、月額コストは極小（ほぼ無料〜数ドル）に抑える
• NAT Gateway など固定費が発生する構成は採用しない

4.5 運用・保守
• DB は SQLite ファイルとして EFS 上に存在する
• バックアップは EFS スナップショット等を用いた単純な方式を想定
• DB マイグレーションは手動または単一実行を前提とする

4.6 拡張性（将来考慮）
• 将来的なスケールが必要になった場合、DB を RDS/Aurora/DynamoDB へ移行可能な構成とする
• 認証方式は JWT ベースであり、他 IdP への変更余地を残す

⸻

5. 制約事項
   • オフライン対応は行わない
   • 複数ユーザー同時利用は正式サポート対象外
   • 高トラフィック、高可用性（SLA 保証）は求めない

⸻

6. 想定外・対象外
   • チーム共有 TODO 機能
   • リアルタイム同期
   • 高度な検索・分析機能

⸻

7. リポジトリ構成（前提）

/backend # バックエンド（NestJS + AWS Lambda）
/docs # 仕様/設計ドキュメント（todo_spec.md, er.md など）
/infra # AWS CDK / IaC 定義
/.local # ローカル環境用設定（Git 管理外を想定）
