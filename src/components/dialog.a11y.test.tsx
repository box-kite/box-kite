import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs, installDialogPlatform } from '../../dev/tests';
import Button from './button';
import Dialog, { AlertDialog } from './dialog';

/**
 * The modal dialog, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * and the alert dialog: https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 *
 * `showModal()` supplies the top layer, the inert page, focus containment and focus return — none of
 * which any test environment implements, so what is tested here is what the component owes on top: the
 * role, the name and the description, the trigger's state, and the close request. Focus *containment*
 * (Tab cycling inside the dialog and never leaving) is the platform's, and is browser-verified only.
 */
describe('Dialog accessibility', () => {
  ignoreLogs();

  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  function DialogExample() {
    return (
      <>
        <Dialog trigger={(trigger) => <Button {...trigger}>Rename</Button>}>
          <Dialog.Title>Rename this view</Dialog.Title>
          <Dialog.Description>The name is only shown to you.</Dialog.Description>
          <Button>Save</Button>
        </Dialog>
        <Button>After</Button>
      </>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Rename' });
  const dialog = () => screen.queryByRole('dialog');

  it('has no axe violations while it is open', async () => {
    render(<DialogExample />);
    fireEvent.click(trigger());

    await expectNoAxeViolations(document.body);
  });

  it('names and describes itself, and says what the trigger controls', () => {
    render(<DialogExample />);
    fireEvent.click(trigger());

    expect(dialog()).toHaveAccessibleName('Rename this view');
    expect(dialog()).toHaveAccessibleDescription('The name is only shown to you.');
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', dialog()!.id);
  });

  it('Enter on the trigger opens it', async () => {
    const key = keyboard();
    render(<DialogExample />);

    await key.pressTab();
    expectFocusOn(trigger());

    await key.press('Enter');
    expect(dialog()).not.toBeNull();
  });

  it('Space on the trigger opens it too', async () => {
    const key = keyboard();
    render(<DialogExample />);

    await key.pressTab();
    await key.press(' ');

    expect(dialog()).not.toBeNull();
  });

  it('Escape closes it and puts focus back on the trigger', async () => {
    uninstall = installDialogPlatform();
    const key = keyboard();
    render(<DialogExample />);

    await key.click(trigger());
    expect(dialog()).not.toBeNull();

    await key.press('Escape');

    expect(dialog()).toBeNull();
    expectFocusOn(trigger());
  });

  it('reaches its own controls from the keyboard', async () => {
    const key = keyboard();
    render(<DialogExample />);

    await key.click(trigger());
    // The dialog follows its trigger in the DOM, because nothing is portalled — so the tab order runs
    // through it without anything to arrange. Containment past its last control is the platform's.
    await key.pressTab();

    expectFocusOn(screen.getByRole('button', { name: 'Save' }));
  });

  it('is an alert dialog when it interrupts, and lands on the least destructive action', async () => {
    function DeleteExample() {
      const cancel = useRef<HTMLButtonElement>(null);

      return (
        <AlertDialog defaultOpen initialFocus={cancel} label="Delete this view?">
          <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
          <Button>Delete</Button>
          <Button ref={cancel}>Cancel</Button>
        </AlertDialog>
      );
    }

    render(<DeleteExample />);
    const alert = screen.getByRole('alertdialog');

    expect(alert).toHaveAccessibleName('Delete this view?');
    expect(alert).toHaveAccessibleDescription('Nothing here can be undone.');
    // APG's rule for an alert dialog: a keyboard user must not be able to confirm a deletion by reflex.
    expectFocusOn(screen.getByRole('button', { name: 'Cancel' }));

    await expectNoAxeViolations(document.body);
  });

  it('an alert dialog ignores a press outside but never Escape', async () => {
    uninstall = installDialogPlatform();
    const key = keyboard();
    render(<AlertDialog defaultOpen label="Delete this view?" />);

    await key.click(document.body);
    expect(screen.queryByRole('alertdialog')).not.toBeNull();

    await key.press('Escape');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
