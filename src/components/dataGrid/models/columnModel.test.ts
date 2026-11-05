import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import ArrayUtils from '../../../utils/array/arrayUtils';
import { GridDefinition } from '../contracts/dataGridContract';
import { ROW_DETAIL_CELL_KEY, ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY } from './cellKeys';
import GridModel from './gridModel';

interface Person {
  firstName: string;
  lastName: string;
  day?: number;
  month?: number;
}

const data: Person[] = [
  { firstName: 'A', lastName: 'X' },
  { firstName: 'B', lastName: 'Y' },
];

const def: GridDefinition<Person> = {
  columns: [{ key: 'parent', pin: 'START', columns: [{ key: 'firstName' }, { key: 'lastName' }] }],
};

function getGrid() {
  return new GridModel<Person>({ data, def }, () => {});
}

describe('ColumnModel', () => {
  ignoreLogs();

  it('propagates pin from parent to leafs', () => {
    const grid = getGrid();
    const firstName = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'firstName');
    const lastName = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'lastName');

    expect(firstName.pin).toEqual('START');
    expect(lastName.pin).toEqual('START');
  });

  /**
   * `LEFT`/`RIGHT` were the whole vocabulary before the sides became logical, so they still say
   * what they always said — and they say it in the one spelling the rest of the grid works in.
   */
  it('takes the physical spelling of a pin and stores the logical side', () => {
    const grid = new GridModel<Person>({
      data,
      def: { columns: [{ key: 'firstName', pin: 'LEFT' }, { key: 'lastName', pin: 'RIGHT' }, { key: 'day' }] },
    });
    const pinOf = (key: string) => ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === key).pin;

    expect(pinOf('firstName')).toEqual('START');
    expect(pinOf('lastName')).toEqual('END');
    expect(pinOf('day')).toBeUndefined();
  });

  it('takes it from a later pin too, and from a parent that spreads it down', () => {
    const grid = new GridModel<Person>({
      data,
      def: { columns: [{ key: 'parent', pin: 'RIGHT', columns: [{ key: 'firstName' }] }, { key: 'day' }] },
    });
    const column = (key: string) => ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === key);

    expect(column('firstName').pin).toEqual('END');

    column('day').pinColumn('LEFT');

    expect(column('day').pin).toEqual('START');
  });

  it('initializes inline width for leafs', () => {
    const grid = getGrid();
    const leaf = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
    expect(leaf.inlineWidth).toEqual(grid.DEFAULT_COLUMN_WIDTH_PX);
  });

  it('computes edge for pinned columns', () => {
    const grid = getGrid();
    const parent = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'parent');
    const leafs = parent.visibleColumns;
    const lastLeft = leafs.at(-1)!;
    expect(lastLeft.isEdge).toBe(true);
  });

  it('toggleVisibility hides and shows a column', () => {
    const grid = getGrid();
    const firstName = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
    expect(firstName.isVisible).toBe(true);
    firstName.toggleVisibility();
    expect(grid.hiddenColumns.has('firstName')).toBe(true);
    expect(firstName.isVisible).toBe(false);
  });

  it('setWidth updates leaf inlineWidth', () => {
    const grid = getGrid();
    const leaf = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
    leaf.setWidth(300);
    expect(leaf.inlineWidth).toEqual(300);
  });

  describe('sortable', () => {
    it('defaults to true when no flags are set', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.sortable).toBe(true);
    });

    it('respects global sortable: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }], sortable: false } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.sortable).toBe(false);
    });

    it('column-level sortable: true overrides global sortable: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', sortable: true }], sortable: false } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.sortable).toBe(true);
    });

    it('column-level sortable: false overrides global sortable: true', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', sortable: false }], sortable: true } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.sortable).toBe(false);
    });

    it('column-level sortable: false works when global is undefined', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', sortable: false }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.sortable).toBe(false);
    });
  });

  describe('resizable', () => {
    it('defaults to true when no flags are set', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.resizable).toBe(true);
    });

    it('respects global resizable: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }], resizable: false } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.resizable).toBe(false);
    });

    it('column-level resizable: true overrides global resizable: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', resizable: true }], resizable: false } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.resizable).toBe(true);
    });

    it('column-level resizable: false overrides global resizable: true', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', resizable: false }], resizable: true } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.resizable).toBe(false);
    });

    it('column-level resizable: false works when global is undefined', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', resizable: false }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.resizable).toBe(false);
    });
  });

  describe('contextMenu', () => {
    it('defaults to true when no flags are set', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenu).toBe(true);
      expect(col.showContextMenu).toBe(true);
      expect(col.contextMenuSections).toEqual({ sort: true, pin: true, group: true });
    });

    it('respects global contextMenu: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }], contextMenu: false } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenu).toBe(false);
      expect(col.showContextMenu).toBe(false);
      expect(col.contextMenuSections).toEqual({ sort: false, pin: false, group: false });
    });

    it('column-level contextMenu: false overrides global true', () => {
      const grid = new GridModel<Person>(
        { data, def: { columns: [{ key: 'firstName', contextMenu: false }], contextMenu: true } },
        () => {},
      );
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenu).toBe(false);
      expect(col.showContextMenu).toBe(false);
    });

    it('column-level contextMenu: true overrides global false', () => {
      const grid = new GridModel<Person>(
        { data, def: { columns: [{ key: 'firstName', contextMenu: true }], contextMenu: false } },
        () => {},
      );
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenu).toBe(true);
      expect(col.showContextMenu).toBe(true);
    });

    it('respects global ContextMenuConfig object', () => {
      const grid = new GridModel<Person>(
        { data, def: { columns: [{ key: 'firstName' }], contextMenu: { sort: true, pin: false, group: false } } },
        () => {},
      );
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenuSections).toEqual({ sort: true, pin: false, group: false });
      expect(col.showContextMenu).toBe(true);
    });

    it('column-level ContextMenuConfig overrides global', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            columns: [{ key: 'firstName', contextMenu: { sort: false, pin: true } }],
            contextMenu: { sort: true, pin: false, group: false },
          },
        },
        () => {},
      );
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenuSections).toEqual({ sort: false, pin: true, group: true });
    });

    it('showContextMenu returns false when all sections are disabled', () => {
      const grid = new GridModel<Person>(
        { data, def: { columns: [{ key: 'firstName', contextMenu: { sort: false, pin: false, group: false } }] } },
        () => {},
      );
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.showContextMenu).toBe(false);
    });

    it('ContextMenuConfig defaults missing keys to true', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', contextMenu: { sort: false } }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.contextMenuSections).toEqual({ sort: false, pin: true, group: true });
    });
  });

  describe('flexible', () => {
    it('isFlexible defaults to true when flexible is undefined', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.isFlexible).toBe(true);
    });

    it('isFlexible returns false when flexible: false', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', flexible: false }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.isFlexible).toBe(false);
    });

    it('isFlexible returns true when flexible: true', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', flexible: true }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.isFlexible).toBe(true);
    });

    it('baseWidth returns the column base width', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName', width: 150 }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.baseWidth).toBe(150);
    });

    it('baseWidth returns DEFAULT_COLUMN_WIDTH_PX when no width specified', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      const col = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      expect(col.baseWidth).toBe(grid.DEFAULT_COLUMN_WIDTH_PX);
    });
  });

  describe('flexWidths calculation', () => {
    it('returns empty object when container width is 0', () => {
      const grid = new GridModel<Person>({ data, def: { columns: [{ key: 'firstName' }] } }, () => {});
      expect(grid.flexWidths.value).toEqual({});
    });

    it('distributes space proportionally based on base widths', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            columns: [
              { key: 'firstName', width: 100 },
              { key: 'lastName', width: 200 },
            ],
          },
        },
        () => {},
      );

      grid.setContainerWidth(600);

      // Total base: 300, available: 600
      // firstName: 100/300 * 600 = 200
      // lastName: 200/300 * 600 = 400
      const flexWidths = grid.flexWidths.value;
      expect(flexWidths['firstName']).toBe(200);
      expect(flexWidths['lastName']).toBe(400);
    });

    it('fixed columns (flexible: false) do not participate in flex', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            columns: [
              { key: 'firstName', width: 100, flexible: false },
              { key: 'lastName', width: 100 },
            ],
          },
        },
        () => {},
      );

      grid.setContainerWidth(400);

      // firstName is fixed at 100, lastName gets remaining 300
      const flexWidths = grid.flexWidths.value;
      expect(flexWidths['firstName']).toBeUndefined();
      expect(flexWidths['lastName']).toBe(300);
    });

    it('keeps the row number, selection and detail columns at their own width (a resize never widens them)', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            showRowNumber: true,
            rowSelection: true,
            rowDetail: { content: () => null },
            columns: [
              { key: 'firstName', width: 100 },
              { key: 'lastName', width: 100 },
            ],
          },
        },
        () => {},
      );

      grid.setContainerWidth(600);
      const firstName = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      firstName.beginResize(0);
      firstName.applyResize(-40);

      const widths = grid.flexWidths.value;
      expect(widths[ROW_NUMBER_CELL_KEY]).toBeUndefined();
      expect(widths[ROW_SELECTION_CELL_KEY]).toBeUndefined();
      expect(widths[ROW_DETAIL_CELL_KEY]).toBeUndefined();
      // 430 shared 215/215, then firstName is dragged to 175 and its 40px go to lastName alone.
      expect(widths['lastName']).toBe(255);
      const leaf = (key: string | number) => ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === key).inlineWidth;
      expect([leaf(ROW_NUMBER_CELL_KEY), leaf(ROW_SELECTION_CELL_KEY), leaf(ROW_DETAIL_CELL_KEY)]).toEqual([70, 50, 50]);
    });

    it('uses base widths when container is smaller than total base widths', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            columns: [
              { key: 'firstName', width: 200 },
              { key: 'lastName', width: 200 },
            ],
          },
        },
        () => {},
      );

      grid.setContainerWidth(300); // Less than total base (400)

      const flexWidths = grid.flexWidths.value;
      expect(flexWidths['firstName']).toBe(200);
      expect(flexWidths['lastName']).toBe(200);
    });

    it('inlineWidth uses flex width when available', () => {
      const grid = new GridModel<Person>(
        {
          data,
          def: {
            columns: [
              { key: 'firstName', width: 100 },
              { key: 'lastName', width: 100 },
            ],
          },
        },
        () => {},
      );

      grid.setContainerWidth(400);

      const firstName = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');
      const lastName = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'lastName');

      // Both should get 200 (400 / 2)
      expect(firstName.inlineWidth).toBe(200);
      expect(lastName.inlineWidth).toBe(200);
    });
  });
});
