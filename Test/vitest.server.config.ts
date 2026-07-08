import { defineConfig } from 'vitest/config';
import path from 'node:path';

// NOTE: server/ test suites are not implemented yet (out of scope for now).
// passWithNoTests keeps `npm run test:server` (and the chained `npm test`)
// green until Test/server/**/*.test.ts is populated in a future pass.
export default defineConfig({
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, '../server'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  test: {
    name: 'server',
    root: __dirname,
    include: ['server/**/*.test.ts'],
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
});
