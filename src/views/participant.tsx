import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import type { Session, Participant } from "@/types";

interface JoinPageProps {
  session: Session;
}

export const JoinPage: FC<JoinPageProps> = ({ session }) => {
  return (
    <Layout title="プレゼント交換 - 参加">
      <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            プレゼント交換に参加
          </h2>
          <p class="text-gray-600 mb-4">
            現在の参加者数: {session.participants.size} /{" "}
            {session.maxParticipants}名
          </p>
          <form
            action={`/session/${session.id}/join`}
            method="post"
            class="space-y-4"
          >
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-600 mb-1"
              >
                お名前（任意）
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="ニックネームなど"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              参加する
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

interface ParticipantPageProps {
  session: Session;
  participant: Participant;
}

export const ParticipantPage: FC<ParticipantPageProps> = ({
  session,
  participant,
}) => {
  const isWaiting = session.lotteryState.status === "waiting";
  const isCompleted = session.lotteryState.status === "completed";

  const wsScript = `
    (function() {
      const sessionId = "${session.id}";
      let ws = null;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;
      const reconnectDelay = 1000;

      function connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + location.host + '/session/' + sessionId + '/ws');

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
          case 'lottery:won':
            showWinnerBanner(message.data.order);
            break;
          case 'lottery:completed':
            showCompleted();
            break;
          case 'lottery:reset':
            resetLottery();
            break;
          case 'participant:joined':
            updateParticipantCount(message.data.total);
            break;
        }
      }

      function updateLotteryResult(data) {
        const statusEl = document.getElementById('lottery-status-text');
        if (statusEl) {
          statusEl.innerHTML = '<p class="text-gray-600">抽選中... （' + data.round + '回目）</p>' +
            '<p class="text-sm text-gray-500 mt-2">当選者: ' + data.winner.number + '番' +
            (data.winner.name ? ' (' + data.winner.name + ' さん)' : '') + '</p>';
        }
      }

      function showWinnerBanner(order) {
        const container = document.getElementById('lottery-status');
        let banner = document.getElementById('winner-banner');
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'winner-banner';
          banner.className = 'mt-4 p-4 bg-yellow-100 rounded-lg text-center animate-pulse';
          container.appendChild(banner);
        }
        banner.innerHTML = '<p class="text-yellow-800 font-bold text-xl">おめでとうございます！</p>' +
          '<p class="text-yellow-700">' + order + '番目に当選しました</p>';
      }

      function showCompleted() {
        const statusEl = document.getElementById('lottery-status-text');
        if (statusEl) {
          statusEl.innerHTML = '<p class="text-green-600 font-semibold">抽選が完了しました</p>';
        }
      }

      function resetLottery() {
        const statusEl = document.getElementById('lottery-status-text');
        if (statusEl) {
          statusEl.innerHTML = '<p class="text-gray-600">抽選開始をお待ちください</p>';
        }
        const banner = document.getElementById('winner-banner');
        if (banner) {
          banner.remove();
        }
      }

      function updateParticipantCount(count) {
        const countEl = document.getElementById('participant-count');
        if (countEl) {
          countEl.textContent = count;
        }
      }

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
    <Layout title="プレゼント交換 - 参加中">
      <div class="max-w-md mx-auto space-y-6">
        <div class="bg-white rounded-lg shadow-lg p-6 text-center">
          <p class="text-gray-600 mb-2">あなたの抽選番号</p>
          <div class="text-6xl font-bold text-green-600 mb-4">
            {participant.number}
          </div>
          {participant.name && (
            <p class="text-gray-500">{participant.name} さん</p>
          )}
        </div>

        <div id="lottery-status" class="bg-white rounded-lg shadow-lg p-6">
          <div id="lottery-status-text" class="text-center">
            {isWaiting && (
              <>
                <p class="text-gray-600">抽選開始をお待ちください</p>
                <div class="mt-4 text-sm text-gray-500">
                  参加者数:{" "}
                  <span id="participant-count">
                    {session.participants.size}
                  </span>
                  名
                </div>
              </>
            )}

            {!isWaiting && !isCompleted && (
              <p class="text-gray-600">
                抽選中... （{session.lotteryState.currentRound}回目）
              </p>
            )}

            {isCompleted && (
              <p class="text-green-600 font-semibold">抽選が完了しました</p>
            )}
          </div>

          {participant.isWinner && (
            <div
              class="mt-4 p-4 bg-yellow-100 rounded-lg text-center"
              id="winner-banner"
            >
              <p class="text-yellow-800 font-bold text-xl">
                おめでとうございます！
              </p>
              <p class="text-yellow-700">
                {participant.winOrder}番目に当選しました
              </p>
            </div>
          )}
        </div>

        <div class="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <span>セッションID: {session.id}</span>
          <span
            id="connection-status"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
          >
            接続中...
          </span>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: wsScript }} />
    </Layout>
  );
};

interface SessionFullPageProps {
  sessionId: string;
}

export const SessionFullPage: FC<SessionFullPageProps> = ({ sessionId }) => {
  return (
    <Layout title="プレゼント交換 - 参加上限">
      <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 class="text-xl font-semibold text-red-600 mb-4">
            参加者数が上限に達しています
          </h2>
          <p class="text-gray-600">このセッションには参加できません。</p>
        </div>
      </div>
    </Layout>
  );
};

interface SessionNotFoundPageProps {}

export const SessionNotFoundPage: FC<SessionNotFoundPageProps> = () => {
  return (
    <Layout title="プレゼント交換 - セッションが見つかりません">
      <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 class="text-xl font-semibold text-red-600 mb-4">
            セッションが見つかりません
          </h2>
          <p class="text-gray-600 mb-4">URLが正しいか確認してください。</p>
          <a
            href="/"
            class="inline-block bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            トップへ戻る
          </a>
        </div>
      </div>
    </Layout>
  );
};
