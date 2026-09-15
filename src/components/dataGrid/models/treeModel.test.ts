import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition, Key } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import TreeRowModel from './treeRowModel';

interface Node {
  id: string;
  name: string;
  size: number;
  children?: Node[];
}

/** Two roots, one of them three levels deep — enough for a level to have a level under it. */
const nested: Node[] = [
  {
    id: 'src',
    name: 'src',
    size: 0,
    children: [
      { id: 'box', name: 'box.ts', size: 12 },
      {
        id: 'core',
        name: 'core',
        size: 0,
        children: [
          { id: 'engine', name: 'engine.ts', size: 40 },
          { id: 'hash', name: 'hash.ts', size: 3 },
        ],
      },
    ],
  },
  { id: 'readme', name: 'README.md', size: 1 },
];

interface FlatNode {
  id: string;
  path: string[];
  name: string;
}

const flat: FlatNode[] = [
  { id: 'engine', path: ['src', 'core', 'engine.ts'], name: 'engine.ts' },
  { id: 'src', path: ['src'], name: 'src' },
  { id: 'core', path: ['src', 'core'], name: 'core' },
];

function nestedGrid(def: Partial<GridDefinition<Node>> = {}, props: Record<string, unknown> = {}) {
  return new GridModel<Node>(
    {
      data: nested,
      def: { rowKey: 'id', columns: [{ key: 'name' }, { key: 'size' }], treeData: { childrenKey: 'children' }, ...def },
      ...props,
    },
    () => {},
  );
}

/** The rows the body would render, which is the tree walked down as far as it is open. */
function visible<T>(grid: GridModel<T>): TreeRowModel<T>[] {
  return grid.flatRows.value as TreeRowModel<T>[];
}

