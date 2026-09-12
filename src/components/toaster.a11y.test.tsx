import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import createToastStore, { ToastStore } from '../utils/toast/toastStore';
import Button from './button';
import Toaster from './toaster';

/**
 * The live region and the keyboard. There is no APG pattern for a toast, so the contract is WCAG's:
 * announced without focus being taken (4.1.3), reachable by keyboard (2.1.1), and its timer stoppable
 * (2.2.1). What no test environment can show is what a screen reader *says* — that is A9's, on hardware.
 */
describe('Toaster accessibility', () => {
  ignoreLogs();

  let store: ToastStore<React.ReactNode>;

  beforeEach(() => {
    store = createToastStore<React.ReactNode>({ limit: 3, duration: Number.POSITIVE_INFINITY });
  });

  afterEach(() => {
    cleanup();
  });

  const region = () => screen.getByRole('region', { name: 'Notifications' });
  const seed = () => {
    act(() => {
      store.add('Saved', { description: 'Your changes are live.', action: { label: 'Undo', onClick: () => {} } });
      store.add('Could not save', { kind: 'error' });
    });
  };

  function Example() {
    return (
      <>
        <Button>Before</Button>
        <Toaster store={store} />
      </>
    );
  }

  it('has no axe violations with a stack on screen', async () => {
    render(<Example />);
    seed();

    await expectNoAxeViolations(document.body);
  });

  it('takes focus from nobody when a toast arrives — 4.1.3 is an announcement, not an interruption', () => {
    render(<Example />);
    screen.getByRole('button', { name: 'Before' }).focus();

    seed();

    expectFocusOn(screen.getByRole('button', { name: 'Before' }));
  });

  it('moves focus to the stack on the hotkey, and only on the hotkey', async () => {
    const user = keyboard();
    render(<Example />);
    seed();

    screen.getByRole('button', { name: 'Before' }).focus();
    await user.press('F7');
    expectFocusOn(screen.getByRole('button', { name: 'Before' }));

    await user.press('F6');
    expectFocusOn(region());
  });

  it('takes a hotkey with a modifier, and none at all', async () => {
    const user = keyboard();
    const { unmount } = render(<Toaster store={store} hotkey="alt+t" />);

    await user.press('t');
    expect(document.activeElement).toBe(document.body);

    await user.type('{Alt>}t{/Alt}');
    expectFocusOn(region());

    unmount();
    render(<Toaster store={store} hotkey={false} />);
    await user.press('F6');
    expect(document.activeElement).toBe(document.body);
  });

  it('walks the toasts with Tab, in the order they are on screen', async () => {
    const user = keyboard();
    render(<Example />);
    seed();

    screen.getByRole('button', { name: 'Before' }).focus();
    await user.press('F6');

    await user.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Undo' }));

    await user.pressTab();
    expectFocusOn(screen.getAllByRole('button', { name: 'Close' })[0]);
  });

  it('dismisses the toast focus is in on Escape, and keeps focus in the stack while there is more to read', async () => {
    const user = keyboard();
    render(<Example />);
    seed();

    screen.getAllByRole('button', { name: 'Close' })[0].focus();
    await user.press('Escape');

    expect(store.getSnapshot().toasts.filter((toast) => toast.open)).toHaveLength(1);
    expectFocusOn(region());
  });

  it('hands focus back where it came from once the stack is empty', async () => {
    const user = keyboard();
    render(<Example />);
    act(() => {
      store.add('Saved');
    });

    const before = screen.getByRole('button', { name: 'Before' });
    before.focus();
    await user.press('F6');
    await user.pressTab();
    await user.press('Escape');

    expectFocusOn(before);
  });

  it('stops the clock while anything in the stack has focus — WCAG 2.2.1', async () => {
    const user = keyboard();
    render(<Example />);
    act(() => {
      store.add('Saved', { duration: 1000 });
    });

    screen.getByRole('button', { name: 'Before' }).focus();
    await user.press('F6');

    // The toast carries a control, which is only allowed because its timer can be stopped.
    expect(screen.getByText('Saved')).toBeInTheDocument();

    fireEvent.blur(region(), { relatedTarget: document.body });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});
