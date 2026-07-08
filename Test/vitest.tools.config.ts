import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@tools': path.resolve(__dirname, '../tools'),
      '@shared': path.resolve(__dirname, 'shared'),
      // tools/source/tools/register*.ts build their zod input schemas at import
      // time, so `zod` must resolve at runtime. In CI only Test/ deps are
      // installed (`cd Test && npm ci`) — tools/node_modules does NOT exist — so
      // `zod` is a Test/ devDep and pinned here to Test's own copy, keeping the
      // suite fully self-contained (same principle as the pino/redis/... aliases
      // in vitest.web.config.ts). Every OTHER runtime import in the covered files
      // is either a Node built-in, `pino` (a Test/ devDep), or
      // `@modelcontextprotocol/sdk` — and the SDK is only ever imported for its
      // TYPES, which the TS transform strips, so it is never needed at runtime
      // and deliberately not aliased.
      zod: path.resolve(__dirname, 'node_modules/zod'),
      // logger.ts imports bare `pino`, which would resolve against tools/node_modules,
      // while `vi.mock('pino')` in a Test/ file resolves against Test/node_modules —
      // two module ids means the mock silently never matches. Pin both to Test's own
      // copy (a Test/ devDep) so the mock applies (same fix as vitest.web.config.ts).
      pino: path.resolve(__dirname, 'node_modules/pino'),
    },
  },
  test: {
    name: 'tools',
    root: __dirname,
    include: ['tools/**/*.test.ts'],
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
      reportsDirectory: './coverage/tools',
      // tools/source is a sibling of Test/ (test.root), not a descendant — v8
      // treats anything outside root as "external" and would silently drop every
      // source file, so allowExternal + an explicit include glob are required
      // (same reasoning as vitest.web.config.ts).
      allowExternal: true,
      include: [path.resolve(__dirname, '../tools/source/**/*.ts')],
      exclude: [
        path.resolve(__dirname, '../tools/source/**/*.d.ts'),
        // The process entrypoint: it starts an HTTP server (`httpServer.listen`)
        // and installs SIGINT/SIGTERM handlers at import time, and exposes no
        // handle to close them — importing it into a unit test would leak an open
        // server/port and dangling process listeners. It is thin composition over
        // the fully-tested client/session/tools layers; its private helpers (host
        // allowlist, password redaction) would need extraction into a side-effect
        // -free module to be unit-tested, tracked as a follow-up.
        path.resolve(__dirname, '../tools/source/index.ts'),
      ],
      reporter: ['text', 'html'],
    },
  },
});
