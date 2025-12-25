import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import routes from "@/routes";

describe("ルート統合テスト", () => {
  let app: Hono;

  beforeEach(() => {
    vi.resetModules();
    app = new Hono();
    app.route("/", routes);
  });

  describe("GET /", () => {
    it("トップページを表示する", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("新しいセッションを作成");
      expect(html).toContain("参加者数");
    });
  });

  describe("POST /sessions", () => {
    it("有効な参加者数でセッションを作成できる", async () => {
      const formData = new FormData();
      formData.append("maxParticipants", "10");

      const res = await app.request("/sessions", {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("セッションを作成しました");
      expect(html).toContain("参加者用URL");
      expect(html).toContain("司会者パスコード");
    });

    it("参加者数が5未満の場合はエラー", async () => {
      const formData = new FormData();
      formData.append("maxParticipants", "3");

      const res = await app.request("/sessions", {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("5〜50名");
    });

    it("参加者数が50を超える場合はエラー", async () => {
      const formData = new FormData();
      formData.append("maxParticipants", "100");

      const res = await app.request("/sessions", {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(400);
    });

    it("参加者数が数値でない場合はエラー", async () => {
      const formData = new FormData();
      formData.append("maxParticipants", "abc");

      const res = await app.request("/sessions", {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(400);
    });
  });

  describe("セッション参加フロー", () => {
    it("セッション作成→参加→抽選の一連のフローが動作する", async () => {
      // 1. セッション作成
      const createFormData = new FormData();
      createFormData.append("maxParticipants", "5");

      const createRes = await app.request("/sessions", {
        method: "POST",
        body: createFormData,
      });
      expect(createRes.status).toBe(200);

      // セッションIDを抽出
      const createHtml = await createRes.text();
      const sessionIdMatch = createHtml.match(/\/session\/([a-zA-Z0-9]+)/);
      expect(sessionIdMatch).not.toBeNull();
      const sessionId = sessionIdMatch![1];

      // 2. 参加ページにアクセス
      const joinPageRes = await app.request(`/session/${sessionId}`);
      expect(joinPageRes.status).toBe(200);
      const joinPageHtml = await joinPageRes.text();
      expect(joinPageHtml).toContain("プレゼント交換に参加");

      // 3. 参加する
      const joinFormData = new FormData();
      joinFormData.append("name", "テストユーザー");

      const joinRes = await app.request(`/session/${sessionId}/join`, {
        method: "POST",
        body: joinFormData,
      });
      // 参加後は /me にリダイレクト
      expect(joinRes.status).toBe(302);
      expect(joinRes.headers.get("location")).toBe(`/session/${sessionId}/me`);

      // 4. リダイレクト先で参加者画面が表示される
      const cookie = joinRes.headers.get("set-cookie");
      const meRes = await app.request(`/session/${sessionId}/me`, {
        headers: {
          Cookie: cookie || "",
        },
      });
      expect(meRes.status).toBe(200);
      const meHtml = await meRes.text();
      expect(meHtml).toContain("あなたの抽選番号");
      expect(meHtml).toContain("テストユーザー");
    });

    it("存在しないセッションにアクセスするとエラー", async () => {
      const res = await app.request("/session/nonexistent");
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain("セッションが見つかりません");
    });
  });

  describe("司会者認証フロー", () => {
    it("正しいパスコードで認証できる", async () => {
      // セッション作成
      const createFormData = new FormData();
      createFormData.append("maxParticipants", "5");
      const createRes = await app.request("/sessions", {
        method: "POST",
        body: createFormData,
      });
      const createHtml = await createRes.text();

      // セッションIDとパスコードを抽出
      const sessionIdMatch = createHtml.match(/\/session\/([a-zA-Z0-9]+)/);
      const sessionId = sessionIdMatch![1];
      const passcodeMatch = createHtml.match(
        /class="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-gray-800">\s*(\d{6})\s*<\/span>/,
      );
      expect(passcodeMatch).not.toBeNull();
      const passcode = passcodeMatch![1];

      // 司会者認証
      const authFormData = new FormData();
      authFormData.append("passcode", passcode);
      const authRes = await app.request(`/session/${sessionId}/host/auth`, {
        method: "POST",
        body: authFormData,
      });

      // 認証成功時は司会者画面が表示される
      expect(authRes.status).toBe(200);
      const authHtml = await authRes.text();
      expect(authHtml).toContain("抽選コントロール");
    });

    it("間違ったパスコードで認証エラー", async () => {
      // セッション作成
      const createFormData = new FormData();
      createFormData.append("maxParticipants", "5");
      const createRes = await app.request("/sessions", {
        method: "POST",
        body: createFormData,
      });
      const createHtml = await createRes.text();

      const sessionIdMatch = createHtml.match(/\/session\/([a-zA-Z0-9]+)/);
      const sessionId = sessionIdMatch![1];

      // 間違ったパスコードで認証
      const authFormData = new FormData();
      authFormData.append("passcode", "000000");
      const authRes = await app.request(`/session/${sessionId}/host/auth`, {
        method: "POST",
        body: authFormData,
      });

      expect(authRes.status).toBe(200);
      const authHtml = await authRes.text();
      expect(authHtml).toContain("パスコードが正しくありません");
    });
  });
});
