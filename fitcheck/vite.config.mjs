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
    proxy: { "/api": "http://localhost:3000" },
    changeOrigin: true,
  },
});
