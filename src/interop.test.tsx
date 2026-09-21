import type { GenerativeUINode, GenerativeUISpec, ToolCallMessagePartStatus } from '@assistant-ui/core';
import { createCatalog, extractSchema } from '@copilotkit/a2ui-renderer';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { catalog } from './catalog';
import Flex from './components/flex';
import { H2, P } from './components/semantics';
import {
  a2uiApplyAll,
  a2uiCatalog,
  a2uiComponentSchema,
  a2uiEmpty,
  a2uiSurface,
  a2uiToSpec,
  fromGenerativeUi,
  toGenerativeUi,
  toolPart,
} from './interop';
import type { GenerativeUiSpec } from './interop';

/**
 * The adapters against the runtimes they adapt, rather than against a memory of them. Each package is a
 * devDependency for exactly this: a shape read off a blog post is a shape that has already moved, and
 * the two claims worth making — *their* type accepts what we emit, and *their* function takes what we
 * built — can only be made against the published `.d.ts` and the published function.
 */
const ALLOWED = ['Flex', 'H2', 'P'];
const STYLE_PROPS = ['d', 'p', 'gap', 'bgColor', 'fontSize'];

const box = catalog({ include: ALLOWED, styleProps: STYLE_PROPS });

describe('assistant-ui', () => {
  // Their `GenerativeUISpec` and ours are the same idea arrived at twice; this is the compiler saying so.
  it('takes what toGenerativeUi emits, as their own type', () => {
    const { spec } = toGenerativeUi({ type: 'Flex', props: { gap: 4 }, children: [{ type: 'H2', children: 'Revenue' }] });
    const theirs: GenerativeUISpec = spec;

    expect(theirs.root).toHaveLength(1);
  });

  it('reads a node written against their type', () => {
    const node: GenerativeUINode = { component: 'Flex', props: { gap: 4 }, children: ['Revenue', { component: 'H2' }] };
    const [built] = fromGenerativeUi({ root: node } as GenerativeUiSpec);

    expect(built).toEqual({ type: 'Flex', props: { gap: 4 }, children: ['Revenue', { type: 'H2' }] });
  });

  // Every member of the union their runtime can hand a Tool UI component, mapped rather than guessed.
  it.each([
    [{ type: 'running' }, 'call', 'running'],
    [{ type: 'complete', reason: 'stop' }, 'call', 'success'],
    [{ type: 'incomplete', reason: 'error' }, 'call', 'error'],
    [{ type: 'requires-action', reason: 'tool-calls' }, 'approval', 'pending'],
    [{ type: 'requires-action', reason: 'interrupt' }, 'approval', 'pending'],
  ] as [ToolCallMessagePartStatus, string, string][])('maps their %o onto a card', (status, kind, mapped) => {
    expect(toolPart({ type: 'tool-call', toolName: 'searchOrders', status })).toMatchObject({ kind, status: mapped });
  });
});

describe('CopilotKit’s A2UI renderer', () => {
  const document = a2uiCatalog(box, { catalogId: 'urn:box-kite:test' });
  const components = document.components as Record<string, Record<string, unknown>>;

  /**
   * Their catalog wants Zod where this ships JSON Schema, which is the whole of the adapter — and one
   * component at a time, so each needs the document's definitions with it (measured: without them zod
   * 4.6 throws `Reference not found: #/$defs/color`).
   */
  const definitions = Object.fromEntries(
    Object.keys(components).map((name) => [
      name,
      {
        props: z.fromJSONSchema(a2uiComponentSchema(document, name) as never) as never,
        description: String(components[name].description ?? ''),
      },
    ]),
  );

  it('is a catalog document their createCatalog accepts', () => {
    const renderers = Object.fromEntries(Object.keys(definitions).map((name) => [name, () => null]));
    const built = createCatalog(definitions as never, renderers as never, { catalogId: 'urn:box-kite:test' });
    // Their catalog holds its components in a `Map`, not a record.
    const registered = built.components as unknown as Map<string, { schema: unknown }>;

    expect(built.id).toBe('urn:box-kite:test');
    expect([...registered.keys()].sort()).toEqual([...ALLOWED].sort());
    for (const name of ALLOWED) expect(registered.get(name)?.schema).toBeTruthy();
  });

  it('survives the round trip their runtime makes back out to an agent', () => {
    expect(
      extractSchema(definitions as never)
        .map((entry) => entry.name)
        .sort(),
    ).toEqual([...ALLOWED].sort());
  });

  // The claim that matters: what their agent generates against our document is what our renderer reads.
  it('renders a surface generated against it', () => {
    const state = a2uiApplyAll(a2uiEmpty, [
      { version: 'v0.9', createSurface: { surfaceId: 'main', catalogId: 'urn:box-kite:test' } },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'main',
          components: [
            { id: 'root', component: 'Flex', gap: 4, children: ['title', 'body'] },
            { id: 'title', component: 'H2', children: [] },
            { id: 'body', component: 'P', children: [] },
          ],
        },
      },
    ]);

    expect(a2uiToSpec(a2uiSurface(state), { catalog: box })).toMatchObject({
      type: 'Flex',
      props: { gap: 4 },
      children: [{ type: 'H2' }, { type: 'P' }],
    });
  });
});

describe('the components the adapters hand back', () => {
  // A name in the catalog that nothing exports is a recipe that compiles and renders nothing.
  it('are the ones this library exports under those names', () => {
    for (const component of [Flex, H2, P]) expect(component).toBeTruthy();
    expect(Object.keys(box.components).sort()).toEqual([...ALLOWED].sort());
  });
});
