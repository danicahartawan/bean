import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Serve /messaging (no trailing slash) in dev the same way it works when deployed.
const cleanPageUrls = {
  name: "clean-page-urls",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === "/messaging" || req.url?.startsWith("/messaging?")) {
        res.statusCode = 302;
        res.setHeader("Location", req.url.replace("/messaging", "/messaging/"));
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
        forecasting: resolve(__dirname, "forecasting.html"),
        bookkeeper: resolve(__dirname, "bookkeeper/index.html"),
        messaging: resolve(__dirname, "messaging/index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.jsx"],
  },
});
