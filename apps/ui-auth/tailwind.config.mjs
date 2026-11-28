import path from 'path'
import { defineConfig as defineViteConfig, mergeConfig } from 'vite'
import { defineConfig as defineVitestConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

const vitestConfig = defineVitestConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

export default defineViteConfig(() => mergeConfig({
  plugins: [
    react({
      babel: {
        plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
      },
    }),
    tailwindcss(),
    TanStackRouterVite(),
    tsconfigPaths(),
  ],

  // Load .env.test from monorepo root
  envDir: path.resolve(__dirname, '../..'),
  envPrefix: 'VITE_',

  server: {
    port: 5175,
    strictPort: false,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  build: {
    rollupOptions: {
      external: ['@tanstack/react-router-devtools'],
    },
  },
  // optimizeDeps: {
  //   exclude: ['class-transformer'],
  // },
}, vitestConfig))
