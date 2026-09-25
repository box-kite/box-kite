import Box from '../src/box';
import Variables from '../src/core/variables';
import type { BoxComponentStyles } from '../src/types';

// preload variable
Box.getVariableValue('violet-300');
Box.getVariableValue('slate-700');

export const { extendedProps, extendedPropTypes } = Box.extend(
  {
    // Gradients
    'gradient-hero': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(236, 72, 153, 0.05) 100%)',
    'gradient-hero-dark': 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(236, 72, 153, 0.1) 100%)',
    'gradient-sidebar': 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
    'gradient-sidebar-dark': 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)',
    // Backgrounds
    'bg-stripes': 'linear-gradient(135deg,var(--violet-300) 10%,#0000 0,#0000 50%,var(--violet-300) 0,var(--violet-300) 60%,#0000 0,#0000)',
    'bg-stripes-dark':
      'linear-gradient(135deg,var(--slate-700) 10%,#0000 0,#0000 50%,var(--slate-700) 0,var(--slate-700) 60%,#0000 0,#0000)',
    // Theme colors
    'theme-bg': 'light-dark(#fff, #082f49)',
    'theme-color': 'light-dark(#fff, #082f49)',
    'bg-img-indeterminate-green': `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 20 20'><line stroke='${Variables.colors['green']}' x1='4' y1='10' x2='16' y2='10' stroke-width='1' /></svg>`)}")`,
    // Glass colors
    'glass-light': 'rgba(255, 255, 255, 0.7)',
    'glass-dark': 'rgba(15, 23, 42, 0.7)',
    'glass-border-light': 'rgba(255, 255, 255, 0.3)',
    'glass-border-dark': 'rgba(255, 255, 255, 0.1)',
    // Code block
    'code-bg': '#0f172a',
    'code-bg-light': '#1e293b',
    // Text styles
    'text-display-lg-size': '36px',
    'text-display-lg-weight': '700',
    'text-display-lg-line-height': '1.2',
    'text-display-lg-letter-spacing': '-0.02em',
    'text-display-sm-size': '28px',
    'text-display-sm-weight': '700',
    'text-display-sm-line-height': '1.25',
    'text-display-sm-letter-spacing': '-0.015em',
  },
  {
    textStyle: [
      {
        values: ['display-lg', 'display-sm'] as const,
        styleName: ['font-size', 'font-weight', 'line-height', 'letter-spacing'],
        valueFormat: (value: string, getVariable: (v: string) => string, styleName?: string) => {
          const suffixMap: Record<string, string> = {
            'font-size': 'size',
            'font-weight': 'weight',
            'line-height': 'line-height',
            'letter-spacing': 'letter-spacing',
          };
          return getVariable(`text-${value}-${suffixMap[styleName!]}`);
        },
      },
    ],
  },
  {
    bgImage: [
      {
        values: [
          'bg-stripes',
          'bg-stripes-dark',
          'gradient-hero',
          'gradient-hero-dark',
          'gradient-sidebar',
          'gradient-sidebar-dark',
        ] as const,
        valueFormat: (value, getVariableValue) => getVariableValue(value),
        styleName: 'background-image',
      },
    ],
    bgColor: [
      {
        values: ['theme-bg', 'glass-light', 'glass-dark', 'code-bg', 'code-bg-light'] as const,
        valueFormat: (value, getVariable) => getVariable(value),
        styleName: 'background-color',
      },
    ],
    color: [
      {
        values: ['theme-color'] as const,
        valueFormat: (value, getVariable) => getVariable(value),
        styleName: 'color',
      },
    ],
    borderColor: [
      {
        values: ['glass-border-light', 'glass-border-dark'] as const,
        valueFormat: (value, getVariable) => getVariable(value),
        styleName: 'border-color',
      },
    ],
  },
);

/** One token's colour, per theme. Inline, because every Box class carries the base `display: block`. */
function token(dark: string, light: string, { theme, ...rest }: BoxComponentStyles = {}) {
  return {
    styles: {
      display: 'inline',
      ...rest,
      theme: {
        dark: { ...theme?.dark, css: { ...theme?.dark?.css, color: dark } },
        light: { ...theme?.light, css: { ...theme?.light?.css, color: light } },
      },
    } satisfies BoxComponentStyles,
  };
}

