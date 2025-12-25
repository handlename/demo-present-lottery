import type { Context } from "hono";
import type { WSContext } from "hono/ws";
import { sessionManager } from "@/services/session-manager";
import { lotteryEngine } from "@/services/lottery-engine";
import type {
  SessionId,
  ParticipantId,
  ClientMessage,
  ServerMessage,
} from "@/types";

/** セッションごとのWebSocket接続を管理 */
const connectionsBySession = new Map<
  SessionId,
  Map<ParticipantId, WSContext>
>();

/** 司会者接続を管理 */
const hostConnections = new Map<SessionId, WSContext>();

/** セッションにメッセージをブロードキャスト */
export function broadcast(sessionId: SessionId, message: ServerMessage): void {
  const connections = connectionsBySession.get(sessionId);
  if (!connections) return;

  const data = JSON.stringify(message);
  for (const ws of connections.values()) {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  }

  const hostWs = hostConnections.get(sessionId);
  if (hostWs && hostWs.readyState === 1) {
    hostWs.send(data);
  }
}

/** 特定の参加者にメッセージを送信 */
export function sendToParticipant(
  sessionId: SessionId,
  participantId: ParticipantId,
  message: ServerMessage,
): void {
  const connections = connectionsBySession.get(sessionId);
  if (!connections) return;

  const ws = connections.get(participantId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

/** 司会者にメッセージを送信 */
export function sendToHost(sessionId: SessionId, message: ServerMessage): void {
  const hostWs = hostConnections.get(sessionId);
  if (hostWs && hostWs.readyState === 1) {
    hostWs.send(JSON.stringify(message));
  }
}

/** Cookieから値を取得 */
function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match?.split("=")[1];
}

/** 参加者用WebSocketハンドラを作成 */
export function createParticipantWebSocketHandler(c: Context) {
  const sessionId = c.req.param("id");
  const cookieHeader = c.req.header("cookie");
  const participantId = getCookieValue(cookieHeader, "participantId");

  return {
    onOpen(_event: Event, ws: WSContext) {
      const session = sessionManager.getSession(sessionId);
      if (!session || !participantId) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "無効なセッションまたは参加者です" },
          } as ServerMessage),
        );
        ws.close();
        return;
      }

      const participant = session.participants.get(participantId);
      if (!participant) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "参加者が見つかりません" },
          } as ServerMessage),
        );
        ws.close();
        return;
      }

      if (!connectionsBySession.has(sessionId)) {
        connectionsBySession.set(sessionId, new Map());
      }
      connectionsBySession.get(sessionId)!.set(participantId, ws);

      ws.send(
        JSON.stringify({
          type: "participant:joined",
          data: {
            number: participant.number,
            total: session.participants.size,
          },
        } as ServerMessage),
      );
    },

    onMessage(event: MessageEvent, ws: WSContext) {
      try {
        const message = JSON.parse(String(event.data)) as ClientMessage;

        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" } as ServerMessage));
        }
      } catch {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "無効なメッセージ形式です" },
          } as ServerMessage),
        );
      }
    },

    onClose() {
      if (participantId) {
        connectionsBySession.get(sessionId)?.delete(participantId);
      }
    },

    onError() {
      if (participantId) {
        connectionsBySession.get(sessionId)?.delete(participantId);
      }
    },
  };
}

/** 司会者用WebSocketハンドラを作成 */
export function createHostWebSocketHandler(c: Context) {
  const sessionId = c.req.param("id");
  const cookieHeader = c.req.header("cookie");
  const isAuthenticated = cookieHeader?.includes(`hostAuth_${sessionId}=true`);

  return {
    onOpen(_event: Event, ws: WSContext) {
      const session = sessionManager.getSession(sessionId);

      if (!session || !isAuthenticated) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "認証されていません" },
          } as ServerMessage),
        );
        ws.close();
        return;
      }

      hostConnections.set(sessionId, ws);
    },

    onMessage(event: MessageEvent, ws: WSContext) {
      try {
        const message = JSON.parse(String(event.data)) as ClientMessage;
        const session = sessionManager.getSession(sessionId);

        if (!session) {
          ws.send(
            JSON.stringify({
              type: "error",
              data: { message: "セッションが見つかりません" },
            } as ServerMessage),
          );
          return;
        }

        switch (message.type) {
          case "lottery:draw": {
            const winner = lotteryEngine.drawWinner(session);
            if (winner) {
              broadcast(sessionId, {
                type: "lottery:result",
                data: {
                  winner,
                  round: session.lotteryState.currentRound,
                },
              });

              sendToParticipant(sessionId, winner.id, {
                type: "lottery:won",
                data: { order: winner.winOrder! },
              });

              if (lotteryEngine.isCompleted(session)) {
                broadcast(sessionId, { type: "lottery:completed" });
              }
            }
            break;
          }

          case "lottery:reset": {
            lotteryEngine.reset(session);
            broadcast(sessionId, { type: "lottery:reset" });
            break;
          }

          case "ping": {
            ws.send(JSON.stringify({ type: "pong" } as ServerMessage));
            break;
          }
        }
      } catch {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "無効なメッセージ形式です" },
          } as ServerMessage),
        );
      }
    },

    onClose() {
      hostConnections.delete(sessionId);
    },

    onError() {
      hostConnections.delete(sessionId);
    },
  };
}

export { connectionsBySession, hostConnections };
