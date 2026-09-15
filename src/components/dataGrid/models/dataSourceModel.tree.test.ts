import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, DataSourceRequest, DataSourceResult, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import RowModel from './rowModel';
import SourceTreeRowModel from './sourceTreeRowModel';

interface Node {
  id: string;
  name: string;
  folder: boolean;
  size: number;
}

/**
 * A file tree the server holds and the browser never does. Three rows at the top, one of which goes two
 * levels further down — enough that a level under a level is exercised.
 */
const CHILDREN: Record<string, Node[]> = {
  '': [
    { id: 'src', name: 'src', folder: true, size: 0 },
    { id: 'docs', name: 'docs', folder: true, size: 0 },
    { id: 'readme', name: 'README.md', folder: false, size: 2 },
  ],
  src: [
    { id: 'core', name: 'core', folder: true, size: 0 },
    { id: 'box.ts', name: 'box.ts', folder: false, size: 9 },
  ],
  core: [
    { id: 'hash.ts', name: 'hash.ts', folder: false, size: 3 },
    { id: 'palette.ts', name: 'palette.ts', folder: false, size: 7 },
  ],
  docs: [{ id: 'props.md', name: 'props.md', folder: false, size: 4 }],
};

/** What a lazy-tree server answers: the children of whatever `treeKeys` names, and how many there are. */
function answer(request: DataSourceRequest<Node>): DataSourceResult<Node> {
  const { treeKeys, startRow, endRow } = request;
  const children = CHILDREN[String(treeKeys[treeKeys.length - 1] ?? '')] ?? [];

  return { rows: children.slice(startRow, endRow), totalCount: children.length };
}

function createSource() {
  const requests: DataSourceRequest<Node>[] = [];
  const getRows = vi.fn((request: DataSourceRequest<Node>) => {
    requests.push(request);

    return Promise.resolve(answer(request));
  });

  return { getRows, blockSize: 50, requests };
}

const baseDef = (def: Partial<GridDefinition<Node>> = {}): GridDefinition<Node> => ({
  rowKey: 'id',
  treeData: { hasChildren: 'folder', column: 'name' },
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'size', header: 'Size' },
  ],
  visibleRowsCount: 10,
  ...def,
});

