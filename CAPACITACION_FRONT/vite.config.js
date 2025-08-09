import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // <-- ¡Agrega esto!
    port: 5173,           // <-- ¡Y esto si quieres el puerto por defecto!
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
