import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPaths = ["health", "auth", "customers", "devices", "tickets", "categories", "users", "dashboard", "articles", "ocr"];
const proxy = Object.fromEntries(apiPaths.map((path) => [`^/${path}(/|$)`, {
  target: "http://127.0.0.1:8000",
  bypass(req) {
    // A browser page load belongs to React; JSON fetches belong to FastAPI.
    if (req.method === "GET" && req.headers.accept?.includes("text/html")) return "/index.html";
  },
}]));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [process.env.ITSM_COLAB_PROXY_HOST].filter(Boolean),
    proxy,
  },
  preview: {
    allowedHosts: [process.env.ITSM_COLAB_PROXY_HOST].filter(Boolean),
    proxy,
  },
});
