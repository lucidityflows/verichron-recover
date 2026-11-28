import path from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['@babel/plugin-proposal-decorators', { legacy: true }]],
      },
    }),
    TanStackRouterVite(),
  ],

  // Load .env.test from monorepo root
  envDir: path.resolve(__dirname, '../..'),
  envPrefix: 'VITE_',

  server: {
    port: 5173,
    strictPort: false,
  },

  build: {
    rollupOptions: {
      external: ['@tanstack/react-router-devtools'],
    },
  },
})
