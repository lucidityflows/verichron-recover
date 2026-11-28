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
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs', 'tailwind.config.mjs', 'src/api/generated/**', 'orval.config.ts', 'legacy/**'],
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
      '@typescript-eslint/consistent-type-imports': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/prefer-includes': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
];
