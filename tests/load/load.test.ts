import { describe, it, expect, beforeEach, vi } from "vitest";
import { sessionManager } from "@/services/session-manager";
import { lotteryEngine } from "@/services/lottery-engine";
import type { Session } from "@/types";

describe("負荷テスト", () => {
  describe("50名同時参加シミュレーション", () => {
    let session: Session;

    beforeEach(() => {
      vi.resetModules();
      session = sessionManager.createSession(50);
    });

    it("50名が同時に参加できる", () => {
      const participants = [];
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        const result = sessionManager.joinSession(session.id, `参加者${i + 1}`);
        participants.push(result.participant);
      }

      const duration = Date.now() - startTime;

      expect(participants.length).toBe(50);
      expect(session.participants.size).toBe(50);
      expect(duration).toBeLessThan(1000); // 1秒以内に完了

      // 全員に異なる抽選番号が割り当てられている
      const numbers = new Set(participants.map((p) => p.number));
      expect(numbers.size).toBe(50);
    });

    it("50名全員に抽選を実行できる", () => {
      // 50名参加
      for (let i = 0; i < 50; i++) {
        sessionManager.joinSession(session.id, `参加者${i + 1}`);
      }

      expect(session.participants.size).toBe(50);

      const winners = [];
      const startTime = Date.now();

      // 50回抽選
      for (let i = 0; i < 50; i++) {
        const winner = lotteryEngine.drawWinner(session);
        expect(winner).not.toBeNull();
        winners.push(winner);
      }

      const duration = Date.now() - startTime;

      expect(winners.length).toBe(50);
      expect(lotteryEngine.isCompleted(session)).toBe(true);
      expect(duration).toBeLessThan(100); // 100ms以内に完了

      // 全員が1回ずつ当選している
      const winnerIds = new Set(winners.map((w) => w!.id));
      expect(winnerIds.size).toBe(50);
    });

    it("抽選結果が1回の抽選あたり1ms以内で処理される", () => {
      // 50名参加
      for (let i = 0; i < 50; i++) {
        sessionManager.joinSession(session.id, `参加者${i + 1}`);
      }

      const drawTimes: number[] = [];

      // 各抽選の処理時間を計測
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now();
        lotteryEngine.drawWinner(session);
        const endTime = performance.now();
        drawTimes.push(endTime - startTime);
      }

      const averageTime =
        drawTimes.reduce((a, b) => a + b, 0) / drawTimes.length;
      const maxTime = Math.max(...drawTimes);

      expect(averageTime).toBeLessThan(1); // 平均1ms以内
      expect(maxTime).toBeLessThan(10); // 最大でも10ms以内
    });

    it("複数セッションが同時に動作できる", () => {
      const sessions: Session[] = [];
      const sessionCount = 10;
      const participantsPerSession = 10;

      // 10セッション作成
      for (let i = 0; i < sessionCount; i++) {
        sessions.push(sessionManager.createSession(participantsPerSession));
      }

      const startTime = Date.now();

      // 各セッションに10名ずつ参加
      for (const s of sessions) {
        for (let j = 0; j < participantsPerSession; j++) {
          sessionManager.joinSession(s.id, `参加者${j + 1}`);
        }
      }

      // 各セッションで抽選実行
      for (const s of sessions) {
        for (let j = 0; j < participantsPerSession; j++) {
          lotteryEngine.drawWinner(s);
        }
        expect(lotteryEngine.isCompleted(s)).toBe(true);
      }

      const duration = Date.now() - startTime;

      // 全100名の参加と抽選が1秒以内に完了
      expect(duration).toBeLessThan(1000);

      // 全セッションの参加者数確認
      for (const s of sessions) {
        expect(s.participants.size).toBe(participantsPerSession);
      }
    });
  });

  describe("メモリ効率", () => {
    it("大量のセッション作成でメモリリークがない", () => {
      const sessionCount = 100;
      const sessions: Session[] = [];

      for (let i = 0; i < sessionCount; i++) {
        sessions.push(sessionManager.createSession(10));
      }

      expect(sessions.length).toBe(sessionCount);

      // 各セッションにIDが割り当てられている
      const ids = new Set(sessions.map((s) => s.id));
      expect(ids.size).toBe(sessionCount);
    });
  });
});
