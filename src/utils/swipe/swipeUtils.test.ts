import { describe, expect, it } from 'vitest';
import SwipeUtils from './swipeUtils';

const trays = { start: 80, end: 160 };
const WIDTH = 400;

describe('SwipeUtils', () => {
  describe('intent', () => {
    it('is nothing until the press has moved past the slop', () => {
      expect(SwipeUtils.intent(5, 3)).toBeNull();
    });

    it('is a swipe sideways and a scroll otherwise', () => {
      expect(SwipeUtils.intent(-20, 4)).toBe('swipe');
      expect(SwipeUtils.intent(6, 12)).toBe('scroll');
    });
  });

  describe('offsetFor', () => {
    it('follows the press while a tray opens', () => {
      expect(SwipeUtils.offsetFor(0, -100, trays, WIDTH, false)).toBe(-100);
      expect(SwipeUtils.offsetFor(-160, 40, trays, WIDTH, false)).toBe(-120);
    });

    it('resists past a tray, never reaching the width', () => {
      const past = SwipeUtils.offsetFor(0, 300, trays, WIDTH, false);

      expect(past).toBeGreaterThan(80);
      expect(past).toBeLessThan(80 + 220);
      expect(SwipeUtils.offsetFor(0, 100_000, trays, WIDTH, false)).toBeLessThan(80 + WIDTH);
    });

    it('follows all the way across with a full swipe', () => {
      expect(SwipeUtils.offsetFor(0, -300, trays, WIDTH, true)).toBe(-300);
      expect(SwipeUtils.offsetFor(0, -900, trays, WIDTH, true)).toBe(-WIDTH);
    });

    it('does not move towards a side with no actions', () => {
      expect(SwipeUtils.offsetFor(0, 120, { start: 0, end: 160 }, WIDTH, true)).toBe(0);
    });
  });

  describe('settle', () => {
    it('opens a tray past half open and closes one short of it', () => {
      expect(SwipeUtils.settle(-90, 0, trays, WIDTH, false)).toEqual({ open: 'end', full: null });
      expect(SwipeUtils.settle(-70, 0, trays, WIDTH, false)).toEqual({ open: null, full: null });
      expect(SwipeUtils.settle(50, 0, trays, WIDTH, false)).toEqual({ open: 'start', full: null });
    });

    it('lets a flick decide by its direction', () => {
      expect(SwipeUtils.settle(-30, -0.8, trays, WIDTH, false)).toEqual({ open: 'end', full: null });
      expect(SwipeUtils.settle(-150, 0.8, trays, WIDTH, false)).toEqual({ open: null, full: null });
    });

    it('performs the outermost action once a full swipe is carried most of the way across', () => {
      expect(SwipeUtils.armed(-250, trays, WIDTH, true)).toBe('end');
      expect(SwipeUtils.settle(-250, 0, trays, WIDTH, true)).toEqual({ open: null, full: 'end' });
      expect(SwipeUtils.armed(-250, trays, WIDTH, false)).toBeNull();
    });

    it('does not arm a narrow item merely by opening its tray', () => {
      expect(SwipeUtils.armed(-170, trays, 200, true)).toBeNull();
    });
  });

  it('rests an open tray at its whole width', () => {
    expect(SwipeUtils.restOffset('start', trays)).toBe(80);
    expect(SwipeUtils.restOffset('end', trays)).toBe(-160);
    expect(SwipeUtils.restOffset(null, trays)).toBe(0);
  });
});

describe('SwipeUtils.velocity', () => {
  it('reads the last tenth of a second of the press, not the whole of it', () => {
    let samples = [{ t: 0, x: 0 }];
    for (const [t, x] of [
      [200, 10],
      [260, 40],
      [300, 80],
    ])
      samples = SwipeUtils.track(samples, { t, x });

    expect(samples.map((sample) => sample.t)).toEqual([200, 260, 300]);
    expect(SwipeUtils.velocity(samples)).toBe(0.7);
  });

  it('is no measurement at all under a frame', () => {
    expect(
      SwipeUtils.velocity([
        { t: 0, x: 0 },
        { t: 2, x: 50 },
      ]),
    ).toBe(0);
  });
});
