import { defineConfig } from 'orval';

export default defineConfig({
  users: {
    input: '../../apps/docs/openapi/openapi-users.json',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  organizations: {
    input: '../../apps/docs/openapi/openapi-organizations.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/organizations/endpoints',
      schemas: './src/api/generated/organizations_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  debts: {
    input: '../../apps/docs/openapi/openapi-debts.json',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  debtors: {
    input: '../../apps/docs/openapi/openapi-debtors.json',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  transactions: {
    input: '../../apps/docs/openapi/openapi-transactions.json',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },

  communications: {
    input: '../../apps/docs/openapi/openapi-communications.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/communications/endpoints',
      schemas: './src/api/generated/communications_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },

  collectors: {
    input: '../../apps/docs/openapi/openapi-collectors.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/collectors/endpoints',
      schemas: './src/api/generated/collectors_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  voice: {
    input: '../../apps/docs/openapi/openapi-voice.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/voice/endpoints',
      schemas: './src/api/generated/voice_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  workflows: {
    input: '../../apps/docs/openapi/openapi-workflows.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/workflows/endpoints',
      schemas: './src/api/generated/workflows_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
  audits: {
    input: '../../apps/docs/openapi/openapi-audits.json',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/audits/endpoints',
      schemas: './src/api/generated/audits_models',
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
      afterAllFilesWrite: 'prettier --write --log-level silent',
    },
  },
});
