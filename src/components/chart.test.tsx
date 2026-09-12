import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import BoxExtends from '../core/extends/boxExtends';
import { StylesContext } from '../react/useStyles';
import { ChartContainer, Gauge, MiniDonut, ProgressRing, Sparkline } from './chart';

/**
 * The geometry is tested in `utils/chart/chartUtils.test.ts`, where a path is just a value. What is
 * left here is what the components decide: which numbers become attributes and which become classes,
 * what an unnamed drawing tells a screen reader, and that a caller's props still win.
 */
describe('the chart primitives', () => {
  afterEach(() => {
    cleanup();
  });

  const styles = () => {
    StylesContext.flushSync();

    return (document.getElementById(StylesContext.styleElementId()) as unknown as HTMLStyleElement).innerText;
  };

  const renderChart = (element: React.ReactElement) => {
    const { container } = render(element);

    return container.querySelector('svg')!;
  };

  describe('Sparkline', () => {
    it('draws the shape of the data as one path, in the d attribute', () => {
      const svg = renderChart(<Sparkline data={[0, 5, 10]} />);
      const paths = svg.querySelectorAll('path');

      expect(paths).toHaveLength(1);
      expect(paths[0]).toHaveAttribute('d', 'M0 100L50 50L100 0');
    });

    /**
     * The reason a column of ten thousand sparklines is affordable: the part that differs per row is
     * the `d` attribute, which the styling engine never sees, so the rows share every rule.
     */
    it('generates no CSS for the data, however much of it there is', () => {
      const before = styles();

      render(
        <>
          <Sparkline data={[1, 9, 3, 7]} />
          <Sparkline data={[4, 2, 8, 1]} />
          <Sparkline data={[6, 6, 2, 5]} />
        </>,
      );

      expect(styles()).toBe(before);
    });

    it('fills its box and keeps the line one width thick when it is stretched', () => {
      const svg = renderChart(<Sparkline data={[1, 2]} />);

      expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
      expect(svg).toHaveAttribute('width', '100%');
      // vector-effect is not inherited, so its rule names the element and its descendants (SV1).
      expect(svg.getAttribute('class')).toContain('vectorEffect-non-scaling-stroke');
    });

    it('fills the space under the line for an area, with the line still on top', () => {
      const paths = renderChart(<Sparkline data={[0, 10]} variant="area" />).querySelectorAll('path');

      expect(paths).toHaveLength(2);
      expect(paths[0]).toHaveAttribute('d', 'M0 100L100 0L100 100L0 100Z');
      expect(paths[1]).toHaveAttribute('d', 'M0 100L100 0');
    });

    it('draws every bar of a bar variant in one path', () => {
      const paths = renderChart(<Sparkline data={[1, 2, 3]} variant="bar" />).querySelectorAll('path');

      expect(paths).toHaveLength(1);
      expect(paths[0].getAttribute('d')?.match(/M/g)).toHaveLength(3);
    });

    it('has an empty drawing for no data rather than a broken one', () => {
      const svg = renderChart(<Sparkline data={[]} />);

      expect(svg.querySelector('path')).toHaveAttribute('d', '');
    });
  });

  describe('ProgressRing and Gauge', () => {
    it('reveals the value as a dash on the arc — a style prop, so it transitions', () => {
      const svg = renderChart(<ProgressRing value={0.25} />);
      const circles = svg.querySelectorAll('circle');

      // Track, then value. The dash is in the class list and in a rule, not in an attribute.
      expect(circles).toHaveLength(2);
      expect(circles[1].getAttribute('class')).toContain('strokeDashoffset-');
      expect(circles[1]).not.toHaveAttribute('stroke-dashoffset');
      expect(styles()).toContain('stroke-dashoffset:');
    });

    it('starts at twelve o’clock, turned by the attribute that carries its own centre', () => {
      const circles = renderChart(<ProgressRing value={0.5} />).querySelectorAll('circle');

      expect(circles[1]).toHaveAttribute('transform', 'rotate(-90 50 50)');
    });

    /**
     * The other half of the affordability story, and the reason the fraction is rounded: two values
     * that round to the same half-percent share one class and one rule.
     */
    it('shares a rule between values too close together to tell apart', () => {
      const [first] = renderChart(<ProgressRing value={0.4001} />).querySelectorAll('circle');
      const near = renderChart(<ProgressRing value={0.4002} />).querySelectorAll('circle')[1];
      const far = renderChart(<ProgressRing value={0.9} />).querySelectorAll('circle')[1];
      const dashOf = (element: Element) => element.getAttribute('class')?.match(/strokeDashoffset-[\d.]+/)?.[0];

      expect(first).toBeTruthy();
      expect(dashOf(near)).toBe(dashOf(renderChart(<ProgressRing value={0.4004} />).querySelectorAll('circle')[1]));
      expect(dashOf(near)).not.toBe(dashOf(far));
    });

    it('is empty at zero and full at one, and cannot be more than either', () => {
      const offsetOf = (value: number) =>
        renderChart(<ProgressRing value={value} />)
          .querySelectorAll('circle')[1]
          .getAttribute('class')
          ?.match(/strokeDashoffset-([\d.]+)/)?.[1];

      expect(offsetOf(1)).toBe('0');
      expect(offsetOf(4)).toBe(offsetOf(1));
      expect(offsetOf(-1)).toBe(offsetOf(0));
    });

    it('draws a dial as two arcs of the same shape, the value dashed over the track', () => {
      const paths = renderChart(<Gauge value={0.5} />).querySelectorAll('path');

      expect(paths).toHaveLength(2);
      expect(paths[0].getAttribute('d')).toBe(paths[1].getAttribute('d'));
      expect(paths[0].getAttribute('d')).toContain('A45 45 0 1 1');
    });

    it('is a ring when its sweep is a whole turn', () => {
      const d = renderChart(<Gauge value={0.5} sweep={360} />)
        .querySelector('path')!
        .getAttribute('d');

      // Two arcs, because one back to its own start draws nothing at all.
      expect(d?.match(/A/g)).toHaveLength(2);
    });

    it('puts what it is given in the middle', () => {
      const svg = renderChart(
        <ProgressRing value={0.5}>
          <text x="50" y="55">
            50%
          </text>
        </ProgressRing>,
      );

      expect(svg.querySelector('text')).toHaveTextContent('50%');
    });
  });

  describe('MiniDonut', () => {
    it('draws one segment per value, each turned to where it starts', () => {
      const circles = renderChart(<MiniDonut data={[1, 1, 2]} />).querySelectorAll('circle');

      expect(circles).toHaveLength(3);
      expect(circles[0]).toHaveAttribute('transform', 'rotate(-90 50 50)');
      expect(circles[1]).toHaveAttribute('transform', 'rotate(0 50 50)');
      expect(circles[2]).toHaveAttribute('transform', 'rotate(90 50 50)');
    });

    it('cycles its colours, and takes any value the fill prop takes', () => {
      const circles = renderChart(<MiniDonut data={[1, 1]} colors={['sky-500', 'var(--chart-2)']} />).querySelectorAll('circle');

      expect(circles[0].getAttribute('class')).toContain('stroke-sky-500');
      expect(circles[1].getAttribute('class')).toContain('stroke-var(--chart-2)');
      expect(styles()).toContain('stroke:var(--chart-2)');
    });

    it('draws nothing at all for values that sum to nothing', () => {
      expect(renderChart(<MiniDonut data={[0, 0]} />).querySelectorAll('circle')).toHaveLength(0);
    });
  });

  describe('every primitive', () => {
    const primitives = [
      ['Sparkline', <Sparkline key="s" data={[1, 2, 3]} />, <Sparkline key="sl" data={[1, 2, 3]} label="Revenue, last 7 days" />],
      ['ProgressRing', <ProgressRing key="r" value={0.4} />, <ProgressRing key="rl" value={0.4} label="40% complete" />],
      ['Gauge', <Gauge key="g" value={0.4} />, <Gauge key="gl" value={0.4} label="Load: 40%" />],
      ['MiniDonut', <MiniDonut key="d" data={[1, 2]} />, <MiniDonut key="dl" data={[1, 2]} label="Split by region" />],
    ] as const;

    // `Svg`'s rule, inherited rather than reimplemented: decoration is hidden, a named drawing is an
    // image. A chart is the case that makes it matter — the numbers are in the picture.
    it.each(primitives)('%s is hidden from a screen reader when nobody named it', (_name, unnamed) => {
      const svg = renderChart(unnamed);

      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('role');
    });

    it.each(primitives)('%s is an image with a name when it is given a label', (_name, _unnamed, named) => {
      const svg = renderChart(named);

      expect(svg).toHaveAttribute('role', 'img');
      expect(svg.getAttribute('aria-label')).toBeTruthy();
    });

    it.each(primitives)('%s takes the style props, so its colour is a class', (_name, unnamed) => {
      const svg = renderChart(<>{unnamed}</>).parentElement!.querySelector('svg')!;

      expect(svg.getAttribute('class')).toContain('_s');
    });

    it.each(primitives)('%s passes axe, named and unnamed', async (_name, unnamed, named) => {
      const { container } = render(
        <>
          {unnamed}
          {named}
        </>,
      );

      await expectNoAxeViolations(container);
    });
  });

  it('lets a caller override the size, the colour and the coordinate defaults', () => {
    const svg = renderChart(<Sparkline data={[1, 2]} width="8rem" height="3rem" color="emerald-500" strokeWidth={3} />);

    expect(svg).toHaveAttribute('width', '8rem');
    expect(svg).toHaveAttribute('height', '3rem');
    expect(svg.getAttribute('class')).toContain('color-emerald-500');
    expect(svg.getAttribute('class')).toContain('strokeWidth-3');
  });

  it('forwards a ref to the svg element and props to its attributes', () => {
    const ref = createRef<SVGSVGElement>();
    const svg = renderChart(<ProgressRing ref={ref} value={0.5} props={{ 'aria-roledescription': 'ring' }} />);

    expect(ref.current).toBe(svg);
    expect(svg).toHaveAttribute('aria-roledescription', 'ring');
  });
});

