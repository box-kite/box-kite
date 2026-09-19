import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { DashboardLayout } from '../utils/dashboard/dashboardUtils';
import Button from './button';
import DashboardGrid, { Widget } from './dashboard';

/**
 * Dragging has no APG pattern, because a drag is not a keyboard gesture — so the keyboard gets the one
 * mechanic every accessible reorder uses instead: a **grab**. Enter picks the widget up, the arrows move
 * it, Enter drops it, Escape puts it back, and a live region says where it went. Asserted as *what is
 * reachable*, *where focus is* and *what was said*, since the position itself is invisible to a reader.
 */
describe('DashboardGrid accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const layout: DashboardLayout = {
    version: 1,
    columns: 12,
    items: [
      { id: 'revenue', x: 0, y: 0, w: 6, h: 2 },
      { id: 'orders', x: 6, y: 0, w: 6, h: 2 },
    ],
  };

  function Example(props: { editable?: boolean } = {}) {
    return (
      <>
        <Button>Before</Button>
        <DashboardGrid label="Sales" columns={12} defaultLayout={layout} editable={props.editable}>
          <Widget id="revenue" title="Revenue">
            Sixty
          </Widget>
          <Widget id="orders" title="Orders">
            Twelve
          </Widget>
        </DashboardGrid>
        <Button>After</Button>
      </>
    );
  }

  const handle = (name: string) => screen.getByRole('button', { name });
  const said = () => document.querySelector('[role="status"]')!.textContent;

  it('has no axe violations in either mode', async () => {
    const { container, rerender } = render(<Example />);
    await expectNoAxeViolations(container);

    rerender(<Example editable />);
    await expectNoAxeViolations(container);
  });

  it('is a named list of widgets, each one an item with a heading', () => {
    render(<Example />);

    expect(screen.getByRole('list', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Revenue' })).toBeInTheDocument();
  });

  it('puts nothing in the tab order until the dashboard can be edited', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Before' }));
    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'After' }));
  });

  it('reaches both handles of both widgets in reading order once it can', async () => {
    const keys = keyboard();
    render(<Example editable />);

    await keys.pressTab();
    await keys.pressTab();
    expectFocusOn(handle('Move Revenue'));
    await keys.pressTab();
    expectFocusOn(handle('Resize Revenue'));
    await keys.pressTab();
    expectFocusOn(handle('Move Orders'));
  });

  it('moves a widget with the arrows between a grab and a drop, announcing every step', async () => {
    const keys = keyboard();
    render(<Example editable />);

    handle('Move Revenue').focus();
    await keys.press('Enter');
    expect(handle('Move Revenue')).toHaveAttribute('aria-pressed', 'true');
    expect(said()).toContain('picked up at column 1, row 1');

    await keys.pressArrow('Right');
    expect(said()).toBe('Revenue, column 2, row 1.');

    await keys.press('Enter');
    expect(said()).toBe('Revenue dropped at column 2, row 1.');
    // The handle is where it was: a grab never moves focus, so there is nothing to give back.
    expectFocusOn(handle('Move Revenue'));
  });

  it('puts the widget back on Escape, and says that it did', async () => {
    const keys = keyboard();
    render(<Example editable />);

    handle('Move Revenue').focus();
    await keys.press('Enter');
    await keys.pressArrow('Down');
    await keys.press('Escape');

    expect(said()).toBe('Revenue put back at column 1, row 1.');
    expect(handle('Move Revenue')).toHaveAttribute('aria-pressed', 'false');
  });

  it('describes both handles with the instructions a grab needs before it starts', () => {
    render(<Example editable />);
    const described = handle('Move Revenue').getAttribute('aria-describedby')!;

    expect(document.getElementById(described)).toHaveTextContent('Press Enter or Space to pick the widget up');
    expect(handle('Resize Revenue')).toHaveAttribute('aria-describedby', described);
  });

  it('resizes from the keyboard with the same two keys', async () => {
    const keys = keyboard();
    render(<Example editable />);

    handle('Resize Revenue').focus();
    await keys.press(' ');
    await keys.pressArrow('Right');

    expect(said()).toBe('Revenue, 7 columns by 2 rows.');
  });

  it('keeps a grabbed widget out of the page, so Tab cancels rather than scattering the layout', async () => {
    const keys = keyboard();
    render(<Example editable />);

    handle('Move Revenue').focus();
    await keys.press('Enter');
    await keys.pressArrow('Right');
    await keys.pressTab();

    expect(said()).toBe('Revenue put back at column 1, row 1.');
    expectFocusOn(handle('Resize Revenue'));
  });
});
