import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/__mocks__/prisma.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': import.meta.dirname || '.',
    },
  },
});
