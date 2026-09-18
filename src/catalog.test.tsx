import { JSONUIProvider, Renderer, schema } from '@json-render/react';
import { render, screen } from '@testing-library/react';
import { ComponentType, ReactNode, createElement } from 'react';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import Box from './box';
import { catalog } from './catalog';
import Flex from './components/flex';
import { H2 } from './components/semantics';

/**
 * The catalog against the runtime it was shaped for. json-render is the one with the widest reach
 * (Vercel's, and the shape assistant-ui and A2UI also take), and it wants Zod where this ships JSON
 * Schema — `z.fromJSONSchema` is the whole adapter, which is why the catalog is JSON Schema at all.
 */
const ALLOWED = ['Flex', 'H2', 'Box'];
const STYLE_PROPS = ['d', 'p', 'gap', 'bgColor', 'fontSize'];

function jsonRenderCatalog(options = {}) {
  const box = catalog({ include: ALLOWED, styleProps: STYLE_PROPS, ...options });

  return schema.createCatalog({
    actions: {},
    components: Object.fromEntries(
      Object.entries(box.components).map(([name, component]) => [
        name,
        { props: z.fromJSONSchema(component.props as never), slots: component.slots, description: component.description, example: {} },
      ]),
    ),
  });
}

/** One component's props as a validator — what a host checks a node against before rendering it. */
function validator(component: string, options = {}) {
  return z.fromJSONSchema(catalog({ include: [component], styleProps: STYLE_PROPS, ...options }).components[component].props as never);
}

const REGISTRY: Record<string, ComponentType<{ element: { props: Record<string, unknown> }; children?: ReactNode }>> = {
  Flex: ({ element, children }) => <Flex {...element.props}>{children}</Flex>,
  H2: ({ element, children }) => <H2 {...element.props}>{children}</H2>,
  Box: ({ element, children }) => <Box {...element.props}>{children}</Box>,
};

const SPEC = {
  root: 'card',
  elements: {
    card: { type: 'Flex', props: { d: 'column', p: 4, gap: 2, bgColor: 'sky-500/10' }, children: ['title'] },
    title: { type: 'H2', props: { fontSize: 24 }, children: [] },
  },
};

describe('catalog() against @json-render/react', () => {
  it('is a catalog that runtime accepts, holding the components it was given', () => {
    expect(jsonRenderCatalog().componentNames.sort()).toEqual([...ALLOWED].sort());
  });

  it('validates a spec written against it, and refuses a component the app left out', () => {
    const outside = { ...SPEC, elements: { ...SPEC.elements, title: { type: 'DataGrid', props: {}, children: [] } } };

    expect(jsonRenderCatalog().validate(SPEC).success).toBe(true);
    expect(jsonRenderCatalog().validate(outside).success).toBe(false);
  });

  it('renders that spec as Box components, with the props it carried', () => {
    render(
      createElement(JSONUIProvider, {
        registry: REGISTRY as never,
        children: createElement(Renderer, { spec: SPEC as never, registry: REGISTRY as never }),
      }),
    );

    const heading = screen.getByRole('heading', { level: 2 });

    expect(heading).toBeInTheDocument();
    // The class is the engine's, so the tree really went through Box rather than through a plain element.
    expect(heading.className).toContain('_b');
  });

  /**
   * The props half of the guardrail is the host's to apply. Measured against 0.20.0: `propsOf` resolves to
   * `z.record(z.string(), z.unknown())` for every catalog holding more than one component, so
   * `catalog.validate()` checks the component *names* and lets any props through. Each component's schema
   * is standalone, which is what makes checking a node yourself one call.
   */
  describe('a component schema as the validator a host applies', () => {
    it('refuses a colour the palette does not have', () => {
      expect(validator('Flex').safeParse({ bgColor: 'sky-500/10' }).success).toBe(true);
      expect(validator('Flex').safeParse({ bgColor: '#ff00ff' }).success).toBe(false);
      expect(validator('Flex').safeParse({ bgColor: 'brand' }).success).toBe(false);
    });

    it('refuses a value outside a prop’s own list, and a prop nobody offered', () => {
      expect(validator('Flex').safeParse({ d: 'sideways' }).success).toBe(false);
      expect(validator('Flex').safeParse({ invented: 1 }).success).toBe(false);
    });

    it('takes what the engine has been extended with, and no regeneration in between', () => {
      Box.extend({ brand: '#7949ff' }, { textGradient: [{ values: ['none', 'sunset'], styleName: 'background-image' }] }, {});

      const extended = validator('Flex', { styleProps: [...STYLE_PROPS, 'textGradient'] });

      expect(extended.safeParse({ textGradient: 'sunset' }).success).toBe(true);
      expect(extended.safeParse({ textGradient: 'nonsense' }).success).toBe(false);
      // The variable is a colour now, so the colour pattern took it without the palette being touched.
      expect(extended.safeParse({ bgColor: 'brand/60' }).success).toBe(true);
    });
  });
});
