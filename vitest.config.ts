import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@songcollector/shared': path.resolve(__dirname, 'shared/src/index.ts') } },
  test: {
    include: ['shared/**/*.test.ts', 'api/**/*.test.ts', 'tests/**/*.test.ts', 'app/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['app/**/*.test.{ts,tsx}', 'jsdom']],
    setupFiles: ['./app/src/test/setup.ts'],
    coverage: { reporter: ['text', 'html'] }
  }
});
