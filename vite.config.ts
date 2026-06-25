import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
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
          spreadsheet: ["xlsx", "exceljs"],
          exports: ["jspdf", "pptxgenjs", "html2canvas", "jszip"]
        }
      }
    }
  }
});



