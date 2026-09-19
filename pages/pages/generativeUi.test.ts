import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { renderSpec, specSchema } from '../../src/spec';
import { renderToStaticMarkup } from '../../src/ssg';
import { parsePartialJson } from '../utils/partialJson';
import { DEMOS, DEMO_REGISTRY, REFUSED_SPEC } from './generativeUi';

/**
 * A recording is only worth showing if it is a spec the loop would really have accepted: the schema the
 * model would have generated under has to admit it, and the renderer has to render it with nothing
 * refused. Both ends are checked here, because a hand-written fixture is the one place they can drift.
 */
const validator = z.fromJSONSchema(specSchema(DEMO_REGISTRY, { bindings: true }) as never);

describe('the recorded generations', () => {
  it.each(DEMOS.map((demo) => [demo.id, demo] as const))('%s is a spec the schema allows', (_id, demo) => {
    expect(validator.safeParse(JSON.parse(demo.spec)).success).toBe(true);
  });

  it.each(DEMOS.map((demo) => [demo.id, demo] as const))('%s renders with nothing refused', (_id, demo) => {
    const { issues } = renderSpec(JSON.parse(demo.spec), { registry: DEMO_REGISTRY, data: demo.data });

    expect(issues).toEqual([]);
  });

  it('binds the host data rather than carrying it', () => {
    const sales = DEMOS[0];
    const { html } = renderToStaticMarkup(
      createElement(Fragment, null, renderSpec(JSON.parse(sales.spec), { registry: DEMO_REGISTRY, data: sales.data }).element),
      false,
    );

    expect(sales.spec).not.toContain('Ana Muresan');
    expect(html).toContain('Recent orders');
    expect(html).toContain('Ana Muresan');
  });

  it('replays a character at a time without throwing, and ends at what it recorded', () => {
    for (const demo of DEMOS) {
      const frames = Array.from({ length: 60 }, (_, step) => demo.spec.slice(0, Math.ceil((demo.spec.length * (step + 1)) / 60)));

      for (const frame of frames)
        expect(() => renderSpec(parsePartialJson(frame), { registry: DEMO_REGISTRY, data: demo.data })).not.toThrow();

      expect(parsePartialJson(demo.spec)).toEqual(JSON.parse(demo.spec));
    }
  });
});

describe('the spec that asks for more than it may have', () => {
  const { issues } = renderSpec(REFUSED_SPEC, { registry: DEMO_REGISTRY, data: DEMOS[0].data });

  it('refuses each one and says which', () => {
    // The ring is refused twice over on purpose: the path resolves to nothing, and a ring with no
    // value cannot render at all — which is what keeps a component from being handed `undefined`.
    expect(issues.map((issue) => issue.code).sort()).toEqual([
      'invalid-prop',
      'missing-prop',
      'unknown-component',
      'unknown-event',
      'unresolved-data',
    ]);
  });

  it('is refused by the schema before it is ever rendered', () => {
    expect(validator.safeParse(REFUSED_SPEC).success).toBe(false);
  });

  it('renders the rest of the tree around them', () => {
    const { html } = renderToStaticMarkup(
      createElement(Fragment, null, renderSpec(REFUSED_SPEC, { registry: DEMO_REGISTRY, data: DEMOS[0].data }).element),
      false,
    );

    expect(html).toContain('Revenue');
    expect(html).not.toContain('iframe');
  });
});
