import { cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import List from './list';
import SortableList from './sortableList';

/** Dragging is not a keyboard gesture, so the keyboard gets a grab — DashboardGrid's model, on a list. */
describe('SortableList accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  function Steps() {
    const [order, setOrder] = useState(['Plan', 'Build', 'Ship']);

    return (
      <SortableList onOrderChange={setOrder}>
        {order.map((step) => (
          <SortableList.Item key={step} value={step}>
            <List.Content>
              <List.Title>{step}</List.Title>
            </List.Content>
            <SortableList.Handle />
          </SortableList.Item>
        ))}
      </SortableList>
    );
  }

  const order = () => screen.getAllByRole('listitem').map((item) => item.textContent);
  const handle = (name: string) => screen.getByRole('button', { name: `Move ${name}` });

  it('picks up on Enter, moves with the arrows and drops on Enter, keeping focus on the handle', async () => {
    const user = keyboard();
    render(<Steps />);

    await user.pressTab();
    expectFocusOn(handle('Plan'));
    await user.press('Enter');
    expect(handle('Plan').getAttribute('aria-pressed')).toBe('true');

    await user.pressArrow('Down');
    await user.pressArrow('Down');
    expect(order()).toEqual(['Build', 'Ship', 'Plan']);
    expectFocusOn(handle('Plan'));

    await user.pressArrow('Up');
    expect(order()).toEqual(['Build', 'Plan', 'Ship']);

    await user.press('Enter');
    expect(handle('Plan').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('status').textContent).toBe('Plan dropped at position 2 of 3.');
  });

  it('picks up on Space too, jumps with Home and End, and puts back on Escape', async () => {
    const user = keyboard();
    render(<Steps />);

    await user.pressTab();
    await user.pressTab();
    expectFocusOn(handle('Build'));
    await user.press(' ');
    await user.press('End');
    expect(order()).toEqual(['Plan', 'Ship', 'Build']);
    await user.press('Home');
    expect(order()).toEqual(['Build', 'Plan', 'Ship']);

    await user.press('Escape');
    expect(order()).toEqual(['Plan', 'Build', 'Ship']);
    expectFocusOn(handle('Build'));
  });
});
