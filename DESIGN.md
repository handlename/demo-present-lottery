# プレゼント交換サポートWebアプリ 技術設計書

## 1. 設計概要

本書は、REQUIREMENTS.mdで定義された要件を実現するための技術設計を記述する。

### 1.1 設計方針

- シンプルさを重視し、必要最小限の技術スタックで構成する
- リアルタイム通信を中心とした設計とする
- データの永続化は行わず、メモリ上で管理する

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                      クライアント                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  参加者画面   │  │  参加者画面   │  │  司会者画面   │     │
│  │  (Browser)  │  │  (Browser)  │  │  (Browser)  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼────────────┘
          │                │                │
          │    WebSocket   │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                      サーバー                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │                  Node.js                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────┐  │   │
│  │  │ WebSocket │  │  Session  │  │   Lottery  │  │   │
│  │  │  Handler  │  │  Manager  │  │   Engine   │  │   │
│  │  └───────────┘  └───────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                         ▲                              │
│                         │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              In-Memory Store                    │   │
│  │         (セッション・参加者データ)                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 通信フロー

```
参加者                    サーバー                    司会者
  │                         │                         │
  │──── セッション参加 ─────▶│                         │
  │◀─── 抽選番号割当 ────────│                         │
  │                         │◀──── 抽選実行 ──────────│
  │◀─── 当選通知 ───────────│────── 抽選結果 ─────────▶│
  │                         │                         │
```

## 3. 技術スタック

### 3.1 採用技術

| カテゴリ | 技術 | バージョン | 選定理由 |
|----------|------|------------|----------|
| ランタイム | Node.js | 20 LTS | 長期サポート、WebSocket対応が容易 |
| 言語 | TypeScript | 5.x | 型安全性の確保（NFR-401） |
| フレームワーク | Hono | 4.x | 軽量、高速、TypeScript親和性が高い |
| WebSocket | Hono WebSocket | - | Honoに統合済み、追加依存なし |
| フロントエンド | Hono JSX + htmx | - | サーバーサイドレンダリング、シンプルな実装 |
| スタイリング | Tailwind CSS | 3.x | ユーティリティファースト、レスポンシブ対応が容易 |
| ビルドツール | Vite | 5.x | 高速なビルド、HMR対応 |
| テスト | Vitest | 1.x | Viteとの統合、高速実行 |
| パッケージ管理 | npm | - | 標準的、追加ツール不要 |

### 3.2 不採用技術と理由

| 技術 | 不採用理由 |
|------|------------|
| React/Vue/Svelte | 本要件ではSPA不要。サーバーサイドレンダリング+htmxで十分実現可能であり、バンドルサイズ削減と複雑性低減を優先 |
| Express.js | Honoの方が軽量かつモダン。TypeScriptサポートも優れている |
| Socket.io | 機能過剰。HonoのWebSocketで十分対応可能 |
| PostgreSQL/MySQL | データ永続化が不要（C-101）。メモリストアで十分 |
| Redis | 単一サーバー構成で50名程度の規模ではオーバースペック |
| Next.js/Remix | フルスタックフレームワークは本要件に対して過剰 |

## 4. コンポーネント設計

### 4.1 サーバーサイドコンポーネント

#### SessionManager

セッションのライフサイクルを管理する。

```typescript
interface Session {
  id: string;
  hostPasscode: string;
  maxParticipants: number;
  participants: Map<string, Participant>;
  lotteryState: LotteryState;
  createdAt: Date;
}

interface Participant {
  id: string;
  number: number;
  name?: string;
  isWinner: boolean;
  winOrder?: number;
}

interface LotteryState {
  status: 'waiting' | 'in_progress' | 'completed';
  currentRound: number;
  winners: string[];
}
```

主要メソッド:
- `createSession(maxParticipants: number): Session`
- `joinSession(sessionId: string, name?: string): Participant`
- `getSession(sessionId: string): Session | undefined`

#### LotteryEngine

抽選ロジックを担当する。

主要メソッド:
- `drawWinner(session: Session): Participant`
- `reset(session: Session): void`
- `isCompleted(session: Session): boolean`

