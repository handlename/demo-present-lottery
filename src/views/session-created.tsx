import type { FC } from "hono/jsx";
import { Layout } from "./layout";
import type { Session } from "@/types";

interface SessionCreatedPageProps {
  session: Session;
  baseUrl: string;
}

export const SessionCreatedPage: FC<SessionCreatedPageProps> = ({
  session,
  baseUrl,
}) => {
  const participantUrl = `${baseUrl}/session/${session.id}`;
  const hostUrl = `${baseUrl}/session/${session.id}/host`;

  return (
    <Layout title="プレゼント交換 - セッション作成完了">
      <div class="max-w-md mx-auto space-y-6">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-green-600 mb-4">
            セッションを作成しました
          </h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">
                参加者用URL
              </label>
              <div class="flex">
                <input
                  type="text"
                  readonly
                  value={participantUrl}
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm"
                />
                <button
                  type="button"
                  onclick={`navigator.clipboard.writeText('${participantUrl}')`}
                  class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-r-lg"
                >
                  コピー
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                このURLを参加者に共有してください
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">
                司会者パスコード
              </label>
              <div class="flex items-center space-x-2">
                <span class="text-2xl font-mono font-bold tracking-wider text-gray-800">
                  {session.hostPasscode}
                </span>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                このパスコードは司会者画面へのアクセスに必要です
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">
                参加者数上限
              </label>
              <span class="text-lg font-semibold text-gray-800">
                {session.maxParticipants}名
              </span>
            </div>
          </div>
        </div>

        <div class="flex space-x-4">
          <a
            href={`/session/${session.id}/host`}
            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition duration-200"
          >
            司会者画面へ
          </a>
          <a
            href="/"
            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg text-center transition duration-200"
          >
            新規作成
          </a>
        </div>
      </div>
    </Layout>
  );
};
