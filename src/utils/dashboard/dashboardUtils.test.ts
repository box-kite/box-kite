import { describe, expect, it } from 'vitest';
import SpecValidate from '../spec/specValidate';
import DashboardUtils, { DashboardItem, DashboardLayout } from './dashboardUtils';

const item = (id: string, x: number, y: number, w: number, h: number, rest: Partial<DashboardItem> = {}): DashboardItem => ({
  id,
  x,
  y,
  w,
  h,
  ...rest,
});

const layoutOf = (items: DashboardItem[], columns = 12): DashboardLayout => ({ version: 1, columns, items });

/** `id@x,y wxh` for every item, in the order the layout stores them — one line a failure can be read from. */
const shape = (layout: DashboardLayout): string =>
  layout.items.map((entry) => `${entry.id}@${entry.x},${entry.y} ${entry.w}x${entry.h}`).join(' | ');

describe('DashboardUtils', () => {
  describe('resolve', () => {
    it('floats every item up, so a layout has no holes', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('a', 0, 4, 6, 2), item('b', 6, 9, 6, 2)]));

      expect(shape(layout)).toBe('a@0,0 6x2 | b@6,0 6x2');
    });

    it('pushes an overlap down rather than letting two widgets share a cell', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('a', 0, 0, 6, 2), item('b', 3, 0, 6, 2)]));

      expect(shape(layout)).toBe('a@0,0 6x2 | b@3,2 6x2');
    });

    it('settles the held item first, so everything else moves around it', () => {
      const layout = DashboardUtils.resolve([item('a', 0, 0, 6, 2), item('b', 0, 0, 6, 2)], 12, 'b');

      expect(layout.map((entry) => `${entry.id}@${entry.y}`).join(' ')).toBe('b@0 a@2');
    });

    it('never moves a fixed item, and flows the rest around it', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('pinned', 0, 3, 12, 2, { fixed: true }), item('a', 0, 1, 6, 2)]));

      expect(shape(layout)).toBe('a@0,0 6x2 | pinned@0,3 12x2');
    });

    it('clamps a widget into the grid rather than off the end of it', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('wide', 9, 0, 9, 2)]));

      expect(shape(layout)).toBe('wide@3,0 9x2');
    });

    it("applies a widget's own minimum and maximum", () => {
      const layout = DashboardUtils.normalize(
        layoutOf([item('a', 0, 0, 1, 1, { minW: 3, minH: 2 }), item('b', 0, 9, 12, 9, { maxW: 4, maxH: 3 })]),
      );

      expect(shape(layout)).toBe('a@0,0 3x2 | b@0,2 4x3');
    });

    it('rounds a fractional cell and keeps a span at one at the least', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('a', 1.4, 0.6, 2.5, 0)]));

      expect(shape(layout)).toBe('a@1,0 3x1');
    });

    it('stores its items in reading order whatever order they arrived in', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('c', 6, 2, 6, 2), item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)]));

      expect(layout.items.map((entry) => entry.id).join('')).toBe('abc');
    });
  });

  describe('moveTo', () => {
    it('sends a widget to a cell and pushes what was there down', () => {
      const layout = DashboardUtils.moveTo(layoutOf([item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)]), 'b', 0, 0);

      expect(shape(layout)).toBe('b@0,0 6x2 | a@0,2 6x2');
    });

    it('floats a drop below everything back up to meet it', () => {
      const layout = DashboardUtils.moveTo(layoutOf([item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)]), 'b', 6, 8);

      expect(shape(layout)).toBe('a@0,0 6x2 | b@6,0 6x2');
    });

    it('refuses to move a fixed widget', () => {
      const original = layoutOf([item('pinned', 0, 0, 6, 2, { fixed: true })]);

      expect(DashboardUtils.moveTo(original, 'pinned', 6, 4)).toBe(original);
    });

    it('is a no-op for an id nothing in the layout answers to', () => {
      const original = layoutOf([item('a', 0, 0, 6, 2)]);

      expect(DashboardUtils.moveTo(original, 'missing', 0, 0)).toBe(original);
    });
  });

  describe('resizeTo', () => {
    it('grows a widget and pushes its neighbour out of the way', () => {
      const layout = DashboardUtils.resizeTo(layoutOf([item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)]), 'a', 12, 2);

      expect(shape(layout)).toBe('a@0,0 12x2 | b@6,2 6x2');
    });

    it('holds a widget to its own minimum', () => {
      const layout = DashboardUtils.resizeTo(layoutOf([item('a', 0, 0, 6, 4, { minW: 4, minH: 3 })]), 'a', 1, 1);

      expect(shape(layout)).toBe('a@0,0 4x3');
    });
  });

  describe('add and remove', () => {
    it('puts a new widget under everything, which compaction then floats up beside them', () => {
      const layout = DashboardUtils.add(layoutOf([item('a', 0, 0, 6, 2)]), { id: 'b', w: 6, h: 2 });

      expect(shape(layout)).toBe('a@0,0 6x2 | b@0,2 6x2');
    });

    it('closes the hole a removed widget leaves', () => {
      const layout = DashboardUtils.remove(layoutOf([item('a', 0, 0, 12, 2), item('b', 0, 2, 12, 2)]), 'a');

      expect(shape(layout)).toBe('b@0,0 12x2');
    });
  });

  describe('project', () => {
    it('scales a twelve-column layout into six', () => {
      const wide = layoutOf([item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 2)]);

      expect(shape(DashboardUtils.project(wide, 6))).toBe('a@0,0 3x2 | b@3,0 3x2');
    });

    it('never projects a widget down to nothing, and closes the holes that leaves', () => {
      const wide = layoutOf([item('a', 0, 0, 1, 2), item('b', 1, 0, 11, 2)]);

      expect(shape(DashboardUtils.project(wide, 2))).toBe('a@0,0 1x2 | b@0,2 2x2');
    });

    it('stacks everything in reading order when there is one column left', () => {
      const wide = layoutOf([item('a', 0, 0, 6, 2), item('b', 6, 0, 6, 3)]);

      expect(shape(DashboardUtils.project(wide, 1))).toBe('a@0,0 1x2 | b@0,2 1x3');
    });

    it('scales a widget’s own minimum with it, so a sixth of twelve is not the whole of two', () => {
      const wide = layoutOf([item('a', 0, 0, 6, 2, { minW: 2 }), item('b', 6, 0, 6, 2, { minW: 2 })]);

      expect(shape(DashboardUtils.project(wide, 2))).toBe('a@0,0 1x2 | b@1,0 1x2');
    });

    it('costs nothing when the space is the one it is already written in', () => {
      const wide = layoutOf([item('a', 0, 0, 6, 2)]);

      expect(DashboardUtils.same(DashboardUtils.project(wide, 12), wide)).toBe(true);
    });
  });

  describe('same', () => {
    it('sees a move and ignores a rebuild', () => {
      const one = DashboardUtils.normalize(layoutOf([item('a', 0, 0, 6, 2)]));
      const two = DashboardUtils.normalize(layoutOf([item('a', 0, 0, 6, 2)]));

      expect(DashboardUtils.same(one, two)).toBe(true);
      expect(DashboardUtils.same(one, DashboardUtils.resizeTo(one, 'a', 12, 2))).toBe(false);
    });
  });

  describe('cellsMoved', () => {
    it('rounds a travelled distance to the nearest whole cell', () => {
      expect(DashboardUtils.cellsMoved(140, -80, { x: 100, y: 50 })).toEqual({ columns: 1, rows: -2 });
    });

    it('answers zero rather than an infinity when nothing has been measured yet', () => {
      expect(DashboardUtils.cellsMoved(140, 75, { x: 0, y: 0 })).toEqual({ columns: 0, rows: 0 });
    });
  });

  describe('parse', () => {
    it('reads a layout back exactly as it was serialized', () => {
      const original = DashboardUtils.normalize(layoutOf([item('a', 0, 0, 6, 2, { minW: 2 }), item('b', 6, 0, 6, 4, { fixed: true })]));
      const { layout, issues } = DashboardUtils.parse(JSON.parse(JSON.stringify(original)));

      expect(issues).toEqual([]);
      expect(layout).toEqual(original);
    });

    it('drops an item it cannot read and says which one', () => {
      const { layout, issues } = DashboardUtils.parse({
        version: 1,
        columns: 12,
        items: [{ id: 'a', x: 0, y: 0, w: 6, h: 2 }, { id: 'b' }, 7],
      });

      expect(shape(layout)).toBe('a@0,0 6x2');
      expect(issues.map((issue) => `${issue.code} ${issue.path}`)).toEqual(['invalid-item items.1', 'invalid-item items.2']);
    });

    it('keeps the first of two items claiming one id', () => {
      const { layout, issues } = DashboardUtils.parse({
        version: 1,
        columns: 12,
        items: [
          { id: 'a', x: 0, y: 0, w: 6, h: 2 },
          { id: 'a', x: 6, y: 0, w: 6, h: 2 },
        ],
      });

      expect(shape(layout)).toBe('a@0,0 6x2');
      expect(issues[0].code).toBe('duplicate-id');
    });

    it('reads a version it does not know on its say-so about the fields it does', () => {
      const { layout, issues } = DashboardUtils.parse({
        version: 9,
        columns: 4,
        items: [{ id: 'a', x: 0, y: 0, w: 2, h: 1, sparkle: true }],
      });

      expect(shape(layout)).toBe('a@0,0 2x1');
      expect(issues.map((issue) => issue.code)).toEqual(['version']);
      expect(layout.version).toBe(1);
    });

    it('answers an empty dashboard for something that is not a layout at all', () => {
      expect(DashboardUtils.parse(null).layout.items).toEqual([]);
      expect(DashboardUtils.parse('{}').issues[0].code).toBe('not-an-object');
      expect(DashboardUtils.parse({ version: 1, columns: 12 }).issues[0].code).toBe('items');
    });

    it('holds a generated column count to a space that can be rendered', () => {
      expect(DashboardUtils.parse({ version: 1, columns: 400, items: [] }).layout.columns).toBe(DashboardUtils.MAX_COLUMNS);
    });

    it('never lets a prototype key through from JSON', () => {
      const { layout } = DashboardUtils.parse(
        JSON.parse('{"version":1,"columns":12,"items":[{"id":"__proto__","x":0,"y":0,"w":1,"h":1}]}'),
      );

      expect(({} as Record<string, unknown>).x).toBeUndefined();
      expect(layout.items[0].id).toBe('__proto__');
    });
  });

  describe('SCHEMA', () => {
    it('accepts a layout this module produced', () => {
      const layout = DashboardUtils.normalize(layoutOf([item('a', 0, 0, 6, 2, { minW: 2, fixed: true })]));

      expect(SpecValidate.matches(DashboardUtils.SCHEMA, JSON.parse(JSON.stringify(layout)))).toBe(true);
    });

    it('refuses what a generator most easily gets wrong', () => {
      const bad = [
        { version: 1, columns: 12 },
        { version: 1, columns: 12, items: [{ id: 'a', x: 0, y: 0, w: '6', h: 2 }] },
        { version: 1, columns: 12, items: [{ id: 'a', x: 0, y: 0, w: 6, h: 2, colour: 'blue' }] },
        { version: 1, columns: 12, items: [{ x: 0, y: 0, w: 6, h: 2 }] },
      ];

      expect(bad.map((value) => SpecValidate.matches(DashboardUtils.SCHEMA, value))).toEqual([false, false, false, false]);
    });
  });
});