/**
 * The container decides nothing about colour — `ChartUtils` does, and its own tests cover the
 * mapping. What is left here is that the variables land in a class rather than in a style attribute,
 * that the dark palette arrives through the theme selector, and that a caller still wins.
 */
describe('ChartContainer', () => {
  afterEach(() => {
    cleanup();
  });

  const styles = () => {
    StylesContext.flushSync();

    return (document.getElementById(StylesContext.styleElementId()) as unknown as HTMLStyleElement).innerText;
  };

  it('declares the numbered palette and one variable per series, in a class', () => {
    const { container } = render(<ChartContainer series={['revenue', 'cost']} />);
    const element = container.firstElementChild!;

    expect(element).not.toHaveAttribute('style');
    expect(styles()).toContain(
      '--chart-1:var(--sky-500);--chart-2:var(--emerald-500);--chart-3:var(--amber-500);--chart-4:var(--violet-500);--chart-5:var(--rose-500);--chart-6:var(--cyan-500);--color-revenue:var(--chart-1);--color-cost:var(--chart-2)',
    );
  });

  // The point of the whole step: nothing inside the chart changes between the two themes.
  it('redeclares the palette under the theme selector', () => {
    render(<ChartContainer />);

    expect(styles()).toContain('.dark .theme-dark-vars-chart-1-sky-400');
    expect(styles()).toContain('--chart-1:var(--sky-400)');
  });

  it('shares one rule between two containers with the same series', () => {
    const { container } = render(<ChartContainer series={['a']} />);
    render(<ChartContainer series={['a']} p={4} />);

    const [first] = Array.from(container.firstElementChild!.classList).filter((name) => name.includes('color-a'));

    expect(first).toBeTruthy();
    expect(styles().split('--color-a').length - 1).toBe(1);
  });

  it('lets a caller replace one slot without a prop for it', () => {
    render(<ChartContainer series={['revenue']} vars={{ 'chart-1': 'teal-600' }} />);

    expect(styles()).toContain('--chart-1:var(--teal-600)');
  });

  it('keeps the dark palette when the caller brings a theme of their own', () => {
    render(<ChartContainer theme={{ dark: { bgColor: 'slate-900' } }} />);

    expect(styles()).toContain('--chart-1:var(--sky-400)');
    expect(styles()).toContain('background-color:var(--slate-900)');
  });

  it('paints a chart drawn with the variables and nothing else', () => {
    const { container } = render(
      <ChartContainer series={['revenue']}>
        <Sparkline data={[1, 4, 2]} stroke="var(--color-revenue)" />
      </ChartContainer>,
    );

    expect(container.querySelector('svg')!.getAttribute('class')).toContain('stroke-var(--color-revenue)');
    expect(styles()).toContain('stroke:var(--color-revenue)');
  });

  it('renders a plain wrapper with no role of its own, and forwards its ref', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ChartContainer ref={ref} tag="section" />);

    expect(ref.current).toBe(container.firstElementChild);
    expect(container.firstElementChild!.tagName).toBe('SECTION');
    expect(container.firstElementChild!.getAttribute('role')).toBeNull();
  });
});

