import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import Variables from '../../core/variables';
import FlowUtils from './flowUtils';

// xyflow's public contract is its stylesheet: every `--xy-X` it reads, minus the `-default`s it declares and the `-props` twins a prop sets.
const css = readFileSync(createRequire(import.meta.url).resolve('@xyflow/react/dist/style.css'), 'utf8');
const contract = new Set(
  [...css.matchAll(/var\(--(xy-[a-z0-9-]+)/g)].map(([, name]) => name).filter((name) => !/-(default|props)$/.test(name)),
);

describe('FlowUtils', () => {
  it('maps or deliberately leaves every variable the installed xyflow reads', () => {
    const handled = [...Object.keys(FlowUtils.VARIABLES), ...FlowUtils.UNMAPPED];

    expect([...contract].filter((name) => !handled.includes(name))).toEqual([]);
    expect(handled.filter((name) => !contract.has(name))).toEqual([]);
    expect(new Set(handled).size).toBe(handled.length);
  });

  it('reads only its own roles in the mapping', () => {
    const roles = new Set(FlowUtils.ROLES.map(FlowUtils.roleVariable));
    const read = Object.values(FlowUtils.VARIABLES).flatMap((value) => [...value.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name));

    expect(read.length).toBeGreaterThan(0);
    expect(read.filter((name) => !roles.has(name))).toEqual([]);
  });

  it('paints every role from the palette in both themes', () => {
    const tokens = [...Object.values(FlowUtils.LIGHT), ...Object.values(FlowUtils.DARK)];

    expect(tokens.filter((token) => !(token in Variables.colors) && !/^(accent|base)-\d+$/.test(token))).toEqual([]);
    expect(Object.keys(FlowUtils.LIGHT)).toEqual([...FlowUtils.ROLES]);
    expect(Object.keys(FlowUtils.DARK)).toEqual([...FlowUtils.ROLES]);
  });

  it('puts one token in both themes, a pair in one each, and ignores a role it does not know', () => {
    const tokens = { selection: 'sky-500', surface: { dark: 'slate-950' }, bogus: 'red-500' } as FlowUtils.Tokens;

    expect(FlowUtils.roleVariables('light', tokens)).toMatchObject({ 'flow-selection': 'sky-500', 'flow-surface': 'white' });
    expect(FlowUtils.roleVariables('dark', tokens)).toMatchObject({ 'flow-selection': 'sky-500', 'flow-surface': 'slate-950' });
    expect(Object.keys(FlowUtils.roleVariables('light', tokens))).not.toContain('flow-bogus');
  });

  it("answers React Flow's colorMode from the page's theme", () => {
    expect(FlowUtils.colorMode('dark')).toBe('dark');
    expect(FlowUtils.colorMode('light')).toBe('light');
    expect(FlowUtils.colorMode(undefined)).toBe('light');
  });
});
