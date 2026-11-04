import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import Button from './button';
import Popover, { PopoverReason } from './popover';

/**
 * The API around the pattern, on both paths. `popover.a11y.test.tsx` owns the pattern itself.
 *
 * The test environment implements no Popover API, so the default here is the *fallback* path — a portal,
 * `useDismiss` and `useFocusReturn`. `installPopoverApi` from `dev/tests` puts the platform contract back
 * for the tests that are about the glue: what the component says to the browser, and what it does with
 * what the browser says back. Everything the platform itself does is verified in Chrome, not here.
 */
describe('Popover', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const trigger = () => screen.getByRole('button', { name: 'Filters' });
  const panel = () => screen.queryByRole('dialog');

  function renderPopover(props: Partial<React.ComponentProps<typeof Popover>> = {}) {
    return render(
      <Popover label="Filters" trigger={(bag) => <Button {...bag}>Filters</Button>} {...props}>
        <Button>Only mine</Button>
      </Popover>,
    );
  }

  describe('without the platform API', () => {
    it('renders nothing but the trigger while it is closed', () => {
      renderPopover();

      expect(trigger()).toBeInTheDocument();
      expect(panel()).toBeNull();
    });

    it('starts open with defaultOpen, and names the panel', () => {
      renderPopover({ defaultOpen: true });

      expect(panel()).toHaveAccessibleName('Filters');
    });

    it('opens and closes from the trigger', () => {
      renderPopover();

      fireEvent.click(trigger());
      expect(panel()).not.toBeNull();

      fireEvent.click(trigger());
      expect(panel()).toBeNull();
    });

    it('reports every open state change with a reason', () => {
      const onOpenChange = vi.fn();
      renderPopover({ onOpenChange });

      fireEvent.click(trigger());
      expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: 'trigger' satisfies PopoverReason }));

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'escape' satisfies PopoverReason }));
    });

    it('closes on a pointer press outside, and not on one inside', () => {
      renderPopover({ defaultOpen: true });

      fireEvent.pointerDown(screen.getByRole('button', { name: 'Only mine' }));
      expect(panel()).not.toBeNull();

      fireEvent.pointerDown(document.body);
      expect(panel()).toBeNull();
    });

    it('stays where the consumer puts it when it is controlled', () => {
      const onOpenChange = vi.fn();
      renderPopover({ open: false, onOpenChange });

      fireEvent.click(trigger());

      expect(panel()).toBeNull();
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' }));
    });

    it('marks the trigger up as the control of the panel', () => {
      renderPopover();

      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger()).not.toHaveAttribute('aria-controls');

      fireEvent.click(trigger());

      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(trigger()).toHaveAttribute('aria-controls', panel()!.id);
    });
  });

  describe('on the platform path', () => {
    let uninstall: () => void;

    afterEach(() => {
      uninstall?.();
    });

    function renderWithApi(props: Partial<React.ComponentProps<typeof Popover>> = {}) {
      uninstall = installPopoverApi();

      return renderPopover(props);
    }

    // Closed, a popover is `display: none`, so it is out of the accessibility tree and `getByRole`
    // cannot see it. That is the point of the state, and the reason these reach for the element itself.
    const element = () => document.querySelector<HTMLElement>('[popover]')!;

    it('renders the panel whether or not it is open, and never portals it', () => {
      renderWithApi();

      const dialog = element();
      expect(dialog).toHaveAttribute('popover', 'auto');
      expect(dialog).toHaveAttribute('role', 'dialog');
      // Declared next to its trigger rather than at the end of the body, which is the whole point.
      expect(dialog.parentElement).toBe(trigger().parentElement);
      expect(dialog.closest('#box-kite-portal')).toBeNull();
    });

    it('hands the toggle to the browser with popovertarget', () => {
      renderWithApi();

      expect(trigger()).toHaveAttribute('popovertarget', element().id);
      // A click handler of ours would fight the light dismiss — see the component.
      expect(trigger().onclick).toBeNull();
    });

    it('shows and hides through the platform, not by unmounting', () => {
      renderWithApi({ defaultOpen: true });

      const dialog = element();
      expect(dialog.matches(':popover-open')).toBe(true);
      expect(panel()).toBe(dialog);

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
        dialog.hidePopover();
      });

      expect(dialog.matches(':popover-open')).toBe(false);
      expect(dialog).toBeInTheDocument();
    });

    it('follows the platform when the platform closes it, and names the reason', () => {
      const onOpenChange = vi.fn();
      renderWithApi({ defaultOpen: true, onOpenChange });

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
        element().hidePopover();
      });

      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'escape' satisfies PopoverReason }));
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('labels a close nobody asked for as imperative', () => {
      const onOpenChange = vi.fn();
      renderWithApi({ defaultOpen: true, onOpenChange });

      act(() => element().hidePopover());

      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'imperative' satisfies PopoverReason }));
    });

    it('refuses an open the consumer controls, before the browser shows it', () => {
      renderWithApi({ open: false });

      const dialog = element();
      act(() => dialog.showPopover());

      expect(dialog.matches(':popover-open')).toBe(false);
    });

    // Bug #251: the refusal swallowed the request, so a controlled popover could never be opened at all.
    it('tells a controlled consumer it was asked to open, and opens once it agrees', async () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderWithApi({ open: false, onOpenChange });

      const dialog = element();
      act(() => dialog.showPopover());
      expect(onOpenChange).not.toHaveBeenCalled();
      await act(() => new Promise((resolve) => setTimeout(resolve)));
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: 'trigger' satisfies PopoverReason }));

      rerender(
        <Popover label="Filters" open onOpenChange={onOpenChange} trigger={(t) => <Button {...t}>Filters</Button>}>
          <Button>Only mine</Button>
        </Popover>,
      );
      expect(dialog.matches(':popover-open')).toBe(true);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it('re-shows a controlled popover the browser closed, since a close cannot be refused', () => {
      renderWithApi({ open: true });

      const dialog = element();
      expect(dialog.matches(':popover-open')).toBe(true);

      act(() => dialog.hidePopover());

      // The consumer still says open, so the effect puts it back — `beforetoggle` closing is not cancelable.
      expect(dialog.matches(':popover-open')).toBe(true);
    });

    // Bug #324: the panel took focus itself, so a link field meant to be copied at once was never focused.
    it('moves focus onto the first control on open, as APG asks of a dialog', () => {
      uninstall = installPopoverApi();
      render(
        <Popover label="Share" trigger={(bag) => <Button {...bag}>Share</Button>}>
          <input aria-label="Hidden" type="hidden" />
          <Button disabled>Disabled</Button>
          <Button props={{ tabIndex: -1 }}>Not tabbable</Button>
          <input aria-label="Link" readOnly defaultValue="https://example.com" />
        </Popover>,
      );

      act(() => element().showPopover());

      expect(document.activeElement).toHaveAttribute('aria-label', 'Link');
    });

    it('lands on initialFocus instead of the first control', () => {
      const copy = React.createRef<HTMLButtonElement>();
      uninstall = installPopoverApi();
      render(
        <Popover label="Share" initialFocus={copy} trigger={(bag) => <Button {...bag}>Share</Button>}>
          <input aria-label="Link" readOnly defaultValue="https://example.com" />
          <Button ref={copy}>Copy</Button>
        </Popover>,
      );

      act(() => element().showPopover());

      expect(copy.current).toHaveFocus();
    });

    it('leaves an autofocus inside alone', () => {
      uninstall = installPopoverApi();
      render(
        <Popover label="Filters" trigger={(bag) => <Button {...bag}>Filters</Button>}>
          <Button>First</Button>
          <Button>Only mine</Button>
        </Popover>,
      );

      const dialog = element();
      // Held onto while the panel is open: closed it is `display: none`, so no role query can reach it.
      act(() => dialog.showPopover());
      const inside = screen.getByRole('button', { name: 'Only mine' });
      act(() => dialog.hidePopover());
      inside.focus();
      act(() => dialog.showPopover());

      // Focus was already inside, which is what an `autofocus` in the markup would have done.
      expect(inside).toHaveFocus();
    });

    it('does not move focus when autoFocus is off', () => {
      renderWithApi({ autoFocus: false });

      act(() => element().showPopover());

      expect(panel()).not.toHaveFocus();
    });

    // Bug #253: a child gated on `open` unmounted with focus before the browser looked, which left it on `<body>`.
    describe('with its focused child gated on open', () => {
      function Gated({ closeFromInside }: { closeFromInside?: boolean }) {
        const [open, setOpen] = React.useState(false);

        return (
          <Popover label="Filters" open={open} onOpenChange={setOpen} trigger={(bag) => <Button {...bag}>Filters</Button>}>
            {open ? <Button onClick={closeFromInside ? () => setOpen(false) : undefined}>Done</Button> : null}
          </Popover>
        );
      }

      async function openAndFocusInside(closeFromInside?: boolean) {
        uninstall = installPopoverApi();
        render(<Gated closeFromInside={closeFromInside} />);
        trigger().focus();
        // Controlled, so the platform's open is asked for and agreed to a task later (bug #251).
        await act(async () => {
          element().showPopover();
          await new Promise((resolve) => setTimeout(resolve));
        });
        const done = screen.getByRole('button', { name: 'Done' });
        done.focus();

        return done;
      }

      it.each([
        ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
        ['a press on the trigger', () => fireEvent.pointerDown(trigger())],
      ])('returns focus to the trigger on %s', async (_, press) => {
        await openAndFocusInside();

        act(() => {
          press();
          element().hidePopover();
        });

        expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
        expect(trigger()).toHaveFocus();
      });

      it('returns focus to the trigger when a control inside closes it', async () => {
        const done = await openAndFocusInside(true);

        act(() => fireEvent.click(done));

        expect(element().matches(':popover-open')).toBe(false);
        expect(trigger()).toHaveFocus();
      });

      it('leaves focus alone on a press outside, which restores nothing by spec', async () => {
        await openAndFocusInside();

        act(() => {
          fireEvent.pointerDown(document.body);
          element().hidePopover();
        });

        expect(trigger()).not.toHaveFocus();
      });
    });
  });
});
