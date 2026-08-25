import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' && !process.env.NETLIFY ? '/bolman_web_dashboard/' : '/',
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
}));
