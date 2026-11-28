/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-misused-promises, @typescript-eslint/no-floating-promises */
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
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs', 'src/migrations/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    },
  },
];
