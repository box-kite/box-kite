import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';
import Combobox from './combobox';

interface Fruit {
  id: string;
  name: string;
  gone?: boolean;
}

const fruit: Fruit[] = [
  { id: 'a', name: 'Apple' },
  { id: 'b', name: 'Banana' },
  { id: 'c', name: 'Cherry', gone: true },
];

/**
 * The APG editable-combobox keyboard map, key by key: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * Two things are asserted at once — the *highlight*, which lives in `aria-activedescendant` because DOM
 * focus never enters the popup, and DOM focus, which stays in the field from first keystroke to last.
 */
describe('Combobox accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const def = { label: 'name', key: 'id', disabled: 'gone' } as const;

  const renderCombobox = (props?: Partial<Parameters<typeof Combobox<Fruit>>[0]>) =>
    render(
      <>
        <Button>Before</Button>
        <Combobox<Fruit> data={fruit} def={def} label="Fruit" {...(props as object)} />
        <Button>After</Button>
      </>,
    );

  const field = () => screen.getByRole('combobox') as HTMLInputElement;
  const options = () => screen.queryAllByRole('option');
  const isOpen = () => field().getAttribute('aria-expanded') === 'true';

  /** The option the highlight is on — read the way a screen reader reads it. */
  const highlighted = () => {
    const id = field().getAttribute('aria-activedescendant');

    return id ? document.getElementById(id)?.textContent : undefined;
  };

  describe('the tab sequence', () => {
    it('is one tab stop, reached with a single Tab', async () => {
      const user = keyboard();
      renderCombobox();

      await user.pressTab();
      await user.pressTab();

      expectFocusOn(field());
    });

    it('leaves for the next control however many options are open', async () => {
      const user = keyboard();
      renderCombobox();

      await user.pressTab();
      await user.pressTab();
      await user.pressArrow('Down');
      expect(isOpen()).toBe(true);

      await user.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'After' }));
    });
  });

  describe('closed', () => {
    it('Down opens, with the highlight on the first choosable row', async () => {
      const user = keyboard();
      renderCombobox();

      await user.click(field());
      await user.press('Escape');
      await user.pressArrow('Down');

      expect(isOpen()).toBe(true);
      expect(highlighted()).toBe('Apple');
    });

    it('Down opens on what is already selected, so it moves on from it', async () => {
      const user = keyboard();
      renderCombobox({ defaultValue: fruit[1] });

      await user.pressTab();
      await user.pressTab();
      await user.pressArrow('Down');

      expect(highlighted()).toBe('Banana');
    });

    it('Up opens at the last choosable row, skipping a disabled one', async () => {
      const user = keyboard();
      renderCombobox();

      await user.pressTab();
      await user.pressTab();
      await user.pressArrow('Up');

      expect(highlighted()).toBe('Banana');
    });

    it('Up opens on the selected row too, not at the end past it', async () => {
      const user = keyboard();
      renderCombobox({ defaultValue: fruit[0] });

      await user.pressTab();
      await user.pressTab();
      await user.pressArrow('Up');

      expect(highlighted()).toBe('Apple');
    });

    it('Alt+Down opens without moving the highlight', async () => {
      const user = keyboard();
      renderCombobox();

      await user.pressTab();
      await user.pressTab();
      await user.press('Alt>}{ArrowDown}{/Alt');

      expect(isOpen()).toBe(true);
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });

    it('a printable character opens and filters, without highlighting a suggestion', async () => {
      const user = keyboard();
      renderCombobox();

      await user.pressTab();
      await user.pressTab();
      await user.type('ba');

      expect(isOpen()).toBe(true);
      expect(options()).toHaveLength(1);
      // List autocomplete, not inline: a highlight nobody asked for is one Tab away from being committed.
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  describe('open', () => {
    const openWith = async (user: ReturnType<typeof keyboard>) => {
      await user.pressTab();
      await user.pressTab();
      await user.pressArrow('Down');
    };

    it('the arrows move the highlight, wrapping and skipping a disabled row', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);

      expect(highlighted()).toBe('Apple');
      await user.pressArrow('Down');
      expect(highlighted()).toBe('Banana');
      await user.pressArrow('Down');
      expect(highlighted()).toBe('Apple');
    });

    it('Home and End go to the ends', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.pressArrow('Down');

      // Home and End are caret keys here, so they hand the highlight back to the field instead.
      await user.press('Home');
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
    });

    it.each(['Left', 'Right'] as const)('%s hands the highlight back to the field, leaving the listbox open', async (direction) => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      expect(highlighted()).toBe('Apple');

      await user.pressArrow(direction);
      expect(field().getAttribute('aria-activedescendant')).toBeNull();
      expect(isOpen()).toBe(true);
    });

    it('Enter chooses the highlighted row and closes', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.press('Enter');

      expect(field().value).toBe('Apple');
      await waitFor(() => expect(isOpen()).toBe(false));
    });

    it('Enter with nothing highlighted commits nothing, so a typed query is safe', async () => {
      const user = keyboard();
      renderCombobox();
      await user.pressTab();
      await user.pressTab();
      await user.type('ba');
      await user.press('Enter');

      expect(field().value).toBe('ba');
    });

    it('Alt+Up chooses the highlighted row and closes', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.press('Alt>}{ArrowUp}{/Alt');

      expect(field().value).toBe('Apple');
      await waitFor(() => expect(isOpen()).toBe(false));
    });

    it('Escape closes and keeps what was typed; a second one clears it', async () => {
      const user = keyboard();
      renderCombobox();
      await user.pressTab();
      await user.pressTab();
      await user.type('ba');

      await user.press('Escape');
      await waitFor(() => expect(isOpen()).toBe(false));
      expect(field().value).toBe('ba');

      await user.press('Escape');
      expect(field().value).toBe('');
    });

    it('Tab commits the highlighted row on the way out', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.pressArrow('Down');

      await user.pressTab();
      expect(field().value).toBe('Banana');
    });

    it('a space types rather than choosing — only Enter chooses here', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.type(' ');

      expect(field().value).toBe(' ');
    });

    it('keeps DOM focus in the field throughout', async () => {
      const user = keyboard();
      renderCombobox();
      await openWith(user);
      await user.pressArrow('Down');

      expectFocusOn(field());
    });
  });

  describe('axe', () => {
    it('has no violations closed', async () => {
      const { container } = renderCombobox({ defaultValue: fruit[0] });

      await expectNoAxeViolations(container);
    });

    it('has no violations open, nor with chips in it', async () => {
      const user = keyboard();
      const { container } = renderCombobox({ multiple: true, defaultValue: [fruit[0]] } as never);
      await user.click(field());

      expect(screen.getByRole('listbox')).toBeTruthy();
      await expectNoAxeViolations(container);
    });
  });
});
