import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const websiteRoot = fileURLToPath(new URL('.', import.meta.url));
const configuredBase = process.env.VITE_BASE_PATH;
const base = configuredBase ? (configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`) : './';

export default defineConfig({
  root: websiteRoot,
  base,
  publicDir: path.resolve(websiteRoot, '../public'),
  plugins: [react()],
  build: { outDir: path.resolve(websiteRoot, 'dist'), emptyOutDir: true },
});