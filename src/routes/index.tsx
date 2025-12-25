import { Hono } from "hono";
import { HomePage } from "@/views/home";
import { SessionCreatedPage } from "@/views/session-created";
import { sessionManager } from "@/services/session-manager";

const app = new Hono();

app.get("/", (c) => {
  return c.html(<HomePage />);
});

app.post("/sessions", async (c) => {
  const body = await c.req.parseBody();
  const maxParticipants = Number(body.maxParticipants);

  if (isNaN(maxParticipants) || maxParticipants < 5 || maxParticipants > 50) {
    return c.text("参加者数は5〜50名の範囲で指定してください", 400);
  }

  const session = sessionManager.createSession(maxParticipants);

  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  return c.html(<SessionCreatedPage session={session} baseUrl={baseUrl} />);
});

export default app;
