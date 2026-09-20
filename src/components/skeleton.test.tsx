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

  it('never draws less than a bar', () => {
    const { container } = render(<Skeleton lines={0} />);

    expect(bars(container)).toHaveLength(1);
  });
});
