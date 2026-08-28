import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      // Aliased before the broader '@infrastructure' entry so it wins.
      '@infrastructure/auth/supabase-client': path.resolve(
        __dirname,
        'tests/stubs/supabase-client.ts'
      ),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      // The 3D viewer is swapped for a light stand-in across the whole component
      // suite. jsdom has no WebGL context, and the viewer's real behaviour is a
      // rendering concern that component tests cannot observe anyway — what the
      // tests care about is the props the pages hand it.
      '@presentation/components/lazy-monument-viewer': path.resolve(
        __dirname,
        'tests/stubs/lazy-monument-viewer.tsx'
      ),
      '@presentation': path.resolve(__dirname, 'src/presentation')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // The developer's own .env must not leak into the suite. A VITE_API_URL
    // pointing at a running backend would send every request to a real server
    // instead of to the handlers, and the level would stop being hermetic.
    env: { VITE_API_URL: '' },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    restoreMocks: true,
    clearMocks: true,
    css: false
  }
});
