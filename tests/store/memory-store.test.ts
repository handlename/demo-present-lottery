import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Session } from "@/types";

// モジュールを再インポートするためのヘルパー
async function createFreshStore() {
  vi.resetModules();
  const { store } = await import("@/store/memory-store");
  return store;
}

function createMockSession(id: string): Session {
  return {
    id,
    hostPasscode: "123456",
    maxParticipants: 10,
    participants: new Map(),
    lotteryState: {
      status: "waiting",
      currentRound: 0,
      winners: [],
    },
    createdAt: new Date(),
  };
}

describe("MemoryStore", () => {
  let store: Awaited<ReturnType<typeof createFreshStore>>;

  beforeEach(async () => {
    vi.useFakeTimers();
    store = await createFreshStore();
  });

  afterEach(() => {
    store.stopCleanup();
    vi.useRealTimers();
  });

  describe("create", () => {
    it("セッションを作成できる", () => {
      const session = createMockSession("test-001");
      store.create(session);
      expect(store.has("test-001")).toBe(true);
    });
  });

  describe("get", () => {
    it("存在するセッションを取得できる", () => {
      const session = createMockSession("test-002");
      store.create(session);
      const retrieved = store.get("test-002");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-002");
    });

    it("存在しないセッションはundefinedを返す", () => {
      const retrieved = store.get("nonexistent");
      expect(retrieved).toBeUndefined();
    });

    it("期限切れのセッションはundefinedを返す", () => {
      const session = createMockSession("test-003");
      store.create(session);

      // 24時間 + 1ミリ秒進める
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const retrieved = store.get("test-003");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("update", () => {
    it("存在するセッションを更新できる", () => {
      const session = createMockSession("test-004");
      store.create(session);

      session.maxParticipants = 20;
      const result = store.update(session);

      expect(result).toBe(true);
      expect(store.get("test-004")?.maxParticipants).toBe(20);
    });

    it("存在しないセッションの更新はfalseを返す", () => {
      const session = createMockSession("nonexistent");
      const result = store.update(session);
      expect(result).toBe(false);
    });

    it("期限切れセッションの更新はfalseを返す", () => {
      const session = createMockSession("test-005");
      store.create(session);

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      const result = store.update(session);
      expect(result).toBe(false);
    });
  });

  describe("delete", () => {
    it("存在するセッションを削除できる", () => {
      const session = createMockSession("test-006");
      store.create(session);

      const result = store.delete("test-006");
      expect(result).toBe(true);
      expect(store.has("test-006")).toBe(false);
    });

    it("存在しないセッションの削除はfalseを返す", () => {
      const result = store.delete("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("has", () => {
    it("存在するセッションでtrueを返す", () => {
      const session = createMockSession("test-007");
      store.create(session);
      expect(store.has("test-007")).toBe(true);
    });

    it("存在しないセッションでfalseを返す", () => {
      expect(store.has("nonexistent")).toBe(false);
    });

    it("期限切れセッションでfalseを返す", () => {
      const session = createMockSession("test-008");
      store.create(session);

      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(store.has("test-008")).toBe(false);
    });
  });

  describe("cleanup", () => {
    it("1時間後に期限切れセッションが自動削除される", async () => {
      const freshStore = await createFreshStore();
      const session = createMockSession("test-009");
      freshStore.create(session);

      // 23時間進める（まだ期限内）
      vi.advanceTimersByTime(23 * 60 * 60 * 1000);
      expect(freshStore.has("test-009")).toBe(true);

      // さらに2時間進める（25時間経過、クリーンアップも実行される）
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      expect(freshStore.has("test-009")).toBe(false);

      freshStore.stopCleanup();
    });
  });
});
