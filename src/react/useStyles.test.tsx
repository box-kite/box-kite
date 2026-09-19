import { cleanup, render } from '@testing-library/react';
import { HTMLDivElement, HTMLStyleElement } from 'happy-dom';
import { StrictMode, useLayoutEffect } from 'react';
import { afterEach, describe, expect, it, suite } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Box from '../box';
import { BoxStyleProps } from '../types';
import { StylesContext } from './useStyles';

const testElementId = 'testElementId';

describe('useStyles', () => {
  ignoreLogs();

  afterEach(cleanup);

  function act(styles: BoxStyleProps) {
    render(
      <Box>
        <Box id={testElementId} {...styles} />
      </Box>,
    );

    const element = document.getElementById(testElementId)!;

    expect(element).not.toBeNull();
    expect(element).toBeInstanceOf(HTMLDivElement);

    const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

    return { element, parent: element.parentElement!, styleElement };
  }

  // The escape hatch is a class like every other prop — the element carries no `style` attribute at all.
  it('compiles the css prop into a class, not an inline style', () => {
    const { element, styleElement } = act({ css: { mixBlendMode: 'multiply' }, hover: { css: { isolation: 'isolate' } } });

    expect(element.classList).toContain('css-mixBlendMode-multiply');
    expect(element.classList).toContain('hover-css-isolation-isolate');
    expect(element.getAttribute('style')).toBeNull();
    expect(styleElement.innerText).toContain('.css-mixBlendMode-multiply{mix-blend-mode:multiply}');
    expect(styleElement.innerText).toContain('.hover-css-isolation-isolate:hover{isolation:isolate}');
  });

  it('applies margin styles', async () => {
    const { element, styleElement } = act({
      m: 8,
      hover: { m: 5 },
    });

    expect(styleElement.innerText).toContain('.m-8{margin:2rem}');
    expect(styleElement.innerText).toContain('.hover-m-5:hover{margin:1.25rem}');

    expect(element.classList).toContain('m-8');
    expect(element.classList).toContain('hover-m-5');
  });

  it('applies padding and border styles', () => {
    const { element, styleElement } = act({ p: 4, b: 1 });
    expect(styleElement.innerText).toContain('.p-4{padding:1rem}');
    expect(styleElement.innerText).toContain('.b-1{border-width:1px}');
    expect(element.classList).toContain('p-4');
    expect(element.classList).toContain('b-1');
  });

  it('applies hover and focus styles', () => {
    const { element, styleElement } = act({
      hover: { bgColor: 'gray-100' },
      focus: { bgColor: 'gray-200' },
    });
    expect(styleElement.innerText).toContain('.hover-bgColor-gray-100:hover{background-color:var(--gray-100)}');
    expect(styleElement.innerText).toContain('.focus-bgColor-gray-200:focus-within{background-color:var(--gray-200)}');
    expect(element.classList).toContain('hover-bgColor-gray-100');
    expect(element.classList).toContain('focus-bgColor-gray-200');
  });

  it('applies active and disabled styles', () => {
    const { element, styleElement } = act({
      active: { opacity: 0.8 },
      disabled: [true, { opacity: 0.4 }],
    });
    expect(styleElement.innerText).toContain('.active-opacity-0\\.8:active{opacity:0.8}');
    expect(styleElement.innerText).toContain('.disabled-opacity-0\\.4[disabled]{opacity:0.4}');
    expect(element.classList).toContain('active-opacity-0.8');
    expect(element.classList).toContain('disabled-opacity-0.4');
  });

  it('applies selected and checked styles', () => {
    const { element, styleElement } = act({
      selected: [true, { borderColor: 'blue-300' }],
      checked: [true, { bgColor: 'green-100' }],
    });
    expect(styleElement.innerText).toContain('.selected-borderColor-blue-300[aria-selected="true"]{border-color:var(--blue-300)}');
    expect(styleElement.innerText).toContain('.checked-bgColor-green-100:checked{background-color:var(--green-100)}');
    expect(element.classList).toContain('selected-borderColor-blue-300');
    expect(element.classList).toContain('checked-bgColor-green-100');
  });

  it('applies required styles', () => {
    const { element, styleElement } = act({
      required: [true, { borderColor: 'red-500' }],
    });
    expect(styleElement.innerText).toContain('.required-borderColor-red-500:required{border-color:var(--red-500)}');
    expect(element.classList).toContain('required-borderColor-red-500');
  });

  it('applies placeholderStyles pseudo-element styles', () => {
    const { element, styleElement } = act({
      placeholderStyles: { color: 'gray-400' },
    });
    expect(styleElement.innerText).toContain('.placeholderStyles-color-gray-400::placeholder{color:var(--gray-400)}');
    expect(element.classList).toContain('placeholderStyles-color-gray-400');
  });

  it('applies placeholderStyles with hover combination', () => {
    const { element, styleElement } = act({
      hover: { placeholderStyles: { color: 'gray-500' } },
    });
    expect(styleElement.innerText).toContain('.hover-placeholderStyles-color-gray-500:hover::placeholder{color:var(--gray-500)}');
    expect(element.classList).toContain('hover-placeholderStyles-color-gray-500');
  });

  it('applies multiple combinations of styles', () => {
    const { element, styleElement } = act({
      m: 2,
      hover: { m: 3 },
      focus: { m: 4 },
      active: { m: 5 },
    });
    expect(styleElement.innerText).toContain('.m-2{margin:0.5rem}');
    expect(styleElement.innerText).toContain('.hover-m-3:hover{margin:0.75rem}');
    expect(styleElement.innerText).toContain('.focus-m-4:focus-within{margin:1rem}');
    expect(styleElement.innerText).toContain('.active-m-5:active{margin:1.25rem}');
    expect(element.classList).toContain('m-2');
    expect(element.classList).toContain('hover-m-3');
    expect(element.classList).toContain('focus-m-4');
    expect(element.classList).toContain('active-m-5');
  });

  suite('when use selectedGroup', () => {
    it('applies selected selector over parent element', () => {
      const { element, styleElement } = act({
        selectedGroup: {
          parent: {
            bgColor: 'blue-100',
            hover: {
              bgColor: 'blue-200',
            },
          },
        },
      });

      expect(styleElement.innerText).toContain(
        '.parent[aria-selected="true"] .selected-parent-bgColor-blue-100{background-color:var(--blue-100)}',
      );
      // The nested `hover` is *this* element's, not the group's (bug #115): both states used to share
      // the pseudo-class mask, so the group came out `:hover[aria-selected="true"]` and the element bare.
      expect(styleElement.innerText).toContain(
        '.parent[aria-selected="true"] .hover-selected-parent-bgColor-blue-200:hover{background-color:var(--blue-200)}',
      );

      expect(element.classList).toContain('selected-parent-bgColor-blue-100');
      expect(element.classList).toContain('hover-selected-parent-bgColor-blue-200');
    });
  });

  suite('string enum values', () => {
    it('applies display prop', () => {
      const { element, styleElement } = act({ display: 'flex' });
      expect(styleElement.innerText).toContain('.display-flex{display:flex}');
      expect(element.classList).toContain('display-flex');
    });

    it('applies position prop', () => {
      const { element, styleElement } = act({ position: 'absolute' });
      expect(styleElement.innerText).toContain('.position-absolute{position:absolute}');
      expect(element.classList).toContain('position-absolute');
    });

    it('applies overflow prop', () => {
      const { element, styleElement } = act({ overflow: 'hidden' });
      expect(styleElement.innerText).toContain('.overflow-hidden{overflow:hidden}');
      expect(element.classList).toContain('overflow-hidden');
    });

    it('applies textAlign prop with custom styleName', () => {
      const { element, styleElement } = act({ textAlign: 'center' });
      expect(styleElement.innerText).toContain('.textAlign-center{text-align:center}');
      expect(element.classList).toContain('textAlign-center');
    });

    it('applies cursor prop', () => {
      const { element, styleElement } = act({ cursor: 'pointer' });
      expect(styleElement.innerText).toContain('.cursor-pointer{cursor:pointer}');
      expect(element.classList).toContain('cursor-pointer');
    });
  });

  suite('boolean values', () => {
    it('applies inline prop (boolean to display: inline-block)', () => {
      const { element, styleElement } = act({ inline: true });
      expect(styleElement.innerText).toContain('.inline-true{display:inline-block}');
      expect(element.classList).toContain('inline-true');
    });

    it('applies flex1 prop (boolean to flex: 1)', () => {
      const { element, styleElement } = act({ flex1: true });
      expect(styleElement.innerText).toContain('.flex1-true{flex:1}');
      expect(element.classList).toContain('flex1-true');
    });
  });

  suite('number values with formatters', () => {
    it('applies fontSize with divider 16 (rem)', () => {
      const { element, styleElement } = act({ fontSize: 14 });
      expect(styleElement.innerText).toContain('.fontSize-14{font-size:0.875rem}');
      expect(element.classList).toContain('fontSize-14');
    });

    it('applies fontSize=16 equals 1rem', () => {
      const { element, styleElement } = act({ fontSize: 16 });
      expect(styleElement.innerText).toContain('.fontSize-16{font-size:1rem}');
      expect(element.classList).toContain('fontSize-16');
    });

    it('applies borderRadius with rem formatter', () => {
      const { element, styleElement } = act({ borderRadius: 8 });
      expect(styleElement.innerText).toContain('.borderRadius-8{border-radius:2rem}');
      expect(element.classList).toContain('borderRadius-8');
    });

    it('applies lineHeight with px formatter', () => {
      const { element, styleElement } = act({ lineHeight: 24 });
      expect(styleElement.innerText).toContain('.lineHeight-24{line-height:24px}');
      expect(element.classList).toContain('lineHeight-24');
    });

    it('applies letterSpacing with px formatter', () => {
      const { element, styleElement } = act({ letterSpacing: 2 });
      expect(styleElement.innerText).toContain('.letterSpacing-2{letter-spacing:2px}');
      expect(element.classList).toContain('letterSpacing-2');
    });

    it('applies outline with px formatter', () => {
      const { element, styleElement } = act({ outline: 2 });
      expect(styleElement.innerText).toContain('.outline-2{outline-width:2px;outline-style:solid}');
      expect(element.classList).toContain('outline-2');
    });

    it('applies opacity as a direct numeric value', () => {
      const { element, styleElement } = act({ opacity: 0.5 });
      expect(styleElement.innerText).toContain('.opacity-0\\.5{opacity:0.5}');
      expect(element.classList).toContain('opacity-0.5');
    });

    it('applies fontWeight as a direct numeric value', () => {
      const { element, styleElement } = act({ fontWeight: 700 });
      expect(styleElement.innerText).toContain('.fontWeight-700{font-weight:700}');
      expect(element.classList).toContain('fontWeight-700');
    });

    it('applies rotate with degree formatter', () => {
      const { element, styleElement } = act({ rotate: 90 });
      expect(styleElement.innerText).toContain('.rotate-90{rotate:90deg}');
      expect(element.classList).toContain('rotate-90');
    });
  });

  suite('multi-styleName props', () => {
    it('applies borderRadiusTop to both top-left and top-right', () => {
      const { element, styleElement } = act({ borderRadiusTop: 4 });
      expect(styleElement.innerText).toContain('.borderRadiusTop-4{border-top-left-radius:1rem;border-top-right-radius:1rem}');
      expect(element.classList).toContain('borderRadiusTop-4');
    });

    it('applies borderRadiusRight to both top-right and bottom-right', () => {
      const { element, styleElement } = act({ borderRadiusRight: 4 });
      expect(styleElement.innerText).toContain('.borderRadiusRight-4{border-top-right-radius:1rem;border-bottom-right-radius:1rem}');
      expect(element.classList).toContain('borderRadiusRight-4');
    });

    it('applies borderRadiusBottom to both bottom-left and bottom-right', () => {
      const { element, styleElement } = act({ borderRadiusBottom: 4 });
      expect(styleElement.innerText).toContain('.borderRadiusBottom-4{border-bottom-left-radius:1rem;border-bottom-right-radius:1rem}');
      expect(element.classList).toContain('borderRadiusBottom-4');
    });

    it('applies borderRadiusLeft to both top-left and bottom-left', () => {
      const { element, styleElement } = act({ borderRadiusLeft: 4 });
      expect(styleElement.innerText).toContain('.borderRadiusLeft-4{border-top-left-radius:1rem;border-bottom-left-radius:1rem}');
      expect(element.classList).toContain('borderRadiusLeft-4');
    });
  });

  suite('color props with variable resolution', () => {
    it('applies color prop with CSS variable', () => {
      const { element, styleElement } = act({ color: 'red-500' });
      expect(styleElement.innerText).toContain('.color-red-500{color:var(--red-500)}');
      expect(element.classList).toContain('color-red-500');
    });

    it('applies borderColor prop with CSS variable', () => {
      const { element, styleElement } = act({ borderColor: 'blue-500' });
      expect(styleElement.innerText).toContain('.borderColor-blue-500{border-color:var(--blue-500)}');
      expect(element.classList).toContain('borderColor-blue-500');
    });
  });

  suite('special value formats', () => {
    it('applies height fit as 100%', () => {
      const { element, styleElement } = act({ height: 'fit' });
      expect(styleElement.innerText).toContain('.height-fit{height:100%}');
      expect(element.classList).toContain('height-fit');
    });

    it('applies height fit-screen as 100vh', () => {
      const { element, styleElement } = act({ height: 'fit-screen' });
      expect(styleElement.innerText).toContain('.height-fit-screen{height:100vh}');
      expect(element.classList).toContain('height-fit-screen');
    });

    it('applies width fit as 100%', () => {
      const { element, styleElement } = act({ width: 'fit' });
      expect(styleElement.innerText).toContain('.width-fit{width:100%}');
      expect(element.classList).toContain('width-fit');
    });

    it('applies height with fraction value', () => {
      const { element, styleElement } = act({ height: '1/2' });
      expect(styleElement.innerText).toContain('.height-1\\/2{height:50%}');
      expect(element.classList).toContain('height-1/2');
    });

    it('applies gridTemplateColumns with repeat formatter', () => {
      const { element, styleElement } = act({ gridTemplateColumns: 3 });
      expect(styleElement.innerText).toContain('.gridTemplateColumns-3{grid-template-columns:repeat(3,minmax(0,1fr))}');
      expect(element.classList).toContain('gridTemplateColumns-3');
    });

    it('applies gridColumn with span formatter', () => {
      const { element, styleElement } = act({ gridColumn: 2 });
      expect(styleElement.innerText).toContain('.gridColumn-2{grid-column:span 2/span 2}');
      expect(element.classList).toContain('gridColumn-2');
    });

    it('applies gridColumn full-row', () => {
      const { element, styleElement } = act({ gridColumn: 'full-row' });
      expect(styleElement.innerText).toContain('.gridColumn-full-row{grid-column:1/-1}');
      expect(element.classList).toContain('gridColumn-full-row');
    });

    it('applies content empty as empty string', () => {
      const { element, styleElement } = act({ content: 'empty' });
      expect(styleElement.innerText).toContain(".content-empty{content:''}");
      expect(element.classList).toContain('content-empty');
    });

    it('applies flip xAxis', () => {
      const { element, styleElement } = act({ flip: 'xAxis' });
      expect(styleElement.innerText).toContain('.flip-xAxis{scale:-1 1}');
      expect(element.classList).toContain('flip-xAxis');
    });

    it('applies translateX with rem', () => {
      const { element, styleElement } = act({ translateX: 4 });
      expect(styleElement.innerText).toContain(
        '.translateX-4{--boxTranslateX:1rem;translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)}',
      );
      expect(element.classList).toContain('translateX-4');
    });
  });

  suite('null and undefined values', () => {
    it('skips undefined values', () => {
      const { element, styleElement } = act({ p: 4, m: undefined });
      expect(styleElement.innerText).toContain('.p-4{padding:1rem}');
      expect(element.classList).toContain('p-4');
      expect(styleElement.innerText).not.toContain('m-undefined');
    });

    it('skips null values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { element, styleElement } = act({ p: 4, m: null as unknown as any });
      expect(styleElement.innerText).toContain('.p-4{padding:1rem}');
      expect(element.classList).toContain('p-4');
      expect(styleElement.innerText).not.toContain('m-null');
    });
  });

  suite('breakpoint styles', () => {
    it('applies sm breakpoint styles', () => {
      const { element, styleElement } = act({ sm: { p: 4 } });
      expect(styleElement.innerText).toContain('@media (min-width: 640px){.sm-p-4{padding:1rem}}');
      expect(element.classList).toContain('sm-p-4');
    });

    it('applies md breakpoint styles', () => {
      const { element, styleElement } = act({ md: { p: 6 } });
      expect(styleElement.innerText).toContain('@media (min-width: 768px){.md-p-6{padding:1.5rem}}');
      expect(element.classList).toContain('md-p-6');
    });

    it('applies lg breakpoint styles', () => {
      const { element, styleElement } = act({ lg: { p: 8 } });
      expect(styleElement.innerText).toContain('@media (min-width: 1024px){.lg-p-8{padding:2rem}}');
      expect(element.classList).toContain('lg-p-8');
    });

    it('applies xl breakpoint styles', () => {
      const { element, styleElement } = act({ xl: { display: 'flex' } });
      expect(styleElement.innerText).toContain('@media (min-width: 1280px){.xl-display-flex{display:flex}}');
      expect(element.classList).toContain('xl-display-flex');
    });

    it('applies breakpoint with hover pseudo class', () => {
      const { element, styleElement } = act({ sm: { hover: { bgColor: 'gray-100' } } });
      expect(styleElement.innerText).toContain(
        '@media (min-width: 640px){.sm-hover-bgColor-gray-100:hover{background-color:var(--gray-100)}}',
      );
      expect(element.classList).toContain('sm-hover-bgColor-gray-100');
    });

    it('applies multiple breakpoints on same element', () => {
      const { element, styleElement } = act({ p: 2, sm: { p: 4 }, md: { p: 6 }, lg: { p: 8 } });
      expect(styleElement.innerText).toContain('.p-2{padding:0.5rem}');
      expect(styleElement.innerText).toContain('@media (min-width: 640px){.sm-p-4{padding:1rem}}');
      expect(styleElement.innerText).toContain('@media (min-width: 768px){.md-p-6{padding:1.5rem}}');
      expect(styleElement.innerText).toContain('@media (min-width: 1024px){.lg-p-8{padding:2rem}}');
      expect(element.classList).toContain('p-2');
      expect(element.classList).toContain('sm-p-4');
      expect(element.classList).toContain('md-p-6');
      expect(element.classList).toContain('lg-p-8');
    });
  });

  suite('pseudo2 as object form', () => {
    it('applies disabled styles as object (without boolean flag)', () => {
      // Object form works at runtime via ObjectUtils.isObject check, though types only expose array form at top level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { element, styleElement } = act({ disabled: { opacity: 0.4 } } as any);
      expect(styleElement.innerText).toContain('.disabled-opacity-0\\.4[disabled]{opacity:0.4}');
      expect(element.classList).toContain('disabled-opacity-0.4');
    });

    it('applies indeterminate styles', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { element, styleElement } = act({ indeterminate: { opacity: 0.6 } } as any);
      expect(styleElement.innerText).toContain('.indeterminate-opacity-0\\.6:indeterminate{opacity:0.6}');
      expect(element.classList).toContain('indeterminate-opacity-0.6');
    });
  });

  suite('combined pseudo classes (weight composition)', () => {
    it('applies hover + focus combined weight', () => {
      const { element, styleElement } = act({
        hover: { focus: { bgColor: 'blue-100' } },
      });
      expect(styleElement.innerText).toContain('.hover-focus-bgColor-blue-100:hover:focus-within{background-color:var(--blue-100)}');
      expect(element.classList).toContain('hover-focus-bgColor-blue-100');
    });
  });

  suite('pseudoGroupClasses', () => {
    it('applies hoverGroup styles', () => {
      const { element, styleElement } = act({
        hoverGroup: {
          parent: {
            bgColor: 'green-100',
          },
        },
      });
      expect(styleElement.innerText).toContain('.parent:hover .hover-parent-bgColor-green-100{background-color:var(--green-100)}');
      expect(element.classList).toContain('hover-parent-bgColor-green-100');
    });

    it('applies disabledGroup styles', () => {
      const { element, styleElement } = act({
        disabledGroup: {
          parent: {
            opacity: 0.4,
          },
        },
      });
      expect(styleElement.innerText).toContain('.parent[disabled] .disabled-parent-opacity-0\\.4{opacity:0.4}');
      expect(element.classList).toContain('disabled-parent-opacity-0.4');
    });
  });

  suite('rule deduplication', () => {
    it('generates CSS rule only once for duplicate prop values', () => {
      render(
        <Box>
          <Box id="el1" p={4} />
          <Box id="el2" p={4} />
        </Box>,
      );

      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;
      const content = styleElement.innerText ?? '';
      const matches = content.match(/\.p-4\{padding:1rem\}/g);
      expect(matches).toHaveLength(1);
    });
  });

  suite('SVG className', () => {
    it('applies _s class for svg tag', () => {
      render(
        <Box>
          <Box tag="svg" id={testElementId} />
        </Box>,
      );

      const element = document.getElementById(testElementId)!;
      expect(element.classList).toContain('_s');
      expect(element.classList).not.toContain('_b');
    });

    it('applies _b class for non-svg tag', () => {
      const { element } = act({ p: 1 });
      expect(element.classList).toContain('_b');
    });
  });

  suite('multi-styleName with breakpoints', () => {
    it('applies borderRadiusTop inside a breakpoint', () => {
      const { element, styleElement } = act({ sm: { borderRadiusTop: 4 } });
      expect(styleElement.innerText).toContain(
        '@media (min-width: 640px){.sm-borderRadiusTop-4{border-top-left-radius:1rem;border-top-right-radius:1rem}}',
      );
      expect(element.classList).toContain('sm-borderRadiusTop-4');
    });
  });

  suite('multi-styleName with pseudo classes', () => {
    it('applies borderRadiusTop inside hover', () => {
      const { element, styleElement } = act({ hover: { borderRadiusTop: 4 } });
      expect(styleElement.innerText).toContain('.hover-borderRadiusTop-4:hover{border-top-left-radius:1rem;border-top-right-radius:1rem}');
      expect(element.classList).toContain('hover-borderRadiusTop-4');
    });
  });

  suite('theme with nested pseudoGroupClasses (themeAndGroup path)', () => {
    it('applies theme + hoverGroup combined selector', () => {
      render(
        <Box.Theme theme="dark">
          <Box
            id={testElementId}
            theme={{
              dark: {
                hoverGroup: {
                  parent: {
                    bgColor: 'gray-100',
                  },
                },
              },
            }}
          />
        </Box.Theme>,
      );

      const element = document.getElementById(testElementId)!;
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

      // Two parents in nesting order, and no `|` to tell them apart any more: each compiles to its own
      // selector, so the class name is just the two segments.
      expect(styleElement.innerText).toContain(
        '@scope (.dark) to ([data-theme]){:scope .parent:hover .theme-dark-hover-parent-bgColor-gray-100{background-color:var(--gray-100)}}',
      );
      expect(element.classList).toContain('theme-dark-hover-parent-bgColor-gray-100');
    });
  });

  suite('valueFormat receives styleName for per-property values', () => {
    it('calls valueFormat with different styleName and returns different values', () => {
      Box.extend(
        { 'test-size': '1rem', 'test-weight': '700' },
        {
          textStyle: [
            {
              values: ['heading'] as const,
              styleName: ['font-size', 'font-weight'],
              valueFormat: (value: string, getVariable: (v: string) => string, styleName?: string) => {
                if (styleName === 'font-size') return getVariable('test-size');
                if (styleName === 'font-weight') return getVariable('test-weight');
                return value;
              },
            },
          ],
        },
        {},
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { element, styleElement } = act({ textStyle: 'heading' } as any);

      expect(styleElement.innerText).toContain('.textStyle-heading{font-size:var(--test-size);font-weight:var(--test-weight)}');
      expect(element.classList).toContain('textStyle-heading');
    });
  });

  suite('when use theme (dark mode)', () => {
    it('applies dark theme styles with base padding override', () => {
      render(
        <Box.Theme theme="dark">
          <Box id={testElementId} p={1} theme={{ dark: { p: 2 } }} />
        </Box.Theme>,
      );

      const element = document.getElementById(testElementId)!;
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

      // Base padding
      expect(styleElement.innerText).toContain('.p-1{padding:0.25rem}');
      // Dark theme padding override
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-p-2{padding:0.5rem}}');

      expect(element.classList).toContain('p-1');
      expect(element.classList).toContain('theme-dark-p-2');
    });

    it('applies dark theme styles with nested hover state', () => {
      render(
        <Box.Theme theme="dark">
          <Box id={testElementId} p={1} theme={{ dark: { p: 2, hover: { p: 3 } } }} />
        </Box.Theme>,
      );

      const element = document.getElementById(testElementId)!;
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

      // Base padding
      expect(styleElement.innerText).toContain('.p-1{padding:0.25rem}');
      // Dark theme padding override
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-p-2{padding:0.5rem}}');
      // Dark theme hover padding override
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .hover-theme-dark-p-3:hover{padding:0.75rem}}');

      expect(element.classList).toContain('p-1');
      expect(element.classList).toContain('theme-dark-p-2');
      expect(element.classList).toContain('hover-theme-dark-p-3');
    });

    it('applies dark theme with multiple style properties', () => {
      render(
        <Box.Theme theme="dark">
          <Box
            id={testElementId}
            p={1}
            bgColor="white"
            theme={{
              dark: {
                p: 2,
                bgColor: 'gray-900',
                hover: {
                  p: 3,
                  bgColor: 'gray-800',
                },
              },
            }}
          />
        </Box.Theme>,
      );

      const element = document.getElementById(testElementId)!;
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

      // Base styles
      expect(styleElement.innerText).toContain('.p-1{padding:0.25rem}');
      expect(styleElement.innerText).toContain('.bgColor-white{background-color:var(--white)}');

      // Dark theme base styles
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-p-2{padding:0.5rem}}');
      expect(styleElement.innerText).toContain(
        '@scope (.dark) to ([data-theme]){:scope .theme-dark-bgColor-gray-900{background-color:var(--gray-900)}}',
      );

      // Dark theme hover styles
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .hover-theme-dark-p-3:hover{padding:0.75rem}}');
      expect(styleElement.innerText).toContain(
        '@scope (.dark) to ([data-theme]){:scope .hover-theme-dark-bgColor-gray-800:hover{background-color:var(--gray-800)}}',
      );

      expect(element.classList).toContain('p-1');
      expect(element.classList).toContain('bgColor-white');
      expect(element.classList).toContain('theme-dark-p-2');
      expect(element.classList).toContain('theme-dark-bgColor-gray-900');
      expect(element.classList).toContain('hover-theme-dark-p-3');
      expect(element.classList).toContain('hover-theme-dark-bgColor-gray-800');
    });

    it('applies dark theme with active and focus states', () => {
      render(
        <Box.Theme theme="dark">
          <Box
            id={testElementId}
            p={1}
            theme={{
              dark: {
                p: 2,
                hover: { p: 3 },
                active: { p: 4 },
                focus: { p: 5 },
              },
            }}
          />
        </Box.Theme>,
      );

      const element = document.getElementById(testElementId)!;
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;

      // Base padding
      expect(styleElement.innerText).toContain('.p-1{padding:0.25rem}');

      // Dark theme states
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-p-2{padding:0.5rem}}');
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .hover-theme-dark-p-3:hover{padding:0.75rem}}');
      expect(styleElement.innerText).toContain('@scope (.dark) to ([data-theme]){:scope .active-theme-dark-p-4:active{padding:1rem}}');
      expect(styleElement.innerText).toContain(
        '@scope (.dark) to ([data-theme]){:scope .focus-theme-dark-p-5:focus-within{padding:1.25rem}}',
      );

      expect(element.classList).toContain('p-1');
      expect(element.classList).toContain('theme-dark-p-2');
      expect(element.classList).toContain('hover-theme-dark-p-3');
      expect(element.classList).toContain('active-theme-dark-p-4');
      expect(element.classList).toContain('focus-theme-dark-p-5');
    });
  });

  // When the rules reach the sheet. The React binding flushes from an insertion effect, which
  // React runs during the commit ahead of every layout effect — so anything that measures or
  // reads styles in a layout effect sees the CSS of the whole commit, not just of the Boxes that
  // happened to commit before it.
  suite('flush scheduling', () => {
    function styleText(): string {
      return (document.getElementById('box-kite-styles') as unknown as HTMLStyleElement | null)?.innerText ?? '';
    }

    function countOccurrences(text: string, needle: string): number {
      return text.split(needle).length - 1;
    }

    it('has the rules of the whole commit in the sheet before any layout effect runs', () => {
      let cssInLayoutEffect = '';

      // Deliberately mounted *before* the Box that needs the rule: with the previous
      // layout-effect flush, tree order decided whether this saw `.p-13` or an empty sheet.
      function Probe() {
        useLayoutEffect(() => {
          cssInLayoutEffect = styleText();
        }, []);

        return null;
      }

      render(
        <>
          <Probe />
          <Box p={13} />
        </>,
      );

      expect(cssInLayoutEffect).toContain('.p-13{padding:3.25rem}');
    });

    it('writes a rule once under StrictMode double rendering', () => {
      render(
        <StrictMode>
          <Box id={testElementId} p={17} />
        </StrictMode>,
      );

      expect(document.getElementById(testElementId)!.classList).toContain('p-17');
      expect(countOccurrences(styleText(), '.p-17{padding:4.25rem}')).toBe(1);
    });

    it('declares a variable read outside of any render', async () => {
      // Nothing renders here, so no effect can flush: the engine's own microtask scheduler is
      // what gets the declaration into `:root`.
      expect(Box.getVariableValue('rose-500')).toBe('var(--rose-500)');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(styleText()).toContain('--rose-500:');
    });

    it('writes pending rules immediately on demand', () => {
      // The escape hatch for code that queues rules outside React and cannot wait for a microtask.
      expect(Box.getVariableValue('lime-500')).toBe('var(--lime-500)');

      StylesContext.flushSync();

      expect(styleText()).toContain('--lime-500:');
    });
  });

  // The style-signature cache memoizes class-name resolution per unique style signature so
  // structurally-identical Boxes skip the merge + walk. These guard its correctness.
  suite('style signature cache', () => {
    it('distinguishes different values for the same prop', () => {
      render(
        <Box>
          <Box id="cache-c1" p={4} />
          <Box id="cache-c2" p={9} />
        </Box>,
      );
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;
      expect(styleElement.innerText).toContain('.p-4{padding:1rem}');
      expect(styleElement.innerText).toContain('.p-9{padding:2.25rem}');
      expect(document.getElementById('cache-c1')!.classList).toContain('p-4');
      expect(document.getElementById('cache-c2')!.classList).toContain('p-9');
    });

    it('serves identical props from cache without dropping classes', () => {
      // First mount registers + caches; a later mount of identical props is a cache hit and
      // must still return the full class list.
      const { unmount } = render(<Box id="cache-first" m={6} color="red-500" />);
      const first = document.getElementById('cache-first')!;
      expect(first.classList).toContain('m-6');
      expect(first.classList).toContain('color-red-500');
      unmount();

      render(<Box id="cache-second" m={6} color="red-500" />);
      const second = document.getElementById('cache-second')!;
      expect(second.classList).toContain('m-6');
      expect(second.classList).toContain('color-red-500');
    });

    // Keep last: clear() resets global style state (and the cache) like an SSG render boundary.
    it('regenerates rules after StylesContext.clear() (SSG reset)', () => {
      render(<Box id="cache-before" p={7} />);
      expect((document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement).innerText).toContain('.p-7{padding:1.75rem}');

      // Simulate an SSG reset: a cached class list must NOT suppress rule regeneration.
      StylesContext.clear();
      cleanup();

      render(<Box id="cache-after" p={7} />);
      const styleElement = document.getElementById('box-kite-styles')! as unknown as HTMLStyleElement;
      expect(styleElement.innerText).toContain('.p-7{padding:1.75rem}');
      expect(document.getElementById('cache-after')!.classList).toContain('p-7');
    });
  });
});
