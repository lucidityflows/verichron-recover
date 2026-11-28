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
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.mjs'],
  },
];