#### WebSocketHandler

リアルタイム通信を管理する。

イベント種別:
- `participant:joined` - 参加者が参加
- `lottery:drawn` - 抽選実行
- `lottery:reset` - 抽選リセット
- `connection:status` - 接続状態

### 4.2 クライアントサイドコンポーネント

#### 画面構成

| 画面 | パス | 説明 |
|------|------|------|
| トップ | `/` | セッション作成画面 |
| 参加者画面 | `/session/:id` | 抽選番号表示、当選結果表示 |
| 司会者画面 | `/session/:id/host` | 抽選実行、参加者管理 |

#### UI状態管理

htmxによるサーバー駆動UIを採用。クライアント側の状態管理は最小限とし、WebSocket経由でサーバーからHTMLフラグメントを受信してDOMを更新する。

```html
<!-- 当選表示エリア（WebSocketで更新） -->
<div id="result" hx-swap-oob="true">
  <!-- サーバーからプッシュされるHTMLで置換 -->
</div>
```

## 5. データ設計

### 5.1 データモデル

```typescript
// セッションID: 8文字のランダム英数字
type SessionId = string;

// 参加者ID: UUIDv4
type ParticipantId = string;

// 抽選番号: 1から始まる連番
type LotteryNumber = number;
```

### 5.2 メモリストア構造

```typescript
class InMemoryStore {
  private sessions: Map<SessionId, Session> = new Map();
  
  // セッションは作成から24時間後に自動削除
  private readonly SESSION_TTL = 24 * 60 * 60 * 1000;
}
```

## 6. API設計

### 6.1 HTTP API

| メソッド | パス | 説明 | 要件ID |
|----------|------|------|--------|
| GET | `/` | トップページ表示 | - |
| POST | `/sessions` | セッション作成 | FR-001 |
| GET | `/session/:id` | 参加者画面表示 | FR-101 |
| POST | `/session/:id/join` | セッション参加 | FR-101, FR-102 |
| GET | `/session/:id/host` | 司会者画面表示 | FR-201 |
| POST | `/session/:id/host/auth` | 司会者認証 | NFR-302 |

### 6.2 WebSocket API

エンドポイント: `ws://host/session/:id/ws`

#### クライアント→サーバー

```typescript
type ClientMessage = 
  | { type: 'lottery:draw' }      // 抽選実行 (FR-202)
  | { type: 'lottery:reset' }     // リセット (FR-205)
  | { type: 'ping' };             // 接続維持
```

#### サーバー→クライアント

```typescript
type ServerMessage =
  | { type: 'participant:joined'; data: { number: number; total: number } }
  | { type: 'lottery:result'; data: { winner: Participant; round: number } }
  | { type: 'lottery:won'; data: { order: number } }  // 当選者本人のみ
  | { type: 'lottery:completed' }
  | { type: 'lottery:reset' }
  | { type: 'pong' };
```

## 7. セキュリティ設計

### 7.1 セッション分離

- セッションIDは8文字のランダム英数字（約2.8兆通り）
- 参加者IDはUUIDv4でクライアント側Cookieに保存
- 異なるセッションへのアクセスは拒否

### 7.2 司会者認証

- セッション作成時に6桁のパスコードを自動生成
- 司会者画面アクセス時にパスコード入力を要求
- パスコードはセッション作成者にのみ表示

### 7.3 通信セキュリティ

- 本番環境ではHTTPS必須
- WebSocketもWSS（WebSocket Secure）を使用

## 8. ディレクトリ構成

```
/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── app.ts                # Honoアプリケーション設定
│   ├── routes/
│   │   ├── index.ts          # ルート定義
│   │   ├── session.ts        # セッション関連ルート
│   │   └── websocket.ts      # WebSocketハンドラ
│   ├── services/
│   │   ├── session-manager.ts
│   │   └── lottery-engine.ts
│   ├── store/
│   │   └── memory-store.ts   # インメモリストア
│   ├── views/
│   │   ├── layout.tsx        # 共通レイアウト
│   │   ├── home.tsx          # トップページ
│   │   ├── participant.tsx   # 参加者画面
│   │   └── host.tsx          # 司会者画面
│   └── types/
│       └── index.ts          # 型定義
├── public/
│   └── styles.css            # Tailwind CSSビルド出力
├── tests/
│   ├── services/
│   │   ├── session-manager.test.ts
│   │   └── lottery-engine.test.ts
│   └── routes/
│       └── session.test.ts
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── vitest.config.ts
```

