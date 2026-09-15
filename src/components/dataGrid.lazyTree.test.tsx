import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { DataSourceRequest, DataSourceResult, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Node {
  id: string;
  name: string;
  size: number;
  folder: boolean;
}

/** The tree the server holds. The browser is handed one level of it at a time and never the whole thing. */
const CHILDREN: Record<string, Node[]> = {
  '': [
    { id: 'src', name: 'src', size: 55, folder: true },
    { id: 'readme', name: 'README.md', size: 1, folder: false },
  ],
  src: [
    { id: 'box', name: 'box.ts', size: 12, folder: false },
    { id: 'core', name: 'core', size: 43, folder: true },
  ],
  core: [{ id: 'engine', name: 'engine.ts', size: 43, folder: false }],
};

/**
 * A tree fetched a level at a time. Same pattern as the eager one — a `treegrid`, `aria-level` on every
 * row and `aria-expanded` on the ones that hold rows — over a datasource that is asked for the children
 * of whatever `treeKeys` names.
 */
describe('DataGrid lazy tree data', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  function createSource() {
    const requests: DataSourceRequest<Node>[] = [];
    const getRows = vi.fn((request: DataSourceRequest<Node>): Promise<DataSourceResult<Node>> => {
      requests.push(request);
      const children = CHILDREN[String(request.treeKeys[request.treeKeys.length - 1] ?? '')] ?? [];

      return Promise.resolve({ rows: children, totalCount: children.length });
    });

    return { getRows, blockSize: 20, requests };
  }

  const def = (source: ReturnType<typeof createSource>, overrides: Partial<GridDefinition<Node>> = {}): GridDefinition<Node> => ({
    rowKey: 'id',
    visibleRowsCount: 'all',
    dataSource: source,
    treeData: { hasChildren: 'folder' },
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'size', header: 'Size' },
    ],
    ...overrides,
  });

  const bodyRows = () => screen.getAllByRole('row').filter((row) => row.getAttribute('aria-level'));
  const nameOf = (row: HTMLElement) => within(row).getAllByRole('gridcell')[0].textContent;
  const names = async (expected: string[]) => waitFor(() => expect(bodyRows().map(nameOf)).toEqual(expected));

  it('draws the top of the tree, and asks for nothing under it', async () => {
    const source = createSource();
    render(<DataGrid<Node> def={def(source)} />);

    await names(['src', 'README.md']);

    expect(screen.getByRole('treegrid')).toBeTruthy();
    expect(source.requests.map((request) => request.treeKeys)).toEqual([[]]);
    expect(bodyRows().map((row) => row.getAttribute('aria-expanded'))).toEqual(['false', null]);
  });

  it('fetches a level when a chevron is pressed, and puts it under the row that asked', async () => {
    const user = keyboard();
    const source = createSource();
    render(<DataGrid<Node> def={def(source)} />);
    await names(['src', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'Expand src' }));

    await names(['src', 'box.ts', 'core', 'README.md']);
    expect(source.requests[source.requests.length - 1].treeKeys).toEqual(['src']);
    expect(bodyRows().map((row) => row.getAttribute('aria-level'))).toEqual(['1', '2', '2', '1']);
  });

  it('carries the whole path down, and takes the subtree away again when the row is shut', async () => {
    const user = keyboard();
    const source = createSource();
    render(<DataGrid<Node> def={def(source)} />);
    await names(['src', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'Expand src' }));
    await names(['src', 'box.ts', 'core', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'Expand core' }));
    await names(['src', 'box.ts', 'core', 'engine.ts', 'README.md']);
    expect(source.requests[source.requests.length - 1].treeKeys).toEqual(['src', 'core']);

    await user.click(screen.getByRole('button', { name: 'Collapse src' }));
    await names(['src', 'README.md']);
  });

  it('gives a chevron only to a row the server said holds rows', async () => {
    const source = createSource();
    render(<DataGrid<Node> def={def(source)} />);
    await names(['src', 'README.md']);

    expect(within(bodyRows()[0]).queryByRole('button', { name: 'Expand src' })).toBeTruthy();
    expect(within(bodyRows()[1]).queryByRole('button', { name: /Expand/ })).toBeNull();
  });

  describe('Keyboard', () => {
    /** Tab lands on the header — one Down is the first cell of the first row. */
    const enterGrid = async (user: ReturnType<typeof keyboard>) => {
      await user.pressTab();
      await user.pressArrow('Down');
    };

    it('Right opens a shut row, and Left shuts an open one', async () => {
      const user = keyboard();
      const source = createSource();
      render(<DataGrid<Node> def={def(source)} />);
      await names(['src', 'README.md']);
      await enterGrid(user);

      await user.pressArrow('Right');
      await names(['src', 'box.ts', 'core', 'README.md']);

      await user.pressArrow('Left');
      await names(['src', 'README.md']);
    });

    it('Left on a row that is already shut steps out to its parent', async () => {
      const user = keyboard();
      const source = createSource();
      render(<DataGrid<Node> def={def(source)} />);
      await names(['src', 'README.md']);
      await enterGrid(user);

      await user.pressArrow('Right');
      await names(['src', 'box.ts', 'core', 'README.md']);

      // Down twice onto the shut `core` row, which has no parent object to point at — only a level.
      await user.pressArrow('Down');
      await user.pressArrow('Down');
      expectFocusOn(within(bodyRows()[2]).getAllByRole('gridcell')[0]);

      await user.pressArrow('Left');

      expectFocusOn(within(bodyRows()[0]).getAllByRole('gridcell')[0]);
    });
  });

  it('has no accessibility violations with a level open', async () => {
    const user = keyboard();
    const source = createSource();
    render(<DataGrid<Node> def={def(source, { rowSelection: true, title: 'Files' })} />);

    // A selection column puts a checkbox in front of the name, so the chevron is the row's own signal.
    await user.click(await screen.findByRole('button', { name: 'Expand src' }));
    await screen.findByRole('button', { name: 'Expand core' });

    const violations = await runAxe(document.body);
    expect(formatViolations(violations), `${violations.length} violation(s) on an open lazy tree`).toBe('');
  }, 20_000);
});
