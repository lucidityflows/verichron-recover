import sharedConfig from '@verichron/eslint-config';

export default [
  ...sharedConfig.map(c => ({
    ...c,
    ...(c.languageOptions?.parserOptions ? {
      languageOptions: {
        ...c.languageOptions,
        parserOptions: {
          ...c.languageOptions.parserOptions,
          tsconfigRootDir: import.meta.dirname,
        }
      }
    } : {})
  })),
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs', 'tailwind.config.mjs', 'src/api/generated/**', 'orval.config.ts'],
  },
  {
    rules: {
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
];
