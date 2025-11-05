import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        "office-list": resolve(__dirname, "src/views/office-list/office-list.html"),
        "office-details": resolve(__dirname, "src/views/office-details/office-details.html"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "[name].css";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
