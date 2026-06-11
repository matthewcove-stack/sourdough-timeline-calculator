var _a, _b, _c, _d, _e;
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
var devHost = (_a = process.env.VITE_DEV_HOST) !== null && _a !== void 0 ? _a : '0.0.0.0';
var devPort = Number((_b = process.env.VITE_DEV_PORT) !== null && _b !== void 0 ? _b : 5173);
var previewHost = (_c = process.env.APP_HOST) !== null && _c !== void 0 ? _c : devHost;
var previewPort = Number((_d = process.env.APP_PORT) !== null && _d !== void 0 ? _d : 4173);
var basePath = (_e = process.env.VITE_BASE_PATH) !== null && _e !== void 0 ? _e : '/';
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
