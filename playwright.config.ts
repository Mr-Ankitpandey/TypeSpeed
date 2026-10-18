import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testIgnore: '**/offline.spec.ts',
  timeout: 100_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'node node_modules/vite/bin/vite.js --config apps/web/vite.config.ts apps/web --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
    },
    {
      command: 'node node_modules/tsx/dist/cli.mjs apps/server/src/index.ts',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: true,
    },
  ],
});
