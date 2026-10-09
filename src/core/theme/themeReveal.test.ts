import { afterEach, describe, expect, it, vi } from 'vitest';
import reveal, { revealOrigin, revealRadius, watchPresses } from './themeReveal';
import transitionTheme, { prepareReveal } from './themeTransition';

type Doc = Record<'startViewTransition', unknown>;

/** A `startViewTransition` that runs the update at once and settles `ready`/`finished` when told to. */
function stubViewTransition() {
  let settle = () => {};
  const done = new Promise<void>((resolve) => (settle = resolve));
  const start = vi.fn((update: () => void) => {
    update();

    return { ready: done, finished: done, updateCallbackDone: Promise.resolve(), skipTransition: vi.fn() };
  });
  (document as unknown as Doc).startViewTransition = start;

  return { start, settle: async () => (settle(), await done) };
}

// happy-dom cannot parse the view-transition pseudo-elements, so the sheet is counted rather than read.
const revealSheets = () => document.head.querySelectorAll('style:not([id])').length;

describe('themeReveal', () => {
  afterEach(() => {
    delete (document as unknown as Partial<Doc>).startViewTransition;
    vi.restoreAllMocks();
    (document.activeElement as HTMLElement | null)?.blur?.();
  });

  it('reaches the farthest corner from the origin', () => {
    expect(revealRadius({ x: 0, y: 0 }, 300, 400)).toBe(500);
    expect(revealRadius({ x: 150, y: 200 }, 300, 400)).toBe(250);
  });

  it('grows from the press that asked for it, else the focused control, else the middle', () => {
    expect(revealOrigin(document)).toEqual({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const button = document.createElement('button');
    document.body.append(button);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 40, height: 20 } as DOMRect);
    button.focus();

    expect(revealOrigin(document)).toEqual({ x: 30, y: 30 });

    const unwatch = watchPresses();
    button.dispatchEvent(new PointerEvent('pointerdown', { clientX: 12, clientY: 24, bubbles: true }));

    expect(revealOrigin(document)).toMatchObject({ x: 12, y: 24 });

    unwatch();
    button.remove();
  });

  it('reveals with the cross-fade off for that transition only', async () => {
    const transition = stubViewTransition();
    const animate = vi.fn();
    document.documentElement.animate = animate;

    reveal(vi.fn());

    expect(revealSheets()).toBe(1);

    await transition.settle();

    expect(animate).toHaveBeenCalledWith(
      { clipPath: [expect.stringMatching(/^circle\(0px at /), expect.stringMatching(/^circle\(\d+px at /)] },
      expect.objectContaining({ pseudoElement: '::view-transition-new(root)' }),
    );
    expect(revealSheets()).toBe(0);
  });

  it('still applies the change where there are no view transitions, and leaves nothing behind', () => {
    const update = vi.fn();

    reveal(update);

    expect(update).toHaveBeenCalledOnce();
    expect(revealSheets()).toBe(0);
  });
});

describe('themeTransition', () => {
  afterEach(() => {
    delete (document as unknown as Partial<Doc>).startViewTransition;
  });

  it('cross-fades until the reveal has been fetched, and reveals after', async () => {
    const transition = stubViewTransition();

    transitionTheme(vi.fn(), 'reveal');

    expect(revealSheets()).toBe(0);

    const stop = prepareReveal();
    await vi.dynamicImportSettled();
    transitionTheme(vi.fn(), 'reveal');

    expect(revealSheets()).toBe(1);

    await transition.settle();
    stop();
  });

  it('never reveals a fade', async () => {
    const transition = stubViewTransition();
    const stop = prepareReveal();
    await vi.dynamicImportSettled();

    transitionTheme(vi.fn(), 'fade');

    expect(revealSheets()).toBe(0);
    await transition.settle();
    stop();
  });
});
