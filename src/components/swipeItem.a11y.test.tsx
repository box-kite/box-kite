import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import List from './list';
import SwipeItem from './swipeItem';

/** A swipe is a pointer's shortcut. The keyboard's way to the same commands is the tab order, and focus opens the tray. */
describe('SwipeItem accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  function Inbox() {
    return (
      <List>
        <SwipeItem
          startActions={<SwipeItem.Action>Pin</SwipeItem.Action>}
          endActions={
            <>
              <SwipeItem.Action variant="danger">Delete</SwipeItem.Action>
              <SwipeItem.Action>Archive</SwipeItem.Action>
            </>
          }
        >
          <List.Content>
            <List.Title>
              <List.Action props={{ href: '#ada' }}>Ada Lovelace</List.Action>
            </List.Title>
          </List.Content>
        </SwipeItem>
      </List>
    );
  }

  const translate = () => (document.querySelector('li')!.firstElementChild as HTMLElement).style.translate || '';

  it('reaches every action after the item’s own, with Tab', async () => {
    const user = keyboard();
    render(<Inbox />);

    await user.pressTab();
    expectFocusOn(screen.getByRole('link', { name: 'Ada Lovelace' }));
    await user.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Pin' }));
    await user.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Delete' }));
    await user.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Archive' }));
  });

  it('closes the tray on Escape and goes back to the item', async () => {
    const user = keyboard();
    render(<Inbox />);

    await user.pressTab();
    await user.pressTab();
    await user.press('Escape');

    expectFocusOn(screen.getByRole('link', { name: 'Ada Lovelace' }));
    expect(translate()).toBe('');
  });
});