export const components = Box.components({
  button: {
    children: {
      demo: {
        styles: {
          bgColor: 'blue-500',
          p: 3,
          b: 0,
          borderRadius: 1,
          color: 'white',
          cursor: 'pointer',
          hover: {
            bgColor: 'blue-400',
          },
        },
        variants: {
          primary: {
            bgColor: 'sky-400',
            hover: {
              bgColor: 'sky-500',
            },
          },
          secondary: {
            bgColor: 'indigo-400',
            hover: {
              bgColor: 'indigo-500',
            },
          },
        },
      },
    },
  },
  // Color box for docs
  colorBox: {
    styles: {
      width: 15,
      height: 15,
      b: 1,
      borderRadius: 2,
      shadow: 'small',
      transition: 'all',
      transitionDuration: 150,
      hover: { outline: 2, outlineOffset: 2, outlineColor: 'indigo-200' },
    },
  },

  // Number badge
  number: {
    styles: {
      borderRadius: 10,
      bgImage: 'gradient-primary',
      p: 3,
      lineHeight: 8,
      b: 0,
      color: 'white',
      fontWeight: 600,
    },
  },

  // Glass card
  glassCard: {
    styles: {
      bgColor: 'glass-light',
      b: 1,
      borderColor: 'glass-border-light',
      borderRadius: 3,
      shadow: 'large',
      p: 6,
    },
    variants: {
      dark: {
        bgColor: 'glass-dark',
        borderColor: 'glass-border-dark',
      },
    },
  },

  /**
   * Every code surface on the site — the docs' code blocks, the playground's editor and its CSS pane —
   * and every part of the code inside them. One tree, per theme: VS Code's Dark+ and Light+. A token is
   * `code.token.<kind>` (`pages/site/codeTokens.ts` names the kinds), so restyling one colour is one line.
   */
  code: {
    // The surface and the plain colour. The frame around it — border, radius — is whatever holds it.
    styles: {
      bgColor: 'code-bg',
      css: { color: '#D4D4D4' },
      theme: { light: { bgColor: 'white', css: { color: '#1F1F1F' } } },
    },
    children: {
      header: {
        styles: {
          display: 'flex',
          jc: 'space-between',
          ai: 'center',
          px: 4,
          py: 3,
          bb: 1,
          theme: {
            dark: { bgColor: 'code-bg-light', borderColor: 'slate-700' },
            light: { bgColor: 'slate-50', borderColor: 'slate-200' },
          },
        },
      },
      label: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          fontSize: 12,
          theme: { dark: { color: 'slate-400' }, light: { color: 'slate-500' } },
        },
      },
      action: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          p: 2,
          px: 3,
          b: 0,
          borderRadius: 2,
          fontSize: 12,
          cursor: 'pointer',
          textDecoration: 'none',
          transitionDuration: 150,
          theme: {
            dark: { bgColor: 'slate-700', color: 'slate-300', hover: { bgColor: 'slate-600' } },
            light: { bgColor: 'slate-200', color: 'slate-600', hover: { bgColor: 'slate-300' } },
          },
        },
        variants: {
          done: {
            bgColor: 'emerald-500',
            color: 'white',
            cursor: 'default',
            theme: { dark: { hover: { bgColor: 'emerald-500' } }, light: { hover: { bgColor: 'emerald-500' } } },
          },
        },
      },
      /** The `<pre>` of a code block: the one place its font, size and line height are set. */
      content: {
        styles: {
          m: 0,
          p: 4,
          maxHeight: 100,
          overflow: 'auto',
          fontSize: 13,
          lineHeight: 24,
          whiteSpace: 'pre',
          css: { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace", tabSize: 2 },
        },
      },
      gutter: {
        styles: { theme: { dark: { color: 'slate-600' }, light: { css: { color: '#237893' } } } },
      },
      lineNumber: {
        styles: {},
        variants: {
          current: { theme: { dark: { color: 'slate-300' }, light: { css: { color: '#0B216F' } } } },
        },
      },
      currentLine: {
        styles: {
          by: 1,
          theme: { dark: { bgColor: 'white/4', borderColor: 'white/5' }, light: { bgColor: 'black/4', borderColor: 'black/5' } },
        },
      },
      /** The playground's textarea: only the caret and the selection show, the glyphs are the layer behind. */
      field: {
        styles: {
          theme: {
            dark: { caretColor: 'slate-100', selection: { css: { backgroundColor: '#264F78' } } },
            light: { caretColor: 'black', selection: { css: { backgroundColor: '#ADD6FF' } } },
          },
        },
      },
      token: {
        children: {
          keyword: token('#569CD6', '#0000FF'),
          control: token('#C586C0', '#AF00DB'),
          string: token('#CE9178', '#A31515'),
          number: token('#B5CEA8', '#098658'),
          literal: token('#569CD6', '#0000FF'),
          comment: token('#6A9955', '#008000', { fontStyle: 'italic' }),
          regex: token('#D16969', '#811F3F'),
          variable: token('#9CDCFE', '#001080'),
          function: token('#DCDCAA', '#795E26'),
          property: token('#9CDCFE', '#001080'),
          type: token('#4EC9B0', '#267F99'),
          operator: token('#D4D4D4', '#1F1F1F'),
          punctuation: token('#D4D4D4', '#1F1F1F'),
          bracket1: token('#FFD700', '#0431FA'),
          bracket2: token('#DA70D6', '#319331'),
          bracket3: token('#179FFF', '#7B3814'),
          tagBracket: token('#808080', '#800000'),
          tag: token('#569CD6', '#800000'),
          component: token('#4EC9B0', '#267F99'),
          text: token('#D4D4D4', '#1F1F1F'),
          attribute: token('#9CDCFE', '#E50000'),
          attributeValue: token('#CE9178', '#0000FF'),
          nesting: token('#C586C0', '#AF00DB'),
          componentProp: token('#4FC1FF', '#0070C1'),
          event: token('#DCDCAA', '#795E26'),
          reserved: token('#569CD6', '#0000FF', { fontStyle: 'italic' }),
          // A name the tag does not take is dropped without a word, which is exactly what a squiggle is for.
          unknown: token('#9CDCFE', '#E50000', {
            css: { textDecorationLine: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: '3px' },
            theme: { dark: { css: { textDecorationColor: '#F48771' } }, light: { css: { textDecorationColor: '#E51400' } } },
          }),
        },
      },
    },
  },

  // Feature card for home page
  featureCard: {
    styles: {
      display: 'flex',
      d: 'column',
      gap: 3,
      p: 6,
      bgColor: 'white',
      borderRadius: 3,
      b: 1,
      borderColor: 'slate-200',
      transition: 'all',
      transitionDuration: 200,
      hover: {
        shadow: 'large',
        borderColor: 'indigo-200',
        translateY: -0.5,
      },
    },
    children: {
      icon: {
        styles: {
          width: 12,
          height: 12,
          display: 'flex',
          ai: 'center',
          jc: 'center',
          bgImage: 'gradient-primary',
          borderRadius: 2,
          color: 'white',
        },
      },
      title: {
        styles: {
          fontSize: 18,
          fontWeight: 600,
          color: 'slate-900',
        },
      },
      description: {
        styles: {
          fontSize: 14,
          color: 'slate-600',
          lineHeight: 24,
        },
      },
    },
  },

  // Navigation item
  navItem: {
    styles: {
      display: 'flex',
      ai: 'center',
      gap: 3,
      p: 3,
      px: 4,
      borderRadius: 2,
      cursor: 'pointer',
      transition: 'all',
      transitionDuration: 150,
      color: 'slate-600',
      hover: {
        bgColor: 'slate-100',
        color: 'slate-900',
      },
    },
    variants: {
      active: {
        bgImage: 'gradient-primary',
        color: 'white',
        fontWeight: 500,
        hover: {
          bgColor: 'transparent',
          color: 'white',
        },
      },
    },
  },

  // Section header
  sectionHeader: {
    styles: {
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: 'slate-400',
      px: 4,
      py: 2,
    },
  },

  // Badge
  badge: {
    styles: {
      display: 'inline-flex',
      ai: 'center',
      gap: 1,
      px: 3,
      py: 1,
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 500,
      bgColor: 'indigo-100',
      color: 'indigo-700',
    },
    variants: {
      success: {
        bgColor: 'emerald-100',
        color: 'emerald-700',
      },
      warning: {
        bgColor: 'amber-100',
        color: 'amber-700',
      },
      error: {
        bgColor: 'red-100',
        color: 'red-700',
      },
    },
  },

  // DataGrid customization
  // The variant the Dropdown page documents. It lives here rather than on the page because this is
  // the object `pages/box.d.ts` augments the types from — registering it on the page would leave
  // `variant="outlined"` a type error there, which is exactly what the page tells readers to avoid.
  dropdown: {
    variants: {
      outlined: {
        bgColor: 'transparent',
        b: 2,
        borderColor: 'indigo-500',
        color: 'indigo-600',
        theme: { dark: { borderColor: 'indigo-400', color: 'indigo-300' } },
      },
    },
    children: {
      item: {
        variants: {
          outlined: {
            hover: { bgColor: 'indigo-50' },
            selected: { bgColor: 'indigo-100', color: 'indigo-700' },
            theme: { dark: { hover: { bgColor: 'indigo-950' }, selected: { bgColor: 'indigo-900', color: 'indigo-200' } } },
          },
        },
      },
      items: {
        variants: {
          outlined: { b: 2, borderColor: 'indigo-500', theme: { dark: { borderColor: 'indigo-400' } } },
        },
      },
    },
  },

  // The Orders demo's outer grid. The library already joins an expanded row to its drawer with a shared
  // surface and an accent bar down the inline start; this re-colours that block, which is all a custom
  // tree has to do — `isExpanded` tints the row, `detailRow` tints the panel under it.
  //
  // `slate` rather than a hue, and this is the whole lesson: a drawer can cover half the grid, and at that
  // size any chroma reads as branding rather than as state. `indigo-950` was also **lighter** than the
  // `gray-900` grid it sat in (L 25.7 against 21), so two open rows painted the grid purple and raised.
  // The accent bar is where the hue belongs — it is 2px wide.
  'orders-datagrid': {
    extends: 'datagrid',
    children: {
      body: {
        children: {
          cell: {
            variants: {
              isExpanded: {
                bgColor: 'slate-100',
                group: { 'grid-row/hover': { bgColor: 'slate-200' } },
                theme: {
                  dark: {
                    bgColor: 'slate-950',
                    group: { 'grid-row/hover': { bgColor: 'slate-900' } },
                  },
                },
              },
            },
          },
          detailRow: {
            styles: {
              bgColor: 'slate-100',
              // Two steps off the drawer, not one: at `slate-200` the rule closing one block sits between
              // two surfaces of nearly its own lightness, and two open rows in a row merge into one.
              borderColor: 'slate-300',
              theme: { dark: { bgColor: 'slate-950', borderColor: 'slate-800' } },
            },
          },
        },
      },
    },
  },

  // The grid inside a detail row. A nested grid is a list, not a second card: no border, no radius, no
  // shadow and no surface of its own, so the drawer it sits in stays the only panel on screen.
  subgrid: {
    extends: 'datagrid',
    styles: {
      b: 0,
      borderRadius: 0,
      shadow: 'none',
      bgColor: 'transparent',
      theme: { dark: { bgColor: 'transparent' } },
    },
    children: {
      header: {
        styles: {
          bgColor: 'transparent',
          theme: { dark: { bgColor: 'transparent' } },
        },
        children: {
          cell: {
            // A caption over a short list, not a heading bar: no fill at all, one rule under it, and a
            // size below the outer grid's own header so the two never compete for the eye.
            styles: {
              bgColor: 'transparent',
              minHeight: 0,
              py: 2,
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              // `gray-500` is what the outer header uses, but that is measured on `gray-50`: on the
              // drawer's tint the same pair is 4.33:1. One step darker measures 6.76.
              color: 'gray-600',
              borderColor: 'gray-300',
              theme: { dark: { bgColor: 'transparent', color: 'gray-400', borderColor: 'gray-700' } },
            },
            variants: {
              isSortable: {
                hover: { bgColor: 'gray-200', color: 'gray-700' },
                theme: { dark: { hover: { bgColor: 'gray-800', color: 'gray-200' } } },
              },
            },
          },
        },
      },
      body: {
        children: {
          cell: {
            styles: {
              bgColor: 'transparent',
              fontSize: 13,
              borderColor: 'gray-200',
              // The drawer is a tinted surface already, so the grid's own `gray-50` hover paints the
              // colour that is there. One step further on, in both themes.
              group: { 'grid-row/hover': { bgColor: 'gray-100' } },
              theme: {
                dark: {
                  borderColor: 'gray-800',
                  group: { 'grid-row/hover': { bgColor: 'gray-800' } },
                },
              },
            },
          },
        },
      },
    },
  },
});
