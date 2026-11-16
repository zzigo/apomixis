import { hylonLivePlugin } from './tools/hylon-live.mjs';
import { hylonRemotePlugin } from './tools/hylon-remote.mjs';
import { hylonSettingsPlugin } from './tools/hylon-settings.mjs';
import { hylonRecordingsPlugin } from './tools/hylon-recordings.mjs';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { createHylonHandler } from './tools/serve.mjs';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig({
  root: 'apps/hylon', base: './',
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4173, strictPort: true, fs: { strict: true }, watch: { ignored: ['**/.local/**'] } },
  plugins: [hylonSettingsPlugin(), hylonRecordingsPlugin(), hylonRemotePlugin(), hylonLivePlugin(), { name: 'hylon-version', transformIndexHtml(html, context) { return html.replaceAll('__HYLON_VERSION__', `${version} ${context.server ? 'DEV' : 'BUILD'}`); } }, { name: 'hylon-local-instruments', configureServer(server) {
    const handler = createHylonHandler({ instrumentRoot: process.env.HYLON_KLAIS_DIR ? resolve(process.env.HYLON_KLAIS_DIR) : resolve('.local/klais') });
    server.middlewares.use((req, res, next) => { if (req.url?.startsWith('/instruments/klais/')) return handler(req, res); next(); });
  } }]
});
