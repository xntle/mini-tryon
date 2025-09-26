import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["@shopify/shop-minis-react"],
  },
  server: {
    "/api": {
      target: "https://mini-tryon-production.up.railway.app",
      changeOrigin: true,
    },
    changeOrigin: true,
  },
});
