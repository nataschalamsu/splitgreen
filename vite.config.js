import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, the API lives in the Cloudflare Worker (worker.js), which
// Vite doesn't run. Proxy /api to a local `wrangler dev` (port 8787) when it's up;
// if it isn't, the fetch fails and the app falls back to on-device OCR — same as prod.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
