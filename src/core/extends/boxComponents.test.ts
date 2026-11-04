import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';
import Sizes from '../sizes';
import boxComponents from './boxComponents';

/**
 * The grid cell's ring is the one component style whose *selector* is the point: it marks the cell the
 * grid is on (bug #64), and a mark a copy acts on cannot be a state of the focus. No browser test
 * catches it — jsdom computes no outline — but the rule text the engine writes does.
 */
describe('datagrid.body.cell current-cell ring', () => {
  it('is a plain class, so the mark outlives the focus that put it there', () => {
    const engine = makeEngine('datagrid-cell-current-ring');

    renderStyles(engine, { component: 'datagrid.body.cell', variant: { isCurrentCell: true } } as never);
    const ring = ruleList(engine).filter((rule) => rule.includes('outline'));

    expect(ring.length).toBeGreaterThan(0);

    for (const rule of ring) {
      // Neither half of the interim rule may come back: `:focus-visible` never matches a pointer at all,
      // and `:focus-within` goes out with the focus, leaving a copy with nothing to act on.
      expect(rule).not.toContain(':focus');
    }
  });

  it('draws nothing until the model says a cell is current', () => {
    const engine = makeEngine('datagrid-cell-no-ring');

    renderStyles(engine, { component: 'datagrid.body.cell' } as never);

    expect(ruleList(engine).filter((rule) => rule.includes('outline'))).toHaveLength(0);
  });
});

/** Safari's computed `position-area` carries the flip, which a starting style lacks (#300) and a hidden popover drops (#301). */
describe('anchored panels', () => {
  it.each([
    ['popover', 'all, overflow, position-area, margin', 'ease, step-end, step-start, step-start', 'ease, step-start, step-end, step-end'],
    ['menu', 'all, position-area, margin', 'ease, step-start, step-start', 'ease, step-end, step-end'],
  ])('%s lands a flip at once and holds it through the exit', (component, property, entrance, exit) => {
    const engine = makeEngine(`${component}-anchored-flip`);

    renderStyles(engine, { component, variant: { topLayer: true } } as never);
    const rules = ruleList(engine);
    const timing = (rule: string) => rule.match(/transition-timing-function:([^;}]*)/)?.[1];

    expect(rules.join('\n')).toContain(`transition-property:${property}`);
    expect(rules.filter((rule) => !rule.includes(':not(')).map(timing)).toContain(entrance);
    expect(rules.filter((rule) => rule.includes(':not(')).map(timing)).toContain(exit);
  });
});

// Bug #325: each control's height fell out of its own padding (46, 36 and 34px side by side), so a field
// and the button beside it never lined up. jsdom has no layout, so the test is that they all read the standard.
describe('the size standard', () => {
  type Entry = {
    extends?: string;
    styles: Record<string, unknown>;
    variants?: Record<string, Record<string, unknown>>;
    children?: Record<string, Entry>;
  };
  const entry = (path: string) =>
    path
      .split('.')
      .reduce<Entry>(
        (found, name, index) => (index ? found.children![name] : (boxComponents as unknown as Record<string, Entry>)[name]),
        {} as Entry,
      );
  const styleOf = (path: string, property: string) => {
    const found = entry(path);
    // A date field is a text box underneath, and takes its height from there.
    return found.styles[property] ?? (found.extends ? entry(found.extends).styles[property] : undefined);
  };

  it.each([
    ['button', 'height'],
    ['textbox', 'height'],
    ['dropdown', 'height'],
    ['dateField', 'height'],
    ['combobox', 'minHeight'],
    ['menu.item', 'minHeight'],
    ['tabs.tab', 'minHeight'],
    ['accordion.trigger', 'minHeight'],
    ['dropdown.item', 'minHeight'],
    ['combobox.item', 'minHeight'],
  ])('%s is the height and the text size of the size in force', (path, property) => {
    expect(styleOf(path, property)).toBe('control');
    expect(styleOf(path, 'fontSize')).toBe('control');
  });

  it.each([
    'button',
    'textbox',
    'textarea',
    'dropdown',
    'dropdown.items',
    'combobox',
    'combobox.items',
    'dateField',
    'calendar',
    'popover',
    'dialog',
    'menu',
    'tabs',
    'accordion',
    'checkbox',
    'radioButton',
    'switch',
    'slider',
  ])('%s takes compact, normal and large, and each one sets the size for everything inside', (path) => {
    const variants = entry(path).variants!;

    expect(variants.compact.vars).toEqual(Sizes.choose('compact'));
    expect(variants.normal.vars).toEqual(Sizes.choose('normal'));
    expect(variants.large.vars).toEqual(Sizes.choose('large'));
  });
});
