import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        base: command === 'build' && !process.env.NETLIFY ? '/bolman_web_dashboard/' : '/',
        plugins: [react()],
        server: {
            allowedHosts: true,
        },
    });
});
