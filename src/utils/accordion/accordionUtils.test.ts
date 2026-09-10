import { describe, expect, it } from 'vitest';
import AccordionUtils from './accordionUtils';

/**
 * The movement and the open set, with no React anywhere: the headers are read off a DOM this builds by
 * hand, which is the point of the model — what is on the page decides, not a registry.
 */
describe('AccordionUtils', () => {
  /** An accordion of `count` headers, with the indices in `disabled` marked. */
  function build(count: number, disabled: number[] = []): HTMLElement {
    const root = document.createElement('div');
    root.setAttribute(AccordionUtils.ROOT_ATTRIBUTE, '');

    for (let index = 0; index < count; index++) {
      const heading = document.createElement('h3');
      const trigger = document.createElement('button');

      trigger.setAttribute(AccordionUtils.TRIGGER_ATTRIBUTE, '');
      trigger.textContent = `Header ${index}`;
      if (disabled.includes(index)) trigger.disabled = true;

      heading.append(trigger);
      root.append(heading);
    }

    return root;
  }

  describe('triggers', () => {
    it('reads the headers off the DOM, in the order they were written', () => {
      const root = build(3);

      expect(AccordionUtils.triggers(root).map((trigger) => trigger.textContent)).toEqual(['Header 0', 'Header 1', 'Header 2']);
    });

    it('has nothing to say about a root that is not there yet', () => {
      expect(AccordionUtils.triggers(null)).toEqual([]);
    });

    it('leaves a nested accordion its own headers', () => {
      const root = build(2);
      const nested = build(2);
      root.append(nested);

      expect(AccordionUtils.triggers(root)).toHaveLength(2);
      expect(AccordionUtils.triggers(nested)).toHaveLength(2);
    });

    it('does not mistake a collapsible inside a panel for a header', () => {
      const root = build(1);
      const loose = document.createElement('button');
      loose.setAttribute('aria-expanded', 'false');
      root.append(loose);

      // A `Collapsible` trigger carries the ARIA but not the marker, which is what the marker is for.
      expect(AccordionUtils.triggers(root)).toHaveLength(1);
    });
  });

  describe('owns', () => {
    it('claims its own headers and disclaims a nested accordion’s', () => {
      const root = build(1);
      const nested = build(1);
      root.append(nested);

      expect(AccordionUtils.owns(root, AccordionUtils.triggers(root)[0])).toBe(true);
      expect(AccordionUtils.owns(root, AccordionUtils.triggers(nested)[0])).toBe(false);
    });

    it('says no to something that is not an element', () => {
      expect(AccordionUtils.owns(build(1), null)).toBe(false);
    });
  });

  describe('isDisabled', () => {
    it('reads both the attribute and the ARIA', () => {
      const [enabled] = AccordionUtils.triggers(build(1));
      const [disabled] = AccordionUtils.triggers(build(1, [0]));
      const aria = document.createElement('button');
      aria.setAttribute('aria-disabled', 'true');

      expect(AccordionUtils.isDisabled(enabled)).toBe(false);
      expect(AccordionUtils.isDisabled(disabled)).toBe(true);
      expect(AccordionUtils.isDisabled(aria)).toBe(true);
    });
  });

  describe('step', () => {
    it('moves to the neighbour in either direction', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.step(triggers, 0, 1, true)).toBe(triggers[1]);
      expect(AccordionUtils.step(triggers, 2, -1, true)).toBe(triggers[1]);
    });

    it('wraps at the ends when it is allowed to', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.step(triggers, 2, 1, true)).toBe(triggers[0]);
      expect(AccordionUtils.step(triggers, 0, -1, true)).toBe(triggers[2]);
    });

    it('stops at the ends when it is not', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.step(triggers, 2, 1, false)).toBeUndefined();
      expect(AccordionUtils.step(triggers, 0, -1, false)).toBeUndefined();
    });

    it('steps over a disabled header', () => {
      const triggers = AccordionUtils.triggers(build(3, [1]));

      expect(AccordionUtils.step(triggers, 0, 1, true)).toBe(triggers[2]);
    });

    it('starts from the near end when nothing inside is focused', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.step(triggers, -1, 1, false)).toBe(triggers[0]);
      expect(AccordionUtils.step(triggers, -1, -1, false)).toBe(triggers[2]);
    });

    it('gives up rather than looping forever when every header is disabled', () => {
      const triggers = AccordionUtils.triggers(build(3, [0, 1, 2]));

      expect(AccordionUtils.step(triggers, 0, 1, true)).toBeUndefined();
    });

    it('has nowhere to go in an empty accordion', () => {
      expect(AccordionUtils.step([], 0, 1, true)).toBeUndefined();
    });
  });

  describe('edge', () => {
    it('finds the first and the last', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.edge(triggers, 1)).toBe(triggers[0]);
      expect(AccordionUtils.edge(triggers, -1)).toBe(triggers[2]);
    });

    it('skips past a disabled header at either end', () => {
      const triggers = AccordionUtils.triggers(build(3, [0, 2]));

      expect(AccordionUtils.edge(triggers, 1)).toBe(triggers[1]);
      expect(AccordionUtils.edge(triggers, -1)).toBe(triggers[1]);
    });
  });

  describe('indexOf', () => {
    it('finds a header, and reports -1 for anything else', () => {
      const triggers = AccordionUtils.triggers(build(2));

      expect(AccordionUtils.indexOf(triggers, triggers[1])).toBe(1);
      expect(AccordionUtils.indexOf(triggers, document.createElement('input'))).toBe(-1);
      expect(AccordionUtils.indexOf(triggers, null)).toBe(-1);
    });
  });

  describe('moveFor', () => {
    it('maps the four keys the pattern uses', () => {
      expect(AccordionUtils.moveFor('ArrowDown')).toEqual({ kind: 'step', delta: 1 });
      expect(AccordionUtils.moveFor('ArrowUp')).toEqual({ kind: 'step', delta: -1 });
      expect(AccordionUtils.moveFor('Home')).toEqual({ kind: 'edge', delta: 1 });
      expect(AccordionUtils.moveFor('End')).toEqual({ kind: 'edge', delta: -1 });
    });

    it('leaves the sideways pair alone, the way APG does', () => {
      expect(AccordionUtils.moveFor('ArrowLeft')).toBeUndefined();
      expect(AccordionUtils.moveFor('ArrowRight')).toBeUndefined();
      expect(AccordionUtils.moveFor('a')).toBeUndefined();
    });
  });

  describe('target', () => {
    it('sends a step to the neighbour and an edge to the end', () => {
      const triggers = AccordionUtils.triggers(build(3));

      expect(AccordionUtils.target(triggers, 0, { kind: 'step', delta: 1 }, true)).toBe(triggers[1]);
      expect(AccordionUtils.target(triggers, 0, { kind: 'edge', delta: -1 }, true)).toBe(triggers[2]);
    });
  });

  describe('toggle', () => {
    it('opens the one that was closed', () => {
      expect(AccordionUtils.toggle([], 'a', false)).toEqual(['a']);
    });

    it('closes the one that was open, so an accordion can stand empty', () => {
      expect(AccordionUtils.toggle(['a'], 'a', false)).toEqual([]);
      expect(AccordionUtils.toggle(['a', 'b'], 'a', true)).toEqual(['b']);
    });

    it('closes the last one when only one may stand open', () => {
      expect(AccordionUtils.toggle(['a'], 'b', false)).toEqual(['b']);
    });

    it('keeps the others when several may', () => {
      expect(AccordionUtils.toggle(['a'], 'b', true)).toEqual(['a', 'b']);
    });

    it('leaves what it was given alone', () => {
      const open = ['a'];
      AccordionUtils.toggle(open, 'b', true);

      expect(open).toEqual(['a']);
    });
  });
});
