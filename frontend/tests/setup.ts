import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

/* ------------------------------------------------------------------ */
/* Browser APIs jsdom does not implement                               */
/* ------------------------------------------------------------------ */

/** Used by the viewer to defer loading until a card scrolls into view. */
class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

if (!window.matchMedia) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  );
}

/**
 * A minimal WebGL context. Nothing in the component suite renders 3D — the
 * viewer is aliased to a stub — but three.js probes for a context at import
 * time in a few places, and a null return there throws.
 */
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

window.scrollTo = vi.fn();
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

/* ------------------------------------------------------------------ */
/* Network                                                             */
/* ------------------------------------------------------------------ */

beforeAll(() => {
  // `error` rather than `warn`: an unhandled request means the test is talking
  // to something nobody stubbed, which is exactly what should fail loudly.
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
  window.localStorage.clear();
});

afterAll(() => {
  server.close();
});
