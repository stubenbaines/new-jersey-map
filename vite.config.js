var _a, _b;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var tauriDevHost = (_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.TAURI_DEV_HOST;
export default defineConfig({
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    plugins: [react()],
    server: {
        host: tauriDevHost || undefined,
        port: 1420,
        strictPort: true,
    },
});
