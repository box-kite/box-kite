import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';
import { Label } from './semantics';
import Textarea from './textarea';

/**
 * The two rows the /textarea reference states, which are the two a multi-line field gets wrong when
 * somebody reaches for a `<div contenteditable>`: Tab leaves rather than indenting, and Enter breaks the
 * line rather than submitting the form around it.
 */
describe('Textarea accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  describe('Keyboard', () => {
    it('takes focus from Tab and lets Tab leave, inserting no tab character', async () => {
      const user = keyboard();
      render(
        <>
          <Textarea name="bio" props={{ 'aria-label': 'Bio' }} />
          <Button>Save</Button>
        </>,
      );

      await user.pressTab();
      expectFocusOn(screen.getByRole('textbox', { name: 'Bio' }));

      await user.pressTab();
      expectFocusOn(screen.getByRole('button'));
      expect((screen.getByRole('textbox', { name: 'Bio' }) as HTMLTextAreaElement).value).toBe('');
    });

    it('inserts a line break on Enter instead of submitting the form', async () => {
      const user = keyboard();
      let submitted = false;
      render(
        <form onSubmit={() => (submitted = true)}>
          <Textarea name="bio" props={{ 'aria-label': 'Bio' }} />
        </form>,
      );
      await user.pressTab();

      await user.type('one');
      await user.press('Enter');
      await user.type('two');

      expect((screen.getByRole('textbox', { name: 'Bio' }) as HTMLTextAreaElement).value).toBe('one\ntwo');
      expect(submitted).toBe(false);
    });
  });

  describe('Semantics', () => {
    it('is named by a label that points at it, and axe-clean with one', async () => {
      const { container } = render(
        <>
          <Label props={{ htmlFor: 'bio' }}>Bio</Label>
          <Textarea name="bio" id="bio" />
        </>,
      );

      expect(screen.getByRole('textbox', { name: 'Bio' })).toBeTruthy();
      await expectNoAxeViolations(container);
    });

    it('announces its limit, rather than only enforcing it', async () => {
      render(<Textarea name="bio" maxLength={140} props={{ 'aria-label': 'Bio' }} />);

      expect(screen.getByRole('textbox', { name: 'Bio' }).getAttribute('maxlength')).toBe('140');
    });
  });
});
