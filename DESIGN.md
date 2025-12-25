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
| ホスティング | Cloudflare Workers / Fly.io / Railway |
| Node.js | 20 LTS |
| メモリ | 256MB以上 |

### 9.3 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `PORT` | サーバーポート | 3000 |
| `NODE_ENV` | 環境識別 | development |

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
3. 実装フェーズへの移行
