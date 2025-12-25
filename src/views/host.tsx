import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import type { Session } from "@/types";

interface HostAuthPageProps {
  sessionId: string;
  error?: string;
}

export const HostAuthPage: FC<HostAuthPageProps> = ({ sessionId, error }) => {
  return (
    <Layout title="プレゼント交換 - 司会者認証">
      <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">司会者認証</h2>
          {error && (
            <div class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form
            action={`/session/${sessionId}/host/auth`}
            method="post"
            class="space-y-4"
          >
            <div>
              <label
                for="passcode"
                class="block text-sm font-medium text-gray-600 mb-1"
              >
                パスコード
              </label>
              <input
                type="text"
                id="passcode"
                name="passcode"
                pattern="[0-9]{6}"
                maxlength={6}
                required
                placeholder="6桁のパスコード"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest"
              />
            </div>
            <button
              type="submit"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              認証
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

interface HostPageProps {
  session: Session;
}

export const HostPage: FC<HostPageProps> = ({ session }) => {
  const participants = Array.from(session.participants.values()).sort(
    (a, b) => a.number - b.number,
  );
  const isWaiting = session.lotteryState.status === "waiting";
  const isCompleted = session.lotteryState.status === "completed";
  const remainingCount = participants.filter((p) => !p.isWinner).length;

  const wsScript = `
    (function() {
      const sessionId = "${session.id}";
      let ws = null;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;
      const reconnectDelay = 1000;

      function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + location.host + '/session/' + sessionId + '/host/ws');

        ws.onopen = function() {
          console.log('WebSocket connected');
          reconnectAttempts = 0;
          updateConnectionStatus('connected');
        };

        ws.onmessage = function(event) {
          const message = JSON.parse(event.data);
          handleMessage(message);
        };

        ws.onclose = function() {
          console.log('WebSocket disconnected');
          updateConnectionStatus('disconnected');
          attemptReconnect();
        };

        ws.onerror = function(error) {
          console.error('WebSocket error:', error);
        };
      }

      function attemptReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          updateConnectionStatus('reconnecting');
          setTimeout(connect, reconnectDelay * reconnectAttempts);
        }
      }

      function updateConnectionStatus(status) {
        const indicator = document.getElementById('connection-status');
        if (!indicator) return;

        indicator.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
        switch(status) {
          case 'connected':
            indicator.className += ' bg-green-100 text-green-800';
            indicator.textContent = '接続中';
            break;
          case 'disconnected':
            indicator.className += ' bg-red-100 text-red-800';
            indicator.textContent = '切断';
            break;
          case 'reconnecting':
            indicator.className += ' bg-yellow-100 text-yellow-800';
            indicator.textContent = '再接続中...';
            break;
        }
      }

      function handleMessage(message) {
        switch(message.type) {
          case 'lottery:result':
            updateLotteryResult(message.data);
            break;
          case 'lottery:completed':
            showCompleted();
            break;
          case 'lottery:reset':
            location.reload();
            break;
          case 'participant:joined':
            updateParticipantCount(message.data.total);
            break;
        }
      }

      function updateLotteryResult(data) {
        const winner = data.winner;
        const round = data.round;

        // Update stats
        document.getElementById('winner-count').textContent = round;
        const remaining = parseInt(document.getElementById('participant-total').textContent) - round;
        document.getElementById('remaining-count').textContent = remaining;

        // Update result display
        const resultEl = document.getElementById('lottery-result');
        resultEl.innerHTML = '<div class="text-center p-4 bg-yellow-100 rounded-lg animate-pulse">' +
          '<p class="text-yellow-700 font-bold text-2xl">' + winner.number + '番</p>' +
          (winner.name ? '<p class="text-yellow-600">' + winner.name + ' さん</p>' : '') +
          '<p class="text-yellow-600 text-sm">' + round + '番目の当選者</p>' +
          '</div>';

        // Update participant in list
        const participantsList = document.getElementById('participants-list');
        if (participantsList) {
          const items = participantsList.querySelectorAll('[data-number]');
          items.forEach(function(item) {
            if (item.dataset.number === String(winner.number)) {
              item.className = 'p-3 rounded-lg text-center bg-yellow-100 border-2 border-yellow-400';
              item.innerHTML = '<span class="text-xl font-bold">' + winner.number + '</span>' +
                (winner.name ? '<p class="text-xs text-gray-600 truncate">' + winner.name + '</p>' : '') +
                '<p class="text-xs text-yellow-700 font-semibold">' + winner.winOrder + '位</p>';
            }
          });
        }
      }

      function showCompleted() {
        const controlsEl = document.getElementById('lottery-controls');
        if (controlsEl) {
          controlsEl.innerHTML = '<div class="text-center p-4 bg-green-100 rounded-lg">' +
            '<p class="text-green-700 font-semibold text-lg">抽選が完了しました</p>' +
            '</div>';
        }
      }

      function updateParticipantCount(count) {
        const countEl = document.getElementById('participant-total');
        if (countEl) {
          countEl.textContent = count;
        }
        const remainingEl = document.getElementById('remaining-count');
        if (remainingEl) {
          const winnerCount = parseInt(document.getElementById('winner-count').textContent) || 0;
          remainingEl.textContent = count - winnerCount;
        }
      }

      // Expose draw and reset functions for buttons
      window.drawLottery = function() {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'lottery:draw' }));
        }
      };

      window.resetLottery = function() {
        if (confirm('抽選をリセットしますか？')) {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'lottery:reset' }));
          }
        }
      };

      // Start connection
      connect();

      // Ping every 30 seconds to keep connection alive
      setInterval(function() {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    })();
  `;

  return (
    <Layout title="プレゼント交換 - 司会者画面">
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-700">
              抽選コントロール
            </h2>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">
                セッションID: {session.id}
              </span>
              <span
                id="connection-status"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
              >
                接続中...
              </span>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6 text-center">
            <div class="p-4 bg-gray-100 rounded-lg">
              <p
                class="text-3xl font-bold text-gray-800"
                id="participant-total"
              >
                {participants.length}
              </p>
              <p class="text-sm text-gray-600">参加者</p>
            </div>
            <div class="p-4 bg-gray-100 rounded-lg">
              <p class="text-3xl font-bold text-green-600" id="winner-count">
                {session.lotteryState.currentRound}
              </p>
              <p class="text-sm text-gray-600">当選者数</p>
            </div>
            <div class="p-4 bg-gray-100 rounded-lg">
              <p class="text-3xl font-bold text-blue-600" id="remaining-count">
                {remainingCount}
              </p>
              <p class="text-sm text-gray-600">残り</p>
            </div>
          </div>

          <div id="lottery-controls" class="space-y-4">
            {isCompleted ? (
              <div class="text-center p-4 bg-green-100 rounded-lg">
                <p class="text-green-700 font-semibold text-lg">
                  抽選が完了しました
                </p>
              </div>
            ) : (
              <div class="flex space-x-4">
                <button
                  type="button"
                  onclick="drawLottery()"
                  disabled={participants.length === 0}
                  class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg text-lg transition duration-200"
                >
                  抽選する
                </button>
                {!isWaiting && (
                  <button
                    type="button"
                    onclick="resetLottery()"
                    class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-lg transition duration-200"
                  >
                    リセット
                  </button>
                )}
              </div>
            )}

            <div
              id="lottery-result"
              class="min-h-[100px] flex items-center justify-center"
            >
              {isWaiting && participants.length === 0 && (
                <p class="text-gray-500">参加者を待っています...</p>
              )}
              {isWaiting && participants.length > 0 && (
                <p class="text-gray-500">抽選を開始してください</p>
              )}
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4">参加者一覧</h3>
          {participants.length === 0 ? (
            <p class="text-gray-500 text-center py-4" id="participants-list">
              まだ参加者がいません
            </p>
          ) : (
            <div
              class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
              id="participants-list"
            >
              {participants.map((p) => (
                <div
                  key={p.id}
                  data-number={p.number}
                  class={`p-3 rounded-lg text-center ${
                    p.isWinner
                      ? "bg-yellow-100 border-2 border-yellow-400"
                      : "bg-gray-100"
                  }`}
                >
                  <span class="text-xl font-bold">{p.number}</span>
                  {p.name && (
                    <p class="text-xs text-gray-600 truncate">{p.name}</p>
                  )}
                  {p.isWinner && (
                    <p class="text-xs text-yellow-700 font-semibold">
                      {p.winOrder}位
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: wsScript }} />
    </Layout>
  );
};
