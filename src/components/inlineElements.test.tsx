import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Box, { useClassNames } from '../box';
import { Img, Link, Span } from './semantics';

// An app component that says nothing about `display`, the way most do.
Box.components({ inlineProbe: { styles: { color: 'sky-600' } }, flexProbe: { styles: { display: 'flex' } } });

function RouterLink({ component }: { component: string }) {
  const { className } = useClassNames({ component: component as never });

  return (
    <a href="/" className={className}>
      Home
    </a>
  );
}

const displayOf = (element: Element | null) => getComputedStyle(element!).display;

function renderAll() {
  const { container } = render(
    <p>
      <Link props={{ href: '/' }}>Link</Link>
      <Link display="flex">Flex link</Link>
      <RouterLink component="inlineProbe" />
      <RouterLink component="flexProbe" />
      <Span>Span</Span>
      <Img props={{ alt: '' }} />
    </p>,
  );
  const links = container.querySelectorAll('a');

  return {
    link: links[0],
    flexLink: links[1],
    routerLink: links[2],
    flexRouterLink: links[3],
    span: container.querySelector('span'),
    img: container.querySelector('img'),
  };
}

describe('an inline element', () => {
  afterEach(cleanup);

  it('is inline-block, wherever its class came from', () => {
    const { link, routerLink, span, img } = renderAll();

    expect(displayOf(link)).toBe('inline-block');
    expect(displayOf(routerLink)).toBe('inline-block');
    expect(displayOf(span)).toBe('inline-block');
    // Media stays block, so no baseline gap opens under an image.
    expect(displayOf(img)).toBe('block');
  });

  it('still loses to a display prop or component', () => {
    const { flexLink, flexRouterLink } = renderAll();

    expect(displayOf(flexLink)).toBe('flex');
    expect(displayOf(flexRouterLink)).toBe('flex');
  });
});
