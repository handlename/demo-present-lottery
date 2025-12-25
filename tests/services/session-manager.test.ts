import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "@/services/session-manager";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe("createSession", () => {
    it("セッションを作成できる", () => {
      const session = manager.createSession(10);

      expect(session.id).toHaveLength(8);
      expect(session.hostPasscode).toHaveLength(6);
      expect(session.maxParticipants).toBe(10);
      expect(session.participants.size).toBe(0);
      expect(session.lotteryState.status).toBe("waiting");
      expect(session.lotteryState.currentRound).toBe(0);
      expect(session.lotteryState.winners).toHaveLength(0);
    });

    it("参加者数が5未満の場合はエラー", () => {
      expect(() => manager.createSession(4)).toThrow(
        "参加者数は5〜50名の範囲で指定してください"
      );
    });

    it("参加者数が50を超える場合はエラー", () => {
      expect(() => manager.createSession(51)).toThrow(
        "参加者数は5〜50名の範囲で指定してください"
      );
    });
  });

  describe("getSession", () => {
    it("作成したセッションを取得できる", () => {
      const created = manager.createSession(10);
      const retrieved = manager.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it("存在しないセッションはundefinedを返す", () => {
      const retrieved = manager.getSession("nonexistent");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("joinSession", () => {
    it("セッションに参加できる", () => {
      const session = manager.createSession(10);
      const result = manager.joinSession(session.id, "テストユーザー");

      expect(result).toBeDefined();
      expect(result?.participant.number).toBe(1);
      expect(result?.participant.name).toBe("テストユーザー");
      expect(result?.participant.isWinner).toBe(false);
    });

    it("名前なしでも参加できる", () => {
      const session = manager.createSession(10);
      const result = manager.joinSession(session.id);

      expect(result).toBeDefined();
      expect(result?.participant.name).toBeUndefined();
    });

    it("参加者には連番が割り当てられる", () => {
      const session = manager.createSession(10);

      const result1 = manager.joinSession(session.id, "ユーザー1");
      const result2 = manager.joinSession(session.id, "ユーザー2");
      const result3 = manager.joinSession(session.id, "ユーザー3");

      expect(result1?.participant.number).toBe(1);
      expect(result2?.participant.number).toBe(2);
      expect(result3?.participant.number).toBe(3);
    });

    it("上限に達すると参加できない", () => {
      const session = manager.createSession(5);

      for (let i = 0; i < 5; i++) {
        manager.joinSession(session.id, `ユーザー${i + 1}`);
      }

      expect(() => manager.joinSession(session.id, "追加ユーザー")).toThrow(
        "参加者数が上限に達しています"
      );
    });

    it("存在しないセッションにはundefinedを返す", () => {
      const result = manager.joinSession("nonexistent", "テスト");
      expect(result).toBeUndefined();
    });
  });

  describe("verifyHostPasscode", () => {
    it("正しいパスコードで認証成功", () => {
      const session = manager.createSession(10);
      const result = manager.verifyHostPasscode(session.id, session.hostPasscode);
      expect(result).toBe(true);
    });

    it("誤ったパスコードで認証失敗", () => {
      const session = manager.createSession(10);
      const result = manager.verifyHostPasscode(session.id, "000000");
      expect(result).toBe(false);
    });

    it("存在しないセッションで認証失敗", () => {
      const result = manager.verifyHostPasscode("nonexistent", "123456");
      expect(result).toBe(false);
    });
  });

  describe("getParticipant", () => {
    it("参加者を取得できる", () => {
      const session = manager.createSession(10);
      const joined = manager.joinSession(session.id, "テスト");
      const participant = manager.getParticipant(
        session.id,
        joined!.participant.id
      );

      expect(participant).toBeDefined();
      expect(participant?.name).toBe("テスト");
    });

    it("存在しない参加者はundefinedを返す", () => {
      const session = manager.createSession(10);
      const participant = manager.getParticipant(session.id, "nonexistent");
      expect(participant).toBeUndefined();
    });
  });

  describe("markParticipantAsWinner", () => {
    it("参加者を当選者としてマークできる", () => {
      const session = manager.createSession(10);
      const joined = manager.joinSession(session.id, "テスト");

      const result = manager.markParticipantAsWinner(
        session.id,
        joined!.participant.id,
        1
      );

      expect(result).toBe(true);

      const participant = manager.getParticipant(
        session.id,
        joined!.participant.id
      );
      expect(participant?.isWinner).toBe(true);
      expect(participant?.winOrder).toBe(1);
    });
  });
});
