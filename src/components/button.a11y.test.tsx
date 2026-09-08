import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';

/**
 * Everything here is the platform's, which is the point: the tests exist because the keyboard table on
 * /button claims it, and a component that reached for a `<div>` — or added a key handler that swallowed
 * the browser's own activation — would break every row of it silently.
 */
describe('Button accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  describe('Keyboard', () => {
    it('takes focus from Tab, and Tab moves on', async () => {
      const user = keyboard();
      render(
        <>
          <Button>Save</Button>
          <Button>Cancel</Button>
        </>,
      );

      await user.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'Save' }));

      await user.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('activates on Enter and on Space', async () => {
      const user = keyboard();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      await user.pressTab();

      await user.press('Enter');
      await user.press(' ');

      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('is out of the tab order when disabled, and does not activate', async () => {
      const user = keyboard();
      const onClick = vi.fn();
      render(
        <>
          <Button onClick={onClick} disabled>
            Save
          </Button>
          <Button>Cancel</Button>
        </>,
      );

      await user.pressTab();

      expectFocusOn(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Semantics', () => {
    it('is a real button named by its own text', async () => {
      const { container } = render(<Button>Save</Button>);

      expect(screen.getByRole('button', { name: 'Save' }).tagName).toBe('BUTTON');
      await expectNoAxeViolations(container);
    });

    it('takes its name from aria-label when it holds an icon and no text', async () => {
      const { container } = render(<Button props={{ 'aria-label': 'Close' }}>×</Button>);

      expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
      await expectNoAxeViolations(container);
    });
  });
});
