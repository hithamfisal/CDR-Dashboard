import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.CDR_API_PORT || process.env.CDR_API_PORT || "4100";
  const apiProxyTarget =
    env.CDR_API_PROXY_TARGET || process.env.CDR_API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`;

  return {
    base: "./",
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },

    build: {
      chunkSizeWarningLimit: 2600,
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ["recharts"],
            spreadsheet: ["exceljs"],
            exports: ["jspdf", "pptxgenjs", "html2canvas", "jszip"],
          },
        },
      },
    },
  };
});
