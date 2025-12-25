import { describe, it, expect, beforeEach } from "vitest";
import { LotteryEngine } from "@/services/lottery-engine";
import type { Session, Participant } from "@/types";

function createTestSession(participantCount: number): Session {
  const participants = new Map<string, Participant>();
  for (let i = 1; i <= participantCount; i++) {
    const id = `participant-${i}`;
    participants.set(id, {
      id,
      number: i,
      name: `参加者${i}`,
      isWinner: false,
    });
  }

  return {
    id: "test-session",
    hostPasscode: "123456",
    maxParticipants: 50,
    participants,
    lotteryState: {
      status: "waiting",
      currentRound: 0,
      winners: [],
    },
    createdAt: new Date(),
  };
}

describe("LotteryEngine", () => {
  let engine: LotteryEngine;

  beforeEach(() => {
    engine = new LotteryEngine();
  });

  describe("drawWinner", () => {
    it("未当選者から1名を抽選できる", () => {
      const session = createTestSession(5);
      const winner = engine.drawWinner(session);

      expect(winner).not.toBeNull();
      expect(winner?.isWinner).toBe(true);
      expect(winner?.winOrder).toBe(1);
      expect(session.lotteryState.currentRound).toBe(1);
      expect(session.lotteryState.winners).toContain(winner?.id);
    });

    it("全員が1回ずつ当選するまで抽選できる", () => {
      const session = createTestSession(5);
      const winners: Participant[] = [];

      for (let i = 0; i < 5; i++) {
        const winner = engine.drawWinner(session);
        expect(winner).not.toBeNull();
        winners.push(winner!);
      }

      // 全員が当選している
      expect(winners.length).toBe(5);
      const winnerIds = new Set(winners.map((w) => w.id));
      expect(winnerIds.size).toBe(5);

      // 当選順序が正しい
      for (let i = 0; i < 5; i++) {
        expect(winners[i].winOrder).toBe(i + 1);
      }
    });

    it("全員が当選済みの場合はnullを返す", () => {
      const session = createTestSession(3);

      for (let i = 0; i < 3; i++) {
        engine.drawWinner(session);
      }

      const result = engine.drawWinner(session);
      expect(result).toBeNull();
    });

    it("参加者がいない場合はnullを返す", () => {
      const session = createTestSession(0);
      const result = engine.drawWinner(session);
      expect(result).toBeNull();
    });

    it("抽選完了後はステータスがcompletedになる", () => {
      const session = createTestSession(2);

      engine.drawWinner(session);
      expect(session.lotteryState.status).toBe("in_progress");

      engine.drawWinner(session);
      expect(session.lotteryState.status).toBe("completed");
    });
  });

  describe("reset", () => {
    it("抽選をリセットできる", () => {
      const session = createTestSession(3);

      // 抽選を実行
      engine.drawWinner(session);
      engine.drawWinner(session);

      // リセット
      engine.reset(session);

      expect(session.lotteryState.status).toBe("waiting");
      expect(session.lotteryState.currentRound).toBe(0);
      expect(session.lotteryState.winners).toHaveLength(0);

      // 全参加者の当選フラグがリセットされている
      for (const participant of session.participants.values()) {
        expect(participant.isWinner).toBe(false);
        expect(participant.winOrder).toBeUndefined();
      }
    });
  });

  describe("isCompleted", () => {
    it("全員が当選した場合はtrueを返す", () => {
      const session = createTestSession(3);

      for (let i = 0; i < 3; i++) {
        engine.drawWinner(session);
      }

      expect(engine.isCompleted(session)).toBe(true);
    });

    it("未当選者がいる場合はfalseを返す", () => {
      const session = createTestSession(3);
      engine.drawWinner(session);

      expect(engine.isCompleted(session)).toBe(false);
    });

    it("参加者がいない場合はtrueを返す", () => {
      const session = createTestSession(0);
      expect(engine.isCompleted(session)).toBe(true);
    });
  });

  describe("getCandidates", () => {
    it("未当選者一覧を取得できる", () => {
      const session = createTestSession(5);
      engine.drawWinner(session);

      const candidates = engine.getCandidates(session);
      expect(candidates.length).toBe(4);
      expect(candidates.every((c) => !c.isWinner)).toBe(true);
    });
  });

  describe("getRemainingCount", () => {
    it("残り参加者数を取得できる", () => {
      const session = createTestSession(5);

      expect(engine.getRemainingCount(session)).toBe(5);

      engine.drawWinner(session);
      expect(engine.getRemainingCount(session)).toBe(4);

      engine.drawWinner(session);
      expect(engine.getRemainingCount(session)).toBe(3);
    });
  });

  describe("getCurrentRound", () => {
    it("現在のラウンド数を取得できる", () => {
      const session = createTestSession(5);

      expect(engine.getCurrentRound(session)).toBe(0);

      engine.drawWinner(session);
      expect(engine.getCurrentRound(session)).toBe(1);

      engine.drawWinner(session);
      expect(engine.getCurrentRound(session)).toBe(2);
    });
  });
});
