import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';
import Menu from './menu';

/**
 * The menu button, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 *
 * The Popover API supplies the top layer and light dismiss; what is tested here is the half APG asks the
 * component for — the roles, the arrow keys, typeahead, and where focus is at each step. The test
 * environment has no Popover API, so this runs the portal path, where `useDismiss` and `useFocusReturn`
 * stand in for the platform. Everything the platform itself does is verified in Chrome.
 */
describe('Menu accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  function MenuExample() {
    return (
      <>
        <Menu trigger={(trigger) => <Button {...trigger}>Actions</Button>}>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Move</Menu.Item>
          <Menu.Item>Merge</Menu.Item>
          <Menu.Item disabled>Rename</Menu.Item>
          <Menu.Separator />
          <Menu.Group label="View">
            <Menu.CheckboxItem>Compact rows</Menu.CheckboxItem>
          </Menu.Group>
          <Menu.RadioGroup label="Sort by" defaultValue="name">
            <Menu.RadioItem value="name">Name</Menu.RadioItem>
            <Menu.RadioItem value="date">Date</Menu.RadioItem>
          </Menu.RadioGroup>
          <Menu.Sub label="Share">
            <Menu.Item>Copy link</Menu.Item>
            <Menu.Item>Email</Menu.Item>
          </Menu.Sub>
        </Menu>
        <Button>After</Button>
      </>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Actions' });
  const menus = () => screen.queryAllByRole('menu');
  const item = (name: string) => screen.getByRole('menuitem', { name });

  it('has no axe violations with the menu and a submenu open', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.pressArrow('Up');
    await keys.pressArrow('Right');

    expect(menus()).toHaveLength(2);
    await expectNoAxeViolations(document.body);
  });

  it('opens from the trigger with the first item focused', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());

    await waitFor(() => expectFocusOn(item('Duplicate')));
  });

  it('opens at the last item on Up and the first on Down', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    trigger().focus();
    await keys.pressArrow('Up');
    await waitFor(() => expectFocusOn(item('Share')));

    await keys.press('Escape');
    trigger().focus();
    await keys.pressArrow('Down');

    await waitFor(() => expectFocusOn(item('Duplicate')));
  });

  it('moves between items with the arrows, wrapping at both ends', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await waitFor(() => expectFocusOn(item('Duplicate')));

    await keys.pressArrow('Down');
    expectFocusOn(item('Move'));

    await keys.pressArrow('Down');
    expectFocusOn(item('Merge'));

    // A disabled item is focusable on purpose: APG asks that a keyboard user find out it is there.
    await keys.pressArrow('Down');
    expectFocusOn(item('Rename'));

    await keys.pressArrow('Up');
    await keys.pressArrow('Up');
    await keys.pressArrow('Up');
    expectFocusOn(item('Duplicate'));

    await keys.pressArrow('Up');
    expectFocusOn(item('Share'));

    await keys.pressArrow('Down');
    expectFocusOn(item('Duplicate'));
  });

  it('jumps to the ends with Home and End', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.press('End');
    expectFocusOn(item('Share'));

    await keys.press('Home');
    expectFocusOn(item('Duplicate'));
  });

  it('finds an item by what is typed, narrowing as more of it arrives', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.type('m');
    expectFocusOn(item('Move'));

    // The same buffer, one letter longer, narrows rather than starting a fresh search — where one letter
    // pressed again would have cycled to the next item starting with it. The cycle and the timeout are `menuUtils.test.ts`.
    await keys.type('e');
    expectFocusOn(item('Merge'));
  });

  it('chooses the item that has focus with Enter, and with Space', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.press('Enter');
    expect(menus()).toHaveLength(0);

    await keys.click(trigger());
    await keys.pressArrow('Down');
    await keys.press(' ');
    expect(menus()).toHaveLength(0);
  });

  it('closes on Escape and puts focus back on the trigger', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.press('Escape');

    expect(menus()).toHaveLength(0);
    expectFocusOn(trigger());
  });

  it('closes on Tab, which is what APG asks of a menu', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.pressTab();

    expect(menus()).toHaveLength(0);
  });

  it('opens a submenu with the inline-end arrow and closes it with the other one', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());
    await keys.press('End');
    expectFocusOn(item('Share'));

    await keys.pressArrow('Right');
    await waitFor(() => expectFocusOn(item('Copy link')));
    expect(menus()).toHaveLength(2);

    await keys.pressArrow('Down');
    expectFocusOn(item('Email'));

    await keys.pressArrow('Left');
    expect(menus()).toHaveLength(1);
    expectFocusOn(item('Share'));
  });

  it('says what the trigger controls, and what a submenu item opens', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    await keys.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', menus()[0].id);
    expect(menus()[0]).toHaveAccessibleName('Actions');

    const share = item('Share');
    expect(share).toHaveAttribute('aria-haspopup', 'menu');
    expect(share).toHaveAttribute('aria-expanded', 'false');

    await keys.press('End');
    await keys.pressArrow('Right');

    expect(share).toHaveAttribute('aria-expanded', 'true');
    expect(share).toHaveAttribute('aria-controls', menus()[1].id);
    expect(menus()[1]).toHaveAccessibleName('Share');
  });

  it('announces a checkbox and a radio item by their state', async () => {
    const keys = keyboard();
    render(<MenuExample />);

    await keys.click(trigger());

    const checkbox = screen.getByRole('menuitemcheckbox', { name: 'Compact rows' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    await keys.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');

    await keys.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');
  });
});
