import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { browserLogger } from './vite.browser-logger';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const beTarget = env.VITE_BE_PROXY_TARGET || 'http://127.0.0.1:8000';
    return {
        plugins: [react(), browserLogger()],
        server: {
            host: '0.0.0.0',
            port: Number(env.VITE_DEV_PORT) || 5173,
            proxy: {
                '/api': {
                    target: beTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        preview: {
            port: Number(env.VITE_DEV_PORT) || 5173,
            proxy: {
                '/api': {
                    target: beTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
