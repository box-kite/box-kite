import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';

/**
 * The APG grid pattern, key by key — the tests below name what each key does, and the other half of the
 * pattern is the numbering: a virtualized grid holds fifty rows and claims ten thousand, so
 * `aria-rowcount`/`aria-rowindex` are all a screen reader has, asserted against rows that are not the
 * first ones. Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */
describe('DataGrid accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  interface Person {
    id: number;
    name: string;
    city: string;
    age: number;
  }

  const people: Person[] = [
    { id: 1, name: 'Ada', city: 'London', age: 36 },
    { id: 2, name: 'Grace', city: 'New York', age: 45 },
    { id: 3, name: 'Alan', city: 'London', age: 41 },
    { id: 4, name: 'Edsger', city: 'Austin', age: 52 },
  ];

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'city', header: 'City' },
    { key: 'age', header: 'Age' },
  ];

  type Definition = Parameters<typeof DataGrid<Person>>[0]['def'];

  const renderGrid = (def?: Partial<Definition>, data: Person[] = people) =>
    render(<DataGrid<Person> data={data} def={{ rowKey: 'id', columns, visibleRowsCount: 'all', ...def } as Definition} />);

  /**
   * The same grid, read right to left. The direction has to be a `direction` in a style: the test
   * environment resolves no `dir` attribute at all, so a real one was measured in Chrome instead.
   */
  const renderRtlGrid = (def?: Partial<Definition>) =>
    render(
      <div style={{ direction: 'rtl' }}>
        <DataGrid<Person> data={people} def={{ rowKey: 'id', columns, visibleRowsCount: 'all', ...def } as Definition} />
      </div>,
    );

  const grid = () => screen.getByRole('grid');
  const headers = () => screen.getAllByRole('columnheader');
  const rows = () => screen.getAllByRole('row');
  const cellsOf = (row: Element) => Array.from(row.querySelectorAll('[role="gridcell"]'));

  describe('Roles and structure', () => {
    it('is a grid of rowgroups, rows and cells', () => {
      renderGrid();

      expect(grid()).toBeTruthy();
      // Two rowgroups: the header and the body. The scroll spacers between them are presentational.
      expect(screen.getAllByRole('rowgroup')).toHaveLength(2);
      expect(headers().map((header) => header.textContent)).toEqual(['Name', 'City', 'Age']);
      expect(cellsOf(rows()[1]).map((cell) => cell.textContent)).toEqual(['Ada', 'London', '36']);
    });

    it('counts every row and column, header rows included', () => {
      renderGrid();

      expect(grid().getAttribute('aria-rowcount')).toBe('5');
      expect(grid().getAttribute('aria-colcount')).toBe('3');
      expect(rows().map((row) => row.getAttribute('aria-rowindex'))).toEqual(['1', '2', '3', '4', '5']);
    });

    it('numbers cells along the row', () => {
      renderGrid();

      expect(headers().map((header) => header.getAttribute('aria-colindex'))).toEqual(['1', '2', '3']);
      expect(cellsOf(rows()[2]).map((cell) => cell.getAttribute('aria-colindex'))).toEqual(['1', '2', '3']);
    });

    it('names itself from its title', () => {
      renderGrid({ topBar: true, title: 'People' });

      expect(screen.getByRole('grid', { name: 'People' })).toBeTruthy();
    });

    it('says a sortable column can be sorted, and which way it is', async () => {
      const user = keyboard();
      renderGrid();

      expect(headers().map((header) => header.getAttribute('aria-sort'))).toEqual(['none', 'none', 'none']);

      await user.click(screen.getByText('Name'));
      expect(headers()[0].getAttribute('aria-sort')).toBe('ascending');

      await user.click(screen.getByText('Name'));
      expect(headers()[0].getAttribute('aria-sort')).toBe('descending');
    });

    it('carries aria-selected only where rows can be selected', () => {
      renderGrid();
      expect(rows()[1].hasAttribute('aria-selected')).toBe(false);

      cleanup();

      renderGrid({ rowSelection: true });
      expect(grid().getAttribute('aria-multiselectable')).toBe('true');
      expect(rows()[1].getAttribute('aria-selected')).toBe('false');
    });

    it('marks the grid busy while it loads instead of hiding a progressbar in it', () => {
      render(<DataGrid<Person> data={people} loading def={{ rowKey: 'id', columns, visibleRowsCount: 'all' } as Definition} />);

      expect(grid().getAttribute('aria-busy')).toBe('true');
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('stops the loading bar sweeping when the user asked for less motion', () => {
      render(<DataGrid<Person> data={people} loading def={{ rowKey: 'id', columns, visibleRowsCount: 'all' } as Definition} />);

      // The sweep is the library's only animation, and it repeats forever. It is a Box prop like any
      // other now, so the sequence and the rule that stops it are both in the engine's stylesheet.
      const css = (document.getElementById('box-kite-styles') as HTMLStyleElement | null)?.textContent ?? '';

      expect(css).toContain('@keyframes rb-datagrid-loader{');
      expect(css).toContain('@media (prefers-reduced-motion: reduce){.motionReduce-animationName-none{animation-name:none}}');
    });
  });

  describe('Roles under virtualization', () => {
    const many: Person[] = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `Person ${index + 1}`,
      city: 'London',
      age: 20 + (index % 40),
    }));

    it('claims every row it has, not the window it renders', () => {
      renderGrid({ visibleRowsCount: 10 }, many);

      expect(grid().getAttribute('aria-rowcount')).toBe('501');
      // The window is a fraction of that — which is exactly why the count above has to be told.
      expect(rows().length).toBeLessThan(100);
    });

    it('numbers a rendered row by its place in the whole grid', () => {
      renderGrid({ visibleRowsCount: 10 }, many);

      const last = rows().at(-1)!;
      const index = Number(last.getAttribute('aria-rowindex'));

      // Row 1 is the header, so a body row's number is its data index plus two.
      expect(last.textContent).toContain(`Person ${index - 1}`);
    });
  });

  describe('Keyboard — moving between cells', () => {
    it('is one tab stop: the first cell, not every cell', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();

      expectFocusOn(headers()[0]);
      expect(headers()[0].getAttribute('tabindex')).toBe('0');
      expect(headers()[1].getAttribute('tabindex')).toBe('-1');
    });

    it('moves along the row with Right and Left, and stops at the ends', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.pressArrow('Right');
      expectFocusOn(headers()[1]);

      await user.pressArrow('Left');
      expectFocusOn(headers()[0]);

      // APG: at the left-most cell, Left moves nothing.
      await user.pressArrow('Left');
      expectFocusOn(headers()[0]);
    });

    it('counts a sideways arrow in the reading order, so Left is forward in a right-to-left grid', async () => {
      const user = keyboard();
      renderRtlGrid();

      await user.pressTab();
      expectFocusOn(headers()[0]);

      await user.pressArrow('Left');
      expectFocusOn(headers()[1]);

      await user.pressArrow('Right');
      expectFocusOn(headers()[0]);

      // Still APG's rule at the end of the row — it is just the other end of the screen.
      await user.pressArrow('Right');
      expectFocusOn(headers()[0]);
    });

    it('leaves the vertical axis, Home and End alone in a right-to-left grid', async () => {
      const user = keyboard();
      renderRtlGrid();

      await user.pressTab();
      await user.pressArrow('Left');
      await user.pressArrow('Down');
      expect(document.activeElement?.textContent).toBe('London');

      await user.press('Home');
      expectFocusOn(cellsOf(rows()[1])[0]);
    });

    it('moves between rows with Down and Up, keeping the column', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.pressArrow('Right');
      await user.pressArrow('Down');

      expectFocusOn(cellsOf(rows()[1])[1]);
      expect(document.activeElement?.textContent).toBe('London');

      await user.pressArrow('Up');
      expectFocusOn(headers()[1]);
    });

    it('keeps the column through a grouped header, where the rows are ragged', async () => {
      const user = keyboard();
      // Two header rows: `Where` covers City and Age, so the row below it holds a different number
      // of cells and the same ordinal means a different column in each.
      renderGrid({
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'where', header: 'Where', columns: [{ key: 'city' }, { key: 'age' }] },
        ],
      });

      await user.pressTab();
      await user.pressArrow('Right');
      expect(document.activeElement?.getAttribute('aria-colspan')).toBe('2');

      // Counting cells would land on Age, the second cell of the row below. The column `Where`
      // starts at is City's.
      await user.pressArrow('Down');
      expect(document.activeElement?.getAttribute('aria-colindex')).toBe('2');

      // Up out of Age lands on the cell covering its column, and coming back down the column the
      // user asked for is still there rather than collapsed onto the start of the span.
      await user.pressArrow('Right');
      await user.pressArrow('Up');
      expect(document.activeElement?.textContent).toBe('Where');

      await user.pressArrow('Down');
      expect(document.activeElement?.getAttribute('aria-colindex')).toBe('3');
    });

    it('goes to the ends of the row with Home and End', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.pressArrow('Down');
      await user.press('End');
      expectFocusOn(cellsOf(rows()[1]).at(-1));

      await user.press('Home');
      expectFocusOn(cellsOf(rows()[1])[0]);
    });

    it('goes to the corners of the grid with Ctrl+Home and Ctrl+End', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.pressCtrl('End');
      expectFocusOn(cellsOf(rows().at(-1)!).at(-1));

      await user.pressCtrl('Home');
      expectFocusOn(headers()[0]);
    });

    it('moves a screenful at a time with PageDown and PageUp', async () => {
      const user = keyboard();
      renderGrid({ visibleRowsCount: 2 });

      await user.pressTab();
      await user.press('PageDown');

      // Two rows down from the header row, which is where a Page of two rows lands.
      expect(document.activeElement?.getAttribute('aria-colindex')).toBe('1');
      expect(document.activeElement?.textContent).toBe('Grace');

      await user.press('PageUp');
      expectFocusOn(headers()[0]);
    });

    it('makes the cell a click lands in the one the arrows carry on from', async () => {
      const user = keyboard();
      renderGrid();

      await user.click(cellsOf(rows()[2])[2]);
      await user.pressArrow('Up');

      expectFocusOn(cellsOf(rows()[1])[2]);
    });
  });

  describe('Keyboard — the widgets a cell holds', () => {
    it('sorts on Enter when the cell is a sortable header', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.press('Enter');

      expect(headers()[0].getAttribute('aria-sort')).toBe('ascending');
      expect(cellsOf(rows()[1])[0].textContent).toBe('Ada');
    });

    it('steps into the header cell with F2, which Enter is spoken for', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      await user.press('F2');

      // The first widget the cell holds, which is the resizer — the menu button is a Tab further.
      expectFocusOn(screen.getAllByRole('separator', { name: /Resize/ })[0]);
      // And the column was not sorted on the way in.
      expect(headers()[0].getAttribute('aria-sort')).toBe('none');
    });

    it('steps into a body cell with Enter and hands the keyboard back on Escape', async () => {
      const user = keyboard();
      renderGrid({ rowSelection: true });

      const cell = cellsOf(rows()[1])[0];
      await user.click(cell);
      await user.press('Enter');

      const checkbox = screen.getByRole('checkbox', { name: 'Select row 1' });
      expectFocusOn(checkbox);

      // While a widget holds focus the arrows belong to it, not to the grid.
      await user.press('Escape');
      expectFocusOn(cell);
    });
  });

  describe('The controls the grid draws for itself', () => {
    it('names every icon-only control it renders', () => {
      renderGrid({ topBar: true, rowSelection: true, rowDetail: { content: () => <span>detail</span> } });

      // A name apiece: the column chooser, the select-all box, each row's box, each row's expander
      // and each column's menu. Bug #50 was that none of the icon-only ones had one.
      expect(screen.getByRole('combobox', { name: 'Columns' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Select all rows' })).toBeTruthy();
      expect(screen.getByRole('checkbox', { name: 'Select row 2' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Expand details for row 1' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Column options for Name' })).toBeTruthy();
      expect(screen.getAllByRole('button').every((button) => button.textContent || button.getAttribute('aria-label'))).toBe(true);
    });

    it('announces the selection count, and says nothing until there is one', async () => {
      const user = keyboard();
      renderGrid({ rowSelection: true });

      const status = screen.getByRole('status');
      expect(status.textContent).toBe('');

      await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
      expect(status.textContent).toBe('1 of 4 rows selected');

      await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
      expect(status.textContent).toBe('4 of 4 rows selected');
    });
  });

  describe('The column menu', () => {
    const openMenu = async (user: ReturnType<typeof keyboard>) => {
      await user.click(screen.getByRole('button', { name: 'Column options for Name' }));
    };

    it('is a menu button, and says so before it is opened', () => {
      renderGrid();
      const trigger = screen.getByRole('button', { name: 'Column options for Name' });

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    // Same rule as the Dropdown popup: the menu was a child of its trigger and got away with it only
    // because the portal moved it before a browser saw it. A `role="menu"` of buttons inside a
    // `<button>` is unreachable content, so the nesting has to be right in the markup now.
    it('renders the menu beside its trigger, never inside it', async () => {
      const user = keyboard();
      renderGrid();

      await openMenu(user);

      expect(screen.getByRole('menu').closest('button')).toBeNull();
    });

    it('opens with focus on its first item and moves with the arrows', async () => {
      const user = keyboard();
      renderGrid();

      await openMenu(user);

      const items = screen.getAllByRole('menuitem');
      expectFocusOn(items[0]);

      await user.pressArrow('Down');
      expectFocusOn(items[1]);
    });

    it('runs the item Enter is on', async () => {
      const user = keyboard();
      renderGrid();

      await openMenu(user);
      await user.press('Enter');

      expect(headers()[0].getAttribute('aria-sort')).toBe('ascending');
      await waitFor(() => expect(screen.queryAllByRole('menuitem')).toHaveLength(0));
    });

    it('closes on Escape and puts focus back on the trigger', async () => {
      const user = keyboard();
      renderGrid();

      await openMenu(user);
      await user.press('Escape');

      await waitFor(() => expect(screen.queryAllByRole('menuitem')).toHaveLength(0));
      expectFocusOn(screen.getByRole('button', { name: 'Column options for Name' }));
    });
  });

  /**
   * APG's window splitter: https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/ — a column resizable
   * only by dragging is one a keyboard-only user cannot resize, which is navigable versus operable.
   */
  describe('The column resizer', () => {
    const resizers = () => screen.getAllByRole('separator');
    const widthOf = (separator: Element) => Number(separator.getAttribute('aria-valuenow'));

    /**
     * The way a keyboard actually gets there: into the grid, then into the cell's first widget.
     * Not a click — a pointer deliberately does not focus the separator, so that a drag leaves no
     * ring behind and costs no re-render.
     */
    const focusResizer = async (user: ReturnType<typeof keyboard>) => {
      await user.pressTab();
      await user.press('F2');
    };

    it('is a splitter with a name, an orientation and a width in pixels', () => {
      renderGrid();
      const separator = resizers()[0];

      expect(separator.getAttribute('aria-label')).toBe('Resize Name');
      expect(separator.getAttribute('aria-orientation')).toBe('vertical');
      expect(separator.getAttribute('aria-valuemin')).toBe('48');
      expect(widthOf(separator)).toBeGreaterThan(48);
      expect(separator.getAttribute('aria-valuetext')).toBe(`${widthOf(separator)} pixels`);
      // The pane it resizes: the header cell it sits in.
      expect(separator.getAttribute('aria-controls')).toBe(headers()[0].id);
    });

    it('steps the width with the arrows, and reports the new one', async () => {
      const user = keyboard();
      renderGrid();

      const separator = resizers()[0];
      const before = widthOf(separator);

      await focusResizer(user);
      expectFocusOn(separator);

      await user.pressArrow('Right');
      expect(widthOf(resizers()[0])).toBe(before + 16);

      await user.pressArrow('Left');
      await user.pressArrow('Left');
      expect(widthOf(resizers()[0])).toBe(before - 16);
    });

    it('goes to its bounds with Home and End', async () => {
      const user = keyboard();
      renderGrid();

      await focusResizer(user);

      await user.press('Home');
      expect(widthOf(resizers()[0])).toBe(48);

      const ceiling = Number(resizers()[0].getAttribute('aria-valuemax'));
      await user.press('End');
      expect(widthOf(resizers()[0])).toBe(ceiling);
    });

    it('never reports a width outside the range it declares', async () => {
      const user = keyboard();
      renderGrid();

      await focusResizer(user);
      // Well past the minimum, which the model clamps rather than following.
      for (let press = 0; press < 20; press++) await user.pressArrow('Left');

      const separator = resizers()[0];
      expect(widthOf(separator)).toBe(48);
      expect(widthOf(separator)).toBeGreaterThanOrEqual(Number(separator.getAttribute('aria-valuemin')));
      expect(widthOf(separator)).toBeLessThanOrEqual(Number(separator.getAttribute('aria-valuemax')));
    });
  });

  describe('Known gaps', () => {
    it('does not yet keep Tab inside the grid', async () => {
      const user = keyboard();
      renderGrid();

      await user.pressTab();
      expectFocusOn(headers()[0]);

      await user.pressTab();

      // APG says Tab leaves the grid altogether and the widgets inside cells are reached with
      // Enter/F2. Here they are still their own tab stops, so this lands on the first column's
      // resizer. Deliberate for now — taking every cell widget out of the tab order is a breaking
      // change for anyone tabbing into a filter box today. Delete this test when it goes.
      expect(document.activeElement?.getAttribute('aria-label')).toBe('Resize Name');
    });
  });
});
