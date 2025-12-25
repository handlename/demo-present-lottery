import type { Session, SessionId } from "@/types";

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24時間

interface StoredSession {
  session: Session;
  expiresAt: number;
}

class MemoryStore {
  private sessions: Map<SessionId, StoredSession> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    // 1時間ごとに期限切れセッションを削除
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, stored] of this.sessions) {
      if (stored.expiresAt <= now) {
        this.sessions.delete(id);
      }
    }
  }

  create(session: Session): void {
    this.sessions.set(session.id, {
      session,
      expiresAt: Date.now() + SESSION_TTL,
    });
  }

  get(id: SessionId): Session | undefined {
    const stored = this.sessions.get(id);
    if (!stored) {
      return undefined;
    }
    if (stored.expiresAt <= Date.now()) {
      this.sessions.delete(id);
      return undefined;
    }
    return stored.session;
  }

  update(session: Session): boolean {
    const stored = this.sessions.get(session.id);
    if (!stored || stored.expiresAt <= Date.now()) {
      return false;
    }
    stored.session = session;
    return true;
  }

  delete(id: SessionId): boolean {
    return this.sessions.delete(id);
  }

  has(id: SessionId): boolean {
    const session = this.get(id);
    return session !== undefined;
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const store = new MemoryStore();
