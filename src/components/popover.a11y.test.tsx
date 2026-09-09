import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import Button from './button';
import Popover from './popover';

/**
 * The non-modal dialog, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 *
 * The Popover API supplies the dismissal and the top layer; what is tested here is what the component
 * owes on top of it — the role, the name, the trigger's state, and where focus is. Two of those the
 * platform does *not* do: it moves focus nowhere on open, and it returns focus nowhere when the element
 * is unmounted rather than hidden (both measured in Chrome 152).
 */
describe('Popover accessibility', () => {
  ignoreLogs();

  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  function PopoverExample() {
    return (
      <>
        <Popover label="Filters" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
          <Button>Only mine</Button>
        </Popover>
        <Button>After</Button>
      </>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Filters' });
  const panel = () => screen.queryByRole('dialog');
  const after = () => screen.getByRole('button', { name: 'After' });

  it('has no axe violations while it is open', async () => {
    render(<PopoverExample />);
    fireEvent.click(trigger());

    await expectNoAxeViolations(document.body);
  });

  it('names the panel and says what the trigger controls', () => {
    render(<PopoverExample />);
    fireEvent.click(trigger());

    expect(panel()).toHaveAccessibleName('Filters');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', panel()!.id);
  });

  it('names the panel after another element with labelledBy', () => {
    render(
      <Popover labelledBy="heading" trigger={(bag) => <Button {...bag}>Filters</Button>} defaultOpen>
        <h2 id="heading">Filter the rows</h2>
      </Popover>,
    );

    expect(panel()).toHaveAccessibleName('Filter the rows');
  });

  it('Enter on the trigger opens it, and moves focus into the panel', async () => {
    const key = keyboard();
    render(<PopoverExample />);

    await key.pressTab();
    expectFocusOn(trigger());

    await key.press('Enter');

    expect(panel()).not.toBeNull();
    expectFocusOn(panel());
  });

  it('Space on the trigger opens it too', async () => {
    const key = keyboard();
    render(<PopoverExample />);

    await key.pressTab();
    await key.press(' ');

    expect(panel()).not.toBeNull();
  });

  it('Escape closes it and puts focus back on the trigger', async () => {
    const key = keyboard();
    render(<PopoverExample />);

    await key.click(trigger());
    expectFocusOn(panel());

    await key.press('Escape');

    expect(panel()).toBeNull();
    expectFocusOn(trigger());
  });

  it('traps nothing: Tab out of the panel reaches the rest of the page', async () => {
    const key = keyboard();
    render(<PopoverExample />);

    await key.click(trigger());
    await key.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Only mine' }));

    await key.pressTab();

    // A non-modal dialog does not hold focus. What follows it in the tab order is the page itself.
    expect(document.activeElement).not.toBe(panel());
  });

  it('returns focus to the trigger when the panel is unmounted rather than hidden', async () => {
    const key = keyboard();

    function Controlled(props: { open: boolean }) {
      return (
        <Popover label="Filters" open={props.open} trigger={(bag) => <Button {...bag}>Filters</Button>}>
          <Button>Only mine</Button>
        </Popover>
      );
    }

    const { rerender } = render(<Controlled open />);
    await key.click(panel()!);
    expectFocusOn(panel());

    // The platform returns focus when a popover is *hidden* and not when the element is removed
    // (measured), and a consumer closing a controlled popover removes it. `useFocusReturn` is that gap.
    rerender(<Controlled open={false} />);

    expect(panel()).toBeNull();
    expectFocusOn(trigger());
  });

  describe('on the platform path', () => {
    // Closed, a popover is `display: none` and so out of the accessibility tree — which is why these
    // reach for the element rather than the role.
    const element = () => document.querySelector<HTMLElement>('[popover]')!;

    it('keeps the panel next to its trigger, so the reading order is the markup order', () => {
      uninstall = installPopoverApi();
      render(<PopoverExample />);

      const dialog = element();
      act(() => dialog.showPopover());

      // Not portalled: the panel follows the trigger in the DOM, which is what a screen reader reads
      // and what Tab walks. A portal has to be arranged for; this needs nothing.
      expect(trigger().nextElementSibling).toBe(dialog);
      expect(dialog.compareDocumentPosition(after()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('has no axe violations with the popover attribute on it', async () => {
      uninstall = installPopoverApi();
      render(<PopoverExample />);
      act(() => element().showPopover());

      await expectNoAxeViolations(document.body);
    });
  });
});
