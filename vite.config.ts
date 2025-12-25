import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
    ssr: true,
    rollupOptions: {
      input: resolve(__dirname, "src/index.ts"),
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  ssr: {
    noExternal: true,
  },
  server: {
    port: 3000,
  },
});