describe('TreeModel', () => {
  ignoreLogs();

  it('shows the top level only until a row is opened', () => {
    const grid = nestedGrid();

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'README.md']);

    visible(grid)[0].toggleTree();

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'README.md']);
  });

  it('a row under a shut row is not built at all', () => {
    const grid = nestedGrid();
    const root = visible(grid)[0];

    expect(root.children).toHaveLength(0);
    expect(root.hasChildren).toBe(true);

    root.toggleTree();

    expect(visible(grid)[0].children).toHaveLength(2);
  });

  it('defaultExpanded takes a depth, and an explicit collapse wins over it', () => {
    const grid = nestedGrid({ treeData: { childrenKey: 'children', defaultExpanded: 1 } });

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'README.md']);

    visible(grid)[0].toggleTree();

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'README.md']);
  });

  it('defaultExpanded true opens every level', () => {
    const grid = nestedGrid({ treeData: { childrenKey: 'children', defaultExpanded: true } });

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'engine.ts', 'hash.ts', 'README.md']);
  });

  it('defaultExpanded takes a list of keys', () => {
    const grid = nestedGrid({ treeData: { childrenKey: 'children', defaultExpanded: ['src', 'core'] } });

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'engine.ts', 'hash.ts', 'README.md']);
  });

  it('level, position and setsize describe where a row sits', () => {
    const grid = nestedGrid({ treeData: { childrenKey: 'children', defaultExpanded: true } });
    const [src, box, core, engine] = visible(grid);

    expect([src.level, src.position, src.siblings]).toEqual([0, 0, 2]);
    expect([box.level, box.position, box.siblings]).toEqual([1, 0, 2]);
    expect([core.level, core.position, core.siblings]).toEqual([1, 1, 2]);
    expect([engine.level, engine.position, engine.siblings]).toEqual([2, 0, 2]);
    expect(engine.treeParent).toBe(core);
  });

  it('a filter keeps a match and every ancestor of it', () => {
    const grid = nestedGrid({ globalFilter: true, treeData: { childrenKey: 'children', defaultExpanded: true } });

    grid.setGlobalFilter('engine');

    // `core` and `src` are on the way to the match and neither matches itself.
    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'core', 'engine.ts']);
  });

  it('a parent that matches on its own keeps no children', () => {
    const grid = nestedGrid({ globalFilter: true, treeData: { childrenKey: 'children', defaultExpanded: true } });

    grid.setGlobalFilter('README');

    expect(visible(grid).map((r) => r.data.name)).toEqual(['README.md']);
  });

  it('a sort happens inside each parent rather than across the tree', () => {
    const grid = nestedGrid({ treeData: { childrenKey: 'children', defaultExpanded: true } });

    grid.setSortColumn('size', 'DESC');

    // Biggest first inside each parent, and never across one: 40 sorts above 3 under `core`, and both
    // stay under `core` however small it is itself.
    expect(visible(grid).map((r) => r.data.name)).toEqual(['README.md', 'src', 'box.ts', 'core', 'engine.ts', 'hash.ts']);
  });

  it('builds the tree from a path on every row, whatever order they come in', () => {
    const grid = new GridModel<FlatNode>(
      {
        data: flat,
        def: { rowKey: 'id', columns: [{ key: 'name' }], treeData: { pathKey: 'path', defaultExpanded: true } },
      },
      () => {},
    );

    const rows = grid.flatRows.value as TreeRowModel<FlatNode>[];

    expect(rows.map((r) => r.data.name)).toEqual(['src', 'core', 'engine.ts']);
    expect(rows.map((r) => r.level)).toEqual([0, 1, 2]);
  });

  it('reports every open row, and only the ones whose ancestors are open too', () => {
    const onChange = vi.fn();
    const grid = nestedGrid({}, { onExpandedTreeKeysChange: onChange });

    visible(grid)[0].toggleTree();
    expect(onChange).toHaveBeenLastCalledWith(['src'], { reason: 'expand' });

    const core = visible(grid).find((r) => r.data.id === 'core')!;
    core.toggleTree();
    expect(onChange).toHaveBeenLastCalledWith(['src', 'core'], { reason: 'expand' });

    visible(grid)[0].toggleTree();
    // `core` is still marked open and is no longer reachable, so it is not reported as open.
    expect(onChange).toHaveBeenLastCalledWith([], { reason: 'collapse' });
  });

  it('expandedTreeKeys is what a controlled grid shows', () => {
    const grid = nestedGrid({}, { expandedTreeKeys: ['src'] as Key[], onExpandedTreeKeysChange: () => {} });

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'README.md']);

    // The toggle is a request, not the state: nothing moves until the owner answers it.
    visible(grid)[0].toggleTree();

    expect(visible(grid).map((r) => r.data.name)).toEqual(['src', 'box.ts', 'core', 'README.md']);
  });

  it('every row is what a select-all reaches, not the top level', () => {
    const grid = nestedGrid();

    expect(grid.loadedRows).toHaveLength(6);
    expect(grid.totalRowCount).toBe(6);

    grid.toggleSelectAllRows();

    expect(grid.selectedRows.size).toBe(6);
    expect(grid.allRowsSelected).toBe(true);
  });

  it('the cascade takes the subtree with the row, and half of one is indeterminate', () => {
    const grid = nestedGrid({ rowSelection: true, treeData: { childrenKey: 'children', selection: 'cascade' } });
    const src = visible(grid)[0];

    src.toggleSelection();

    expect(grid.selectedRows.size).toBe(5);
    expect(src.selected).toBe(true);
    expect(src.indeterminate).toBe(false);

    grid.toggleRowSelection('hash');

    expect(src.selected).toBe(false);
    expect(src.indeterminate).toBe(true);
  });

  it('without the cascade a checkbox is the row it is on', () => {
    const grid = nestedGrid({ rowSelection: true });

    visible(grid)[0].toggleSelection();

    expect(Array.from(grid.selectedRows)).toEqual(['src']);
    expect(visible(grid)[0].indeterminate).toBe(false);
  });

  it('is still a tree beside a datasource, and stops walking the data it will never be handed', () => {
    const grid = nestedGrid({ dataSource: { getRows: async () => ({ rows: [], totalCount: 0 }) } });

    // A chevron, an indent and a treegrid either way — what changes is who holds the tree.
    expect(grid.tree.enabled).toBe(true);
    expect(grid.tree.isLazy).toBe(true);
    expect(grid.tree.isEager).toBe(false);
    expect(grid.tree.nodes.value).toEqual([]);
    expect(grid.tree.everyRow()).toEqual([]);
  });
});
