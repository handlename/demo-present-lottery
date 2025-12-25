import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import routes from "@/routes";
import {
  createParticipantWebSocketHandler,
  createHostWebSocketHandler,
} from "@/routes/websocket";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.route("/", routes);

// 参加者用WebSocket
app.get("/session/:id/ws", upgradeWebSocket(createParticipantWebSocketHandler));

// 司会者用WebSocket
app.get("/session/:id/host/ws", upgradeWebSocket(createHostWebSocketHandler));

const port = Number(process.env.PORT) || 3000;

console.log(`Server is running on http://localhost:${port}`);

const server = serve({
  fetch: app.fetch,
  port,
});

injectWebSocket(server);
