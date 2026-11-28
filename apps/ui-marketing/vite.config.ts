import path from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],

  // Load .env.test from monorepo root
  envDir: path.resolve(__dirname, '../..'),
  envPrefix: 'VITE_',

  server: {
    port: 5178,
    strictPort: false,
  },

  resolve: {
    alias: {
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
