import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/views/office-list/office-list.jsx"),
      output: {
        entryFileNames: "office-list.js",
        assetFileNames: "office-list.css",
        inlineDynamicImports: true,
      },
    },
  },
});
