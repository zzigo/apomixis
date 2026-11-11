import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { createHylonHandler } from './tools/serve.mjs';
export default defineConfig({
  root: 'apps/hylon', base: './',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4173, strictPort: true, fs: { strict: true }, watch: { ignored: ['**/.local/**'] } },
  plugins: [{ name: 'hylon-local-instruments', configureServer(server) {
    const handler = createHylonHandler({ instrumentRoot: process.env.HYLON_KLAIS_DIR ? resolve(process.env.HYLON_KLAIS_DIR) : resolve('.local/klais') });
    server.middlewares.use((req, res, next) => { if (req.url?.startsWith('/instruments/klais/')) return handler(req, res); next(); });
  } }]
});
