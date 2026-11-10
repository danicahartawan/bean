import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Serve /messaging and /flow (no trailing slash) in dev the same way they work when deployed.
const cleanPageUrls = {
  name: "clean-page-urls",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const clean = ["/messaging", "/flow"].find(p => req.url === p || req.url?.startsWith(p + "?"));
      if (clean) {
        res.statusCode = 302;
        res.setHeader("Location", req.url.replace(clean, clean + "/"));
        return res.end();
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), cleanPageUrls],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        new: resolve(__dirname, "new/index.html"),
        hello: resolve(__dirname, "hello/index.html"),
        forecasting: resolve(__dirname, "forecasting.html"),
        bookkeeper: resolve(__dirname, "bookkeeper/index.html"),
        bookkeeperV2: resolve(__dirname, "bookkeeper-v2/index.html"),
        flow: resolve(__dirname, "flow/index.html"),
        flowNote: resolve(__dirname, "flow/note.html"),
        flowCheck: resolve(__dirname, "flow/check.html"),
        messaging: resolve(__dirname, "messaging/index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.jsx"],
  },
});
