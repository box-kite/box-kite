import { memo } from 'react';
import { describe, expect, it } from 'vitest';
import type { CatalogSchema } from '../../core';
import { createSpecRegistry } from './specRegistry';

function Thing() {
  return <span>thing</span>;
}

const props: CatalogSchema = { type: 'object', properties: { size: { type: 'number' } }, additionalProperties: false };

describe('createSpecRegistry', () => {
  it('takes a component as it stands — and a memoized one is an object, not a function', () => {
    const Memoized = memo(Thing);
    const registry = createSpecRegistry({ components: { Thing, Memoized } });

    expect(registry.get('Thing')?.component).toBe(Thing);
    expect(registry.get('Memoized')?.component).toBe(Memoized);
  });

  it('gives a component nobody described no props and the ordinary children slot', () => {
    const entry = createSpecRegistry({ components: { Thing } }).get('Thing');

    expect(entry?.props).toBeUndefined();
    expect(entry?.slots).toEqual(['default']);
    expect(entry?.events).toEqual([]);
  });

  it('takes the catalog’s rules for a component the catalog describes', () => {
    const catalog = { components: { Thing: { description: 'A thing.', props, slots: ['body'], events: ['onPick'] } } };
    const entry = createSpecRegistry({ catalog, components: { Thing } }).get('Thing');

    expect(entry).toMatchObject({ slots: ['body'], events: ['onPick'], description: 'A thing.', props });
  });

  it('lets the app narrow what the catalog described, prop by prop', () => {
    const catalog = { components: { Thing: { props, slots: ['default'], events: ['onPick'] } } };
    const registry = createSpecRegistry({ catalog, components: { Thing: { component: Thing, events: [] } } });

    expect(registry.get('Thing')?.events).toEqual([]);
    expect(registry.get('Thing')?.props).toBe(props);
  });

  it('answers for a name nobody registered the way it answers for any other', () => {
    const registry = createSpecRegistry({ components: { Thing } });

    expect(registry.get('Dialog')).toBeUndefined();
    // A record would have answered this one with `Object`'s own.
    expect(registry.get('constructor')).toBeUndefined();
    expect(registry.names).toEqual(['Thing']);
  });

  it('hands its rules on as the source `specSchema()` takes', () => {
    const registry = createSpecRegistry({ components: { Thing: { component: Thing, props, slots: [], events: ['onPick'] } } });

    expect(registry.components).toEqual({ Thing: { props, slots: [], events: ['onPick'], description: undefined } });
  });
});
