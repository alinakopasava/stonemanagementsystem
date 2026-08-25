import { defineConfig } from 'vitest/config';

/**
 * The Row Level Security suite talks to a real Supabase project: it creates
 * throwaway accounts, drives PostgREST directly with their JWTs and deletes
 * them afterwards. It is kept out of the default run on purpose — `npm test`
 * must stay hermetic and offline.
 *
 * Run with:  npm run test:rls
 * Requires:  RLS_TEST_ENABLED=true plus SUPABASE_URL / keys in backend/.env
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.js'],
    // Every case shares one set of seeded accounts; parallel files would race.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000
  }
});
