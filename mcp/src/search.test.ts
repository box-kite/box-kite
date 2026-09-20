import { describe, expect, it } from 'vitest';
import { componentsWithProp, resolveComponent, search } from './search';

const names = (query: string, limit = 6) => search(query, { limit }).map((hit) => hit.name);

describe('search_docs', () => {
  it('puts an exact name first', () => {
    expect(search('gap')[0]).toMatchObject({ kind: 'prop', name: 'gap' });
    expect(search('Tabs')[0]).toMatchObject({ kind: 'component', name: 'Tabs' });
  });

  it('finds the prop that takes a value somebody named', () => {
    // `sticky` is a value of `position` and a word in a dozen descriptions: the value has to win.
    expect(names('sticky header')).toContain('position');
  });

  it('answers a goal rather than a name', () => {
    expect(names('fade in when it mounts')).toContain('startingStyle');
    expect(names('style every other row')).toContain('nth');
    expect(names('dark mode')).toContain('theme');
  });

  it('drops the words that only add noise', () => {
    // `in` matches `inline`, `inRange` and `insetRing` before it matches anything meant.
    expect(names('what can I put in a grid')).toEqual(expect.not.arrayContaining(['inRange', 'insetRing']));
    expect(search('')).toHaveLength(0);
  });

  it('keeps a stopword that was the whole query, because several are real keys', () => {
    expect(names('not')).toContain('not');
    expect(names('has')).toContain('has');
  });

  // The ranking is the product, so its answers are pinned. Each of these was wrong at some point
  // while it was being tuned, and the whole set is what stopped one fix from breaking another.
  it.each([
    ['fade in when it mounts', 'startingStyle'],
    ['style every other row', 'nth'],
    ['dark mode', 'theme'],
    ['reduced motion', 'motionReduce'],
    ['text size', 'fontSize'],
    ['dropdown menu with checkboxes', 'Menu'],
    ['container query', 'container'],
  ])('answers %j with %s', (query, expected) => {
    expect(search(query)[0]?.name).toBe(expected);
  });

  it('narrows to one corpus on request', () => {
    expect(search('menu', { kind: 'component' }).every((hit) => hit.kind === 'component')).toBe(true);
    expect(search('menu', { kind: 'rule' }).every((hit) => hit.kind === 'rule')).toBe(true);
  });

  it('names the components a shared prop belongs to, since none of them is in the prop registry', () => {
    expect(componentsWithProp('onValueChange')).toEqual(expect.arrayContaining(['Tabs', 'Slider', 'Accordion']));
    expect(componentsWithProp('p')).toEqual([]);
  });

  it('resolves a part name to the component that owns it', () => {
    expect(resolveComponent('Tabs.Panel')?.name).toBeTruthy();
    expect(resolveComponent('datagrid')?.name).toBe('DataGrid');
    expect(resolveComponent('Nonesuch')).toBeUndefined();
  });
});
