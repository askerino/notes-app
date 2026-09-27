import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import boundaries from "eslint-plugin-boundaries";
import playwright from "eslint-plugin-playwright";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import testingLibrary from "eslint-plugin-testing-library";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.app.json" },
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "pages", pattern: "src/pages" },
        { type: "features", pattern: "src/features/*", capture: ["feature"] },
        { type: "shared", pattern: ["src/api", "src/components", "src/hooks", "src/lib"] },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            {
              from: { element: { type: "app" } },
              disallow: { to: { element: { type: "features" } } },
            },
            {
              from: { element: { type: "pages" } },
              disallow: { to: { element: { type: "app" } } },
            },
            {
              from: { element: { type: "features" } },
              disallow: { to: { element: { types: { anyOf: ["app", "pages", "features"] } } } },
            },
            {
              from: { element: { type: "shared" } },
              disallow: { to: { element: { types: { anyOf: ["app", "pages", "features"] } } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}"],
    extends: [testingLibrary.configs["flat/react"]],
  },
  {
    files: ["tests/e2e/**/*.ts"],
    extends: [playwright.configs["flat/recommended"]],
  },
  eslintConfigPrettier,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      curly: ["error", "all"],
    },
  },
]);
