import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, '../Web/src'),
      '@testUtils': path.resolve(__dirname, 'web/_testUtils'),
      '@shared': path.resolve(__dirname, 'shared'),
      // Web/src imports these as bare specifiers and would resolve them against
      // Web/node_modules, while a `vi.mock('pino', ...)` in a Test/ file resolves
      // against Test/node_modules — two different module ids means the mock would
      // silently never match. Pin BOTH sides to Test's own copies (declared in
      // Test/package.json) so the suite is fully self-contained in CI: only
      // `cd Test && npm ci` is required — Web/node_modules need NOT be installed.
      // Every one of these packages is vi.mock'd in the tests, so their real code
      // never executes and version drift between Test/ and Web/ is irrelevant.
      pino: path.resolve(__dirname, 'node_modules/pino'),
      redis: path.resolve(__dirname, 'node_modules/redis'),
      amqplib: path.resolve(__dirname, 'node_modules/amqplib'),
      outers: path.resolve(__dirname, 'node_modules/outers'),
      mongodb: path.resolve(__dirname, 'node_modules/mongodb'),
    },
  },
  test: {
    name: 'web',
    root: __dirname,
    include: ['web/**/*.test.ts'],
    environment: 'node',
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./shared/setup/vitest.setup.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/web',
      // Web/src is a sibling of Test/ (test.root), not a descendant — v8's
      // provider excludes anything outside root as "external" unless told
      // otherwise, which would silently drop every source file from the report.
      // `include` (with these globs) is what pulls in uncovered files too.
      allowExternal: true,
      include: [path.resolve(__dirname, '../Web/src/**/*.ts')],
      exclude: [path.resolve(__dirname, '../Web/src/**/*.d.ts')],
      reporter: ['text', 'html'],
    },
  },
});
