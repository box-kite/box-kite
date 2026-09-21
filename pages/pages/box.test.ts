import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { siteRoutes } from '../site/site';
import {
  boxMembers,
  categoryCounts,
  categoryOf,
  declarationsFor,
  namedValues,
  nestingKeys,
  propCategories,
  propCount,
  props,
  scaleRows,
  writtenExample,
} from './box';

const root = process.cwd();

/**
 * /box teaches the prop system and /box-functions lists the public surface, so both are claims about
 * generated artifacts: `api/props.json` for the props, `src/box.ts` for the members, and the engine
 * itself for every number. A failure here is a page that has gone stale, not a generator with a bug.
 */
describe('the prop reference the page reads', () => {
  it('is the one the engine was measured into', () => {
    const api = JSON.parse(readFileSync(resolve(root, 'api/props.json'), 'utf8'));

    expect(propCount).toBe(api.propCount);
    expect(props).toHaveLength(api.propCount);
  });

  it('files every prop under exactly one category', () => {
    const counts = categoryCounts();
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    expect(total).toBe(propCount);
  });

  it('leaves no category empty, so the filter never offers a blank list', () => {
    const counts = categoryCounts();

    expect(propCategories.filter((category) => !counts[category.id]).map((category) => category.id)).toEqual([]);
  });

  // The finder renders every row on the server, so one prop the reference spells differently takes the
  // whole page down: a prop past forty values carries `valueCount` and no `values` at all, which it did.
  it('describes every prop without reaching for a field the reference may not have', () => {
    for (const prop of props) {
      expect(writtenExample(prop).startsWith(prop.name), `${prop.name} has no written example`).toBe(true);
      expect(typeof namedValues(prop)).toBe('string');
    }
  });

  // The rules are ordered and the first match wins, which is a decision rather than a derivation — these
  // are the props where two families both have a claim, so a reordering has to break something.
  it.each([
    ['p', 'spacing'],
    ['borderColor', 'color'],
    ['borderRadius', 'border'],
    ['textAnchor', 'svg'],
    ['textShadowColor', 'typography'],
    ['translateX', 'motion'],
    ['ring', 'effects'],
    ['flex1', 'layout'],
    ['maxWidth', 'sizing'],
    ['insetStart', 'position'],
    ['scrollbarGutter', 'control'],
    ['css', 'escape'],
  ])('files %s under %s', (name, category) => {
    const prop = props.find((entry) => entry.name === name);

    expect(prop, `${name} is not in api/props.json`).toBeDefined();
    expect(categoryOf(prop!).id).toBe(category);
  });
});

describe('the scale table', () => {
  it('names props the registry has', () => {
    for (const row of scaleRows)
      expect(
        props.some((prop) => prop.name === row.prop),
        `${row.prop} is not a prop`,
      ).toBe(true);
  });

  // The table's whole point is that one number means nine things, so the engine is asked rather than told.
  it('writes what the page says each family writes', () => {
    expect(declarationsFor('p', 4)).toBe('padding: 1rem');
    expect(declarationsFor('gap', 4)).toBe('gap: 1rem');
    expect(declarationsFor('borderRadius', 4)).toBe('border-radius: 1rem');
    expect(declarationsFor('fontSize', 4)).toBe('font-size: 0.25rem');
    expect(declarationsFor('lineHeight', 4)).toBe('line-height: 4px');
    expect(declarationsFor('b', 4)).toBe('border-width: 4px');
    expect(declarationsFor('strokeWidth', 4)).toBe('stroke-width: 4');
    expect(declarationsFor('transitionDuration', 4)).toBe('transition-duration: 4ms');
  });

  it('answers for the values a reader can actually type, escaped class names included', () => {
    expect(declarationsFor('p', 0)).toBe('padding: 0rem');
    expect(declarationsFor('p', 1.5)).toBe('padding: 0.375rem');
    expect(declarationsFor('p', -2)).toBe('padding: -0.5rem');
  });

  it('answers nothing for a value the prop refuses, rather than inventing one', () => {
    expect(declarationsFor('fontSize', 'enormous')).toBe('');
  });
});

describe('the Box surface', () => {
  const source = readFileSync(resolve(root, 'src/box.ts'), 'utf8');

  it('lists every static the entry assigns to Box', () => {
    const assigned = [...source.matchAll(/^Box\.(\w+) =/gm)].map(([, name]) => `Box.${name}`);
    const listed = boxMembers.map((member) => member.name.replace('()', ''));

    expect(assigned.filter((name) => !listed.includes(name))).toEqual([]);
  });

  it('lists every hook the entry exports beside Box', () => {
    const exported = [...source.matchAll(/export (?:function (use\w+)|\{ (use\w+) \})/g)].map(([, fn, named]) => fn ?? named);
    const listed = boxMembers.map((member) => member.name.replace('()', ''));

    expect(exported.filter((name) => !listed.includes(name))).toEqual([]);
  });

  it('points every "read more" at a route this site serves', () => {
    const paths: string[] = siteRoutes.map((route) => route.path);
    const links = [...boxMembers, ...nestingKeys].flatMap((entry) => (entry.more ? [entry.more] : []));

    expect(links.filter((link) => !paths.includes(link.to)).map((link) => link.to)).toEqual([]);
  });
});
