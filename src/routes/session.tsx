import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sessionManager } from "@/services/session-manager";
import { lotteryEngine } from "@/services/lottery-engine";
import {
  JoinPage,
  ParticipantPage,
  SessionNotFoundPage,
  SessionFullPage,
} from "@/views/participant";
import { HostAuthPage, HostPage } from "@/views/host";

const app = new Hono();

app.get("/:id", (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<SessionNotFoundPage />);
  }

  const participantId = getCookie(c, `participant_${sessionId}`);
  if (participantId) {
    const participant = sessionManager.getParticipant(sessionId, participantId);
    if (participant) {
      return c.html(
        <ParticipantPage session={session} participant={participant} />,
      );
    }
  }

  if (session.participants.size >= session.maxParticipants) {
    return c.html(<SessionFullPage sessionId={sessionId} />);
  }

  return c.html(<JoinPage session={session} />);
});

app.post("/:id/join", async (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<SessionNotFoundPage />);
  }

  const existingParticipantId = getCookie(c, `participant_${sessionId}`);
  if (existingParticipantId) {
    const existingParticipant = sessionManager.getParticipant(
      sessionId,
      existingParticipantId,
    );
    if (existingParticipant) {
      return c.html(
        <ParticipantPage session={session} participant={existingParticipant} />,
      );
    }
  }

  const body = await c.req.parseBody();
  const name = body.name ? String(body.name) : undefined;

  try {
    const result = sessionManager.joinSession(sessionId, name);
    if (!result) {
      return c.html(<SessionNotFoundPage />);
    }

    setCookie(c, `participant_${sessionId}`, result.participant.id, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return c.html(
      <ParticipantPage
        session={result.session}
        participant={result.participant}
      />,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("上限")) {
      return c.html(<SessionFullPage sessionId={sessionId} />);
    }
    throw error;
  }
});

// 司会者画面
app.get("/:id/host", (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<SessionNotFoundPage />);
  }

  const hostAuth = getCookie(c, `host_${sessionId}`);
  if (hostAuth !== "true") {
    return c.html(<HostAuthPage sessionId={sessionId} />);
  }

  return c.html(<HostPage session={session} />);
});

app.post("/:id/host/auth", async (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<SessionNotFoundPage />);
  }

  const body = await c.req.parseBody();
  const passcode = String(body.passcode);

  if (!sessionManager.verifyHostPasscode(sessionId, passcode)) {
    return c.html(
      <HostAuthPage
        sessionId={sessionId}
        error="パスコードが正しくありません"
      />,
    );
  }

  setCookie(c, `host_${sessionId}`, "true", {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return c.html(<HostPage session={session} />);
});

// 抽選実行
app.post("/:id/lottery/draw", (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<div class="text-red-600">セッションが見つかりません</div>);
  }

  const winner = lotteryEngine.drawWinner(session);

  if (!winner) {
    return c.html(
      <div class="text-center p-4 bg-green-100 rounded-lg">
        <p class="text-green-700 font-semibold text-lg">抽選が完了しました</p>
      </div>,
    );
  }

  return c.html(
    <div class="text-center p-6 bg-yellow-100 rounded-lg animate-pulse">
      <p class="text-yellow-800 text-lg mb-2">
        {session.lotteryState.currentRound}回目の当選者
      </p>
      <p class="text-5xl font-bold text-yellow-700 mb-2">{winner.number}</p>
      {winner.name && <p class="text-xl text-yellow-700">{winner.name} さん</p>}
    </div>,
  );
});

// 抽選リセット
app.post("/:id/lottery/reset", (c) => {
  const sessionId = c.req.param("id");
  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return c.html(<div class="text-red-600">セッションが見つかりません</div>);
  }

  lotteryEngine.reset(session);

  return c.html(
    <div class="text-center p-4">
      <p class="text-gray-600">抽選をリセットしました</p>
    </div>,
  );
});

export default app;
