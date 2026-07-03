import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/user-service": "http://localhost:8080",
      "/event-service": "http://localhost:8080",
      "/seat-service": "http://localhost:8080",
      "/ticket-service": "http://localhost:8080",
      "/booking-service": "http://localhost:8080",
      "/payment-service": "http://localhost:8080",
      "/notification-service": "http://localhost:8080",
      "/auth-service": "http://localhost:8080",
    },
  },
});