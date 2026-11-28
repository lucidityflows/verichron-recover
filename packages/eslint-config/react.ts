import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefresh from 'eslint-plugin-react-refresh';
import type { Linter } from 'eslint';

import baseConfig from './index.js';

const config: Linter.FlatConfig[] = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...(react.configs.recommended.rules as Linter.RulesRecord),
      ...(react.configs['jsx-runtime'].rules as Linter.RulesRecord),
      ...reactHooks.configs.recommended.rules,
      ...(jsxA11y.configs.recommended.rules as Linter.RulesRecord),
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];

export default config;