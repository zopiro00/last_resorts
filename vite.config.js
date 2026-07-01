import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Project page lives at /last_resorts/ on GitHub Pages; dev stays at /.
  base: command === 'build' ? '/last_resorts/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
}));
