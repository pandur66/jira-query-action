const tseslint = require("@typescript-eslint/eslint-plugin")
const tsparser = require("@typescript-eslint/parser")
const prettier = require("eslint-config-prettier")

module.exports = [
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettier,
]
