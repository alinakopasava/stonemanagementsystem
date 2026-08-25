import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Loaded before any test module, so `env.js` sees a complete config and the
    // Supabase SDK is replaced before any route module imports it.
    setupFiles: ['./tests/setup/test-env.js'],
    include: ['tests/**/*.test.js'],
    // The RLS suite talks to a real database and is run by `npm run test:rls`.
    exclude: ['tests/rls/**', 'node_modules/**'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/config/env.js']
    }
  }
});
