import { describe, expect, it } from 'vitest';
import { catalog } from '../../catalog';
import A2uiInterop, { A2uiState } from './a2uiInterop';

const fold = (messages: unknown[]): A2uiState => A2uiInterop.applyAll(A2uiInterop.EMPTY, messages);

const v09 = (surfaceId = 'main') => ({ version: 'v0.9', createSurface: { surfaceId, catalogId: 'test-catalog' } });

const components = (surfaceId: string, list: Record<string, unknown>[]) => ({
  version: 'v0.9',
  updateComponents: { surfaceId, components: list },
});

describe('A2uiInterop.apply', () => {
  it('opens a surface and keeps what the message said about it', () => {
    const state = fold([{ version: 'v0.9', createSurface: { surfaceId: 'main', catalogId: 'c1', theme: { primaryColor: 'blue' } } }]);

    expect(A2uiInterop.surface(state)).toMatchObject({ id: 'main', catalogId: 'c1', theme: { primaryColor: 'blue' } });
  });

  it('takes the root off v0.8’s beginRendering, which is the only version that names one', () => {
    const state = fold([{ beginRendering: { surfaceId: 'main', root: 'page' } }]);

    expect(A2uiInterop.surface(state)?.root).toBe('page');
  });

  // The two cases A2UI's own conformance suite keeps for the message processor, both about isolation.
  it('adds components to the surface the message names and to no other', () => {
    const state = fold([v09('s1'), v09('s2'), components('s2', [{ id: 'root', component: 'Text', text: 'Hello' }])]);

    expect(A2uiInterop.surface(state, 's1')?.components).toEqual({});
    expect(A2uiInterop.surface(state, 's2')?.components.root).toMatchObject({ component: 'Text', text: 'Hello' });
  });

  it('gives each surface its own data model, so one path holds a different value in each', () => {
    const state = fold([
      v09('s1'),
      v09('s2'),
      { version: 'v0.9', updateDataModel: { surfaceId: 's1', path: '/value', value: 'one' } },
      { version: 'v0.9', updateDataModel: { surfaceId: 's2', path: '/value', value: 'two' } },
    ]);

    expect(A2uiInterop.surface(state, 's1')?.data).toEqual({ value: 'one' });
    expect(A2uiInterop.surface(state, 's2')?.data).toEqual({ value: 'two' });
  });

  it('updates the component an id already names rather than adding a second one', () => {
    const state = fold([
      v09(),
      components('main', [{ id: 'greeting', component: 'Text', text: 'Hello' }]),
      components('main', [{ id: 'greeting', component: 'Text', text: 'Hello, Alice' }]),
    ]);

    expect(Object.keys(A2uiInterop.surface(state)!.components)).toEqual(['greeting']);
    expect(A2uiInterop.surface(state)!.components.greeting.text).toBe('Hello, Alice');
  });

  it('creates the containers a pointer names and leaves its siblings alone', () => {
    const state = fold([
      v09(),
      { version: 'v0.9', updateDataModel: { surfaceId: 'main', path: '/user/name', value: 'Alice' } },
      { version: 'v0.9', updateDataModel: { surfaceId: 'main', path: '/user/email', value: 'alice@example.com' } },
    ]);

    expect(A2uiInterop.surface(state)?.data).toEqual({ user: { name: 'Alice', email: 'alice@example.com' } });
  });

  it('deletes the key at a path whose value is left out, which is how v0.9 says so', () => {
    const state = fold([
      v09(),
      { version: 'v0.9', updateDataModel: { surfaceId: 'main', path: '/', value: { a: 1, b: 2 } } },
      { version: 'v0.9', updateDataModel: { surfaceId: 'main', path: '/a' } },
    ]);

    expect(A2uiInterop.surface(state)?.data).toEqual({ b: 2 });
  });

  it('merges v0.8’s typed contents at their path instead of replacing what is there', () => {
    const state = fold([
      { beginRendering: { surfaceId: 'main', root: 'root' } },
      {
        dataModelUpdate: {
          surfaceId: 'main',
          contents: [
            {
              key: 'user',
              valueMap: [
                { key: 'name', valueString: 'Alice' },
                { key: 'age', valueNumber: 30 },
              ],
            },
          ],
        },
      },
      { dataModelUpdate: { surfaceId: 'main', path: 'user', contents: [{ key: 'email', valueString: 'a@b.c' }] } },
    ]);

    expect(A2uiInterop.surface(state)?.data).toEqual({ user: { name: 'Alice', age: 30, email: 'a@b.c' } });
  });

  it('unwraps v0.8’s component key into the flat shape v0.9 sends', () => {
    const state = fold([
      { beginRendering: { surfaceId: 'main', root: 'greeting' } },
      { surfaceUpdate: { surfaceId: 'main', components: [{ id: 'greeting', component: { Text: { text: { literalString: 'Hi' } } } }] } },
    ]);

    expect(A2uiInterop.surface(state)?.components.greeting).toMatchObject({ component: 'Text' });
  });

  it('removes only the surface a delete names', () => {
    const state = fold([v09('s1'), v09('s2'), { version: 'v0.9', deleteSurface: { surfaceId: 's1' } }]);

    expect(state.order).toEqual(['s2']);
    expect(A2uiInterop.surface(state, 's1')).toBeNull();
  });

  // A transport carries heartbeats, text deltas and the agent's own events; none of them is a re-render.
  it('hands the same state back for a message that is not A2UI at all', () => {
    const state = fold([v09()]);

    for (const message of [null, 'text', 42, { type: 'TEXT_MESSAGE_CONTENT' }, { deleteSurface: { surfaceId: 'gone' } }]) {
      expect(A2uiInterop.apply(state, message)).toBe(state);
    }
  });
});

