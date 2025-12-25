import { store } from "@/store/memory-store";
import type {
  Session,
  SessionId,
  Participant,
  ParticipantId,
  LotteryState,
} from "@/types";

const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateId(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return result;
}

function generateSessionId(): SessionId {
  return generateId(8);
}

function generatePasscode(): string {
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function generateParticipantId(): ParticipantId {
  return crypto.randomUUID();
}

export class SessionManager {
  createSession(maxParticipants: number): Session {
    if (maxParticipants < 5 || maxParticipants > 50) {
      throw new Error("参加者数は5〜50名の範囲で指定してください");
    }

    const session: Session = {
      id: generateSessionId(),
      hostPasscode: generatePasscode(),
      maxParticipants,
      participants: new Map(),
      lotteryState: {
        status: "waiting",
        currentRound: 0,
        winners: [],
      },
      createdAt: new Date(),
    };

    store.create(session);
    return session;
  }

  getSession(sessionId: SessionId): Session | undefined {
    return store.get(sessionId);
  }

  joinSession(
    sessionId: SessionId,
    name?: string
  ): { session: Session; participant: Participant } | undefined {
    const session = store.get(sessionId);
    if (!session) {
      return undefined;
    }

    if (session.participants.size >= session.maxParticipants) {
      throw new Error("参加者数が上限に達しています");
    }

    const participantId = generateParticipantId();
    const number = session.participants.size + 1;

    const participant: Participant = {
      id: participantId,
      number,
      name,
      isWinner: false,
    };

    session.participants.set(participantId, participant);
    store.update(session);

    return { session, participant };
  }

  getParticipant(
    sessionId: SessionId,
    participantId: ParticipantId
  ): Participant | undefined {
    const session = store.get(sessionId);
    if (!session) {
      return undefined;
    }
    return session.participants.get(participantId);
  }

  verifyHostPasscode(sessionId: SessionId, passcode: string): boolean {
    const session = store.get(sessionId);
    if (!session) {
      return false;
    }
    return session.hostPasscode === passcode;
  }

  updateLotteryState(sessionId: SessionId, state: LotteryState): boolean {
    const session = store.get(sessionId);
    if (!session) {
      return false;
    }
    session.lotteryState = state;
    return store.update(session);
  }

  markParticipantAsWinner(
    sessionId: SessionId,
    participantId: ParticipantId,
    winOrder: number
  ): boolean {
    const session = store.get(sessionId);
    if (!session) {
      return false;
    }

    const participant = session.participants.get(participantId);
    if (!participant) {
      return false;
    }

    participant.isWinner = true;
    participant.winOrder = winOrder;
    return store.update(session);
  }
}

export const sessionManager = new SessionManager();
