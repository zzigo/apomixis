import { defineConfig } from 'vite';
export default defineConfig({ root: 'apps/hylon', base: './', build: { outDir: '../../dist', emptyOutDir: true }, server: { fs: { strict: true } } });
