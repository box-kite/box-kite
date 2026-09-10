import { afterEach, describe, expect, it } from 'vitest';
import TabsUtils from './tabsUtils';

/**
 * The movement model on its own, over real elements: what a key means, which tab it lands on, and the
 * two things the DOM has to carry for either answer to exist — a value and a disabled state.
 */
describe('TabsUtils', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  /** A tablist of `values`, where a value ending in `!` is a disabled tab. */
  function build(values: string[], nested?: string[]): HTMLElement {
    const list = document.createElement('div');
    list.setAttribute('role', 'tablist');

    for (const value of values) {
      const tab = document.createElement('button');
      tab.setAttribute('role', 'tab');
      tab.dataset.value = value.replace('!', '');
      if (value.endsWith('!')) tab.setAttribute('disabled', '');
      list.appendChild(tab);
    }

    if (nested) {
      const inner = build(nested);
      list.appendChild(inner);
    }

    document.body.appendChild(list);

    return list;
  }

  const valuesOf = (tabs: HTMLElement[]) => tabs.map((tab) => TabsUtils.valueOf(tab));

  describe('tabs', () => {
    it('reads the tabs in DOM order', () => {
      const list = build(['one', 'two', 'three']);

      expect(valuesOf(TabsUtils.tabs(list))).toEqual(['one', 'two', 'three']);
    });

    it('leaves a nested tablist to itself', () => {
      const list = build(['one', 'two'], ['inner']);

      expect(valuesOf(TabsUtils.tabs(list))).toEqual(['one', 'two']);
      expect(TabsUtils.owns(list, TabsUtils.tabs(list)[0])).toBe(true);
    });

    it('finds the tabs however deeply they are wrapped', () => {
      const list = build([]);
      const group = document.createElement('div');
      const tab = document.createElement('button');
      tab.setAttribute('role', 'tab');
      tab.dataset.value = 'wrapped';
      group.appendChild(tab);
      list.appendChild(group);

      expect(valuesOf(TabsUtils.tabs(list))).toEqual(['wrapped']);
    });

    it('answers with nothing for no list at all', () => {
      expect(TabsUtils.tabs(null)).toEqual([]);
    });
  });

  describe('isDisabled', () => {
    it('reads the attribute and the ARIA state alike', () => {
      const list = build(['one', 'two!']);
      const [enabled, disabled] = TabsUtils.tabs(list);

      expect(TabsUtils.isDisabled(enabled)).toBe(false);
      expect(TabsUtils.isDisabled(disabled)).toBe(true);

      enabled.setAttribute('aria-disabled', 'true');
      expect(TabsUtils.isDisabled(enabled)).toBe(true);
    });
  });

  describe('moveFor', () => {
    it('reads the reading axis in a horizontal list', () => {
      expect(TabsUtils.moveFor('ArrowRight', 'horizontal')).toEqual({ kind: 'step', delta: 1 });
      expect(TabsUtils.moveFor('ArrowLeft', 'horizontal')).toEqual({ kind: 'step', delta: -1 });
    });

    it('mirrors the arrows in a right-to-left page', () => {
      expect(TabsUtils.moveFor('ArrowLeft', 'horizontal', true)).toEqual({ kind: 'step', delta: 1 });
      expect(TabsUtils.moveFor('ArrowRight', 'horizontal', true)).toEqual({ kind: 'step', delta: -1 });
    });

    it('reads the block axis in a vertical list, and never mirrors it', () => {
      expect(TabsUtils.moveFor('ArrowDown', 'vertical')).toEqual({ kind: 'step', delta: 1 });
      expect(TabsUtils.moveFor('ArrowUp', 'vertical')).toEqual({ kind: 'step', delta: -1 });
      expect(TabsUtils.moveFor('ArrowDown', 'vertical', true)).toEqual({ kind: 'step', delta: 1 });
    });

    it('leaves the off-axis arrows to the page', () => {
      expect(TabsUtils.moveFor('ArrowDown', 'horizontal')).toBeUndefined();
      expect(TabsUtils.moveFor('ArrowUp', 'horizontal')).toBeUndefined();
      expect(TabsUtils.moveFor('ArrowLeft', 'vertical')).toBeUndefined();
      expect(TabsUtils.moveFor('ArrowRight', 'vertical')).toBeUndefined();
    });

    it('takes Home and End on either axis', () => {
      expect(TabsUtils.moveFor('Home', 'horizontal')).toEqual({ kind: 'edge', delta: 1 });
      expect(TabsUtils.moveFor('End', 'vertical')).toEqual({ kind: 'edge', delta: -1 });
    });

    it('means nothing by any other key', () => {
      expect(TabsUtils.moveFor('Enter', 'horizontal')).toBeUndefined();
      expect(TabsUtils.moveFor('a', 'horizontal')).toBeUndefined();
    });
  });

  describe('step', () => {
    it('moves to the neighbour', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two', 'three']));

      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 0, 1, true)!)).toBe('two');
      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 2, -1, true)!)).toBe('two');
    });

    it('wraps at the ends when it may', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two', 'three']));

      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 2, 1, true)!)).toBe('one');
      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 0, -1, true)!)).toBe('three');
    });

    it('stops at the ends when it may not', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two', 'three']));

      expect(TabsUtils.step(tabs, 2, 1, false)).toBeUndefined();
      expect(TabsUtils.step(tabs, 0, -1, false)).toBeUndefined();
    });

    it('steps over a disabled tab', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two!', 'three']));

      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 0, 1, true)!)).toBe('three');
      expect(TabsUtils.valueOf(TabsUtils.step(tabs, 2, -1, true)!)).toBe('one');
    });

    it('starts from the matching end when nothing is focused', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two', 'three']));

      expect(TabsUtils.valueOf(TabsUtils.step(tabs, -1, 1, true)!)).toBe('one');
      expect(TabsUtils.valueOf(TabsUtils.step(tabs, -1, -1, true)!)).toBe('three');
    });

    it('gives up rather than looping forever when every tab is disabled', () => {
      const tabs = TabsUtils.tabs(build(['one!', 'two!']));

      expect(TabsUtils.step(tabs, 0, 1, true)).toBeUndefined();
    });

    it('has nowhere to go in an empty list', () => {
      expect(TabsUtils.step([], 0, 1, true)).toBeUndefined();
    });
  });

  describe('edge', () => {
    it('takes the first and the last selectable tab', () => {
      const tabs = TabsUtils.tabs(build(['one!', 'two', 'three', 'four!']));

      expect(TabsUtils.valueOf(TabsUtils.edge(tabs, 1)!)).toBe('two');
      expect(TabsUtils.valueOf(TabsUtils.edge(tabs, -1)!)).toBe('three');
    });
  });

  describe('target', () => {
    it('routes an edge move past the loop rule', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two', 'three']));

      expect(TabsUtils.valueOf(TabsUtils.target(tabs, 1, { kind: 'edge', delta: -1 }, false)!)).toBe('three');
      expect(TabsUtils.valueOf(TabsUtils.target(tabs, 1, { kind: 'step', delta: 1 }, false)!)).toBe('three');
    });
  });

  describe('indexOf', () => {
    it('places a tab, and refuses anything else', () => {
      const tabs = TabsUtils.tabs(build(['one', 'two']));

      expect(TabsUtils.indexOf(tabs, tabs[1])).toBe(1);
      expect(TabsUtils.indexOf(tabs, document.body)).toBe(-1);
      expect(TabsUtils.indexOf(tabs, null)).toBe(-1);
    });
  });

  describe('token', () => {
    it('leaves an id-safe value alone', () => {
      expect(TabsUtils.token('overview')).toBe('overview');
      expect(TabsUtils.token('my-tab-2')).toBe('my-tab-2');
    });

    it('escapes what an id or a selector cannot carry', () => {
      expect(TabsUtils.token('my tab')).not.toContain(' ');
      expect(TabsUtils.token('a.b')).not.toContain('.');
      expect(TabsUtils.token('a:b/c')).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('keeps two values that differ only in punctuation apart', () => {
      // An `aria-controls` is a space-separated list, so a value collapsed into another names two
      // elements or the wrong one.
      const values = ['a b', 'a_b', 'a-b', 'a.b', 'a:b', 'a_20_b'];
      const tokens = values.map(TabsUtils.token);

      expect(new Set(tokens).size).toBe(values.length);
    });
  });
  describe('selectedTab', () => {
    it('reads the selected tab off the attribute the component writes', () => {
      const list = build(['one', 'two', 'three']);
      TabsUtils.tabs(list)[1].setAttribute('aria-selected', 'true');

      expect(TabsUtils.valueOf(TabsUtils.selectedTab(list)!)).toBe('two');
    });

    it('has no answer when nothing is selected', () => {
      expect(TabsUtils.selectedTab(build(['one', 'two']))).toBeUndefined();
      expect(TabsUtils.selectedTab(null)).toBeUndefined();
    });

    it('leaves the selection of a nested list to that list', () => {
      const list = build(['one'], ['inner']);
      const inner = list.querySelector('[role="tablist"]')!;
      TabsUtils.tabs(inner)[0].setAttribute('aria-selected', 'true');

      expect(TabsUtils.selectedTab(list)).toBeUndefined();
      expect(TabsUtils.valueOf(TabsUtils.selectedTab(inner)!)).toBe('inner');
    });
  });

  describe('bounds', () => {
    /** No layout in this environment either, so the two rectangles *are* the input. */
    function stub(element: Element, box: { top: number; left: number; width: number; height: number }) {
      element.getBoundingClientRect = () => box as DOMRect;
    }

    it('measures the tab against its list rather than the page', () => {
      const list = build(['one']);
      const tab = TabsUtils.tabs(list)[0];
      stub(list, { top: 40, left: 100, width: 600, height: 40 });
      stub(tab, { top: 40, left: 180, width: 80, height: 40 });

      // 80, not 180: an indicator placed from the origin of the viewport would sit off the end of its list.
      expect(TabsUtils.bounds(list, tab, 'horizontal')).toEqual({ start: 80, size: 80 });
    });

    it('turns onto the block axis for a vertical list', () => {
      const list = build(['one']);
      const tab = TabsUtils.tabs(list)[0];
      stub(list, { top: 40, left: 100, width: 200, height: 300 });
      stub(tab, { top: 76, left: 100, width: 200, height: 36 });

      expect(TabsUtils.bounds(list, tab, 'vertical')).toEqual({ start: 36, size: 36 });
    });

    it('adds back the offset of a list that scrolls, which is a list the consumer set up', () => {
      const list = build(['one']);
      const tab = TabsUtils.tabs(list)[0];
      stub(list, { top: 0, left: 0, width: 300, height: 40 });
      stub(tab, { top: 0, left: -120, width: 80, height: 40 });
      Object.defineProperty(list, 'scrollLeft', { value: 200, configurable: true });

      // A tab scrolled out to the left has a negative rectangle: without the scroll offset the indicator
      // would follow it off the list instead of staying on the tab.
      expect(TabsUtils.bounds(list, tab, 'horizontal').start).toBe(80);
    });
  });

  describe('sameBounds', () => {
    it('is what stops a reflow that moved nothing costing a render', () => {
      expect(TabsUtils.sameBounds({ start: 8, size: 80 }, { start: 8, size: 80 })).toBe(true);
      expect(TabsUtils.sameBounds({ start: 8, size: 80 }, { start: 8, size: 81 })).toBe(false);
      expect(TabsUtils.sameBounds(undefined, undefined)).toBe(true);
      expect(TabsUtils.sameBounds(undefined, { start: 0, size: 0 })).toBe(false);
    });
  });

  describe('visiblePanel', () => {
    /** A container of panels, where a value ending in `!` is one that is hidden. */
    function panels(values: string[]): HTMLElement {
      const container = document.createElement('div');

      for (const value of values) {
        const panel = document.createElement('div');
        panel.setAttribute('role', 'tabpanel');
        panel.dataset.value = value.replace('!', '');
        if (value.endsWith('!')) panel.setAttribute('hidden', '');
        container.appendChild(panel);
      }

      document.body.appendChild(container);

      return container;
    }

    it('finds the only panel there is', () => {
      expect(TabsUtils.visiblePanel(panels(['one']))?.dataset.value).toBe('one');
    });

    it('skips the panels a keepMounted widget is hiding', () => {
      expect(TabsUtils.visiblePanel(panels(['one!', 'two', 'three!']))?.dataset.value).toBe('two');
    });

    it('has no answer when every panel is hidden, or there is none', () => {
      expect(TabsUtils.visiblePanel(panels(['one!', 'two!']))).toBeUndefined();
      expect(TabsUtils.visiblePanel(panels([]))).toBeUndefined();
      expect(TabsUtils.visiblePanel(null)).toBeUndefined();
    });
  });
});
