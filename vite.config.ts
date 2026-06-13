import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react()],
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



