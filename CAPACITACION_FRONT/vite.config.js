import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(), '');
  
  return {
    plugins: [react()],
    server: {
      host: env.VITE_FRONTEND_HOST,
      port: parseInt(env.VITE_FRONTEND_PORT),
      // Sin proxy - todas las llamadas van directamente al backend
    }
  };
});