function createGrid(def: GridDefinition<Node>, overrides?: Partial<DataGridProps<Node>>) {
  return new GridModel<Node>({ def, ...overrides }, vi.fn());
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Fetch whatever the first screenful covers, the way the adapter's effect does. */
async function fill(grid: GridModel<Node>) {
  grid.source.request(0, 30);
  await flush();
}

/** Press a row's chevron by id, and let the level it opens answer. */
async function open(grid: GridModel<Node>, id: string) {
  const row = rows(grid).find((item) => item.key === id) as SourceTreeRowModel<Node>;
  row.toggleTree();
  await fill(grid);
}

const rows = (grid: GridModel<Node>) => Array.from({ length: grid.rows.value.length }, (_, i) => grid.rows.value[i] as RowModel<Node>);
const names = (grid: GridModel<Node>) =>
  rows(grid).map((row) => `${'  '.repeat((row as SourceTreeRowModel<Node>).level)}${row.placeholder ? '...' : row.data.name}`);
const levelCount = <T>(grid: GridModel<T>) => (grid.source as unknown as { levels: Map<string, unknown> }).levels.size;

describe('DataSourceModel tree data', () => {
  ignoreLogs();

  it('asks for the top of the tree, and the request names no row at all', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);

    expect(source.requests).toHaveLength(1);
    expect(source.requests[0].treeKeys).toEqual([]);
    expect(source.requests[0].groupBy).toEqual([]);
    expect(names(grid)).toEqual(['src', 'docs', 'README.md']);
  });

  it('fetches the children of a row only once it is opened, and splices them in after it', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);
    await open(grid, 'src');

    expect(source.requests[source.requests.length - 1].treeKeys).toEqual(['src']);
    expect(names(grid)).toEqual(['src', '  core', '  box.ts', 'docs', 'README.md']);
    expect(grid.source.rowCount).toBe(5);
  });

  it('carries the whole path of a row three levels down', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);
    await open(grid, 'src');
    await open(grid, 'core');

    expect(source.requests[source.requests.length - 1].treeKeys).toEqual(['src', 'core']);
    expect(names(grid)).toEqual(['src', '  core', '    hash.ts', '    palette.ts', '  box.ts', 'docs', 'README.md']);
  });

  it('takes a subtree away when the row above it is shut, and frees every level under it', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);
    await open(grid, 'src');
    await open(grid, 'core');
    expect(levelCount(grid)).toBe(3);

    await open(grid, 'src');

    expect(names(grid)).toEqual(['src', 'docs', 'README.md']);
    expect(levelCount(grid)).toBe(1);
  });

  it('grows a chevron only where the server said there is something under the row', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);

    const [src, , readme] = rows(grid) as SourceTreeRowModel<Node>[];
    expect(src.hasChildren).toBe(true);
    expect(readme.hasChildren).toBe(false);

    // A row with nothing under it never opens, however hard its chevron is pressed.
    readme.toggleTree();
    expect(names(grid)).toEqual(['src', 'docs', 'README.md']);
  });

  it('reports the rows that are open and reachable, and drops one whose parent was shut', async () => {
    const onExpandedTreeKeysChange = vi.fn();
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }), { onExpandedTreeKeysChange });

    await fill(grid);
    await open(grid, 'src');
    await open(grid, 'core');

    expect([...onExpandedTreeKeysChange.mock.calls[1][0]].sort()).toEqual(['core', 'src']);
    expect(onExpandedTreeKeysChange.mock.calls[1][1]).toEqual({ reason: 'expand' });

    // `core` is still marked open, under a row that is not — so it is not reported as open.
    await open(grid, 'src');
    expect(onExpandedTreeKeysChange.mock.calls[2][0]).toEqual([]);
    expect(onExpandedTreeKeysChange.mock.calls[2][1]).toEqual({ reason: 'collapse' });
  });

  it('opens what defaultExpanded names, and asks for that level once', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, treeData: { hasChildren: 'folder', defaultExpanded: ['src'] } }));

    await fill(grid);
    await fill(grid);

    expect(names(grid)).toEqual(['src', '  core', '  box.ts', 'docs', 'README.md']);
    expect(source.requests.filter((request) => request.treeKeys.length > 0)).toHaveLength(1);
  });

  it('draws a level nobody has answered for yet as skeletons that hold their depth', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);
    (rows(grid)[0] as SourceTreeRowModel<Node>).toggleTree();
    grid.source.request(0, 30);

    // The level is there and empty: a block's worth of rows, one deeper than the row that opened it.
    const child = rows(grid)[1] as SourceTreeRowModel<Node>;
    expect(child.placeholder).toBe(true);
    expect(child.level).toBe(1);
    expect(child.hasChildren).toBe(false);

    await flush();
    expect(names(grid)).toEqual(['src', '  core', '  box.ts', 'docs', 'README.md']);
  });

  it('numbers a row among its own siblings rather than among the rows on screen', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);
    await open(grid, 'src');

    const [, core, box, docs] = rows(grid) as SourceTreeRowModel<Node>[];
    expect([core.position, core.siblings]).toEqual([0, 2]);
    expect([box.position, box.siblings]).toEqual([1, 2]);
    expect([docs.position, docs.siblings]).toEqual([1, 3]);
  });

  it('refuses a cascading selection, which it could not honour', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, rowSelection: true, treeData: { hasChildren: 'folder', selection: 'cascade' } }));

    await fill(grid);
    await open(grid, 'src');

    expect(grid.tree.cascades).toBe(false);

    // Ticking the folder is the folder, not the two rows under it that happen to be in hand.
    const src = rows(grid)[0] as SourceTreeRowModel<Node>;
    src.toggleSelection();
    expect([...grid.selectedRows]).toEqual(['src']);
  });

  it('is a tree rather than a grouping, so Group By is not offered', async () => {
    const source = { ...createSource(), grouping: true };
    const grid = createGrid(baseDef({ dataSource: source }));

    await fill(grid);

    expect(grid.source.isTree).toBe(true);
    expect(grid.source.canGroup).toBe(false);
    expect(grid.columns.value.leafs[0].contextMenuSections.group).toBe(false);
  });

  it('throws the open levels away when the query changes underneath them, and asks again', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, globalFilter: true }));

    await fill(grid);
    await open(grid, 'src');
    expect(levelCount(grid)).toBe(2);

    // Both levels at once: every block of every one of them is about a question nobody is asking now.
    grid.setGlobalFilter('box');
    expect(levelCount(grid)).toBe(1);

    // The row is still there and still open, so its level comes back — under the new query.
    await fill(grid);
    await fill(grid);

    const underSrc = source.requests.filter((request) => request.treeKeys.length > 0);
    expect(underSrc).toHaveLength(2);
    expect(underSrc[1].globalFilter).toBe('box');
    expect(names(grid)).toEqual(['src', '  core', '  box.ts', 'docs', 'README.md']);
  });
});
