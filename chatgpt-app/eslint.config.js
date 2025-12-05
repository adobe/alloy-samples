import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  js.configs.recommended,
  {
    ignores: ["frontend/dist/**"],
  },
  {
    ...pluginReact.configs.flat.recommended,
    ...pluginReact.configs.flat["jsx-runtime"],
    files: ["frontend/**/*.{js,mjs,cjs,jsx}"],
    ignores: ["frontend/build.js"],
    plugins: {
      react: pluginReact,
    },
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        process: "readonly",
      },
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReact.configs.flat["jsx-runtime"].rules,
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "detect",
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
