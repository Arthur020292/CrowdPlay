import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const port = Number(env.CROWDPLAY_WEB_PORT || "4177");
  const workerPort = Number(env.CROWDPLAY_WORKER_PORT || "8788");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@crowdplay/protocol": new URL("../../packages/protocol/src/index.ts", import.meta.url).pathname,
        "@crowdplay/game-content": new URL("../../packages/game-content/src/index.ts", import.meta.url).pathname,
        "@crowdplay/game-goldrush": new URL("../../packages/game-goldrush/src/index.ts", import.meta.url).pathname,
        "@crowdplay/game-quizdash": new URL("../../packages/game-quizdash/src/index.ts", import.meta.url).pathname
      }
    },
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${workerPort}`,
          changeOrigin: true,
          ws: true
        }
      }
    }
  };
});