/**
 * The style tree each primitive names — the point of it being that an app restyles every chart it has
 * in one place. Last in the file on purpose: `components()` writes to the shared registry.
 */
describe('the chart style trees', () => {
  afterEach(() => {
    cleanup();
  });

  it('takes its paint from the node, so one override reaches every drawing', () => {
    BoxExtends.components({ sparkline: { styles: { stroke: 'emerald-500' } } });

    const { container } = render(<Sparkline data={[1, 2]} />);

    expect(container.querySelector('svg')!.getAttribute('class')).toContain('stroke-emerald-500');
  });

  it('reaches the parts a drawing is made of', () => {
    BoxExtends.components({ progressRing: { children: { track: { styles: { strokeOpacity: 0.5 } } } } });

    const { container } = render(<ProgressRing value={0.4} />);

    expect(container.querySelectorAll('circle')[0].getAttribute('class')).toContain('strokeOpacity-0.5');
  });

  it('still lets a prop on the element win', () => {
    BoxExtends.components({ miniDonut: { styles: { strokeLinecap: 'round' } } });

    const { container } = render(<MiniDonut data={[1, 1]} strokeLinecap="butt" />);

    expect(container.querySelector('svg')!.getAttribute('class')).toContain('strokeLinecap-butt');
  });
});
