import { cleanup, fireEvent, render } from '@testing-library/react';
import React, { createRef, forwardRef, Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Box, { BoxProps, useBoxElement } from './box';
import Button from './components/button';
import Flex from './components/flex';
import Grid from './components/grid';
import { H1, Link } from './components/semantics';
import { Circle, Svg } from './components/svg';
import Textarea from './components/textarea';
import Textbox from './components/textbox';
import VisuallyHidden from './components/visuallyHidden';
import { getDefaultEngine } from './core';

interface Fiber {
  type: unknown;
  tag: number;
  return: Fiber | null;
  memoizedState: { next: unknown } | null;
}

function fiberOf(element: Element): Fiber {
  const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'))!;

  return (element as unknown as Record<string, Fiber>)[key];
}

// `memo` over the render: React 19 takes the ref as a prop, so one fiber; React 18 needs a `forwardRef` under it.
const FIBERS = parseInt(React.version, 10) >= 19 ? 1 : 2;

function Probe({ children }: { children: React.ReactNode }) {
  return children;
}

/** The component fibers between the element and the `Probe` that rendered it. */
function componentsAbove(element: Element) {
  const fibers: Fiber[] = [];

  for (let fiber = fiberOf(element).return; fiber && fiber.type !== Probe; fiber = fiber.return) fibers.push(fiber);

  return fibers;
}

function hookCount(fiber: Fiber) {
  let count = 0;

  for (let hook = fiber.memoizedState; hook; hook = hook.next as Fiber['memoizedState']) count++;

  return count;
}

describe('Box', () => {
  afterEach(cleanup);

  it.each([
    ['Box', <Box key="x" p={2} />],
    ['Flex', <Flex key="x" gap={2} />],
    ['Grid', <Grid key="x" gap={2} />],
    ['H1', <H1 key="x">Title</H1>],
    ['Link', <Link key="x" props={{ href: '/' }} />],
    ['Button', <Button key="x">Go</Button>],
    ['Textbox', <Textbox key="x" />],
    ['Textarea', <Textarea key="x" />],
    ['VisuallyHidden', <VisuallyHidden key="x">hidden</VisuallyHidden>],
    ['Svg', <Svg key="x" viewBox="0 0 24 24" />],
  ])('renders a %s as one memoized component above its element', (_, element) => {
    const { container } = render(<Probe>{element}</Probe>);

    expect(componentsAbove(container.firstElementChild!)).toHaveLength(FIBERS);
  });

  it('renders an SVG element as one component too', () => {
    const { container } = render(
      <svg>
        <Probe>
          <Circle r={4} />
        </Probe>
      </svg>,
    );

    expect(componentsAbove(container.querySelector('circle')!)).toHaveLength(FIBERS);
  });

  // Hover state used to cost every Box a `useState` it never read; only the insertion effect is left.
  // The comparison is the point: a leaf whose props are all primitives costs nothing when its parent re-renders.
  it('skips a re-render whose props have not changed', () => {
    const resolve = vi.spyOn(getDefaultEngine(), 'resolveClassNames');
    const { rerender } = render(<P n={1} />);

    resolve.mockClear();
    rerender(<P n={2} />);

    // The Flex and the Button, whose children changed; the H1 is skipped.
    expect(resolve).toHaveBeenCalledTimes(2);
    resolve.mockRestore();

    function P({ n }: { n: number }) {
      return (
        <Flex gap={2}>
          <H1 color="sky-700">Title</H1>
          <Button>{n}</Button>
        </Flex>
      );
    }
  });

  it('holds one hook, the flush', () => {
    const { container } = render(
      <Probe>
        <Flex p={2} />
      </Probe>,
    );

    expect(hookCount(componentsAbove(container.firstElementChild!)[0])).toBe(1);
  });

  // DevTools, the component reference and `componentsApi.mjs` all read these.
  it('keeps each wrapper a component of its own', () => {
    expect(Flex).not.toBe(Box);
    expect((Flex as unknown as { displayName: string }).displayName).toBe('Flex');
    expect((H1 as unknown as { displayName: string }).displayName).toBe('H1');
    expect((Box as unknown as { displayName: string }).displayName).toBe('Box');
  });

  it('hands a ref through a wrapper to the element', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Go</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('still tracks hover for function children, and only there', () => {
    const { container } = render(<Box tag="span">{({ isHover }) => (isHover ? 'over' : 'out')}</Box>);
    const span = container.querySelector('span')!;

    expect(span.textContent).toBe('out');
    fireEvent.mouseEnter(span);
    expect(span.textContent).toBe('over');
    fireEvent.mouseLeave(span);
    expect(span.textContent).toBe('out');
  });

  it('lets a component of your own render a Box with no fiber of its own', () => {
    const Card = forwardRef(function Card(props: BoxProps, ref: Ref<HTMLDivElement>) {
      return useBoxElement({ p: 4, borderRadius: 2, ...props }, ref);
    });
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Probe>
        <Card ref={ref} p={6} />
      </Probe>,
    );
    const element = container.firstElementChild!;

    expect(componentsAbove(element)).toHaveLength(1);
    expect(ref.current).toBe(element);
    expect(element.className).toContain('p-6');
    expect(element.className).not.toContain('p-4');
  });
});
