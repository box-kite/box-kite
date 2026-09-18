import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import ViewportModel from './viewportModel';

interface Row {
  id: number;
  name: string;
}

const makeData = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `r${i + 1}` }));

function getGrid(def?: Partial<GridDefinition<Row>>, count = 100) {
  return new GridModel<Row>({
    data: makeData(count),
    def: { rowKey: 'id', columns: [{ key: 'name' }], visibleRowsCount: 10, ...def },
  });
}

describe('ViewportModel', () => {
  ignoreLogs();

  it('isEmpty reflects the data length', () => {
    expect(getGrid({}, 0).viewport.isEmpty).toBe(true);
    expect(getGrid({}, 5).viewport.isEmpty).toBe(false);
  });

  describe('fixed-height windowing', () => {
    it('at scrollTop 0: startIndex 0, take = the viewport plus both buffers, translateY 0', () => {
      const grid = getGrid();
      const w = grid.viewport.window(0);
      expect(w.startIndex).toBe(0);
      expect(w.take).toBe(10 + 2 + ViewportModel.ROWS_BEHIND + ViewportModel.ROWS_AHEAD);
      expect(w.translateY).toBe(0);
    });

    it('scrolling down keeps only the small buffer behind the viewport', () => {
      const grid = getGrid();
      const rowHeight = grid.rowHeight;
      // scroll to row 50
      const w = grid.viewport.window(rowHeight * 50, 'down');
      expect(w.startIndex).toBe(50 - ViewportModel.ROWS_BEHIND);
      expect(w.translateY).toBe(w.startIndex * rowHeight);
    });

    it('scrolling up puts the cover above the viewport and keeps the window the same size', () => {
      const grid = getGrid();
      const down = grid.viewport.window(grid.rowHeight * 50, 'down');
      const up = grid.viewport.window(grid.rowHeight * 50, 'up');

      expect(up.startIndex).toBe(50 - ViewportModel.ROWS_AHEAD);
      expect(up.take).toBe(down.take);
    });

    it('covers more than one frame of a hard flick ahead of the viewport, both ways', () => {
      const grid = getGrid({}, 1000);
      const { rowHeight } = grid;
      const scrollTop = rowHeight * 500;
      // A hard flick reaches about ten thousand pixels a second, which is 167 of them in a 60 fps frame.
      const frames = (px: number) => px / (10000 / 60);

      const down = grid.viewport.window(scrollTop, 'down');
      expect(frames((down.startIndex + down.take) * rowHeight - (scrollTop + grid.viewport.viewHeight!))).toBeGreaterThan(2);

      const up = grid.viewport.window(scrollTop, 'up');
      expect(frames(scrollTop - up.startIndex * rowHeight)).toBeGreaterThan(2);
    });

    it('the rendered window always covers the viewport itself, wherever the scroll stops', () => {
      const grid = getGrid({}, 1000);
      const { rowHeight, viewport } = grid;

      for (const offset of [0, 1, rowHeight / 2, rowHeight - 1, rowHeight * 3.7]) {
        for (const direction of ['down', 'up'] as const) {
          const scrollTop = rowHeight * 200 + offset;
          const w = viewport.window(scrollTop, direction);

          expect(w.startIndex * rowHeight).toBeLessThanOrEqual(scrollTop);
          expect((w.startIndex + w.take) * rowHeight).toBeGreaterThanOrEqual(scrollTop + viewport.viewHeight!);
        }
      }
    });

    it('totalHeight = rowCount * rowHeight and viewHeight is fixed', () => {
      const grid = getGrid();
      expect(grid.viewport.totalHeight).toBe(grid.flatRows.value.length * grid.rowHeight);
      expect(grid.viewport.viewHeight).toBe(grid.rowHeight * 10 + grid.rowHeight / 5);
    });
  });

  describe('showAll', () => {
    it('renders every row with no translate and undefined viewHeight', () => {
      const grid = getGrid({ visibleRowsCount: 'all' }, 30);
      expect(grid.viewport.showAll).toBe(true);
      const w = grid.viewport.window(99999);
      expect(w.startIndex).toBe(0);
      expect(w.take).toBe(30);
      expect(w.translateY).toBe(0);
      expect(w.viewHeight).toBeUndefined();
    });
  });

  describe('variable-height windowing (row detail)', () => {
    it('uses the rowOffsets binary search and offset-based translateY', () => {
      const grid = getGrid({ rowDetail: { content: () => null } }, 100);
      // expand a row so offsets are non-uniform
      grid.toggleDetailRow(grid.getRowKey(grid.data[0]));

      expect(grid.viewport.hasDetailRows).toBe(true);
      const { offsets } = grid.rowOffsets.value;
      const target = offsets[40];
      const w = grid.viewport.window(target, 'down');
      // start is the found index minus the rows kept behind it
      expect(w.startIndex).toBe(Math.max(0, 40 - ViewportModel.ROWS_BEHIND));
      expect(w.translateY).toBe(offsets[w.startIndex]);
      expect(w.totalHeight).toBe(grid.rowOffsets.value.totalHeight);
    });
  });

  describe('directionOf', () => {
    it('reads the direction off the move, and a stop keeps the one it arrived in', () => {
      expect(ViewportModel.directionOf(0, 100, 'up')).toBe('down');
      expect(ViewportModel.directionOf(100, 0, 'down')).toBe('up');
      expect(ViewportModel.directionOf(100, 100, 'down')).toBe('down');
      expect(ViewportModel.directionOf(100, 100, 'up')).toBe('up');
    });
  });

  it('emptyHeight falls back to default row count when showing all', () => {
    const grid = getGrid({ visibleRowsCount: 'all' }, 0);
    expect(grid.viewport.emptyHeight).toBe(grid.rowHeight * ViewportModel.DEFAULT_VISIBLE_ROWS_COUNT);
  });
});
