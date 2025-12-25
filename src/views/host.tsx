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
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            司会者認証
          </h2>
          {error && (
            <div class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form action={`/session/${sessionId}/host/auth`} method="post" class="space-y-4">
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
    (a, b) => a.number - b.number
  );
  const isWaiting = session.lotteryState.status === "waiting";
  const isCompleted = session.lotteryState.status === "completed";
  const remainingCount = participants.filter((p) => !p.isWinner).length;

  return (
    <Layout title="プレゼント交換 - 司会者画面">
      <div class="max-w-2xl mx-auto space-y-6">
        <div
          class="bg-white rounded-lg shadow-lg p-6"
          hx-ext="ws"
          ws-connect={`/session/${session.id}/ws?host=true`}
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-700">抽選コントロール</h2>
            <span class="text-sm text-gray-500">
              セッションID: {session.id}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-4 mb-6 text-center">
            <div class="p-4 bg-gray-100 rounded-lg">
              <p class="text-3xl font-bold text-gray-800">
                {participants.length}
              </p>
              <p class="text-sm text-gray-600">参加者</p>
            </div>
            <div class="p-4 bg-gray-100 rounded-lg">
              <p class="text-3xl font-bold text-green-600">
                {session.lotteryState.currentRound}
              </p>
              <p class="text-sm text-gray-600">当選者数</p>
            </div>
            <div class="p-4 bg-gray-100 rounded-lg">
              <p class="text-3xl font-bold text-blue-600">{remainingCount}</p>
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
                  hx-post={`/session/${session.id}/lottery/draw`}
                  hx-target="#lottery-result"
                  hx-swap="innerHTML"
                  disabled={participants.length === 0}
                  class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg text-lg transition duration-200"
                >
                  抽選する
                </button>
                {!isWaiting && (
                  <button
                    type="button"
                    hx-post={`/session/${session.id}/lottery/reset`}
                    hx-target="#lottery-result"
                    hx-swap="innerHTML"
                    hx-confirm="抽選をリセットしますか？"
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
            <p class="text-gray-500 text-center py-4">
              まだ参加者がいません
            </p>
          ) : (
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" id="participants-list">
              {participants.map((p) => (
                <div
                  key={p.id}
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
    </Layout>
  );
};
