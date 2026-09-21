import { describe, expect, it } from 'vitest';
import Springs from '../../src/core/springs';
import { curvePath, demos, dials, springPresets } from './motion';

/**
 * The showcase's whole claim is that what it draws is what the CSS receives, so every figure on it is
 * held to `Springs` rather than to a copy of it. A failure here is the page having gone stale.
 */
describe('the motion showcase', () => {
  it('opens the playground on the spring the library itself defaults to', () => {
    const tuning = Object.fromEntries(dials.map((dial) => [dial.key, dial.initial]));

    expect(Springs.spring(tuning)).toEqual(Springs.spring());
  });

  it('starts every dial inside its own range', () => {
    for (const dial of dials) {
      expect(dial.initial).toBeGreaterThanOrEqual(dial.min);
      expect(dial.initial).toBeLessThanOrEqual(dial.max);
    }
  });

  it('draws every preset the engine ships, and no name it does not', () => {
    expect([...springPresets]).toEqual([...Springs.presetNames]);
  });

  it('draws the curve the CSS gets, one point per sample', () => {
    const { easing } = Springs.spring();
    const samples = easing.slice('linear('.length, -1).split(',').length;

    expect(curvePath(easing).split(' ')).toHaveLength(samples);
  });

  // Time runs left to right and progress bottom to top, so a curve drawn upside down — the mistake that
  // looks plausible in a 0,0-is-top-left viewBox — puts these two the wrong way round.
  it('starts at rest on the left and arrives at the target on the right', () => {
    const points = curvePath(Springs.spring().easing).split(' ');

    expect(points[0]).toBe('M2.0,88.0');
    expect(points[points.length - 1]).toBe('L98.0,28.0');
  });

  it('names a demo once, so the table of contents has no duplicate link', () => {
    expect(new Set(demos.map((demo) => demo.id)).size).toBe(demos.length);
  });
});
