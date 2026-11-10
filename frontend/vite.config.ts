import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// In dev, /api is proxied to the Express server. The port is read from the
// project-root .env (PORT=...) so you only ever change it in one place.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const target = process.env.VITE_API_PROXY || `http://127.0.0.1:${env.PORT || 5050}`;
  return {
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: false,
      target: "es2022",
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks cache across deploys; app code changes more often.
          codeSplitting: { groups: [
            { name: "vendor-react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 20 },
            { name: "vendor-motion", test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/, priority: 20 },
          ] },
        },
      },
    },
    server: { port: 5173, proxy: { "/api": { target, changeOrigin: true } } },
  };
});
