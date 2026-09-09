import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';
import { Label } from './semantics';
import Textbox from './textbox';

/**
 * A text field's whole keyboard contract is that it intercepts nothing, which is exactly the kind of
 * claim that rots silently — so the rows the /textbox reference states are asserted here. The other half
 * is the name: a placeholder is not one, and axe agrees.
 */
describe('Textbox accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  describe('Keyboard', () => {
    it('takes focus from Tab and lets Tab leave, rather than swallowing it', async () => {
      const user = keyboard();
      render(
        <>
          <Textbox name="email" props={{ 'aria-label': 'Email' }} />
          <Button>Send</Button>
        </>,
      );

      await user.pressTab();
      expectFocusOn(screen.getByRole('textbox', { name: 'Email' }));

      await user.pressTab();
      expectFocusOn(screen.getByRole('button'));
    });

    it('types what is typed, with no key handler of its own in the way', async () => {
      const user = keyboard();
      render(<Textbox name="email" props={{ 'aria-label': 'Email' }} />);
      await user.pressTab();

      await user.type('ada@example.com');

      expect((screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement).value).toBe('ada@example.com');
    });
  });

  describe('Semantics', () => {
    it('is named by a label that points at it, and axe-clean with one', async () => {
      const { container } = render(
        <>
          <Label props={{ htmlFor: 'email' }}>Email</Label>
          <Textbox name="email" id="email" />
        </>,
      );

      expect(screen.getByRole('textbox', { name: 'Email' })).toBeTruthy();
      await expectNoAxeViolations(container);
    });

    // accname does fall back to a placeholder, which is the trap: the name is there until the first
    // keystroke takes it away. So what is asserted is the prop's two forms, not a violation.
    it('takes a placeholder as the attribute, and an object as ::placeholder styles instead', async () => {
      render(
        <>
          <Textbox name="email" placeholder="Email" />
          <Textbox name="city" placeholder={{ color: 'gray-400' }} props={{ 'aria-label': 'City' }} />
        </>,
      );

      expect(screen.getByPlaceholderText('Email').getAttribute('placeholder')).toBe('Email');
      expect(screen.getByRole('textbox', { name: 'City' }).hasAttribute('placeholder')).toBe(false);
    });

    it('carries its type through to the input, so the platform validates and picks the keyboard', async () => {
      render(<Textbox name="email" type="email" props={{ 'aria-label': 'Email' }} />);

      expect(screen.getByRole('textbox', { name: 'Email' }).getAttribute('type')).toBe('email');
    });
  });
});
