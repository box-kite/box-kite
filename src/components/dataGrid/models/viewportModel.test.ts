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
    it('at scrollTop 0: startIndex 0, take = visibleRows + 2*preload, translateY 0', () => {
      const grid = getGrid();
      const w = grid.viewport.window(0);
      expect(w.startIndex).toBe(0);
      expect(w.take).toBe(10 + ViewportModel.ROWS_TO_PRELOAD * 2);
      expect(w.translateY).toBe(0);
    });

    it('scrolling down moves the window start back by the preload margin', () => {
      const grid = getGrid();
      const rowHeight = grid.rowHeight;
      // scroll to row 50
      const w = grid.viewport.window(rowHeight * 50);
      expect(w.startIndex).toBe(50 - ViewportModel.ROWS_TO_PRELOAD);
      expect(w.translateY).toBe(w.startIndex * rowHeight);
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
      const w = grid.viewport.window(target);
      // start is the found index minus preload
      expect(w.startIndex).toBe(Math.max(0, 40 - ViewportModel.ROWS_TO_PRELOAD));
      expect(w.translateY).toBe(offsets[w.startIndex]);
      expect(w.totalHeight).toBe(grid.rowOffsets.value.totalHeight);
    });
  });

  it('emptyHeight falls back to default row count when showing all', () => {
    const grid = getGrid({ visibleRowsCount: 'all' }, 0);
    expect(grid.viewport.emptyHeight).toBe(grid.rowHeight * ViewportModel.DEFAULT_VISIBLE_ROWS_COUNT);
  });
});
