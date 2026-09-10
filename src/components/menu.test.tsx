import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import Button from './button';
import Menu, { MenuReason } from './menu';

/**
 * The API around the pattern, on both paths. `menu.a11y.test.tsx` owns the pattern itself.
 *
 * The test environment implements no Popover API, so the default here is the *portal* path — `useDismiss`
 * and `useFocusReturn` standing in for the platform. `installPopoverApi` puts the platform contract back
 * for the tests that are about the glue. What the platform itself does — the top layer, light dismiss, the
 * nesting rules, focus return — is verified in Chrome, not here.
 */
describe('Menu', () => {
  ignoreLogs();

  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  const onSelect = vi.fn();

  function MenuExample(props: Partial<React.ComponentProps<typeof Menu>> = {}) {
    return (
      <Menu trigger={(bag) => <Button {...bag}>Actions</Button>} {...props}>
        <Menu.Item onSelect={onSelect}>Duplicate</Menu.Item>
        <Menu.Item disabled>Move</Menu.Item>
        <Menu.Separator />
        <Menu.Group label="View">
          <Menu.CheckboxItem defaultChecked>Compact rows</Menu.CheckboxItem>
        </Menu.Group>
        <Menu.RadioGroup label="Sort by" defaultValue="name">
          <Menu.RadioItem value="name">Name</Menu.RadioItem>
          <Menu.RadioItem value="date">Date</Menu.RadioItem>
        </Menu.RadioGroup>
        <Menu.Sub label="Share">
          <Menu.Item>Copy link</Menu.Item>
        </Menu.Sub>
      </Menu>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Actions' });
  const menu = () => screen.queryByRole('menu');
  const item = (name: string) => screen.getByRole('menuitem', { name });

  describe('without the platform API', () => {
    it('renders nothing but the trigger while it is closed', () => {
      render(<MenuExample />);

      expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
      expect(trigger()).not.toHaveAttribute('aria-controls');
      expect(menu()).toBeNull();
    });

    it('opens and closes from the trigger, and says what it controls', () => {
      render(<MenuExample />);

      fireEvent.click(trigger());

      expect(menu()).not.toBeNull();
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(trigger()).toHaveAttribute('aria-controls', menu()!.id);

      fireEvent.click(trigger());

      expect(menu()).toBeNull();
    });

    it('names the menu after its trigger, and takes a name of its own instead', () => {
      render(<MenuExample defaultOpen />);
      expect(menu()).toHaveAccessibleName('Actions');

      cleanup();
      render(<MenuExample defaultOpen label="Row actions" />);
      expect(menu()).toHaveAccessibleName('Row actions');
    });

    it('marks the items up with the roles a menu owns', () => {
      render(<MenuExample defaultOpen />);

      expect(item('Duplicate')).toHaveAttribute('role', 'menuitem');
      expect(screen.getByRole('menuitemcheckbox', { name: 'Compact rows' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('separator')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Sort by' })).toBeInTheDocument();
    });

    it('chooses an item and closes, reporting select as the reason', () => {
      const onOpenChange = vi.fn();
      render(<MenuExample defaultOpen onOpenChange={onOpenChange} />);

      fireEvent.click(item('Duplicate'));

      expect(onSelect).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'select' satisfies MenuReason }));
      expect(menu()).toBeNull();
    });

    it('keeps the menu open for an item that says so', () => {
      render(
        <Menu defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.Item closeOnSelect={false}>Refresh</Menu.Item>
        </Menu>,
      );

      fireEvent.click(item('Refresh'));

      expect(menu()).not.toBeNull();
    });

    it('leaves a disabled item focusable, silent and open', () => {
      const onOpenChange = vi.fn();
      render(<MenuExample defaultOpen onOpenChange={onOpenChange} />);

      const move = item('Move');
      expect(move).toHaveAttribute('aria-disabled', 'true');
      expect(move).not.toBeDisabled();

      move.focus();
      expect(move).toHaveFocus();

      fireEvent.click(move);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('toggles a checkbox item without closing the menu', () => {
      const onCheckedChange = vi.fn();
      render(
        <Menu defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.CheckboxItem onCheckedChange={onCheckedChange}>Compact rows</Menu.CheckboxItem>
        </Menu>,
      );

      const checkbox = screen.getByRole('menuitemcheckbox');
      expect(checkbox).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(checkbox);

      expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.objectContaining({ reason: 'select' }));
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
      expect(menu()).not.toBeNull();
    });

    it('moves the check inside a radio group', () => {
      const onValueChange = vi.fn();
      render(<MenuExample defaultOpen />);

      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Date' }));

      expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('lets the consumer own the radio value', () => {
      const onValueChange = vi.fn();
      render(
        <Menu defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.RadioGroup value="name" onValueChange={onValueChange}>
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
            <Menu.RadioItem value="date">Date</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu>,
      );

      fireEvent.click(screen.getByRole('menuitemradio', { name: 'Date' }));

      expect(onValueChange).toHaveBeenCalledWith('date', expect.objectContaining({ reason: 'select' }));
      expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
    });

    it('closes on Escape and on a press outside, and not on one inside', () => {
      const onOpenChange = vi.fn();
      render(<MenuExample defaultOpen onOpenChange={onOpenChange} />);

      fireEvent.pointerDown(item('Duplicate'));
      expect(menu()).not.toBeNull();

      fireEvent.pointerDown(document.body);
      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'outside-pointer' satisfies MenuReason }));

      cleanup();
      onOpenChange.mockClear();
      render(<MenuExample defaultOpen onOpenChange={onOpenChange} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'escape' satisfies MenuReason }));
    });

    it('stays where the consumer puts it when it is controlled', () => {
      const onOpenChange = vi.fn();
      render(<MenuExample open={false} onOpenChange={onOpenChange} />);

      fireEvent.click(trigger());

      expect(menu()).toBeNull();
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' satisfies MenuReason }));
    });

    it('moves focus onto the first item when it opens', async () => {
      render(<MenuExample />);

      fireEvent.click(trigger());

      await waitFor(() => expect(item('Duplicate')).toHaveFocus());
    });
  });

  describe('submenus', () => {
    const submenu = () => screen.getAllByRole('menu')[1];

    it('says the item opens a menu, and opens one without closing its parent', async () => {
      const keys = keyboard();
      render(<MenuExample defaultOpen />);

      const share = item('Share');
      expect(share).toHaveAttribute('aria-haspopup', 'menu');
      expect(share).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getAllByRole('menu')).toHaveLength(1);

      share.focus();
      await keys.pressArrow('Right');

      expect(share).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getAllByRole('menu')).toHaveLength(2);
      expect(submenu()).toHaveAccessibleName('Share');
      await waitFor(() => expect(item('Copy link')).toHaveFocus());
    });

    it('opens on hover and closes when focus moves to another item', async () => {
      const keys = keyboard();
      render(<MenuExample defaultOpen />);

      await keys.hover(item('Share'));
      expect(screen.getAllByRole('menu')).toHaveLength(2);

      await keys.hover(item('Duplicate'));
      await waitFor(() => expect(screen.getAllByRole('menu')).toHaveLength(1));
    });

    it('closes the submenu with the arrow pointing back, and puts focus on its item', async () => {
      const keys = keyboard();
      render(<MenuExample defaultOpen />);

      item('Share').focus();
      await keys.pressArrow('Right');
      await waitFor(() => expect(item('Copy link')).toHaveFocus());

      await keys.pressArrow('Left');

      expect(screen.getAllByRole('menu')).toHaveLength(1);
      expect(item('Share')).toHaveFocus();
    });

    it('closes the whole menu when a submenu item is chosen', async () => {
      const keys = keyboard();
      const onOpenChange = vi.fn();
      render(<MenuExample defaultOpen onOpenChange={onOpenChange} />);

      item('Share').focus();
      await keys.pressArrow('Right');
      await keys.click(item('Copy link'));

      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'select' satisfies MenuReason }));
      expect(menu()).toBeNull();
    });

    it('closes the submenu first on Escape, and the menu on the next press', async () => {
      const keys = keyboard();
      render(<MenuExample defaultOpen />);

      item('Share').focus();
      await keys.pressArrow('Right');
      expect(screen.getAllByRole('menu')).toHaveLength(2);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.getAllByRole('menu')).toHaveLength(1);
      expect(item('Share')).toHaveFocus();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(menu()).toBeNull();
    });

    it('opens nothing at all when it is disabled', async () => {
      const keys = keyboard();
      render(
        <Menu defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.Sub label="Share" disabled>
            <Menu.Item>Copy link</Menu.Item>
          </Menu.Sub>
        </Menu>,
      );

      const share = item('Share');
      expect(share).toHaveAttribute('aria-disabled', 'true');

      share.focus();
      await keys.pressArrow('Right');

      expect(screen.getAllByRole('menu')).toHaveLength(1);
      expect(screen.queryByRole('menuitem', { name: 'Copy link' })).toBeNull();
    });

    it('counts a press inside a submenu as a press inside the menu', async () => {
      const keys = keyboard();
      const onOpenChange = vi.fn();
      render(
        <Menu defaultOpen onOpenChange={onOpenChange} trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.Sub label="Share">
            <Menu.CheckboxItem>Include the title</Menu.CheckboxItem>
          </Menu.Sub>
        </Menu>,
      );

      item('Share').focus();
      await keys.pressArrow('Right');

      // The panel is portalled on this path, so nothing about the DOM says it is inside the menu — the
      // menu is told where it is instead.
      fireEvent.pointerDown(screen.getByRole('menuitemcheckbox', { name: 'Include the title' }));

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('on the platform path', () => {
    function renderWithApi(props: Partial<React.ComponentProps<typeof Menu>> = {}) {
      uninstall = installPopoverApi();

      return render(<MenuExample {...props} />);
    }

    // Closed, a popover is `display: none`, so it is out of the accessibility tree and `getByRole`
    // cannot see it. That is the point of the state, and the reason these reach for the element itself.
    const panels = () => [...document.querySelectorAll<HTMLElement>('[popover]')];

    it('renders the menu whether or not it is open, and never portals it', () => {
      renderWithApi();

      const [panel] = panels();
      expect(panel).toHaveAttribute('popover', 'auto');
      expect(panel).toHaveAttribute('role', 'menu');
      expect(panel.parentElement).toBe(trigger().parentElement);
      expect(panel.closest('#box-kite-portal')).toBeNull();
    });

    it('declares a submenu inside the menu it hangs off, which is what nests the two popovers', () => {
      renderWithApi();

      const [panel, sub] = panels();
      expect(sub).toBeDefined();
      expect(panel.contains(sub)).toBe(true);
      // Beside its own item rather than inside it: interactive content in a button is unreachable.
      expect(sub.previousElementSibling).toBe(document.getElementById(sub.getAttribute('aria-labelledby')!));
    });

    it('hands the toggle to the browser with popovertarget', () => {
      renderWithApi();

      expect(trigger()).toHaveAttribute('popovertarget', panels()[0].id);
      // A click handler of ours would fight the light dismiss — see `usePopoverLayer`.
      expect(trigger().onclick).toBeNull();
    });

    it('moves focus onto the first item when the platform shows it', () => {
      renderWithApi();

      act(() => panels()[0].showPopover());

      expect(item('Duplicate')).toHaveFocus();
    });

    it('opens at the last item when the trigger is pressed Up', () => {
      renderWithApi();

      fireEvent.keyDown(trigger(), { key: 'ArrowUp' });

      expect(item('Share')).toHaveFocus();
    });

    it('follows the platform when the platform closes it', () => {
      const onOpenChange = vi.fn();
      renderWithApi({ defaultOpen: true, onOpenChange });

      act(() => panels()[0].hidePopover());

      expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'imperative' satisfies MenuReason }));
      expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes a submenu with the menu, though nothing has unmounted', async () => {
      const keys = keyboard();
      renderWithApi({ defaultOpen: true });

      // Held onto: hidden, the menu is `display: none`, so no role query can reach anything inside it.
      const share = item('Share');

      share.focus();
      await keys.pressArrow('Right');
      expect(panels()[1].matches(':popover-open')).toBe(true);

      act(() => panels()[0].hidePopover());

      expect(panels()[1].matches(':popover-open')).toBe(false);
      expect(share).toHaveAttribute('aria-expanded', 'false');
    });

    it('shows and hides through the platform rather than by unmounting', () => {
      renderWithApi({ defaultOpen: true });

      const [panel] = panels();
      expect(panel.matches(':popover-open')).toBe(true);

      act(() => panel.hidePopover());

      expect(panel.matches(':popover-open')).toBe(false);
      expect(panel).toBeInTheDocument();
    });
  });
});
