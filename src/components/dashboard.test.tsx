import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardUtils, { DashboardLayout } from '../utils/dashboard/dashboardUtils';
import DashboardGrid, { Widget } from './dashboard';

const layout = (items: DashboardLayout['items'], columns = 12): DashboardLayout => ({ version: 1, columns, items });

const two = layout([
  { id: 'a', x: 0, y: 0, w: 6, h: 2 },
  { id: 'b', x: 6, y: 0, w: 6, h: 2 },
]);

const widgetOf = (id: string) => document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`)!;
const handleOf = (id: string, kind: 'Move' | 'Resize' = 'Move') => screen.getByRole('button', { name: `${kind} ${id}` });

/** No test environment lays a grid out, so a drag says how big a cell is: this widget is `w`x`h` of them. */
function measure(id: string, cell = { width: 100, height: 50 }) {
  const element = widgetOf(id);
  const item = two.items.find((entry) => entry.id === id);
  const width = cell.width * (item?.w ?? 1);
  const height = cell.height * (item?.h ?? 1);

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width, height, left: 0, top: 0, right: width, bottom: height } as DOMRect);

  return cell;
}

/** A drag of the named handle, in whole cells. */
function drag(id: string, cells: { x?: number; y?: number }, kind: 'Move' | 'Resize' = 'Move') {
  const cell = measure(id);
  const handle = handleOf(id, kind);

  fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: (cells.x ?? 0) * cell.width, clientY: (cells.y ?? 0) * cell.height });
  fireEvent.pointerUp(handle, { pointerId: 1 });
}

const status = () => document.querySelector('[role="status"]')!.textContent;

describe('DashboardGrid', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('placement', () => {
    it('places a widget in the cell its layout item names, as a class', () => {
      render(
        <DashboardGrid layout={two} columns={12} label="Sales">
          <Widget id="b" title="Orders" />
        </DashboardGrid>,
      );

      const classes = widgetOf('b').className;
      expect(classes).toContain('gridColumnStart-7');
      expect(classes).toContain('gridColumnEnd-13');
      expect(classes).toContain('gridRowStart-1');
      expect(classes).toContain('gridRowEnd-3');
    });

    it('draws every projection on the same tracks — the narrowest plainly, the rest as container queries', () => {
      const uneven = layout([
        { id: 'a', x: 0, y: 0, w: 5, h: 2 },
        { id: 'b', x: 5, y: 0, w: 7, h: 2 },
      ]);

      render(
        <DashboardGrid layout={uneven} columns={{ md: 6, xxl: 12 }}>
          <Widget id="b" title="Orders" />
        </DashboardGrid>,
      );

      // A grid cannot query itself, so the twelve tracks are always twelve: six columns is the projected
      // layout drawn on pairs of them, and it pushes this widget onto its own row on the way.
      const classes = widgetOf('b').className.split(' ');
      expect(classes).toContain('gridColumnStart-5');
      expect(classes).toContain('gridRowStart-3');
      expect(classes).toContain('cq-xxl-gridColumnStart-6');
      expect(classes).toContain('cq-xxl-gridRowStart-1');
    });

    it('leaves a widget the layout says nothing about to flow, with no list semantics', () => {
      render(
        <DashboardGrid layout={two} columns={12}>
          <Widget id="unplaced" title="Notes" />
        </DashboardGrid>,
      );

      expect(widgetOf('unplaced')).not.toHaveAttribute('role', 'listitem');
      expect(widgetOf('unplaced').className).not.toContain('gridColumnStart');
    });

    it('orders the widgets the way the layout reads, not the way they were written', () => {
      render(
        <DashboardGrid layout={two} columns={12}>
          <Widget id="b" title="Orders" />
          <Widget id="a" title="Revenue" />
        </DashboardGrid>,
      );

      expect(widgetOf('a').className).toContain('order-0');
      expect(widgetOf('b').className).toContain('order-1');
    });

    it('names the set of widgets and calls each one a list item', () => {
      render(
        <DashboardGrid layout={two} columns={12} label="Sales">
          <Widget id="a" title="Revenue" />
        </DashboardGrid>,
      );

      expect(screen.getByRole('list', { name: 'Sales' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });

  describe('editing with a pointer', () => {
    it('has no handles at all until the dashboard is editable', () => {
      render(
        <DashboardGrid layout={two} columns={12}>
          <Widget id="a" title="Revenue" />
        </DashboardGrid>,
      );

      expect(screen.queryByRole('button', { name: 'Move Revenue' })).toBeNull();
    });

    it('moves a widget by the cells the pointer travelled, and says so', () => {
      const changed = vi.fn();
      const committed = vi.fn();

      render(
        <DashboardGrid defaultLayout={two} columns={12} editable onLayoutChange={changed} onLayoutCommit={committed}>
          <Widget id="a" name="a" title="Revenue" />
          <Widget id="b" name="b" title="Orders" />
        </DashboardGrid>,
      );

      drag('a', { x: 1, y: 1 });

      expect(changed).toHaveBeenCalled();
      const [next] = changed.mock.lastCall!;
      expect(next.items.find((item: { id: string }) => item.id === 'a')).toMatchObject({ x: 1, y: 0 });
      expect(changed.mock.lastCall![1]).toMatchObject({ reason: 'move' });
      expect(committed).toHaveBeenCalledTimes(1);
      expect(status()).toBe('a moved to column 2, row 1.');
    });

    it('pushes the widget it lands on out of the way', () => {
      const changed = vi.fn();

      render(
        <DashboardGrid defaultLayout={two} columns={12} editable onLayoutChange={changed}>
          <Widget id="a" name="a" title="Revenue" />
          <Widget id="b" name="b" title="Orders" />
        </DashboardGrid>,
      );

      drag('b', { x: -6 });

      const [next] = changed.mock.lastCall!;
      expect(next.items.map((item: { id: string; y: number }) => `${item.id}@${item.y}`)).toEqual(['b@0', 'a@2']);
    });

    it('resizes from the corner, in cells', () => {
      const changed = vi.fn();

      render(
        <DashboardGrid defaultLayout={two} columns={12} editable onLayoutChange={changed}>
          <Widget id="a" name="a" title="Revenue" />
        </DashboardGrid>,
      );

      drag('a', { x: 2, y: 1 }, 'Resize');

      const [next] = changed.mock.lastCall!;
      expect(next.items[0]).toMatchObject({ id: 'a', w: 8, h: 3 });
      expect(changed.mock.lastCall![1]).toMatchObject({ reason: 'resize' });
    });

    it('gives a pinned widget no handles rather than handles that refuse', () => {
      render(
        <DashboardGrid layout={layout([{ id: 'a', x: 0, y: 0, w: 6, h: 2, fixed: true }])} columns={12} editable>
          <Widget id="a" name="a" title="Revenue" />
        </DashboardGrid>,
      );

      expect(screen.queryByRole('button', { name: 'Move a' })).toBeNull();
    });

    it('leaves a controlled layout to its owner and still reports the move', () => {
      const changed = vi.fn();

      render(
        <DashboardGrid layout={two} columns={12} editable onLayoutChange={changed}>
          <Widget id="a" name="a" title="Revenue" />
        </DashboardGrid>,
      );

      drag('a', { x: 3 });

      expect(changed).toHaveBeenCalled();
      expect(widgetOf('a').className).toContain('gridColumnStart-1');
    });
  });

  describe('editing with the keyboard', () => {
    const grid = (props: { rtl?: boolean } = {}) => (
      <DashboardGrid defaultLayout={two} columns={12} editable style={props.rtl ? { direction: 'rtl' } : undefined}>
        <Widget id="a" name="Revenue" title="Revenue" />
        <Widget id="b" name="Orders" title="Orders" />
      </DashboardGrid>
    );

    it('picks a widget up, moves it a cell at a time and drops it', () => {
      render(grid());
      const handle = handleOf('Revenue');

      fireEvent.keyDown(handle, { key: 'Enter' });
      expect(handle).toHaveAttribute('aria-pressed', 'true');
      expect(status()).toBe('Revenue picked up at column 1, row 1. Use the arrow keys to move it.');

      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(status()).toBe('Revenue, column 2, row 1.');

      fireEvent.keyDown(handle, { key: 'Enter' });
      expect(handle).toHaveAttribute('aria-pressed', 'false');
      expect(status()).toBe('Revenue dropped at column 2, row 1.');
      expect(widgetOf('a').className).toContain('gridColumnStart-2');
    });

    it('puts the whole layout back when a grab is cancelled', () => {
      render(grid());
      const handle = handleOf('Revenue');

      fireEvent.keyDown(handle, { key: 'Enter' });
      fireEvent.keyDown(handle, { key: 'ArrowDown' });
      expect(widgetOf('b').className).toContain('gridRowStart-1');

      fireEvent.keyDown(handle, { key: 'Escape' });
      expect(status()).toBe('Revenue put back at column 1, row 1.');
      expect(widgetOf('a').className).toContain('gridRowStart-1');
    });

    it('cancels a grab that loses focus rather than dropping the widget somewhere nobody looked', () => {
      render(grid());
      const handle = handleOf('Revenue');

      fireEvent.keyDown(handle, { key: 'Enter' });
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      fireEvent.blur(handle);

      expect(handle).toHaveAttribute('aria-pressed', 'false');
      expect(widgetOf('a').className).toContain('gridColumnStart-1');
    });

    it('follows the reading order, so ArrowLeft moves a widget rightwards in a right-to-left page', () => {
      render(grid({ rtl: true }));
      const handle = handleOf('Revenue');

      fireEvent.keyDown(handle, { key: 'Enter' });
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });

      expect(status()).toBe('Revenue, column 2, row 1.');
    });

    it('resizes with the same grab', () => {
      render(grid());
      const handle = handleOf('Revenue', 'Resize');

      fireEvent.keyDown(handle, { key: ' ' });
      expect(status()).toBe('Revenue held for resizing at 6 columns by 2 rows. Use the arrow keys to resize it.');

      fireEvent.keyDown(handle, { key: 'ArrowDown' });
      expect(status()).toBe('Revenue, 6 columns by 3 rows.');
    });

    it('describes both handles with the instructions, once', () => {
      render(grid());
      const instructions = handleOf('Revenue').getAttribute('aria-describedby')!;

      expect(document.getElementById(instructions)!.textContent).toContain('Press Enter or Space to pick the widget up');
      expect(handleOf('Revenue', 'Resize')).toHaveAttribute('aria-describedby', instructions);
    });
  });

  describe('the round trip', () => {
    it('renders a dragged layout identically after it has been through JSON and back', () => {
      let last = two;

      function Live({ start }: { start: DashboardLayout }) {
        const [current, setCurrent] = useState(start);

        return (
          <DashboardGrid
            layout={current}
            columns={12}
            editable
            onLayoutChange={(next) => {
              last = next;
              setCurrent(next);
            }}
          >
            <Widget id="a" name="a" title="Revenue" />
            <Widget id="b" name="b" title="Orders" />
          </DashboardGrid>
        );
      }

      render(<Live start={two} />);
      drag('b', { x: -3, y: 1 });
      const dragged = { a: widgetOf('a').className, b: widgetOf('b').className };
      const stored = JSON.stringify(last);

      cleanup();
      const { layout: parsed, issues } = DashboardUtils.parse(JSON.parse(stored));
      render(<Live start={parsed} />);

      expect(issues).toEqual([]);
      expect({ a: widgetOf('a').className, b: widgetOf('b').className }).toEqual(dragged);
    });
  });

  describe('what is a class and what is not', () => {
    it('translates the held widget with the only inline style in the component', () => {
      render(
        <DashboardGrid defaultLayout={two} columns={12} editable>
          <Widget id="a" name="a" title="Revenue" />
        </DashboardGrid>,
      );

      const cell = measure('a');
      const handle = handleOf('a');
      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: cell.width + 7, clientY: 3 });

      // One cell taken by the layout, seven pixels still owed to the pointer.
      expect(widgetOf('a').style.translate).toBe('7px 3px');

      fireEvent.pointerUp(handle, { pointerId: 1 });
      expect(widgetOf('a').style.translate).toBe('');
    });
  });
});

describe('Widget', () => {
  afterEach(cleanup);

  it('is a heading at the level the page needs', () => {
    render(<Widget title="Revenue" level={2} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Revenue' })).toBeInTheDocument();
  });

  it('reports itself busy while it is loading, and shows no content', () => {
    render(
      <Widget id="a" title="Revenue" loading props={{ 'data-widget-id': 'a' }}>
        Sixty
      </Widget>,
    );

    expect(widgetOf('a')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Sixty')).toBeNull();
  });

  it('shows an error in place of the content, with a retry that refetches', () => {
    const refresh = vi.fn();
    render(
      <Widget title="Revenue" error="The report timed out." onRefresh={refresh}>
        Sixty
      </Widget>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('The report timed out.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('says so in words when there is nothing to show', () => {
    render(<Widget title="Revenue" empty />);

    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });

  it('offers a refresh named after the widget', () => {
    const refresh = vi.fn();
    render(<Widget title="Revenue" onRefresh={refresh} />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Revenue' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('is a card with no chrome it was not given, outside a dashboard', () => {
    render(<Widget props={{ 'data-widget-id': 'plain' }}>Just content</Widget>);

    expect(widgetOf('plain')).not.toHaveAttribute('role');
    expect(screen.getByText('Just content')).toBeInTheDocument();
  });
});
