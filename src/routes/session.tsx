import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sessionManager } from "@/services/session-manager";
import {
  JoinPage,
  ParticipantPage,
  SessionNotFoundPage,
  SessionFullPage,
} from "@/views/participant";

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
      return c.html(<ParticipantPage session={session} participant={participant} />);
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
      existingParticipantId
    );
    if (existingParticipant) {
      return c.html(
        <ParticipantPage session={session} participant={existingParticipant} />
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
      <ParticipantPage session={result.session} participant={result.participant} />
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("上限")) {
      return c.html(<SessionFullPage sessionId={sessionId} />);
    }
    throw error;
  }
});

export default app;
