import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Box from './box';
import Flex from './components/flex';
import { DEFAULT_STYLE_ELEMENT_ID } from './core/engine/styleEngine';
import { StylesContext } from './react/useStyles';
import { renderToStaticMarkup } from './ssg';

/**
 * The server and the client run the same engine but write through different sinks: the server
 * builds a CSS string, the browser inserts into a stylesheet. If the two ever diverge, an app gets
 * styles at first paint that the client then contradicts — invisible in any test that only renders
 * one of the two. Each case below renders the same tree through both paths and compares.
 */
function splitRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of css) {
    if (char === '\n' && depth === 0) continue;
    current += char;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        rules.push(current);
        current = '';
      }
    }
  }

  return rules;
}

/**
 * Render the way a server does: through the string sink, the one an engine picks by itself in a
 * process with no DOM. (`src/ssg.node.test.tsx` runs the same path with no `document` at all.)
 */
function renderOnServer(element: React.ReactElement) {
  StylesContext.configure({ sink: 'string' });

  try {
    return renderToStaticMarkup(element, false);
  } finally {
    // Back to the sink the rest of the suite is configured for, which also drops what the server
    // render put in the string sink.
    StylesContext.configure({ sink: 'textContent' });
  }
}

function renderOnClient(element: React.ReactElement) {
  const { container } = render(element);
  const styleElement = document.getElementById(DEFAULT_STYLE_ELEMENT_ID);

  return { html: container.innerHTML, styles: styleElement?.textContent ?? '' };
}

function roundTrip(element: React.ReactElement) {
  const server = renderOnServer(element);
  // `renderToStaticMarkup` clears the engine when it is done, so the client render starts from the
  // same blank slate a browser would.
  const client = renderOnClient(element);

  return { server, client };
}

describe('SSR round-trip', () => {
  afterEach(() => {
    StylesContext.clear();
  });

  it('produces the same markup and the same CSS for a simple tree', () => {
    const { server, client } = roundTrip(
      <Box p={4} bgColor="red-500">
        hello
      </Box>,
    );

    expect(client.html).toBe(server.html);
    expect(splitRules(client.styles)).toEqual(splitRules(server.styles));
  });

  it('agrees on breakpoints, pseudo classes and groups', () => {
    const { server, client } = roundTrip(
      <Flex className="parent" d="column" gap={2} hover={{ bgColor: 'blue-500' }} sm={{ gap: 4 }}>
        <Box hoverGroup={{ parent: { display: 'grid' } }} focus={{ b: 1 }}>
          child
        </Box>
      </Flex>,
    );

    expect(client.html).toBe(server.html);
    expect(splitRules(client.styles)).toEqual(splitRules(server.styles));
    expect(client.styles).toContain('@media (min-width: 640px)');
    expect(client.styles).toContain('.parent:hover .hover-parent-display-grid{display:grid}');
  });

  it('agrees on theme-scoped rules', () => {
    const { server, client } = roundTrip(
      <Box theme={{ dark: { bgColor: 'gray-900', hover: { bgColor: 'gray-800' } } }} bgColor="white">
        themed
      </Box>,
    );

    expect(client.html).toBe(server.html);
    expect(splitRules(client.styles)).toEqual(splitRules(server.styles));
    expect(client.styles).toContain(
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-bgColor-gray-900{background-color:var(--gray-900)}}',
    );
  });

  it('marks a local theme in the markup, so the boundary exists before hydration', () => {
    // What ends an outer theme's `@scope` block is `data-theme` in the HTML: written from an effect it
    // would arrive after the first paint, and the page would paint the outer theme's colours (bug #189).
    const { server, client } = roundTrip(
      <Box.Theme use="local" theme="light">
        <Box bgColor="white">panel</Box>
      </Box.Theme>,
    );

    expect(client.html).toBe(server.html);
    expect(server.html).toContain('data-theme="light"');
    expect(server.html).toContain('class="_b light"');
  });

  it('declares the same :root variables on both sides', () => {
    const { server, client } = roundTrip(
      <Box color="violet-500" bgColor="violet-50" shadow="medium">
        tokens
      </Box>,
    );

    const rootBlocks = (css: string) => splitRules(css).filter((rule) => rule.startsWith(':root{'));

    expect(rootBlocks(client.styles)).toEqual(rootBlocks(server.styles));
    expect(client.styles).toContain('--violet-500:');
    expect(client.styles).toContain('--medium:');
  });

  it('gives the browser the same cascade when the client writes to a real stylesheet', () => {
    const element = (
      <Flex d="column" gap={2} p={4} hover={{ bgColor: 'blue-500' }} sm={{ gap: 4 }}>
        <Box b={1} color="red-500">
          child
        </Box>
      </Flex>
    );
    const server = renderOnServer(element);

    StylesContext.configure({ sink: 'cssom' });

    try {
      render(element);
      const sheet = (document.getElementById(DEFAULT_STYLE_ELEMENT_ID) as unknown as HTMLStyleElement | null)?.sheet;
      // A stylesheet re-serializes what it is given, so the comparison is selector by selector,
      // in order — the part that decides which declaration wins. `@property` is dropped from both
      // sides: it registers a custom property rather than competing for one, and happy-dom's parser
      // rejects it outright, so a live sheet never holds it.
      const selectorsIn = (rules: string[]) =>
        rules.filter((rule) => !rule.startsWith('@property')).map((rule) => rule.slice(0, rule.indexOf('{')).replace(/\s+/g, ' ').trim());

      expect(selectorsIn([...(sheet?.cssRules ?? [])].map((rule) => rule.cssText))).toEqual(selectorsIn(splitRules(server.styles)));
    } finally {
      StylesContext.configure({ sink: 'textContent' });
    }
  });

  it('does not carry rules from one server render into the next', () => {
    const first = renderOnServer(<Box p={4}>first</Box>);
    const second = renderOnServer(<Box m={4}>second</Box>);

    expect(first.styles).toContain('.p-4{padding:1rem}');
    expect(second.styles).toContain('.m-4{margin:1rem}');
    expect(second.styles).not.toContain('.p-4{');
  });
});
