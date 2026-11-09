import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Skeleton from './skeleton';

describe('Skeleton', () => {
  afterEach(cleanup);

  // One gloss per bar, so counting the travelling element is counting the bars.
  const bars = (container: HTMLElement) => container.querySelectorAll('[class*="rb-skeleton-sweep"]');

  it('draws one bar by default', () => {
    const { container } = render(<Skeleton />);

    expect(bars(container)).toHaveLength(1);
  });

  it('draws a bar a line, so a paragraph placeholder looks like a paragraph', () => {
    const { container } = render(<Skeleton lines={3} />);

    expect(bars(container)).toHaveLength(3);
  });

  it('hides itself from a reader when there is nothing to tell them', () => {
    const { container } = render(<Skeleton lines={3} />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('role');
  });

  it('names what is on its way when it is given a label, and stops hiding', () => {
    render(<Skeleton lines={2} label="Loading orders" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading orders');
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-hidden');
  });

  it('is one round bar when it stands for an avatar, whatever it was told about lines', () => {
    const { container } = render(<Skeleton circle lines={4} />);

    expect(bars(container)).toHaveLength(1);
  });

  // The circle bar was a fixed `width: 10`, so `<Skeleton circle width={6} />` drew 40px inside a 24px skeleton.
  it('sizes a circle by its width, and by an avatar without one', () => {
    const sized = render(<Skeleton circle width={6} />).container;
    const bar = bars(sized)[0].parentElement!;

    expect(getComputedStyle(bar.parentElement!).width).toBe('24px');
    expect(getComputedStyle(bar).width).toBe('100%');
    expect(getComputedStyle(bar).aspectRatio).toBe('1 / 1');
    cleanup();

    const plain = render(<Skeleton circle />).container;
    expect(getComputedStyle(bars(plain)[0].parentElement!.parentElement!).width).toBe('40px');
  });

  it('never draws less than a bar', () => {
    const { container } = render(<Skeleton lines={0} />);

    expect(bars(container)).toHaveLength(1);
  });

  // Bug #337: the bar kept its one-line height however tall the skeleton was told to be.
  it('fills the skeleton with its one bar, so a height makes it a block', () => {
    const { container } = render(<Skeleton height={40} />);

    expect(getComputedStyle(bars(container)[0].parentElement!).flexGrow).toBe('1');
  });

  it('keeps every bar one line tall when there are several', () => {
    const { container } = render(<Skeleton height={40} lines={2} />);

    expect([...bars(container)].map((gloss) => getComputedStyle(gloss.parentElement!).flexGrow)).not.toContain('1');
  });
});
