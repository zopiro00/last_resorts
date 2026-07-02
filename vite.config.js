import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Base path differs per host:
  //  - GitHub Pages project site is served under /last_resorts/
  //  - Netlify serves at the domain root (Netlify sets NETLIFY=true at build)
  //  - dev server always runs at /
  base:
    command === 'build'
      ? process.env.NETLIFY
        ? '/'
        : '/last_resorts/'
      : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
}));
