import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const wasmFiles = ['mtcute.wasm', 'mtcute-simd.wasm'];

export default defineConfig({
  root: resolve(process.cwd(), 'shared-login'),
  base: '/shared-login/',
  build: {
    outDir: resolve(process.cwd(), 'public/shared-login'),
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [{
    name: 'copy-mtcute-wasm-assets',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'public/shared-login');
      mkdirSync(outDir, { recursive: true });
      for (const file of wasmFiles) {
        const source = require.resolve('@mtcute/wasm/' + file);
        copyFileSync(source, resolve(outDir, file));
      }
    },
  }],
});
