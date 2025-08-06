import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import hooksPlugin from "eslint-plugin-react-hooks";
import refreshPlugin from "eslint-plugin-react-refresh";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": hooksPlugin,
      "react-refresh": refreshPlugin,
    },
    rules: {
        ...hooksPlugin.configs.recommended.rules,
        "react-refresh/only-export-components": "warn",
    },
  },
];