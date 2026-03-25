import js from "@eslint/js";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  {
    ignores: ["frontend/dist/**"],
  },
  {
    files: ["frontend/**/*.{js,mjs,cjs,jsx}"],
    ignores: ["frontend/build.js"],
    extends: [eslintReact.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: [
      "backend/**/*.{js,mjs,cjs,jsx}",
      "experience-edge-client/**/*.{js,mjs,cjs,jsx}",
      "frontend/build.js",
    ],
    plugins: { js },
    languageOptions: { globals: globals.node },
  },
]);