## 9. 開発・運用環境

### 9.1 開発環境

```bash
# 依存関係インストール
npm install

# 開発サーバー起動（HMR有効）
npm run dev

# テスト実行
npm run test

# ビルド
npm run build
```

### 9.2 本番環境

| 項目 | 推奨構成 |
|------|----------|
| ホスティング | Render（推奨）/ Fly.io |
| Node.js | 20 LTS |
| メモリ | 256MB以上 |

### 9.3 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `PORT` | サーバーポート | 3000 |
| `NODE_ENV` | 環境識別 | development |

## 12. デプロイ設計

### 12.1 デプロイ要件

本アプリケーションをパブリック環境にデプロイするにあたり、以下の技術要件を満たす必要がある。

| 要件 | 説明 | 必須 |
|------|------|------|
| Node.jsランタイム | Node.js 20 LTS以上が動作すること | 必須 |
| WebSocketサポート | 永続的なWebSocket接続をサポートすること | 必須 |
| HTTPS | SSL/TLS証明書が自動提供されること | 必須 |
| カスタムポート | 環境変数でポート番号を指定可能なこと | 必須 |
| 無料枠 | 継続的なコスト負担なく運用可能なこと | 必須 |
| 自動デプロイ | GitHubからの自動デプロイに対応していること | 推奨 |

### 12.2 プラットフォーム比較

無料枠でWebSocketをサポートするプラットフォームを比較検討した。

| プラットフォーム | WebSocket | 無料枠 | 制限事項 | 評価 |
|------------------|-----------|--------|----------|------|
| **Render** | ○ | Web Service無料枠あり | 15分間アクセスがないとスリープ、月750時間まで | ◎ 推奨 |
| **Fly.io** | ○ | 3つの共有CPU VMまで無料 | クレジットカード登録必要、リソース制限あり | ○ 次点 |
| **Railway** | ○ | 月$5のクレジット | クレジット消費後は停止、WebSocket接続時間に制限 | △ |
| **Cloudflare Workers** | △ | 無制限リクエスト | WebSocketは有料プランのみ、Node.js非互換 | × |
| **Vercel** | × | 無料枠あり | Serverless関数ベースでWebSocket非対応 | × |
| **Netlify** | × | 無料枠あり | Functionsは短時間実行のみ、WebSocket非対応 | × |
| **Heroku** | ○ | なし（2022年廃止） | 無料枠廃止済み | × |

### 12.3 採用プラットフォーム：Render

**Render**を本アプリケーションのデプロイ先として採用する。

#### 採用理由

1. **WebSocket完全対応**: 追加設定なしでWebSocket接続が可能
2. **Node.js 20サポート**: 最新LTSバージョンに対応
3. **無料枠の提供**: Web Service（Individual Plan）で無料利用可能
4. **自動デプロイ**: GitHub連携による自動デプロイに対応
5. **HTTPS自動化**: SSL証明書の自動発行・更新
6. **シンプルな設定**: Dockerfileまたはビルドコマンド指定のみで動作

#### 無料枠の制限と対策

| 制限 | 内容 | 対策 |
|------|------|------|
| スリープ | 15分間アクセスがないとスリープ状態になる | イベント開始前にアクセスしてウォームアップ |
| 起動時間 | スリープからの復帰に数十秒かかる | イベント利用時は事前にセッション作成 |
| 月間時間 | 750時間/月まで | 単一サービスなら24時間×31日=744時間で収まる |
| スペック | 512MB RAM, 0.1 CPU | 50名程度の同時接続では十分 |

### 12.4 不採用プラットフォームと理由

