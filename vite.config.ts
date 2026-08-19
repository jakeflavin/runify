import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Served from a sub-path of the portfolio's Hosting site.
  base: '/runify/',
  plugins: [react()],
  server: {
    // Honour a port handed down by the environment, so a preview harness that assigns one
    // gets the server where it expects it. Falls back to Vite's own default otherwise.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },

})
