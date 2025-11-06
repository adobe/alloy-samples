import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/views/office-details/office-details.jsx"),
      output: {
        entryFileNames: "office-details.js",
        assetFileNames: "office-details.css",
        inlineDynamicImports: true,
      },
    },
  },
});
