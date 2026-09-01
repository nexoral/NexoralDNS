import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@dhcp': path.resolve(__dirname, '../DHCP'),
      '@shared': path.resolve(__dirname, 'shared'),
      // DHCP/src imports `nexoraldns-shared` as a bare specifier — pin to source
      // so the suite never needs shared/ built or installed (same as server config).
      'nexoraldns-shared': path.resolve(__dirname, '../shared/source/index.ts'),
      // Pin runtime deps to Test/'s own copies so CI works without DHCP/node_modules.
      redis: path.resolve(__dirname, 'node_modules/redis'),
    },
  },
  test: {
    name: 'dhcp',
    root: __dirname,
    include: ['dhcp/**/*.test.ts'],
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
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/dhcp',
      allowExternal: true,
      include: [path.resolve(__dirname, '../DHCP/src/**/*.ts')],
      exclude: [
        path.resolve(__dirname, '../DHCP/src/**/*.d.ts'),
        // Side-effectful entrypoint: connects Redis and starts IP scanning at
        // import time with no teardown handle — importing it leaks connections.
        path.resolve(__dirname, '../DHCP/src/config/DHCP.ts'),
      ],
      reporter: ['text', 'html'],
    },
  },
});
