import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['src/**/*.{js,jsx}', 'vite.config.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, __APP_VERSION__: "readonly" }, // via Vite define
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['api/**/*.js'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // `const { uiOnly, ...rest } = obj` zum Entfernen von Feldern erlauben
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
])
