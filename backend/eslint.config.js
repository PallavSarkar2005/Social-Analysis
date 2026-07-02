import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-undef": "error",
    },
  },

  {
    ignores: [
      "node_modules/**",
      "storage/**",
      "coverage/**",
      "tests/**",
      "tmp/**",
    ],
  },
];
