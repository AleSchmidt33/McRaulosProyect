// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ya los tenías:
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/productos": { target: "http://localhost:3000", changeOrigin: true },

      // 👇 añadidos para imágenes (no tocan el back):
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
      "/images": { target: "http://localhost:3000", changeOrigin: true },
      "/static": { target: "http://localhost:3000", changeOrigin: true },
      "/media": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
});