describe('A2uiInterop.toSpec', () => {
  const surfaceOf = (list: Record<string, unknown>[], root = 'root') =>
    A2uiInterop.surface(fold([{ beginRendering: { surfaceId: 'main', root } }, components('main', list)]));

  it('walks the adjacency list into the tree a renderer takes', () => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([
        { id: 'root', component: 'Column', children: ['header', 'body'] },
        { id: 'header', component: 'Text', text: 'Welcome' },
        { id: 'body', component: 'Card', child: 'content' },
        { id: 'content', component: 'Text', text: { path: '/message' } },
      ]),
    );

    expect(spec).toEqual({
      type: 'Column',
      key: 'root',
      children: [
        { type: 'Text', key: 'header', props: { text: 'Welcome' } },
        { type: 'Card', key: 'body', children: [{ type: 'Text', key: 'content', props: { text: { $data: '/message' } } }] },
      ],
    });
  });

  it('reads v0.8’s wrappers as the values v0.9 would have sent plain', () => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([
        { id: 'root', component: 'Column', children: { explicitList: ['a'] } },
        { id: 'a', component: 'Text', text: { literalString: 'Hi' }, weight: { literalNumber: 2 }, wrap: { literalBoolean: true } },
      ]),
    );

    expect(spec?.children).toEqual([{ type: 'Text', key: 'a', props: { text: 'Hi', weight: 2, wrap: true } }]);
  });

  // A template is one node per item of an array, which is what `repeat` already means.
  it.each([
    ['v0.9', { componentId: 'item', path: '/messages' }],
    ['v0.8', { template: { componentId: 'item', dataBinding: '/messages' } }],
  ])('turns a %s template into a repeat', (_version, children) => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([
        { id: 'root', component: 'List', children },
        { id: 'item', component: 'Text', text: { path: '/text' } },
      ]),
    );

    expect(spec?.children).toEqual([{ type: 'Text', key: 'item', props: { text: { $data: '/text' } }, repeat: { $data: '/messages' } }]);
  });

  it('binds an action under its own name, which is what the app registers as the event', () => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([{ id: 'root', component: 'Button', label: 'Submit', action: { event: { name: 'submit_form' } } }]),
    );

    expect(spec).toEqual({ type: 'Button', key: 'root', props: { label: 'Submit' }, on: { action: 'submit_form' } });
  });

  it('binds a prop the catalog calls an event, for an agent generating against this library', () => {
    const spec = A2uiInterop.toSpec(surfaceOf([{ id: 'root', component: 'Button', onClick: 'refresh' }]), {
      catalog: { components: { Button: { events: ['onClick'] } } },
    });

    expect(spec).toEqual({ type: 'Button', key: 'root', on: { onClick: 'refresh' } });
  });

  // An agent streams a leaf before the branch that holds it, so half a surface is the ordinary case.
  it('renders what has arrived and leaves out what has not', () => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([
        { id: 'root', component: 'Column', children: ['here', 'not-yet'] },
        { id: 'here', component: 'Text' },
      ]),
    );

    expect(spec?.children).toEqual([{ type: 'Text', key: 'here' }]);
  });

  it('answers nothing while the root itself is still on its way', () => {
    expect(A2uiInterop.toSpec(surfaceOf([{ id: 'leaf', component: 'Text' }]))).toBeNull();
    expect(A2uiInterop.toSpec(null)).toBeNull();
  });

  // Nothing stops an agent writing one, and an id graph has no depth limit of its own.
  it('cuts a cycle rather than walking it', () => {
    const spec = A2uiInterop.toSpec(
      surfaceOf([
        { id: 'root', component: 'Column', children: ['a'] },
        { id: 'a', component: 'Column', children: ['root'] },
      ]),
    );

    expect(spec).toEqual({ type: 'Column', key: 'root', children: [{ type: 'Column', key: 'a' }] });
  });

  it('starts from the root the caller names over the one the surface carries', () => {
    const surface = surfaceOf([
      { id: 'root', component: 'Text' },
      { id: 'other', component: 'Card' },
    ]);

    expect(A2uiInterop.toSpec(surface, { root: 'other' })?.type).toBe('Card');
  });
});

