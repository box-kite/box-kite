// @vitest-environment node
/**
 * The heritage walk, which is the one part of the extraction that can be wrong without failing anything:
 * a prop inherited from another component's props interface is missing from the page, from the catalog
 * and from the manifest, and every generated file still agrees with every other one (bug #185).
 */
import { describe, expect, it } from 'vitest';
import { buildComponentsApi } from './componentsApi.mjs';

const api = buildComponentsApi();
const componentOf = (name) => api.get(name.replace(/[.]/g, '-').toLowerCase());
const propOf = (name, prop) => componentOf(name)?.props.find((entry) => entry.name === prop);

describe('the component API reference', () => {
  it('carries a prop inherited from another component, with the requirement it was declared with', () => {
    // `GaugeProps extends ProgressRingProps`, and a gauge with no value is not a gauge.
    expect(propOf('Gauge', 'value')).toMatchObject({ type: 'number', required: true });
    expect(propOf('Gauge', 'sweep')).toBeDefined();
  });

  it('carries the props a shared type brings, and not the ones it omits', () => {
    // Every chart is an `Svg` underneath, so `label` is what keeps a generated one out of `aria-hidden`.
    for (const chart of ['Sparkline', 'ProgressRing', 'Gauge', 'MiniDonut']) expect(propOf(chart, 'label')).toBeDefined();

    expect(propOf('Sparkline', 'viewBox')).toBeUndefined();
  });

  it('stops where the Box props begin', () => {
    expect(propOf('Sparkline', 'bgColor')).toBeUndefined();
    expect(propOf('Gauge', 'p')).toBeUndefined();
  });

  it('lets a part narrow what it inherited rather than listing it twice', () => {
    const names = componentOf('Menu').parts.find((part) => part.name === 'Menu.CheckboxItem').props.map((prop) => prop.name);

    expect(names.filter((name) => name === 'disabled')).toHaveLength(1);
    expect(names).toContain('checked');
  });
});
