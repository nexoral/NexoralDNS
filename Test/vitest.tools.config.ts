import { defineConfig } from 'vitest/config';
import path from 'node:path';

// NOTE: tools/ test suites are not implemented yet (out of scope for now).
// passWithNoTests keeps `npm run test:tools` (and the chained `npm test`)
// green until Test/tools/**/*.test.ts is populated in a future pass.
export default defineConfig({
  resolve: {
    alias: {
      '@tools': path.resolve(__dirname, '../tools'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  test: {
    name: 'tools',
    root: __dirname,
    include: ['tools/**/*.test.ts'],
    environment: 'node',
    globals: true,
    passWithNoTests: true,
  },
});
