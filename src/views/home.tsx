import type { FC } from "hono/jsx";
import { Layout } from "./layout";

export const HomePage: FC = () => {
  return (
    <Layout title="プレゼント交換 - セッション作成">
      <div class="max-w-md mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-4">
            新しいセッションを作成
          </h2>
          <form action="/sessions" method="post" class="space-y-4">
            <div>
              <label
                for="maxParticipants"
                class="block text-sm font-medium text-gray-600 mb-1"
              >
                参加者数
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                min="5"
                max="50"
                value="10"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">5〜50名の範囲で設定</p>
            </div>
            <button
              type="submit"
              class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              セッションを作成
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
