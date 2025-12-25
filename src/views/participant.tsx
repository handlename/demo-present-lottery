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
            現在の参加者数: {session.participants.size} / {session.maxParticipants}名
          </p>
          <form action={`/session/${session.id}/join`} method="post" class="space-y-4">
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

        <div
          id="lottery-status"
          class="bg-white rounded-lg shadow-lg p-6"
          hx-ext="ws"
          ws-connect={`/session/${session.id}/ws?participantId=${participant.id}`}
        >
          {isWaiting && (
            <div class="text-center">
              <p class="text-gray-600">抽選開始をお待ちください</p>
              <div class="mt-4 text-sm text-gray-500">
                参加者数: {session.participants.size}名
              </div>
            </div>
          )}

          {!isWaiting && !isCompleted && (
            <div class="text-center">
              <p class="text-gray-600">
                抽選中... （{session.lotteryState.currentRound}回目）
              </p>
            </div>
          )}

          {isCompleted && (
            <div class="text-center">
              <p class="text-green-600 font-semibold">抽選が完了しました</p>
            </div>
          )}

          {participant.isWinner && (
            <div class="mt-4 p-4 bg-yellow-100 rounded-lg text-center" id="winner-banner">
              <p class="text-yellow-800 font-bold text-xl">
                おめでとうございます！
              </p>
              <p class="text-yellow-700">
                {participant.winOrder}番目に当選しました
              </p>
            </div>
          )}
        </div>

        <div class="text-center text-sm text-gray-500">
          セッションID: {session.id}
        </div>
      </div>
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
          <p class="text-gray-600">
            このセッションには参加できません。
          </p>
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
          <p class="text-gray-600 mb-4">
            URLが正しいか確認してください。
          </p>
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