| プラットフォーム | 不採用理由 |
|------------------|------------|
| Cloudflare Workers | Node.jsランタイムではなくWorkers独自ランタイム。`@hono/node-server`や`@hono/node-ws`が動作しない。WebSocketは有料プラン限定 |
| Vercel | Serverless Functions前提の設計でWebSocket非対応。Edge Functionsも永続接続に対応していない |
| Netlify | FunctionsはHTTPリクエスト・レスポンス形式のみ対応。WebSocket非対応 |
| Railway | 無料枠が月$5のクレジット制で、使い切ると停止。予測困難なコスト発生リスク |
| Heroku | 2022年11月に無料枠が廃止。有料プランは$7/月から |
| Fly.io | 有力な代替候補だが、クレジットカード登録必須かつリソース管理がやや複雑 |

### 12.5 Renderデプロイ設定

#### render.yaml（Infrastructure as Code）

プロジェクトルートに`render.yaml`を配置することで、Render Blueprintによる自動設定が可能。

```yaml
services:
  - type: web
    name: present-exchange
    runtime: node
    plan: free
    buildCommand: npm install && npm run build:css
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /
```

#### 手動設定手順

1. [Render Dashboard](https://dashboard.render.com/)にアクセス
2. 「New +」→「Web Service」を選択
3. GitHubリポジトリを連携
4. 以下を設定:
   - **Name**: `present-exchange`（任意）
   - **Region**: `Oregon (US West)` または `Singapore`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build:css`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. 環境変数を設定:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`（Renderのデフォルト）

#### 必要なpackage.json修正

```json
{
  "scripts": {
    "build:css": "npx tailwindcss -i ./src/styles.css -o ./public/styles.css --minify",
    "start": "node dist/index.js"
  }
}
```

### 12.6 CI/CDパイプライン

GitHub Actionsを利用したCI/CDは以下の構成とする。

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test

  # Renderは自動デプロイを使用するため、deployジョブは不要
  # GitHubリポジトリ連携により、mainブランチへのpush時に自動デプロイされる
```

### 12.7 本番環境URL構成

デプロイ後のURLは以下の形式となる。

| 種別 | URL |
|------|-----|
| アプリケーション | `https://present-exchange.onrender.com` |
| WebSocket（参加者） | `wss://present-exchange.onrender.com/session/:id/ws` |
| WebSocket（司会者） | `wss://present-exchange.onrender.com/session/:id/host/ws` |

※サービス名により実際のURLは異なる

### 12.8 運用上の注意事項

1. **スリープ対策**: イベント開始15分前までにURLにアクセスし、サービスをウォームアップする
2. **セッション有効期限**: インメモリストアのため、サービス再起動でセッションは消失する。イベント中の再デプロイは避ける
3. **監視**: Render Dashboardでログとメトリクスを確認可能
4. **スケールアップ**: 参加者が50名を超える場合や頻繁に利用する場合は有料プラン（$7/月〜）へのアップグレードを検討

## 10. 要件トレーサビリティ

| 要件ID | 設計要素 |
|--------|----------|
| FR-001 | POST `/sessions`, SessionManager.createSession |
| FR-002 | セッションID生成、URL構成 |
| FR-101 | GET `/session/:id`, POST `/session/:id/join` |
| FR-102 | SessionManager.joinSession, 連番割当 |
| FR-104 | WebSocket `lottery:won` イベント |
| FR-201 | GET `/session/:id/host` |
| FR-202 | WebSocket `lottery:draw`, LotteryEngine.drawWinner |
| FR-301 | WebSocket通信全般 |
| FR-303 | クライアント側再接続ロジック |
| NFR-201 | Tailwind CSSレスポンシブ設計 |
| NFR-302 | パスコード認証 |
| NFR-401 | TypeScript採用 |

## 11. 次のステップ

1. 本設計書のレビューと承認
2. `/prj-define-tasks` コマンドによるタスク定義
3. デプロイ準備（render.yaml作成、package.json修正）
4. Renderへのデプロイと動作確認
5. 運用開始
