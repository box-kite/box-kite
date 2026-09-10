import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installDialogPlatform } from '../../dev/tests';
import Button from './button';
import Dialog, { AlertDialog, DialogReason } from './dialog';

/**
 * The API around the pattern, on both paths. `dialog.a11y.test.tsx` owns the pattern itself.
 *
 * happy-dom implements `showModal`/`show`/`close` and the UA's `dialog:not([open])` rule, so the element
 * is real here — what it does not implement is anything a *user* does, which is why the default in this
 * file is a browser with no `closedby`: the component's own dismissal. `installDialogPlatform` puts the
 * platform's close request and light dismiss back for the tests that are about the glue.
 */
describe('Dialog', () => {
  ignoreLogs();

  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  const trigger = () => screen.getByRole('button', { name: 'Rename' });
  const dialog = () => screen.queryByRole('dialog') as HTMLDialogElement | null;

  function renderDialog(props: Partial<React.ComponentProps<typeof Dialog>> = {}) {
    return render(
      <Dialog trigger={(bag) => <Button {...bag}>Rename</Button>} {...props}>
        <Dialog.Title>Rename this view</Dialog.Title>
        <Button>Save</Button>
      </Dialog>,
    );
  }

  it('renders the trigger with the dialog closed', () => {
    renderDialog();

    expect(trigger()).toBeInTheDocument();
    expect(dialog()).toBeNull();
  });

  it('opens from the trigger and closes from it again', () => {
    renderDialog();

    fireEvent.click(trigger());
    expect(dialog()).toBeInTheDocument();

    fireEvent.click(trigger());
    expect(dialog()).toBeNull();
  });

  it('starts open with defaultOpen', () => {
    renderDialog({ defaultOpen: true });

    expect(dialog()).toBeInTheDocument();
  });

  it('is modal by default and non-modal on request', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const show = vi.spyOn(HTMLDialogElement.prototype, 'show');

    renderDialog();
    fireEvent.click(trigger());
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();

    cleanup();
    renderDialog({ modal: false });
    fireEvent.click(trigger());
    expect(show).toHaveBeenCalledTimes(1);
    expect(showModal).toHaveBeenCalledTimes(1);

    showModal.mockRestore();
    show.mockRestore();
  });

  it('reports every open state change with a reason', () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange, modal: false });

    fireEvent.click(trigger());
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: 'trigger' satisfies DialogReason }));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'escape' satisfies DialogReason }));
  });

  it('hears a close it did not ask for, however it happened', () => {
    const onOpenChange = vi.fn();
    renderDialog({ defaultOpen: true, onOpenChange });

    // What a `<form method="dialog">` submit and an imperative `close()` both come through as.
    act(() => dialog()!.close());

    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'imperative' satisfies DialogReason }));
    expect(dialog()).toBeNull();
  });

  it('closes on a pointer press outside, and not on one inside', () => {
    renderDialog({ defaultOpen: true, modal: false });

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }));
    expect(dialog()).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(dialog()).toBeNull();
  });

  it('ignores a press outside when it is not dismissible', () => {
    renderDialog({ defaultOpen: true, dismissible: false });

    fireEvent.pointerDown(document.body);
    expect(dialog()).toBeInTheDocument();
  });

  it('stays where the consumer puts it when it is controlled', () => {
    const onOpenChange = vi.fn();
    renderDialog({ open: false, onOpenChange });

    fireEvent.click(trigger());

    expect(dialog()).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' }));
  });

  it('puts a dismissed dialog back when the consumer keeps it open', () => {
    renderDialog({ open: true });

    // A close cannot be refused, so the component re-shows what the state still says is open.
    act(() => dialog()!.close());

    expect(dialog()).toBeInTheDocument();
  });

  it('names and describes itself from its own parts', () => {
    render(
      <Dialog defaultOpen>
        <Dialog.Title>Rename this view</Dialog.Title>
        <Dialog.Description>The name is only shown to you.</Dialog.Description>
      </Dialog>,
    );

    expect(dialog()).toHaveAccessibleName('Rename this view');
    expect(dialog()).toHaveAccessibleDescription('The name is only shown to you.');
  });

  it('takes a name and a description from the page instead', () => {
    render(
      <>
        <span id="heading">Rename</span>
        <span id="hint">Only you see it</span>
        <Dialog defaultOpen labelledBy="heading" describedBy="hint" />
      </>,
    );

    expect(dialog()).toHaveAccessibleName('Rename');
    expect(dialog()).toHaveAccessibleDescription('Only you see it');
  });

  it('falls back to label, and references nothing that is not there', () => {
    render(<Dialog defaultOpen label="Rename" />);

    expect(dialog()).toHaveAccessibleName('Rename');
    expect(dialog()).not.toHaveAttribute('aria-labelledby');
    expect(dialog()).not.toHaveAttribute('aria-describedby');
  });

  it('says what the trigger controls', () => {
    renderDialog();

    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', dialog()!.id);
  });

  it('refuses a part rendered outside a dialog', () => {
    expect(() => render(<Dialog.Title>Orphan</Dialog.Title>)).toThrow(/inside a <Dialog>/);
  });

  describe('with the platform close request', () => {
    it('leaves Escape and the press outside to the browser', () => {
      uninstall = installDialogPlatform();
      const onOpenChange = vi.fn();
      renderDialog({ defaultOpen: true, onOpenChange });

      expect(dialog()).toHaveAttribute('closedby', 'any');

      fireEvent.pointerDown(document.body);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'outside-pointer' satisfies DialogReason }));
    });

    it('asks for a close request only when it cannot be dismissed', () => {
      uninstall = installDialogPlatform();
      renderDialog({ defaultOpen: true, dismissible: false });

      expect(dialog()).toHaveAttribute('closedby', 'closerequest');

      fireEvent.pointerDown(document.body);
      expect(dialog()).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(dialog()).toBeNull();
    });
  });

  describe('focus', () => {
    it('lands where initialFocus says', () => {
      function Example() {
        const cancel = useRef<HTMLButtonElement>(null);

        return (
          <Dialog defaultOpen label="Delete" initialFocus={cancel}>
            <Button>Delete</Button>
            <Button ref={cancel}>Cancel</Button>
          </Dialog>
        );
      }

      render(<Example />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    // The platform returns focus when a dialog *closes*; nothing returns it when the element is removed
    // from the page while still open, which is what `useFocusReturn` is here for.
    it('goes back to the invoker when an open dialog is unmounted', () => {
      const Example = ({ mounted }: { mounted: boolean }) => (
        <>
          <Button>Outside</Button>
          {mounted && (
            <Dialog defaultOpen label="Rename">
              <Button>Inside</Button>
            </Dialog>
          )}
        </>
      );

      const { rerender } = render(<Example mounted={false} />);
      const outside = screen.getByRole('button', { name: 'Outside' });
      outside.focus();

      rerender(<Example mounted />);
      screen.getByRole('button', { name: 'Inside' }).focus();

      rerender(<Example mounted={false} />);
      expect(outside).toHaveFocus();
    });
  });

  describe('scroll lock', () => {
    const locked = () => [...document.documentElement.classList].filter((name) => name.includes('overflow'));

    it('holds the page while a modal dialog is open, and lets it go again', () => {
      renderDialog();

      expect(locked()).toHaveLength(0);

      fireEvent.click(trigger());
      expect(locked()).toHaveLength(1);

      fireEvent.click(trigger());
      expect(locked()).toHaveLength(0);
    });

    it('leaves the page alone for a non-modal dialog, and when asked to', () => {
      renderDialog({ defaultOpen: true, modal: false });
      expect(locked()).toHaveLength(0);

      cleanup();
      renderDialog({ defaultOpen: true, lockScroll: false });
      expect(locked()).toHaveLength(0);
    });

    it('keeps the lock while a second dialog is still open', () => {
      render(
        <>
          <Dialog defaultOpen label="Outer" />
          <Dialog defaultOpen label="Inner" />
        </>,
      );

      const [, inner] = screen.getAllByRole('dialog') as HTMLDialogElement[];
      expect(locked()).toHaveLength(1);

      act(() => inner.close());
      expect(locked()).toHaveLength(1);
    });
  });
});

describe('AlertDialog', () => {
  ignoreLogs();

  afterEach(cleanup);

  const alert = () => screen.queryByRole('alertdialog');

  it('is an alert dialog, and a press outside does not answer it', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialog.Title>Delete this view?</AlertDialog.Title>
        <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
      </AlertDialog>,
    );

    expect(alert()).toHaveAccessibleName('Delete this view?');
    expect(alert()).toHaveAccessibleDescription('Nothing here can be undone.');

    fireEvent.pointerDown(document.body);
    expect(alert()).toBeInTheDocument();
  });
});
