import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const tauriDevHost = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.TAURI_DEV_HOST;

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
