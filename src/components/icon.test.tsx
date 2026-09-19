import { cleanup, render } from '@testing-library/react';
import { Sun } from 'lucide-react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { ignoreLogs } from '../../dev/tests';
import { StylesContext } from '../react/useStyles';
import Icon from './icon';
import { Path, Svg } from './svg';

/**
 * An icon set that is not lucide, written the way `@tabler/icons-react` and `react-icons` are:
 * whatever it is given lands on its `<svg>`. That contract is the whole of `Icon`'s requirement,
 * and it is what makes one adapter enough for every set.
 */
function TablerShapedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path d="M12 3v18" />
    </svg>
  );
}

describe('Icon', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const styles = () => {
    StylesContext.flushSync();

    return (document.getElementById(StylesContext.styleElementId()) as unknown as HTMLStyleElement).innerText;
  };

  const renderIcon = (element: React.ReactElement) => {
    const { container } = render(element);

    return container.querySelector('svg')!;
  };

  describe('the icon sets', () => {
    it('styles a lucide icon through the class it spreads onto its own svg', () => {
      const svg = renderIcon(
        <Icon color="amber-400">
          <Sun />
        </Icon>,
      );

      expect(svg.tagName).toBe('svg');
      expect(svg.getAttribute('class')).toContain('color-amber-400');
      expect(styles()).toContain('color:var(--amber-400)');
    });

    it('styles any component that spreads its props onto an svg', () => {
      const svg = renderIcon(
        <Icon opacity={0.5}>
          <TablerShapedIcon />
        </Icon>,
      );

      expect(svg.querySelector('path')).toHaveAttribute('d', 'M12 3v18');
      expect(svg.getAttribute('class')).toContain('opacity-0.5');
    });

    it('styles a raw inline svg', () => {
      const svg = renderIcon(
        <Icon color="sky-500">
          <svg viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={10} />
          </svg>
        </Icon>,
      );

      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg.getAttribute('class')).toContain('color-sky-500');
    });

    it('keeps the class the icon set wrote for itself', () => {
      const svg = renderIcon(
        <Icon className="my-icon">
          <TablerShapedIcon className="tabler-icon" />
        </Icon>,
      );

      expect(svg.getAttribute('class')).toContain('tabler-icon');
      expect(svg.getAttribute('class')).toContain('my-icon');
    });

    it('takes exactly one element, and says so when it is given anything else', () => {
      expect(() =>
        render(
          <Icon>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {['a', 'b'] as any}
          </Icon>,
        ),
      ).toThrow(/<Icon> takes exactly one element/);
    });
  });

  describe('size', () => {
    it('is 24px square by default, the size an icon set draws at', () => {
      const svg = renderIcon(
        <Icon>
          <Sun />
        </Icon>,
      );

      expect(svg.getAttribute('class')).toContain('width-6');
      expect(svg.getAttribute('class')).toContain('height-6');
      expect(styles()).toContain('.width-6{width:1.5rem}');
    });

    it('is one number on the ÷4 scale, for both axes', () => {
      const svg = renderIcon(
        <Icon size={5}>
          <Sun />
        </Icon>,
      );

      expect(svg.getAttribute('class')).toContain('width-5');
      expect(svg.getAttribute('class')).toContain('height-5');
      expect(styles()).toContain('.height-5{height:1.25rem}');
    });

    it('is CSS, not a prop handed down — so it outranks the width the icon set writes', () => {
      const svg = renderIcon(
        <Icon size={4}>
          <Sun />
        </Icon>,
      );

      // lucide's own attributes are still there; the class is what decides, because a CSS
      // declaration beats a presentation attribute. Nothing about lucide's API is known here.
      expect(svg).toHaveAttribute('width', '24');
      expect(svg.getAttribute('class')).toContain('width-4');
    });

    it('lets a width or a height of its own replace the default, and a size beat both', () => {
      const wide = renderIcon(
        <Icon width={10}>
          <Sun />
        </Icon>,
      );
      cleanup();
      const sized = renderIcon(
        <Icon width={10} size={3}>
          <Sun />
        </Icon>,
      );

      expect(wide.getAttribute('class')).toContain('width-10');
      expect(wide.getAttribute('class')).not.toContain('width-6');
      expect(sized.getAttribute('class')).toContain('width-3');
      expect(sized.getAttribute('class')).not.toContain('width-10');
    });
  });

  describe('the style props', () => {
    it('puts strokeWidth in the class, where a breakpoint and a hover can reach it', () => {
      const svg = renderIcon(
        <Icon strokeWidth={1.5} hover={{ strokeWidth: 3 }}>
          <Sun />
        </Icon>,
      );

      expect(svg).toHaveAttribute('stroke-width', '2');
      expect(styles()).toContain('stroke-width:1.5');
      expect(styles()).toContain(':hover{stroke-width:3}');
    });

    it('resolves themes and pseudo-classes the same way every other Box prop does', () => {
      renderIcon(
        <Icon color="gray-500" theme={{ dark: { color: 'gray-300' } }}>
          <Sun />
        </Icon>,
      );

      expect(styles()).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-color-gray-300{color:var(--gray-300)}}');
    });

    it('forwards props to the element and a ref to it', () => {
      const ref = createRef<SVGSVGElement>();
      const svg = renderIcon(
        <Icon ref={ref} props={{ focusable: false }}>
          <Sun />
        </Icon>,
      );

      expect(svg).toHaveAttribute('focusable', 'false');
      expect(ref.current).toBe(svg);
    });
  });

  describe('the name', () => {
    it('hides an icon nobody named from the accessibility tree', () => {
      const svg = renderIcon(
        <Icon>
          <Sun />
        </Icon>,
      );

      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('names one that was given a label, as an image', async () => {
      const { container } = render(
        <Icon label="Sunny">
          <Sun />
        </Icon>,
      );
      const svg = container.querySelector('svg')!;

      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAccessibleName('Sunny');
      expect(svg).not.toHaveAttribute('aria-hidden');
      await expectNoAxeViolations(container);
    });

    it('leaves the decision alone when the icon or the caller made it', () => {
      const byCaller = renderIcon(
        <Icon props={{ role: 'presentation' }}>
          <Sun />
        </Icon>,
      );
      cleanup();
      const byIcon = renderIcon(
        <Icon>
          <TablerShapedIcon aria-label="North" />
        </Icon>,
      );

      expect(byCaller).toHaveAttribute('role', 'presentation');
      expect(byCaller).not.toHaveAttribute('aria-hidden');
      expect(byIcon).not.toHaveAttribute('aria-hidden');
    });
  });

  /**
   * `Svg` takes these props already — it is a Box — so wrapping one in `Icon` is still not what the
   * adapter is for. It used to be worse than redundant: `Icon` hands attributes the way an icon set
   * takes them, on top, while a Box keeps them in `props`, so the name was dropped and the icon came
   * out `aria-hidden` and unnamed (bug #78). The adapter asks the child which convention it follows.
   */
  describe('a child of this library’s own', () => {
    it('is styled directly, which is the way to do it', () => {
      const svg = renderIcon(
        <Svg viewBox="0 0 24 24" width="1.5rem" color="sky-500" label="Sunny">
          <Path d="M12 3v18" />
        </Svg>,
      );

      expect(svg.getAttribute('class')).toContain('color-sky-500');
      expect(svg).toHaveAttribute('role', 'img');
    });

    it('is still named when it is wrapped, in the props bag where its attributes live', () => {
      const svg = renderIcon(
        <Icon label="Sort" color="sky-500">
          <Svg viewBox="0 0 24 24">
            <Path d="M12 3v18" />
          </Svg>
        </Icon>,
      );

      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', 'Sort');
      expect(svg.getAttribute('class')).toContain('color-sky-500');
    });

    it('is hidden when it is wrapped and nobody named it', () => {
      const svg = renderIcon(
        <Icon>
          <Svg viewBox="0 0 24 24">
            <Path d="M12 3v18" />
          </Svg>
        </Icon>,
      );

      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('role');
    });

    // `cloneElement` replaces a prop it is given, and for a Box that prop is the whole attribute
    // bag — so the routing has to merge rather than assign.
    it('keeps the attributes the child was written with', () => {
      const svg = renderIcon(
        <Icon label="Sort">
          <Svg viewBox="0 0 24 24" props={{ 'aria-roledescription': 'sort marker' }}>
            <Path d="M12 3v18" />
          </Svg>
        </Icon>,
      );

      expect(svg).toHaveAttribute('aria-roledescription', 'sort marker');
      expect(svg).toHaveAttribute('aria-label', 'Sort');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('leaves a name the child gave itself alone', () => {
      const svg = renderIcon(
        <Icon>
          <Svg viewBox="0 0 24 24" label="Drawn by hand">
            <Path d="M12 3v18" />
          </Svg>
        </Icon>,
      );

      expect(svg).toHaveAttribute('aria-label', 'Drawn by hand');
      expect(svg).not.toHaveAttribute('aria-hidden');
    });
  });
});
