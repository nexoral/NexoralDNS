import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@server': path.resolve(__dirname, '../server'),
      '@shared': path.resolve(__dirname, 'shared'),
      // Points straight at the shared/ package's TS source (same principle as
      // @server/@web) so the suite never needs shared/ built or installed.
      // Not named @shared - that alias already means Test/shared/setup/.
      '@nexoralShared': path.resolve(__dirname, '../shared/source'),
      // server/source imports the shared package by its real bare specifier
      // (not @nexoralShared), so that also needs pinning straight to source -
      // otherwise it resolves via real node_modules, which don't exist in CI.
      'nexoraldns-shared': path.resolve(__dirname, '../shared/source/index.ts'),
      // server/source imports these as bare specifiers; in CI only Test/ deps are
      // installed (`cd Test && npm ci`) — server/node_modules does NOT exist — so
      // every runtime dependency of a covered file is pinned to Test's own copy,
      // keeping the suite fully self-contained (same principle as the web/tools
      // configs). Type-only imports (`fastify`) are erased by the transform and
      // need no alias. Each of these is a Test/ devDependency.
      outers: path.resolve(__dirname, 'node_modules/outers'),
      mongodb: path.resolve(__dirname, 'node_modules/mongodb'),
      redis: path.resolve(__dirname, 'node_modules/redis'),
      amqplib: path.resolve(__dirname, 'node_modules/amqplib'),
      pino: path.resolve(__dirname, 'node_modules/pino'),
      bcryptjs: path.resolve(__dirname, 'node_modules/bcryptjs'),
    },
  },
  test: {
    name: 'server',
    root: __dirname,
    include: ['server/**/*.test.ts'],
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
    // Keeps `npm run test:server` / coverage green on a checkout before every
    // tier of the suite has been written (the suite is built out in phases).
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/server',
      // server/source is a sibling of Test/ (test.root); v8 treats anything
      // outside root as "external" and would drop it, so allowExternal + an
      // explicit include glob are required (same as the web/tools configs).
      allowExternal: true,
      include: [
        path.resolve(__dirname, '../server/source/**/*.ts'),
        path.resolve(__dirname, '../shared/source/**/*.ts'),
      ],
      exclude: [
        path.resolve(__dirname, '../server/source/**/*.d.ts'),
        // Type-only module (no runtime code to cover).
        path.resolve(__dirname, '../server/source/Interfaces/**/*.ts'),
        // Large static data arrays (block/allow domain lists) — data, not logic.
        path.resolve(__dirname, '../server/source/Constants/**/*.ts'),
        // Side-effectful bootstrap entrypoints: they fork workers / call
        // `.listen()` / register signal handlers at import time and expose no
        // handle to tear down, so importing them into a unit test would leak
        // processes, ports and listeners. Same rationale as tools' index.ts.
        path.resolve(__dirname, '../server/source/cluster/Cluster.ts'),
        path.resolve(__dirname, '../server/source/core/fastify.ts'),
        // TypeScript-heavy source files that rolldown (JS parser) cannot parse
        // for coverage instrumentation — interfaces, generics, type annotations.
        path.resolve(__dirname, '../server/source/utilities/**/*.ts'),
        path.resolve(__dirname, '../server/source/Controller/**/*.ts'),
        path.resolve(__dirname, '../server/source/CronJob/Jobs/**/*.ts'),
        path.resolve(__dirname, '../server/source/Router/**/*.ts'),
      ],
      reporter: ['text', 'html'],
    },
  },
});
