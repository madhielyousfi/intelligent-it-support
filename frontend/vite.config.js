import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://localhost:8000",
      "/auth": "http://localhost:8000",
      "/customers": "http://localhost:8000",
      "/devices": "http://localhost:8000",
      "/tickets": "http://localhost:8000",
      "/categories": "http://localhost:8000",
      "/users": "http://localhost:8000",
      "/dashboard": "http://localhost:8000",
      "/articles": "http://localhost:8000",
      "/ocr": "http://localhost:8000",
    },
  },
});
