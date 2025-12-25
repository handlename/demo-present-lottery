import type { FC, PropsWithChildren } from "hono/jsx";

interface LayoutProps {
  title?: string;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title = "プレゼント交換",
  children,
}) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/htmx.org@2.0.0"></script>
        <script src="https://unpkg.com/htmx-ext-ws@2.0.0/ws.js"></script>
      </head>
      <body class="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
        <div class="container mx-auto px-4 py-8">
          <header class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800">{title}</h1>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
};
