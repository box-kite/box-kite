// @vitest-environment node
import ReactDOMServer from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Box from './box';
import Flex from './components/flex';
import Overlay from './components/overlay';
import { getStyles, renderToStaticMarkup, resetStyles } from './ssg';

/**
 * Server rendering in a process with no DOM at all — the environment a Node server actually runs
 * in. `ssg` used to install a fake `global.document` at import time to survive this, which meant
 * the library could not coexist with a real DOM or another framework's SSR in the same process.
 * These tests fail the moment anything in the render path reaches for `document` again.
 */
describe('SSG without a DOM', () => {
  it('has no document to render against', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
  });

  it('renders markup and returns the CSS behind it', () => {
    const result = renderToStaticMarkup(
      <Box p={4} bgColor="red-500">
        hello
      </Box>,
      false,
    );

    expect(result.html).toBe('<div class="_b p-4 bgColor-red-500">hello</div>');
    expect(result.styles).toContain('.p-4{padding:1rem}');
    expect(result.styles).toContain('.bgColor-red-500{background-color:var(--red-500,oklch(63.7% .237 25.3))}');
    expect(result.styles).not.toContain('--red-500:');
    // The reset comes along, so the markup is not styled against a blank sheet.
    expect(result.styles).toContain('._b{display: block;');
  });

  it('injects the styles into a rendered head', () => {
    const result = renderToStaticMarkup(
      <html>
        <head>
          <title>my website</title>
        </head>
        <body>
          <Box p={4}>hello</Box>
        </body>
      </html>,
    );

    expect(result.html).toContain('<style id="box-kite-styles">');
    expect(result.html).toContain('.p-4{padding:1rem}');
    expect(result.html.indexOf('<style id="box-kite-styles">')).toBeLessThan(result.html.indexOf('<title>'));
  });

  it('exposes getStyles()/resetStyles() for a request rendered by any React renderer', () => {
    // The documented cycle, straight out of the docs: render with react-dom/server, read the CSS,
    // reset for the next request. No effect ever runs here, so `getStyles()` has to flush itself.
    const html = ReactDOMServer.renderToString(<Box m={2}>hello</Box>);
    expect(html).toContain('m-2');

    const styles = getStyles();
    expect(styles).toContain('.m-2{margin:0.5rem}');
    // Reading the styles twice must not double anything up.
    expect(getStyles()).toBe(styles);

    resetStyles();
    expect(getStyles()).not.toContain('.m-2{');
  });

  it('gives sequential requests independent stylesheets and identical class names', () => {
    const first = renderToStaticMarkup(<Box p={4}>first</Box>, false);
    const second = renderToStaticMarkup(<Box m={4}>second</Box>, false);
    const third = renderToStaticMarkup(<Box p={4}>third</Box>, false);

    expect(second.styles).not.toContain('.p-4{');
    expect(first.styles).not.toContain('.m-4{');
    // Request 3 renders what request 1 did, so it must get byte-identical CSS — the class-name
    // counter and the `:root` block are per request, not per process.
    expect(third.styles).toBe(first.styles);
  });

  it('does not accumulate variables in :root across requests', () => {
    Box.extend({ 'ssg-first': '#111111', 'ssg-second': '#222222' }, {}, {});
    renderToStaticMarkup(<Box bgColor={'ssg-first' as never}>first</Box>, false);
    const second = renderToStaticMarkup(<Box bgColor={'ssg-second' as never}>second</Box>, false);

    expect(second.styles).toContain('--ssg-second:');
    expect(second.styles).not.toContain('--ssg-first:');
  });

  it('renders a component that needs a portal in the browser', () => {
    // Overlay resolves its portal container during render. It only worked on the server because
    // the fake document answered `getElementById` with its own style element.
    const result = renderToStaticMarkup(
      <Flex>
        <Overlay>tip</Overlay>
      </Flex>,
      false,
    );

    expect(result.html).toContain('display-flex');
  });
});
