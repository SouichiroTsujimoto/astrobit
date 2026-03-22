import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    integration: 'integration.ts',
    client: 'client.ts',
    server: 'server.ts',
  },
  format: ['esm'],
  dts: true,
  external: ['astro', 'vite'],
  clean: true,
})
