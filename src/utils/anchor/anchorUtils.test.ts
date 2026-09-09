import { describe, expect, it } from 'vitest';
import Anchors from '../../core/anchors';
import { AnchorRect, areaFor, flipFor, place } from './anchorUtils';

const viewport: AnchorRect = { top: 0, left: 0, width: 1000, height: 600 };
const anchor: AnchorRect = { top: 300, left: 400, width: 80, height: 30 };
const layer: AnchorRect = { top: 0, left: 0, width: 120, height: 40 };

const options = { side: 'bottom', align: 'center', offset: 0, flip: true, rtl: false } as const;

/**
 * The `position-area` half of the model: what the browser is given. The expectations here are the rects
 * measured in Chrome 152 — an alignment is the span *away* from the edge it lines up with, which is the
 * one thing about the grammar that reads backwards.
 */
describe('areaFor', () => {
  it('spans away from the edge it aligns to', () => {
    expect(areaFor('bottom', 'start')).toBe('block-end span-inline-end');
    expect(areaFor('bottom', 'end')).toBe('block-end span-inline-start');
    expect(areaFor('top', 'start')).toBe('block-start span-inline-end');
  });

  it('writes the block axis first even when the side is on the inline one, which is what `positionArea` takes', () => {
    expect(areaFor('end', 'start')).toBe('span-block-end inline-end');
    expect(areaFor('start', 'end')).toBe('span-block-start inline-start');
    expect(areaFor('end', 'center')).toBe('span-all inline-end');
  });

  it('centres with `span-all` rather than the centre cell, so a flip is not disqualified', () => {
    expect(areaFor('bottom', 'center')).toBe('block-end span-all');
  });

  it('produces only areas the `positionArea` grammar takes, which is the half of this the browser reads', () => {
    for (const side of ['top', 'bottom', 'start', 'end'] as const) {
      for (const align of ['start', 'center', 'end'] as const) {
        expect(Anchors.isArea(areaFor(side, align))).toBe(true);
      }
    }
  });

  it('flips along the side’s own axis', () => {
    expect(flipFor('bottom')).toBe('flip-block');
    expect(flipFor('top')).toBe('flip-block');
    expect(flipFor('start')).toBe('flip-inline');
  });
});

/** The coordinates half: the same placement worked out by hand, for a browser that cannot do it. */
describe('place', () => {
  it('sits on the requested side, offset by the gap', () => {
    expect(place(anchor, layer, viewport, { ...options, offset: 8 })).toEqual({ top: 338, left: 380, side: 'bottom' });
    expect(place(anchor, layer, viewport, { ...options, side: 'top', offset: 8 })).toEqual({ top: 252, left: 380, side: 'top' });
    expect(place(anchor, layer, viewport, { ...options, side: 'end', offset: 8 })).toEqual({ top: 295, left: 488, side: 'end' });
    expect(place(anchor, layer, viewport, { ...options, side: 'start', offset: 8 })).toEqual({ top: 295, left: 272, side: 'start' });
  });

  it('lines the layer up with the anchor’s edges, and reads `start` from the right in a right-to-left page', () => {
    expect(place(anchor, layer, viewport, { ...options, align: 'start' })).toMatchObject({ left: 400 });
    expect(place(anchor, layer, viewport, { ...options, align: 'end' })).toMatchObject({ left: 360 });
    expect(place(anchor, layer, viewport, { ...options, align: 'start', rtl: true })).toMatchObject({ left: 360 });
    // The block axis has no reading order, so an alignment beside the anchor is the same either way.
    expect(place(anchor, layer, viewport, { ...options, side: 'end', align: 'start', rtl: true })).toMatchObject({ top: 300 });
  });

  it('flips to the opposite side when the requested one has no room and the other has', () => {
    const nearBottom = { ...anchor, top: 560 };

    expect(place(nearBottom, layer, viewport, { ...options, offset: 8 })).toEqual({ top: 512, left: 380, side: 'top' });
  });

  it('keeps the side it was given when neither side fits, so the layer does not jump for nothing', () => {
    const tall = { top: 0, left: 0, width: 120, height: 590 };

    expect(place(anchor, tall, viewport, options).side).toBe('bottom');
  });

  it('never flips when asked not to', () => {
    const nearBottom = { ...anchor, top: 560 };

    expect(place(nearBottom, layer, viewport, { ...options, flip: false })).toMatchObject({ top: 590, side: 'bottom' });
  });

  it('shifts along the cross axis to stay in the viewport, and against the near edge when it cannot fit', () => {
    const nearRight = { ...anchor, left: 960 };
    const nearLeft = { ...anchor, left: 0 };

    expect(place(nearRight, layer, viewport, { ...options, align: 'start' })).toMatchObject({ left: 880 });
    expect(place(nearLeft, layer, viewport, { ...options, align: 'end' })).toMatchObject({ left: 0 });
  });
});
