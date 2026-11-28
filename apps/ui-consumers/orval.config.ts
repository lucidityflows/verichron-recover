import { defineConfig } from 'orval';

export default defineConfig({
  users: {
    input: '../docs/openapi/openapi-users.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/users/endpoints',
      schemas: './src/api/generated/users_models',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/api/custom-client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  debtors: {
    input: '../docs/openapi/openapi-debtors.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/debtors/endpoints',
      schemas: './src/api/generated/debtors_models',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/api/custom-client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  debts: {
    input: '../docs/openapi/openapi-debts.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/debts/endpoints',
      schemas: './src/api/generated/debts_models',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/api/custom-client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
  transactions: {
    input: '../docs/openapi/openapi-transactions.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/transactions/endpoints',
      schemas: './src/api/generated/transactions_models',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/api/custom-client.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
