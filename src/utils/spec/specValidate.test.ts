import { describe, expect, it } from 'vitest';
import type { CatalogSchema } from '../../core';
import SpecValidate from './specValidate';

const COLOR: CatalogSchema = { type: 'string', pattern: '^(?:sky|rose)-(?:100|500)(?:\\/(?:100|\\d{1,2}))?$' };

describe('SpecValidate.matches', () => {
  it('judges the primitives, and refuses a number that cannot be written as JSON', () => {
    expect(SpecValidate.matches({ type: 'string' }, 'text')).toBe(true);
    expect(SpecValidate.matches({ type: 'string' }, 4)).toBe(false);
    expect(SpecValidate.matches({ type: 'number' }, 4.5)).toBe(true);
    expect(SpecValidate.matches({ type: 'number' }, Number.NaN)).toBe(false);
    expect(SpecValidate.matches({ type: 'number' }, Number.POSITIVE_INFINITY)).toBe(false);
    expect(SpecValidate.matches({ type: 'integer' }, 4.5)).toBe(false);
    expect(SpecValidate.matches({ type: 'boolean' }, false)).toBe(true);
    expect(SpecValidate.matches({ type: 'boolean' }, 'false')).toBe(false);
  });

  it('holds a value to its enum and its pattern', () => {
    expect(SpecValidate.matches({ type: 'string', enum: ['row', 'column'] }, 'row')).toBe(true);
    expect(SpecValidate.matches({ type: 'string', enum: ['row', 'column'] }, 'sideways')).toBe(false);
    expect(SpecValidate.matches(COLOR, 'sky-500/40')).toBe(true);
    expect(SpecValidate.matches(COLOR, '#ff00ff')).toBe(false);
  });

  it('takes any branch of an anyOf', () => {
    const schema: CatalogSchema = { anyOf: [{ type: 'number' }, { type: 'string', enum: ['auto'] }] };

    expect(SpecValidate.matches(schema, 4)).toBe(true);
    expect(SpecValidate.matches(schema, 'auto')).toBe(true);
    expect(SpecValidate.matches(schema, 'fit')).toBe(false);
  });

  it('checks every item of an array', () => {
    expect(SpecValidate.matches({ type: 'array', items: { type: 'number' } }, [1, 2, 3])).toBe(true);
    expect(SpecValidate.matches({ type: 'array', items: { type: 'number' } }, [1, '2'])).toBe(false);
    expect(SpecValidate.matches({ type: 'array', items: { type: 'number' } }, 1)).toBe(false);
  });

  it('checks an object property by property, and closes it where the schema is closed', () => {
    const schema: CatalogSchema = {
      type: 'object',
      properties: { linear: { type: 'string' }, colors: { type: 'array', items: COLOR } },
      required: ['colors'],
      additionalProperties: false,
    };

    expect(SpecValidate.matches(schema, { linear: 'r', colors: ['sky-500', 'rose-100'] })).toBe(true);
    expect(SpecValidate.matches(schema, { linear: 'r' })).toBe(false);
    expect(SpecValidate.matches(schema, { colors: ['sky-500'], interpolat: 'oklch' })).toBe(false);
    expect(SpecValidate.matches(schema, { colors: ['#ff00ff'] })).toBe(false);
  });

  it('follows a local $ref, and refuses the value when the pointer names nothing', () => {
    const schema: CatalogSchema = { $defs: { color: COLOR }, type: 'object', properties: { bgColor: { $ref: '#/$defs/color' } } };
    const broken: CatalogSchema = { $defs: { color: COLOR }, type: 'object', properties: { bgColor: { $ref: '#/$defs/colour' } } };

    expect(SpecValidate.matches(schema, { bgColor: 'sky-500' })).toBe(true);
    expect(SpecValidate.matches(schema, { bgColor: 'ultramarine' })).toBe(false);
    // The safe direction: a typo in a host's schema must not turn a prop into an open one.
    expect(SpecValidate.matches(broken, { bgColor: 'sky-500' })).toBe(false);
  });

  it('refuses a key that is not a key, whatever the schema says about the rest', () => {
    const open: CatalogSchema = { type: 'object', properties: { href: { type: 'string' } } };

    expect(SpecValidate.matches(open, { href: '/about', title: 'About' })).toBe(true);
    expect(SpecValidate.matches(open, JSON.parse('{ "__proto__": { "polluted": true } }'))).toBe(false);
    expect(SpecValidate.isSafeKey('constructor')).toBe(false);
  });

  it('validates nothing rather than throwing when a pattern will not compile', () => {
    expect(SpecValidate.matches({ type: 'string', pattern: '^(unclosed' }, 'anything')).toBe(false);
  });
});
