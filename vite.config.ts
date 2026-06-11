import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const devHost = process.env.VITE_DEV_HOST ?? '0.0.0.0';
const devPort = Number(process.env.VITE_DEV_PORT ?? 5173);
const previewHost = process.env.APP_HOST ?? devHost;
const previewPort = Number(process.env.APP_PORT ?? 4173);
const basePath = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: devHost,
    port: devPort
  },
  preview: {
    host: previewHost,
    port: previewPort
  },
  test: {
    environment: 'node',
    globals: true
  }
});
