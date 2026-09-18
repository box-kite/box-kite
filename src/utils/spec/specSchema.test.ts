import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { CatalogSchema } from '../../core';
import { SpecSchemaSource, specSchema } from './specSchema';

const COLOR: CatalogSchema = { type: 'string', pattern: '^(?:sky|rose)-(?:100|500)$' };

const SOURCE: SpecSchemaSource = {
  components: {
    Flex: {
      description: 'A flex row or column.',
      slots: ['default'],
      events: [],
      props: {
        type: 'object',
        $defs: { color: COLOR },
        properties: { d: { type: 'string', enum: ['row', 'column'] }, bgColor: { $ref: '#/$defs/color' } },
        additionalProperties: false,
      },
    },
    Button: {
      description: 'A button.',
      slots: ['default'],
      events: ['onClick'],
      props: { type: 'object', $defs: { color: COLOR }, properties: { bgColor: { $ref: '#/$defs/color' } }, additionalProperties: false },
    },
    Sparkline: {
      description: 'A trend line.',
      slots: [],
      events: [],
      props: { type: 'object', properties: { data: { type: 'array', items: { type: 'number' } } }, required: ['data'] },
    },
    Tooltip: { description: 'A tooltip.', slots: ['content'], events: [] },
  },
};

const defsOf = (schema: CatalogSchema) => schema.$defs ?? {};

describe('specSchema()', () => {
  const schema = specSchema(SOURCE);
  const defs = defsOf(schema);

  it('offers every component as a node, discriminated by its own name', () => {
    expect(defs.node.anyOf?.map((option) => option.$ref)).toEqual([
      '#/$defs/Flex',
      '#/$defs/Button',
      '#/$defs/Sparkline',
      '#/$defs/Tooltip',
    ]);
    expect(defs.Flex.properties?.type).toEqual({ type: 'string', enum: ['Flex'] });
    expect(defs.Flex.additionalProperties).toBe(false);
  });

  it('gives children only to a component that has somewhere to put them', () => {
    expect(defs.Flex.properties?.children).toEqual({ $ref: '#/$defs/children' });
    expect(defs.Sparkline.properties?.children).toBeUndefined();
    expect(defs.Tooltip.properties?.children).toBeUndefined();
    expect(defs.Tooltip.properties?.slots?.properties?.content).toEqual({ $ref: '#/$defs/children' });
  });

  it('requires the props object only where the component requires something in it', () => {
    expect(defs.Sparkline.required).toEqual(['type', 'props']);
    expect(defs.Flex.required).toEqual(['type']);
    // Nothing a JSON spec can set, so there is no props object to offer at all.
    expect(defs.Tooltip.properties?.props).toBeUndefined();
  });

  it('offers an action for an event, and nothing anywhere else', () => {
    expect(defs.Button.properties?.on?.properties?.onClick).toEqual({ $ref: '#/$defs/action' });
    expect(defs.Flex.properties?.on).toBeUndefined();
    expect(defs.action).toBeDefined();
  });

  it('lifts a component’s own definitions into the document, shared where they agree', () => {
    expect(defs.color).toEqual(COLOR);
    expect(defs.Flex.properties?.props?.$defs).toBeUndefined();
    expect(defs.Flex.properties?.props?.properties?.bgColor).toEqual({ $ref: '#/$defs/color' });
    expect(defs.Button.properties?.props?.properties?.bgColor).toEqual({ $ref: '#/$defs/color' });
  });

  it('renames a definition that disagrees with one already in the document', () => {
    const own: CatalogSchema = { type: 'number' };
    const clash = specSchema({
      components: {
        ...SOURCE.components,
        Gauge: {
          slots: [],
          events: [],
          props: { type: 'object', $defs: { color: own }, properties: { value: { $ref: '#/$defs/color' } } },
        },
      },
    });

    expect(defsOf(clash).color).toEqual(COLOR);
    expect(defsOf(clash).color2).toEqual(own);
    expect(defsOf(clash).Gauge.properties?.props?.properties?.value).toEqual({ $ref: '#/$defs/color2' });
  });

  it('says nothing about data unless bindings are asked for', () => {
    const bound = specSchema(SOURCE, { bindings: true });

    expect(defs.reference).toBeUndefined();
    expect(defs.Flex.properties?.repeat).toBeUndefined();
    expect(defsOf(bound).reference).toBeDefined();
    expect(defsOf(bound).Flex.properties?.repeat).toEqual({ $ref: '#/$defs/reference' });
    expect(defsOf(bound).Flex.properties?.props?.properties?.d).toEqual({
      anyOf: [{ type: 'string', enum: ['row', 'column'] }, { $ref: '#/$defs/reference' }],
    });
  });

  it('narrows what may stand at the root without narrowing what may stand inside it', () => {
    const rooted = specSchema(SOURCE, { root: ['Flex'] });

    expect(rooted.anyOf).toEqual([{ $ref: '#/$defs/Flex' }]);
    expect(defsOf(rooted).node.anyOf).toHaveLength(4);
  });

  /**
   * The point of the whole file: it has to be a schema a model can be *constrained* to, which means a
   * validator has to be buildable from it. `z.fromJSONSchema` is the same one-call adapter the catalog
   * is JSON Schema for.
   */
  describe('as a generation constraint', () => {
    const validator = z.fromJSONSchema(specSchema(SOURCE) as never);

    it('takes a tree the catalog allows', () => {
      const tree = {
        type: 'Flex',
        props: { d: 'column', bgColor: 'sky-500' },
        children: [{ type: 'Button', props: { bgColor: 'rose-100' }, on: { onClick: 'save' }, children: ['Save'] }],
      };

      expect(validator.safeParse(tree).success).toBe(true);
    });

    it('refuses a component nobody allowed, a prop nobody has and a colour outside the palette', () => {
      expect(validator.safeParse({ type: 'DataGrid' }).success).toBe(false);
      expect(validator.safeParse({ type: 'Flex', props: { invented: 1 } }).success).toBe(false);
      expect(validator.safeParse({ type: 'Flex', props: { bgColor: '#ff00ff' } }).success).toBe(false);
    });

    it('refuses children on a component with nowhere to put them, and an event it has not got', () => {
      expect(validator.safeParse({ type: 'Sparkline', props: { data: [1, 2] }, children: ['x'] }).success).toBe(false);
      expect(validator.safeParse({ type: 'Flex', on: { onClick: 'save' } }).success).toBe(false);
    });
  });
});
