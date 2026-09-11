import { describe, expect, it } from 'vitest';
import SliderUtils, { SliderScale } from './sliderUtils';

const scale = (min: number, max: number, step: number): SliderScale => ({ min, max, step });

describe('SliderUtils', () => {
  describe('decimals', () => {
    it('counts what a step carries', () => {
      expect(SliderUtils.decimals(1)).toBe(0);
      expect(SliderUtils.decimals(0.5)).toBe(1);
      expect(SliderUtils.decimals(0.001)).toBe(3);
    });

    it('gives an exponent-form step the float precision instead of a wrong answer', () => {
      expect(SliderUtils.decimals(1e-7)).toBe(12);
    });
  });

  describe('snap', () => {
    it('lands on the grid, counted from the minimum rather than from zero', () => {
      expect(SliderUtils.snap(7, scale(1, 21, 5))).toBe(6);
      expect(SliderUtils.snap(9, scale(1, 21, 5))).toBe(11);
    });

    it('keeps a fractional step free of float noise', () => {
      expect(SliderUtils.snap(0.3, scale(0, 1, 0.1))).toBe(0.3);
      expect(SliderUtils.snap(0.7000001, scale(0, 1, 0.1))).toBe(0.7);
    });

    it('clamps to the scale', () => {
      expect(SliderUtils.snap(-40, scale(0, 100, 1))).toBe(0);
      expect(SliderUtils.snap(140, scale(0, 100, 1))).toBe(100);
    });

    it('leaves a value alone when there is no grid', () => {
      expect(SliderUtils.snap(33.33, scale(0, 100, 0))).toBe(33.33);
    });

    it('never steps past a maximum that is not on the grid', () => {
      expect(SliderUtils.snap(10, scale(0, 10, 3))).toBe(9);
      expect(SliderUtils.snap(9.9, scale(0, 10, 3))).toBe(9);
    });
  });

  describe('percent and percentage', () => {
    it('places a value on the scale', () => {
      expect(SliderUtils.percent(25, 0, 100)).toBe(25);
      expect(SliderUtils.percent(5, 0, 20)).toBe(25);
      expect(SliderUtils.percent(-5, 0, 20)).toBe(0);
    });

    it('puts everything at the start of a scale with no width', () => {
      expect(SliderUtils.percent(5, 5, 5)).toBe(0);
    });

    it('rounds a length to a hundredth of a percent, so two equal values are one string', () => {
      expect(SliderUtils.percentage(1, 0, 3)).toBe('33.33%');
      expect(SliderUtils.percentage(50, 0, 100)).toBe('50%');
    });
  });

  describe('thumbs and shaped', () => {
    it('takes either shape in', () => {
      expect(SliderUtils.thumbs(40)).toEqual([40]);
      expect(SliderUtils.thumbs([20, 80])).toEqual([20, 80]);
    });

    it('gives back the shape it was given', () => {
      expect(SliderUtils.shaped(40, [60])).toBe(60);
      expect(SliderUtils.shaped([20, 80], [30, 70])).toEqual([30, 70]);
    });
  });

  describe('move', () => {
    it('snaps the thumb it moves and leaves the rest alone', () => {
      expect(SliderUtils.move([10, 60], 1, 71.4, scale(0, 100, 5))).toEqual([10, 70]);
    });

    it('holds a thumb at its neighbour rather than letting it cross', () => {
      expect(SliderUtils.move([20, 80], 0, 95, scale(0, 100, 1))).toEqual([80, 80]);
      expect(SliderUtils.move([20, 80], 1, 5, scale(0, 100, 1))).toEqual([20, 20]);
    });

    it('holds the outermost thumbs at the ends of the scale', () => {
      expect(SliderUtils.move([20, 80], 0, -50, scale(0, 100, 1))).toEqual([0, 80]);
      expect(SliderUtils.move([20, 80], 1, 500, scale(0, 100, 1))).toEqual([20, 100]);
    });

    it('lets a middle thumb move between the two beside it', () => {
      expect(SliderUtils.move([10, 50, 90], 1, 85, scale(0, 100, 1))).toEqual([10, 85, 90]);
      expect(SliderUtils.move([10, 50, 90], 1, 95, scale(0, 100, 1))).toEqual([10, 90, 90]);
    });
  });

  describe('same', () => {
    it('is what stops a drag that moved nothing costing a render', () => {
      expect(SliderUtils.same([1, 2], [1, 2])).toBe(true);
      expect(SliderUtils.same([1, 2], [1, 3])).toBe(false);
      expect(SliderUtils.same([1], [1, 2])).toBe(false);
    });
  });

  describe('nearest', () => {
    it('finds the thumb a press belongs to', () => {
      expect(SliderUtils.nearest([20, 80], 30)).toBe(0);
      expect(SliderUtils.nearest([20, 80], 70)).toBe(1);
    });

    it('takes the last of two equally near ones, so a stacked pair can be pulled apart', () => {
      expect(SliderUtils.nearest([0, 0], 40)).toBe(1);
      expect(SliderUtils.nearest([20, 80], 50)).toBe(1);
    });
  });

  describe('valueAt', () => {
    const rect = { left: 100, right: 300, top: 50, bottom: 150, width: 200, height: 100 } as DOMRect;

    it('measures a horizontal track from its left edge', () => {
      expect(SliderUtils.valueAt(rect, 150, 0, 'horizontal', false)).toBe(0.25);
    });

    it('measures a right-to-left one from its right edge', () => {
      expect(SliderUtils.valueAt(rect, 150, 0, 'horizontal', true)).toBe(0.75);
    });

    it('measures a vertical one upwards from its bottom, whatever the reading order', () => {
      expect(SliderUtils.valueAt(rect, 0, 125, 'vertical', false)).toBe(0.25);
      expect(SliderUtils.valueAt(rect, 0, 125, 'vertical', true)).toBe(0.25);
    });

    it('clamps a pointer that has left the track', () => {
      expect(SliderUtils.valueAt(rect, 40, 0, 'horizontal', false)).toBe(0);
      expect(SliderUtils.valueAt(rect, 900, 0, 'horizontal', false)).toBe(1);
    });

    it('answers with the start of a track that has no size', () => {
      expect(SliderUtils.valueAt({ ...rect, width: 0 } as DOMRect, 150, 0, 'horizontal', false)).toBe(0);
      expect(SliderUtils.valueAt({ ...rect, height: 0 } as DOMRect, 0, 125, 'vertical', false)).toBe(0);
    });
  });

  describe('moveFor', () => {
    it('gives both arrow pairs to both orientations, which is APG’s rule', () => {
      expect(SliderUtils.moveFor('ArrowUp')).toEqual({ kind: 'step', delta: 1 });
      expect(SliderUtils.moveFor('ArrowRight')).toEqual({ kind: 'step', delta: 1 });
      expect(SliderUtils.moveFor('ArrowDown')).toEqual({ kind: 'step', delta: -1 });
      expect(SliderUtils.moveFor('ArrowLeft')).toEqual({ kind: 'step', delta: -1 });
    });

    it('mirrors the sideways pair and only that pair', () => {
      expect(SliderUtils.moveFor('ArrowLeft', true)).toEqual({ kind: 'step', delta: 1 });
      expect(SliderUtils.moveFor('ArrowRight', true)).toEqual({ kind: 'step', delta: -1 });
      expect(SliderUtils.moveFor('ArrowUp', true)).toEqual({ kind: 'step', delta: 1 });
      expect(SliderUtils.moveFor('ArrowDown', true)).toEqual({ kind: 'step', delta: -1 });
    });

    it('knows the pages and the ends', () => {
      expect(SliderUtils.moveFor('PageUp')).toEqual({ kind: 'page', delta: 1 });
      expect(SliderUtils.moveFor('PageDown')).toEqual({ kind: 'page', delta: -1 });
      expect(SliderUtils.moveFor('Home')).toEqual({ kind: 'edge', delta: -1 });
      expect(SliderUtils.moveFor('End')).toEqual({ kind: 'edge', delta: 1 });
    });

    it('means nothing by anything else', () => {
      expect(SliderUtils.moveFor('Enter')).toBeUndefined();
      expect(SliderUtils.moveFor('a')).toBeUndefined();
    });
  });

  describe('moved', () => {
    const range = scale(0, 100, 5);

    it('steps and pages by what it was given', () => {
      expect(SliderUtils.moved(40, { kind: 'step', delta: 1 }, range, 20)).toBe(45);
      expect(SliderUtils.moved(40, { kind: 'page', delta: -1 }, range, 20)).toBe(20);
    });

    it('puts an edge move on the end itself, on the grid or off it', () => {
      expect(SliderUtils.moved(40, { kind: 'edge', delta: 1 }, scale(0, 98, 5), 20)).toBe(98);
      expect(SliderUtils.moved(40, { kind: 'edge', delta: -1 }, scale(3, 98, 5), 20)).toBe(3);
    });
  });
});
