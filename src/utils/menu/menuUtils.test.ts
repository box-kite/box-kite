import { beforeEach, describe, expect, it } from 'vitest';
import MenuUtils from './menuUtils';

/** A menu with a group, a separator, a disabled item and a submenu declared inside it. */
const markup = `
  <div id="menu" role="menu">
    <button id="duplicate" role="menuitem">Duplicate</button>
    <button id="move" role="menuitem">Move</button>
    <button id="rename" role="menuitem" aria-disabled="true">Rename</button>
    <div role="separator"></div>
    <div role="group" aria-label="View">
      <div role="presentation">View</div>
      <button id="compact" role="menuitemcheckbox" aria-checked="false">Compact rows</button>
      <button id="date" role="menuitemradio" aria-checked="true">Date</button>
    </div>
    <button id="share" role="menuitem" aria-haspopup="menu" aria-expanded="true">Share</button>
    <div id="submenu" role="menu">
      <button id="copy" role="menuitem">Copy link</button>
    </div>
  </div>
`;

describe('MenuUtils', () => {
  const element = (id: string) => document.getElementById(id)!;
  const menu = () => element('menu');

  beforeEach(() => {
    document.body.innerHTML = markup;
  });

  describe('owns', () => {
    it('claims the items written in the panel, however deeply they are wrapped', () => {
      expect(MenuUtils.owns(menu(), element('duplicate'))).toBe(true);
      expect(MenuUtils.owns(menu(), element('compact'))).toBe(true);
      expect(MenuUtils.owns(menu(), menu())).toBe(true);
    });

    it('leaves a submenu its own items', () => {
      expect(MenuUtils.owns(menu(), element('copy'))).toBe(false);
      expect(MenuUtils.owns(element('submenu'), element('copy'))).toBe(true);
    });

    it('answers false for anything outside and for nothing at all', () => {
      expect(MenuUtils.owns(menu(), document.body)).toBe(false);
      expect(MenuUtils.owns(menu(), null)).toBe(false);
    });
  });

  describe('items', () => {
    it('is every role a menu item carries, in the order they are written', () => {
      expect(MenuUtils.items(menu()).map((item) => item.id)).toEqual(['duplicate', 'move', 'rename', 'compact', 'date', 'share']);
    });

    it('counts a separator, a group and a label as none of them', () => {
      expect(MenuUtils.items(menu()).some((item) => item.getAttribute('role') === 'separator')).toBe(false);
    });

    it("is the submenu's own list inside the submenu", () => {
      expect(MenuUtils.items(element('submenu')).map((item) => item.id)).toEqual(['copy']);
    });
  });

  describe('step', () => {
    it('moves one item in either direction', () => {
      const items = MenuUtils.items(menu());

      expect(MenuUtils.step(items, 0, 1)?.id).toBe('move');
      expect(MenuUtils.step(items, 2, -1)?.id).toBe('move');
    });

    it('wraps at both ends, which is what a menu does', () => {
      const items = MenuUtils.items(menu());

      expect(MenuUtils.step(items, items.length - 1, 1)?.id).toBe('duplicate');
      expect(MenuUtils.step(items, 0, -1)?.id).toBe('share');
    });

    it('starts at the near end when nothing has focus yet', () => {
      const items = MenuUtils.items(menu());

      expect(MenuUtils.step(items, -1, 1)?.id).toBe('duplicate');
      expect(MenuUtils.step(items, -1, -1)?.id).toBe('share');
    });

    it('has nowhere to go in an empty menu', () => {
      expect(MenuUtils.step([], 0, 1)).toBeUndefined();
    });

    it('does not skip a disabled item, because APG asks that it stay reachable', () => {
      const items = MenuUtils.items(menu());

      expect(MenuUtils.step(items, 1, 1)?.id).toBe('rename');
      expect(MenuUtils.isDisabled(element('rename'))).toBe(true);
      expect(MenuUtils.isDisabled(element('move'))).toBe(false);
    });
  });

  it('knows an item that opens a submenu', () => {
    expect(MenuUtils.isSubTrigger(element('share'))).toBe(true);
    expect(MenuUtils.isSubTrigger(element('move'))).toBe(false);
  });

  describe('typeaheadTarget', () => {
    it('searches from after the item that has focus, so one letter cycles', () => {
      const items = MenuUtils.items(menu());

      // Two items start with a "d": from the first, the letter lands on the second.
      expect(MenuUtils.typeaheadTarget(items, 'd', 0)?.id).toBe('date');
      expect(MenuUtils.typeaheadTarget(items, 'd', 4)?.id).toBe('duplicate');
    });

    it('treats a longer buffer as a prefix, matched from the item that has focus', () => {
      const items = MenuUtils.items(menu());

      expect(MenuUtils.typeaheadTarget(items, 'du', 4)?.id).toBe('duplicate');
      expect(MenuUtils.typeaheadTarget(items, 'da', 0)?.id).toBe('date');
    });

    it('finds nothing when nothing starts with it', () => {
      expect(MenuUtils.typeaheadTarget(MenuUtils.items(menu()), 'zz', 0)).toBeUndefined();
    });
  });
});
