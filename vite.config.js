import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        new: resolve(__dirname, "new/index.html"),
        forecasting: resolve(__dirname, "forecasting.html"),
        bookkeeper: resolve(__dirname, "bookkeeper/index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.jsx"],
  },
});
