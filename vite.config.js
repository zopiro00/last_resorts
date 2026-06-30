import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Project page lives at /Cloud-Gardens/ on GitHub Pages; dev stays at /.
  base: command === 'build' ? '/Cloud-Gardens/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
}));
