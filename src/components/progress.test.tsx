import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import Progress from './progress';

describe('Progress', () => {
  afterEach(cleanup);

  const bar = () => screen.getByRole('progressbar');

  it('reports where it has got to', () => {
    render(<Progress label="Upload" value={62} />);

    expect(bar()).toHaveAttribute('aria-valuenow', '62');
    expect(bar()).toHaveAttribute('aria-valuemin', '0');
    expect(bar()).toHaveAttribute('aria-valuemax', '100');
  });

  it('measures against its own range', () => {
    const { container } = render(<Progress label="Files" min={0} max={8} value={2} />);

    expect(bar()).toHaveAttribute('aria-valuenow', '2');
    expect(container.querySelector('[style]')!.getAttribute('style')).toBe('inline-size: 25%;');
  });

  it('reports nothing at all with no value, which is what indeterminate means', () => {
    render(<Progress label="Preparing" />);

    expect(bar()).not.toHaveAttribute('aria-valuenow');
    expect(bar()).not.toHaveAttribute('aria-valuetext');
  });

  it('sweeps rather than fills when there is nothing to fill', () => {
    const { container } = render(<Progress label="Preparing" />);
    const fill = container.firstElementChild!.firstElementChild!;

    expect(fill.getAttribute('style')).toBeNull();
    expect(fill.className).toContain('animationName-rb-progress-sweep');
  });

  it('clamps a value that has run past either end', () => {
    const { container, rerender } = render(<Progress label="Upload" value={140} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '100');
    expect(container.querySelector('[style]')!.getAttribute('style')).toBe('inline-size: 100%;');

    rerender(<Progress label="Upload" value={-3} />);
    expect(bar()).toHaveAttribute('aria-valuenow', '0');
  });

  it('puts a range with no width at its start rather than dividing by nothing', () => {
    const { container } = render(<Progress label="Upload" min={5} max={5} value={5} />);

    expect(container.querySelector('[style]')!.getAttribute('style')).toBe('inline-size: 0%;');
  });

  it('rounds the fill to a hundredth of a percent, so two equal values are one string', () => {
    const { container } = render(<Progress label="Upload" min={0} max={3} value={1} />);

    expect(container.querySelector('[style]')!.getAttribute('style')).toBe('inline-size: 33.33%;');
  });

  it('writes aria-valuetext only when there is a format to write it from', () => {
    const { rerender } = render(<Progress label="Files" max={10} value={3} />);
    expect(bar()).not.toHaveAttribute('aria-valuetext');

    rerender(<Progress label="Files" max={10} value={3} format={(value) => `${value} of 10 files`} />);
    expect(bar()).toHaveAttribute('aria-valuetext', '3 of 10 files');
  });

  it('is named by label or by another element', () => {
    const { rerender } = render(<Progress label="Upload" value={10} />);
    expect(screen.getByRole('progressbar', { name: 'Upload' })).toBeInTheDocument();

    rerender(
      <>
        <span id="download-label">Download</span>
        <Progress labelledBy="download-label" value={10} />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Download' })).toBeInTheDocument();
  });

  it('takes Box props, the way every component here does', () => {
    const { container } = render(<Progress label="Upload" value={10} mt={4} height={4} />);

    expect(container.firstElementChild!.className).toContain('mt-4');
    expect(container.firstElementChild!.className).toContain('height-4');
  });

  it('has no axe violations, determinate or not', async () => {
    const { container } = render(
      <>
        <Progress label="Upload" value={62} />
        <Progress label="Preparing" />
      </>,
    );

    await expectNoAxeViolations(container);
  });
});
