import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Box from '../box';
import resolveStyles from './resolveStyles';
import { StylesContext } from './useStyles';

/**
 * Element mode through the React binding: Box renders its CSS as `<style href precedence>` siblings, which
 * React 19 hoists into `<head>`, dedupes by href and keeps in precedence order — the emission path that
 * needs no effect. Configured for the whole file, since the sink belongs to the engine and Vitest gives
 * each file its own module registry.
 */
StylesContext.configure({ sink: 'element' });

// Hoisting is React 19. The 18 lane of the CI matrix runs the fallback expectations at the bottom.
const canHoist = parseInt(React.version, 10) >= 19;

/** The hoisted style elements, in document order. */
function hoisted() {
  return [...document.head.querySelectorAll('style[data-precedence]')] as unknown as HTMLStyleElement[];
}

function hrefsIn(elements: HTMLStyleElement[]) {
  return elements.map((element) => element.getAttribute('data-href'));
}

describe('element mode', () => {
  afterEach(cleanup);

  describe.skipIf(!canHoist)('with React 19', () => {
    it('hoists the CSS into the head and leaves the markup alone', () => {
      const { container } = render(<Box p={4} lineHeight={24} />);

      expect(container.innerHTML).toBe('<div class="_b p-4 lineHeight-24"></div>');

      const elements = hoisted();
      const css = elements.map((element) => element.textContent).join('');

      expect(css).toContain('.p-4{padding:1rem}');
      // The base element carries the layer order, so it has to be the first one in the head.
      expect(elements[0].getAttribute('data-precedence')).toBe('rb-base');
      expect(elements[0].textContent!.startsWith('@layer rb,')).toBe(true);
      expect(elements.at(-1)!.getAttribute('data-precedence')).toBe('rb');
    });

    it('keeps one element per rule however many Boxes need it', () => {
      render(
        <>
          <Box b={1} />
          <Box b={1} />
          <Box b={1} mt={3} />
        </>,
      );

      const hrefs = hrefsIn(hoisted());

      expect(hrefs.length).toBe(new Set(hrefs).size);
      expect(hoisted().filter((element) => element.textContent!.includes('.b-1{border-width:1px}')).length).toBe(1);
    });

    it('hands every Box the same element objects, so an RSC payload sends each one once', () => {
      // Flight serializes a repeated object as a reference and a fresh one in full: new elements per Box
      // put the base stylesheet in the payload once per Box (bug #256).
      const first = resolveStyles({ p: 4, mt: 3 }, false).styleElements!;
      const second = resolveStyles({ p: 4, mt: 3 }, false).styleElements!;
      const other = resolveStyles({ p: 4 }, false).styleElements!;

      const padding = (elements: React.ReactElement[]) =>
        elements.find((element) =>
          (element.props as { dangerouslySetInnerHTML: { __html: string } }).dangerouslySetInnerHTML.__html.includes('padding:1rem'),
        );

      expect(second).toBe(first);
      expect(other[0]).toBe(first[0]);
      expect(padding(other)).toBeDefined();
      expect(padding(other)).toBe(padding(first));
    });

    it('renders the elements as siblings, so a void tag still works', () => {
      // Children would be a hard React error on `input`; hoisted siblings are fine.
      const { container } = render(<Box tag="input" p={2} />);

      expect(container.innerHTML).toBe('<input class="_b p-2">');
      expect(hoisted().some((element) => element.textContent!.includes('.p-2{padding:0.5rem}'))).toBe(true);
    });

    it('puts the CSS in the head of a server-rendered document', () => {
      const html = renderToStaticMarkup(
        <html>
          <head />
          <body>
            <Box gap={6} />
          </body>
        </html>,
      );

      const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

      expect(head).toContain('data-precedence="rb-base"');
      expect(head).toContain('.gap-6{gap:1.5rem}');
      expect(html).toContain('<div class="_b gap-6"></div>');
    });

    it('hydrates server output without a mismatch', async () => {
      const tree = (
        <Box p={5} theme={{ dark: { p: 7 } }}>
          <Box tag="span" fontSize={14} />
        </Box>
      );
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = renderToString(tree);

      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      let root: ReturnType<typeof hydrateRoot>;
      await act(async () => {
        root = hydrateRoot(container, tree);
      });

      const mismatches = errors.mock.calls
        .map((args) => args.map(String).join(' '))
        .filter((message) => /hydration failed|did not match|didn't match|expected server html/i.test(message));

      errors.mockRestore();
      expect(mismatches).toEqual([]);
      expect(container.innerHTML).toContain(`class="_b p-5 theme-dark-p-7"`);

      await act(async () => root.unmount());
      container.remove();
    });

    it('carries the global styles of a global theme', () => {
      render(
        <Box.Theme use="global" globalStyles={{ overflow: 'hidden' }}>
          <Box />
        </Box.Theme>,
      );

      expect(hoisted().some((element) => element.textContent!.includes('html{overflow:hidden}'))).toBe(true);
    });
  });

  describe.skipIf(canHoist)('with React 18, which cannot hoist', () => {
    it('renders the style elements inline instead', () => {
      const { container } = render(<Box p={4} />);

      expect(container.querySelectorAll('style').length).toBeGreaterThan(0);
      expect(container.innerHTML).toContain('.p-4{padding:1rem}');
      expect(container.innerHTML).toContain('<div class="_b p-4"></div>');
    });
  });
});
