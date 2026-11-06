import { cleanup, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { ignoreLogs } from '../../dev/tests';
import { StylesContext } from '../react/useStyles';
// prettier-ignore
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Marker, Mask, Path, Polygon, Polyline, RadialGradient, Rect, Stop, Svg, SvgSymbol, SvgText, TSpan, Use } from './svg';

describe('SVG element components', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const styles = () => {
    StylesContext.flushSync();

    return (document.getElementById(StylesContext.styleElementId()) as unknown as HTMLStyleElement).innerText;
  };

  const renderSvg = (children: React.ReactNode) => {
    const { container } = render(<Svg viewBox="0 0 100 100">{children}</Svg>);

    return container.querySelector('svg')!;
  };

  it('renders one element per component, under the tag it is named for', () => {
    const svg = renderSvg(
      <>
        <Defs>
          <LinearGradient id="gradient">
            <Stop offset="0%" stopColor="red" />
          </LinearGradient>
          <RadialGradient id="radial" />
          <ClipPath id="clip">
            <Rect width={10} height={10} />
          </ClipPath>
          <Mask id="mask" />
          <SvgSymbol id="symbol" viewBox="0 0 10 10" />
          <Marker id="marker" refX={5} />
        </Defs>
        <G>
          <Path d="M0 0 L10 10" />
          <Circle cx={5} />
          <Ellipse cx={5} />
          <Line x1={0} y1={0} x2={10} y2={10} />
          <Polyline points="0,0 10,10" />
          <Polygon points="0,0 10,10 0,10" />
          <SvgText x={5} y={5}>
            <TSpan x={5}>label</TSpan>
          </SvgText>
          <Use href="#symbol" />
        </G>
      </>,
    );

    const tags = [...svg.querySelectorAll('*')].map((element) => element.tagName);
    expect(tags).toEqual([
      'defs',
      'linearGradient',
      'stop',
      'radialGradient',
      'clipPath',
      'rect',
      'mask',
      'symbol',
      'marker',
      'g',
      'path',
      'circle',
      'ellipse',
      'line',
      'polyline',
      'polygon',
      'text',
      'tspan',
      'use',
    ]);
  });

  describe('the names SVG and Box both use', () => {
    it("gives a path's d to the element, not to Box's flex-direction prop", () => {
      const svg = renderSvg(<Path d="M0 0 L10 10" />);
      const path = svg.querySelector('path')!;

      expect(path).toHaveAttribute('d', 'M0 0 L10 10');
      expect(path.getAttribute('class')).not.toMatch(/(^|\s)d-/);
      expect(styles()).not.toContain('flex-direction');
    });

    it("gives a rect's width and height to the element, in user units rather than the ÷4 scale", () => {
      const svg = renderSvg(<Rect width={40} height={24} />);
      const rect = svg.querySelector('rect')!;

      expect(rect).toHaveAttribute('width', '40');
      expect(rect).toHaveAttribute('height', '24');
      expect(rect.getAttribute('class')).not.toMatch(/(^|\s)(width|height)-/);
      expect(styles()).not.toContain('width:10rem');
    });

    it("gives a text's x and y to the element, where the CSS geometry properties do not reach", () => {
      const svg = renderSvg(
        <SvgText x={50} y={20} dominantBaseline="central">
          label
        </SvgText>,
      );
      const text = svg.querySelector('text')!;

      expect(text).toHaveAttribute('x', '50');
      expect(text).toHaveAttribute('y', '20');
      expect(styles()).toContain('dominant-baseline:central');
      expect(text.getAttribute('class')).not.toMatch(/(^|\s)[xy]-/);
    });

    it('reads cx as CSS on a circle and as an attribute on a radial gradient', () => {
      const svg = renderSvg(
        <>
          <Circle cx={28} cy={28} r={12} />
          <RadialGradient id="radial" cx="50%" cy="50%" r="50%" />
        </>,
      );

      expect(styles()).toContain('cx:28');
      expect(styles()).toContain('r:12');
      expect(svg.querySelector('circle')).not.toHaveAttribute('cx');

      const gradient = svg.querySelector('radialGradient')!;
      expect(gradient).toHaveAttribute('cx', '50%');
      expect(gradient).toHaveAttribute('r', '50%');
      expect(gradient.getAttribute('class')).not.toMatch(/(^|\s)(cx|cy|r)-/);
    });
  });

  describe('what stays a Box prop', () => {
    it('styles the shapes through the engine, pseudo-classes included', () => {
      const svg = renderSvg(<Circle cx={28} r={12} fill="red-500" strokeWidth={2} hover={{ r: 22 }} />);

      const css = styles();
      expect(css).toContain('stroke-width:2');
      expect(css).toContain('.hover-r-22:hover{r:22px}');
      expect(svg.querySelector('circle')!.getAttribute('class')).toContain('strokeWidth-2');
    });

    it('puts the shape transition on the root svg, so geometry animates with nothing declared', () => {
      const svg = renderSvg(<Circle r={12} />);

      expect(svg.getAttribute('class')).toContain('_s');
    });
  });

  describe('props', () => {
    it('merges the lifted attributes over the ones given in props', () => {
      const svg = renderSvg(<Path d="M0 0 L10 10" props={{ d: 'M0 0', strokeLinecap: 'round' }} />);
      const path = svg.querySelector('path')!;

      expect(path).toHaveAttribute('d', 'M0 0 L10 10');
      expect(path).toHaveAttribute('stroke-linecap', 'round');
    });

    it('leaves an attribute given in props alone when the top-level one was not passed', () => {
      const svg = renderSvg(<Path props={{ d: 'M0 0' }} />);

      expect(svg.querySelector('path')).toHaveAttribute('d', 'M0 0');
    });

    it('forwards a ref to the element', () => {
      const ref = createRef<SVGPathElement>();
      render(
        <Svg viewBox="0 0 10 10">
          <Path ref={ref} d="M0 0" />
        </Svg>,
      );

      expect(ref.current?.tagName).toBe('path');
    });
  });

  describe('Svg', () => {
    it('writes the viewBox, the size and the namespace as attributes', () => {
      const { container } = render(<Svg viewBox="0 0 24 24" width="100%" height={48} preserveAspectRatio="xMidYMid slice" />);
      const svg = container.querySelector('svg')!;

      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('width', '100%');
      expect(svg).toHaveAttribute('height', '48');
      expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
      expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    });

    it('hides a drawing nobody named from the accessibility tree', () => {
      const { container } = render(
        <Svg viewBox="0 0 10 10">
          <Path d="M0 0" />
        </Svg>,
      );

      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it('names one that was given a label, as an image', async () => {
      const { container } = render(
        <Svg viewBox="0 0 10 10" label="Revenue, rising">
          <Path d="M0 10 L10 0" />
        </Svg>,
      );
      const svg = container.querySelector('svg')!;

      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAccessibleName('Revenue, rising');
      expect(svg).not.toHaveAttribute('aria-hidden');
      await expectNoAxeViolations(container);
    });

    it('leaves the decision alone when the caller made it themselves', () => {
      const { container } = render(<Svg viewBox="0 0 10 10" props={{ role: 'presentation' }} />);
      const svg = container.querySelector('svg')!;

      expect(svg).toHaveAttribute('role', 'presentation');
      expect(svg).not.toHaveAttribute('aria-hidden');
    });

    it('takes the style props, minus the layout width and height', () => {
      const { container } = render(<Svg viewBox="0 0 10 10" mt={4} fill="red-500" />);

      expect(styles()).toContain('margin-top:1rem');
      expect(container.querySelector('svg')!.getAttribute('class')).toContain('fill-red-500');
    });
  });
});
