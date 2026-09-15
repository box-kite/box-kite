import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Node {
  id: string;
  name: string;
  size: number;
  children?: Node[];
}

const files: Node[] = [
  {
    id: 'src',
    name: 'src',
    size: 55,
    children: [
      { id: 'box', name: 'box.ts', size: 12 },
      { id: 'core', name: 'core', size: 43, children: [{ id: 'engine', name: 'engine.ts', size: 43 }] },
    ],
  },
  { id: 'readme', name: 'README.md', size: 1 },
];

/**
 * A tree is a `treegrid`, which is what makes a row's `aria-expanded` and `aria-level` valid — on a plain
 * `grid` both are a serious axe violation (bug #162). Pattern:
 * https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
 */
describe('DataGrid tree data', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const def = (overrides: Partial<GridDefinition<Node>> = {}): GridDefinition<Node> => ({
    rowKey: 'id',
    visibleRowsCount: 'all',
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'size', header: 'Size' },
    ],
    treeData: { childrenKey: 'children' },
    ...overrides,
  });

  const renderTree = (overrides: Partial<GridDefinition<Node>> = {}, props: Record<string, unknown> = {}) =>
    render(<DataGrid<Node> data={files} def={def(overrides)} {...props} />);

  const bodyRows = () => screen.getAllByRole('row').filter((row) => row.getAttribute('aria-level'));
  const nameOf = (row: HTMLElement) => within(row).getAllByRole('gridcell')[0].textContent;

  it('is a treegrid, and every row says how deep it sits', () => {
    renderTree({ treeData: { childrenKey: 'children', defaultExpanded: true } });

    expect(screen.getByRole('treegrid')).toBeTruthy();
    expect(screen.queryByRole('grid')).toBeNull();

    expect(bodyRows().map((row) => [nameOf(row), row.getAttribute('aria-level'), row.getAttribute('aria-posinset')])).toEqual([
      ['src', '1', '1'],
      ['box.ts', '2', '1'],
      ['core', '2', '2'],
      ['engine.ts', '3', '1'],
      ['README.md', '1', '2'],
    ]);
    expect(bodyRows()[0].getAttribute('aria-setsize')).toBe('2');
  });

  it('only a row with something under it carries an open state', () => {
    renderTree();

    expect(bodyRows().map((row) => row.getAttribute('aria-expanded'))).toEqual(['false', null]);
  });

  it('a chevron opens the row it names', async () => {
    const user = keyboard();
    renderTree();

    expect(bodyRows().map(nameOf)).toEqual(['src', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'Expand src' }));

    expect(bodyRows().map(nameOf)).toEqual(['src', 'box.ts', 'core', 'README.md']);
    expect(bodyRows()[0].getAttribute('aria-expanded')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Collapse src' }));

    expect(bodyRows().map(nameOf)).toEqual(['src', 'README.md']);
  });

  it('a leaf keeps the chevron’s width so the values stay in a column', () => {
    renderTree({ treeData: { childrenKey: 'children', defaultExpanded: true } });

    // One control per row that holds rows, and nothing focusable on a leaf.
    expect(screen.getAllByRole('button', { name: /Expand|Collapse/ })).toHaveLength(2);
  });

  it('a Cell renderer of the caller’s own is indented and given a chevron too', () => {
    renderTree({
      columns: [
        { key: 'name', header: 'Name', Cell: ({ cell }) => <b>{String(cell.value).toUpperCase()}</b> },
        { key: 'size', header: 'Size' },
      ],
    });

    const cell = within(bodyRows()[0]).getAllByRole('gridcell')[0];

    // The chevron is named from the row's value rather than from what the renderer drew with it.
    expect(within(cell).getByRole('button', { name: 'Expand src' })).toBeTruthy();
    expect(cell.textContent).toContain('SRC');
  });

  describe('Keyboard', () => {
    /** Tab lands on the header — one Down is the first cell of the first row. */
    const enterGrid = async (user: ReturnType<typeof keyboard>) => {
      await user.pressTab();
      await user.pressArrow('Down');
    };

    it('Right opens a shut row, and Left shuts an open one', async () => {
      const user = keyboard();
      renderTree();
      await enterGrid(user);

      await user.pressArrow('Right');

      expect(bodyRows().map(nameOf)).toEqual(['src', 'box.ts', 'core', 'README.md']);

      await user.pressArrow('Left');

      expect(bodyRows().map(nameOf)).toEqual(['src', 'README.md']);
    });

    it('Left on a row that is already shut steps out to its parent', async () => {
      const user = keyboard();
      renderTree({ treeData: { childrenKey: 'children', defaultExpanded: 1 } });
      await enterGrid(user);

      await user.pressArrow('Down');
      await user.pressArrow('Down');
      // The shut `core` row.
      expectFocusOn(within(bodyRows()[2]).getAllByRole('gridcell')[0]);

      await user.pressArrow('Left');

      // Its parent, `src`.
      expectFocusOn(within(bodyRows()[0]).getAllByRole('gridcell')[0]);
    });

    it('Right on a row with nothing under it is an ordinary move along the row', async () => {
      const user = keyboard();
      renderTree();
      await enterGrid(user);

      await user.pressArrow('Down');
      await user.pressArrow('Right');

      // The next cell along the leaf row.
      expectFocusOn(within(bodyRows()[1]).getAllByRole('gridcell')[1]);
    });
  });

  it('ticking a row with the cascade on takes everything under it', async () => {
    const user = keyboard();
    const onChange = vi.fn();
    renderTree(
      { rowSelection: true, treeData: { childrenKey: 'children', selection: 'cascade', defaultExpanded: true } },
      { onSelectedRowKeysChange: onChange },
    );

    await user.click(screen.getByRole('checkbox', { name: 'Select row 3' }));

    expect(onChange).toHaveBeenLastCalledWith(['core', 'engine'], { reason: 'select' });
    // The row above is half-ticked: some of what is under it is selected and some is not.
    expect(screen.getByRole('checkbox', { name: 'Select row 1' }).getAttribute('aria-checked')).toBe('mixed');
  });

  it('offers no Group by: a tree is already the shape the rows are in', async () => {
    const user = keyboard();
    renderTree();

    await user.click(screen.getByRole('button', { name: 'Column options for Size' }));

    expect(await screen.findByRole('menuitem', { name: 'Sort Ascending' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Group by Size' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations, open and selectable', async () => {
    renderTree({ rowSelection: true, title: 'Files', treeData: { childrenKey: 'children', defaultExpanded: true, selection: 'cascade' } });

    const violations = await runAxe(document.body);
    expect(formatViolations(violations), `${violations.length} violation(s) on an open tree`).toBe('');
  }, 20_000);
});
