import { afterEach, describe, expect, it, vi } from 'vitest';
import startViewTransition from './viewTransition';

// `lib.dom` types `startViewTransition` on `Document`, so the stub goes on through a record view of it
// rather than by widening the real property.
type Doc = Record<'startViewTransition', unknown>;

/** A browser's `startViewTransition`, with the three promises a caller waits on. */
function installApi(options: { objectForm?: boolean } = {}) {
  const calls: unknown[] = [];
  const skipTransition = vi.fn();

  (document as unknown as Doc).startViewTransition = (argument: unknown) => {
    calls.push(argument);

    if (!options.objectForm && typeof argument !== 'function') throw new TypeError('not a function');

    const update = typeof argument === 'function' ? argument : (argument as { update: () => unknown }).update;
    const updateCallbackDone = Promise.resolve(update()).then(() => undefined);

    return { ready: updateCallbackDone, finished: updateCallbackDone, updateCallbackDone, skipTransition };
  };

  return { calls, skipTransition };
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reduce,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  delete (document as unknown as Partial<Doc>).startViewTransition;
  vi.restoreAllMocks();
});

describe('startViewTransition', () => {
  it('runs the update and reports no transition where the browser has no API', async () => {
    setReducedMotion(false);
    const update = vi.fn();

    const handle = startViewTransition(update);

    expect(update).toHaveBeenCalledOnce();
    expect(handle.transitioned).toBe(false);
    await expect(handle.finished).resolves.toBeUndefined();
    expect(() => handle.skip()).not.toThrow();
  });

  it('hands back the browser‘s own promises when it has one', async () => {
    setReducedMotion(false);
    const { skipTransition } = installApi();
    const update = vi.fn();

    const handle = startViewTransition(update);

    expect(handle.transitioned).toBe(true);
    await handle.finished;
    expect(update).toHaveBeenCalledOnce();

    handle.skip();
    expect(skipTransition).toHaveBeenCalledOnce();
  });

  // A view transition is a whole-page cross-fade, which is exactly the motion the preference is about —
  // so the default skips it. The update still runs: the new state has to appear either way.
  it('skips the transition under reduced motion and still applies the update', async () => {
    setReducedMotion(true);
    const { calls } = installApi();
    const update = vi.fn();

    const handle = startViewTransition(update);

    expect(calls).toHaveLength(0);
    expect(update).toHaveBeenCalledOnce();
    expect(handle.transitioned).toBe(false);
  });

  it('transitions anyway when the caller says the change is unreadable without it', () => {
    setReducedMotion(true);
    installApi();

    expect(startViewTransition(vi.fn(), { reducedMotion: 'play' }).transitioned).toBe(true);
  });

  it('passes types through as the object form the newer API takes', async () => {
    setReducedMotion(false);
    const { calls } = installApi({ objectForm: true });

    await startViewTransition(vi.fn(), { types: ['forward'] }).finished;

    expect(calls[0]).toMatchObject({ types: ['forward'] });
  });

  // The browsers that shipped the API before types treat that object as the callback and throw, which
  // would otherwise turn an optional enhancement into a broken update.
  it('falls back to the callback form where the object form throws', async () => {
    setReducedMotion(false);
    const { calls } = installApi({ objectForm: false });
    const update = vi.fn();

    const handle = startViewTransition(update, { types: ['forward'] });

    await handle.finished;
    expect(calls).toHaveLength(2);
    expect(typeof calls[1]).toBe('function');
    expect(update).toHaveBeenCalledOnce();
  });

  it('awaits an update that returns a promise before resolving', async () => {
    setReducedMotion(false);
    let resolved = false;

    const handle = startViewTransition(async () => {
      await Promise.resolve();
      resolved = true;
    });

    await handle.updateCallbackDone;
    expect(resolved).toBe(true);
  });
});
