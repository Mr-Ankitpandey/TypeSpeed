import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { configuredOrigin } from './src/lib/seo';
export default defineConfig({
  plugins: [react(), tailwind()],
  define: {
    'import.meta.env.VITE_NOINDEX': JSON.stringify(
      !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production',
    ),
    'import.meta.env.VITE_SITE_URL': JSON.stringify(
      configuredOrigin(process.env),
    ),
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/socket.io': { target: 'http://127.0.0.1:3001', ws: true } },
  },
});
