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

/** `element.animate` on the root, which happy-dom does not have. */
function spyOnAnimate() {
  const animate = vi.fn((_keyframes: Record<string, unknown[]>, _options: { pseudoElement?: string }) => undefined);
  document.documentElement.animate = animate as unknown as Element['animate'];

  return animate;
}

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

  it('holds both screenshots over the browser cross-fade and grows the new one from the press', async () => {
    const transition = stubViewTransition();
    const animate = spyOnAnimate();

    reveal(vi.fn());
    await transition.settle();

    const pseudoElements = animate.mock.calls.map(([, options]) => options.pseudoElement);
    expect(pseudoElements).toEqual(['::view-transition-old(root)', '::view-transition-new(root)']);
    expect(animate.mock.calls[0][0]).toEqual({ opacity: [1, 1], mixBlendMode: ['normal', 'normal'] });
    expect(animate.mock.calls[1][0].clipPath).toEqual([
      expect.stringMatching(/^circle\(0px at /),
      expect.stringMatching(/^circle\(\d+px at /),
    ]);
  });

  it('writes no stylesheet, which would restyle the whole page on the press (bug #244)', async () => {
    const transition = stubViewTransition();
    spyOnAnimate();
    const sheets = document.head.querySelectorAll('style').length;

    reveal(vi.fn());

    expect(document.head.querySelectorAll('style').length).toBe(sheets);
    await transition.settle();
  });

  it('still applies the change where there are no view transitions', () => {
    const update = vi.fn();
    const animate = spyOnAnimate();

    reveal(update);

    expect(update).toHaveBeenCalledOnce();
    expect(animate).not.toHaveBeenCalled();
  });
});

describe('themeTransition', () => {
  afterEach(() => {
    delete (document as unknown as Partial<Doc>).startViewTransition;
  });

  it('cross-fades until the reveal has been fetched, and reveals after', async () => {
    let transition = stubViewTransition();
    const animate = spyOnAnimate();

    transitionTheme(vi.fn(), 'reveal');
    await transition.settle();

    expect(animate).not.toHaveBeenCalled();

    const stop = prepareReveal();
    await vi.dynamicImportSettled();
    transition = stubViewTransition();
    transitionTheme(vi.fn(), 'reveal');
    await transition.settle();

    expect(animate).toHaveBeenCalled();
    stop();
  });

  it('never reveals a fade', async () => {
    const transition = stubViewTransition();
    const animate = spyOnAnimate();
    const stop = prepareReveal();
    await vi.dynamicImportSettled();

    transitionTheme(vi.fn(), 'fade');
    await transition.settle();

    expect(animate).not.toHaveBeenCalled();
    stop();
  });
});
