/** セッションID: 8文字のランダム英数字 */
export type SessionId = string;

/** 参加者ID: UUIDv4 */
export type ParticipantId = string;

/** 抽選番号: 1から始まる連番 */
export type LotteryNumber = number;

/** 参加者 */
export interface Participant {
  id: ParticipantId;
  number: LotteryNumber;
  name?: string;
  isWinner: boolean;
  winOrder?: number;
}

/** 抽選状態 */
export interface LotteryState {
  status: "waiting" | "in_progress" | "completed";
  currentRound: number;
  winners: ParticipantId[];
}

/** セッション */
export interface Session {
  id: SessionId;
  hostPasscode: string;
  maxParticipants: number;
  participants: Map<ParticipantId, Participant>;
  lotteryState: LotteryState;
  createdAt: Date;
}

/** クライアント→サーバーメッセージ */
export type ClientMessage =
  | { type: "lottery:draw" }
  | { type: "lottery:reset" }
  | { type: "ping" };

/** サーバー→クライアントメッセージ */
export type ServerMessage =
  | { type: "participant:joined"; data: { number: LotteryNumber; total: number } }
  | { type: "lottery:result"; data: { winner: Participant; round: number } }
  | { type: "lottery:won"; data: { order: number } }
  | { type: "lottery:completed" }
  | { type: "lottery:reset" }
  | { type: "error"; data: { message: string } }
  | { type: "pong" };
