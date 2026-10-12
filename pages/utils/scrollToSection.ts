let current = () => {};

/**
 * `scrollIntoView` that lands: the code blocks are `content-visibility: auto` and the demos mount as they near the
 * screen, so a far heading can move while the scroll is on its way. Chrome restarts a smooth scroll from rest when it is
 * re-aimed mid-flight, so each leg is let finish and the next starts the moment it ends. Returns a cancel; any input cancels it.
 */
export function scrollToSection(target: Element): () => void {
  current();
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const inputs = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  const deadline = performance.now() + 6000;
  let frame = 0;
  let aimedAt = 0;
  let lastY = NaN;
  let lastTop = NaN;
  let stillSince = 0;

  const offset = () => target.getBoundingClientRect().top - scrollPadding();
  const landed = () => {
    const top = offset();
    const atEnd = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1;

    return Math.abs(top) <= 1 || (atEnd && top > 0);
  };
  const aim = () => {
    aimedAt = performance.now();
    target.scrollIntoView({ behavior, block: 'start' });
  };

  // The leg ended: go again at once if the heading moved while it ran.
  const onScrollEnd = () => {
    if (!landed()) aim();
  };

  // A fallback for a browser with no `scrollend`, and for content that moves after a leg has ended.
  const step = (now: number) => {
    const y = window.scrollY;
    const top = offset();
    if (y !== lastY || Math.abs(top - lastTop) > 1) stillSince = now;
    lastY = y;
    lastTop = top;

    const still = now - stillSince;
    if (now > deadline || (still > 250 && landed())) return stop();
    // Past the moment a new smooth scroll begins to move, so a leg that has not started yet is not taken for one that stopped.
    if (still > 80 && now - aimedAt > 150 && !landed()) aim();

    frame = requestAnimationFrame(step);
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    inputs.forEach((type) => window.removeEventListener(type, stop));
    window.removeEventListener('scrollend', onScrollEnd);
  };

  current = stop;
  inputs.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  window.addEventListener('scrollend', onScrollEnd);
  aim();
  frame = requestAnimationFrame(step);

  return stop;
}

function scrollPadding() {
  return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
}
