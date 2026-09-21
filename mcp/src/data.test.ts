import { describe, expect, it } from 'vitest';
import { priorFacts as agentFacts } from '../../scripts/agentSources.mjs';
import { acceptedValues, component, components, packageName, priorFacts, prop, props, rules } from './data';

describe('the corpora', () => {
  it('holds every style prop the reference measured', () => {
    expect(props).toHaveLength(235);
    expect(prop('fontSize')?.example.css).toBe('font-size: 0.875rem');
  });

  it('answers for a component with an extracted record and for one the manifest alone knows', () => {
    expect(component('Tabs')?.keyboard?.length).toBeGreaterThan(0);
    expect(component('datagrid')?.name).toBe('DataGrid');

    // `H1` has no API page: without the manifest beside them a question about it would be answered
    // "no such component", which is exactly the answer that sends a model back to `<Box tag="h1">`.
    expect(component('H1')?.import).toContain('components/semantics');
  });

  it('reads the palette off the engine rather than out of the truncated reference', () => {
    // `props.json` drops a list over 40 long, and a colour prop's is 300 — the list worth having.
    expect(prop('bgColor')?.values).toBeUndefined();
    expect(acceptedValues('bgColor')).toContain('sky-500');
    expect(acceptedValues('bgColor').length).toBeGreaterThan(280);
  });

  it('splits the rules file on its own numbering', () => {
    expect(rules.length).toBeGreaterThanOrEqual(42);
    expect(rules.map((rule) => rule.number)).toEqual(rules.map((_, index) => index + 1));
    expect(rules[0].heading).toContain('style={{ }}');
  });

  it('states the prior facts exactly as the other agent files do', () => {
    // Two parsers of one block is how a fact comes to be stated two ways. This is the pin.
    expect(priorFacts).toEqual(agentFacts());
  });

  it('is the published package it documents', () => {
    expect(packageName).toBe('@box-kite/react');
    expect(components.length).toBeGreaterThan(60);
  });
});