describe('A2uiInterop.catalogDocument', () => {
  const box = catalog({ include: ['Flex', 'Button', 'H2'], styleProps: ['p', 'gap', 'bgColor'] });
  const document = A2uiInterop.catalogDocument(box, { catalogId: 'urn:test' });
  const components = document.components as Record<string, Record<string, unknown>>;

  it('names the document the way a createSurface message will', () => {
    expect(document.catalogId).toBe('urn:test');
    expect(document.$id).toBe('urn:test');
  });

  it('makes the component type a property rather than the key above it', () => {
    const properties = components.Flex.properties as Record<string, { enum?: string[] }>;

    expect(properties.component.enum).toEqual(['Flex']);
    expect(components.Flex.required).toContain('component');
  });

  it('gives every component the id an adjacency list refers to it by', () => {
    for (const name of Object.keys(components)) {
      expect((components[name].properties as Record<string, unknown>).id).toBeTruthy();
      expect(components[name].required).toContain('id');
    }
  });

  it('makes children a list of ids rather than nested nodes', () => {
    expect((components.Flex.properties as Record<string, unknown>).children).toMatchObject({ type: 'array', items: { type: 'string' } });
  });

  it('keeps the values a prop takes, which is the whole point of handing over a catalog', () => {
    const properties = components.Flex.properties as Record<string, { $ref?: string }>;

    expect(properties.bgColor.$ref).toBe('#/$defs/color');
    expect(properties.p).toBeTruthy();
  });

  // A `$ref` resolves against the document root, so a component's own `$defs` nested under
  // `components.Flex` would point at nothing at all.
  it('lifts every component’s definitions to the document, where a $ref resolves', () => {
    expect((document.$defs as Record<string, unknown>).color).toBeTruthy();

    for (const name of Object.keys(components)) expect(components[name].$defs).toBeUndefined();
  });

  it('turns an event into the name of an action, since a message cannot carry a function', () => {
    const properties = components.Button.properties as Record<string, { type?: string }>;

    for (const event of box.components.Button.events) expect(properties[event].type).toBe('string');
  });
});
