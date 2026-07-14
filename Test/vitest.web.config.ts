import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, '../Web/src'),
      '@testUtils': path.resolve(__dirname, 'web/_testUtils'),
      '@shared': path.resolve(__dirname, 'shared'),
      // Points straight at the shared/ package's TS source (same principle as
      // @server/@web) so the suite never needs shared/ built or installed.
      // Not named @shared - that alias already means Test/shared/setup/.
      '@nexoralShared': path.resolve(__dirname, '../shared/source'),
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
      // `.d.ts` plus type-only source files. A file that declares ONLY
      // interfaces/types (e.g. IDNSIOHandler.ts) emits zero runtime JS, so no
      // test ever imports it. v8 then treats it as an "uncovered" file and hands
      // the raw `.ts` to rolldown WITHOUT the TS transform — `export interface`
      // is not valid JS, so it throws "Unexpected token" and aborts the report.
      // Excluding is correct, not a workaround: pure type files have 0
      // executable statements, so there is literally nothing to cover.
      exclude: [
        path.resolve(__dirname, '../Web/src/**/*.d.ts'),
        path.resolve(__dirname, '../Web/src/utilities/IDNSIOHandler.ts'),
      ],
      reporter: ['text', 'html'],
    },
  },
});
