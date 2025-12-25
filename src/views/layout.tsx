import type { FC, PropsWithChildren } from "hono/jsx";

interface LayoutProps {
  title?: string;
}

const customStyles = `
  @keyframes winner-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.4);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 30px rgba(234, 179, 8, 0.8), 0 0 60px rgba(234, 179, 8, 0.6);
      transform: scale(1.02);
    }
  }

  @keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
  }

  @keyframes bounce-in {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }

  .animate-winner-glow {
    animation: winner-glow 1.5s ease-in-out infinite;
  }

  .animate-bounce-in {
    animation: bounce-in 0.5s ease-out;
  }

  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }

  .confetti-container {
    position: fixed;
    top: 50%;
    left: 50%;
    pointer-events: none;
    z-index: 1000;
  }

  .confetti-piece {
    position: absolute;
    width: 10px;
    height: 10px;
    animation: confetti 1s ease-out forwards;
  }
`;

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
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
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
