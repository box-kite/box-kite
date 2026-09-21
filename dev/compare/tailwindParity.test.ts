import { describe, expect, it } from 'vitest';
import {
  breakpoints,
  cssStyles,
  mediaFeatures,
  pseudo1,
  pseudo2,
  pseudoElements,
  startingStyleKey,
  themeGroupClass,
} from '../../src/core/boxStyles';
import Containers from '../../src/core/containers';
import Groups from '../../src/core/groups';
import Variants from '../../src/core/variants';
import { allGroups, propertyGroups, variantGroups } from './tailwindParity';

/**
 * The parity table is a promise about the registry, so it is held to it in both directions: a prop it
 * names has to exist, and a prop that exists has to be named. A prop added without a row here fails —
 * which is the only way a published gap table stays true a release later.
 */
describe('the Tailwind parity table', () => {
  const named = (groups: typeof allGroups) => new Set(groups.flatMap((group) => group.rows.flatMap((row) => row.props)));

  const nestingKeys = {
    ...pseudo1,
    ...pseudo2,
    ...pseudoElements,
    ...Variants.variantKeys,
    ...Groups.groupKeys,
    ...themeGroupClass,
    ...startingStyleKey,
    ...breakpoints,
    ...mediaFeatures,
    ...Containers.containerQueryKey,
  };

  it('names props that exist', () => {
    const registry = new Set([...Object.keys(cssStyles), ...Object.keys(nestingKeys)]);

    expect([...named(allGroups)].filter((prop) => !registry.has(prop))).toEqual([]);
  });

  it('names every CSS prop the registry holds', () => {
    const covered = named(propertyGroups);

    expect(Object.keys(cssStyles).filter((prop) => !covered.has(prop))).toEqual([]);
  });

  it('names every nesting key', () => {
    const covered = named(variantGroups);
    // `placeholderStyles` is the deprecated spelling of `placeholder`, and the five `*Group` props are
    // the deprecated spelling of `group`: a table of what to write does not list either.
    const deprecated = new Set(['placeholderStyles', 'hoverGroup', 'focusGroup', 'activeGroup', 'disabledGroup', 'selectedGroup']);

    expect(Object.keys(nestingKeys).filter((key) => !covered.has(key) && !deprecated.has(key))).toEqual([]);
  });

  it('explains itself wherever it is not a plain yes', () => {
    const unexplained = allGroups.flatMap((group) =>
      group.rows.filter((row) => row.status !== 'has' && !row.note).map((row) => `${group.name}: ${row.tailwind}`),
    );

    expect(unexplained).toEqual([]);
  });

  it('has no row claiming coverage with no prop behind it', () => {
    const wrong = allGroups.flatMap((group) =>
      group.rows.filter((row) => (row.status === 'none') !== (row.props.length === 0)).map((row) => `${group.name}: ${row.tailwind}`),
    );

    expect(wrong).toEqual([]);
  });
});
