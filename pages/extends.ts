import Box from '../src/box';
import Variables from '../src/core/variables';

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

  // Code block
  codeBlock: {
    styles: {
      bgColor: 'code-bg',
      borderRadius: 3,
      overflow: 'hidden',
      shadow: 'large',
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
          borderColor: 'slate-700',
          bgColor: 'code-bg-light',
        },
      },
      content: {
        styles: {
          p: 4,
          overflow: 'auto',
          maxHeight: 100,
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
  // tree has to do now — `isExpanded` tints the row, `detailRow` tints the panel under it.
  'orders-datagrid': {
    extends: 'datagrid',
    children: {
      body: {
        children: {
          cell: {
            variants: {
              isExpanded: {
                bgColor: 'indigo-50',
                theme: { dark: { bgColor: 'indigo-950' } },
              },
            },
          },
          detailRow: {
            styles: {
              bgColor: 'indigo-50',
              borderColor: 'indigo-200',
              theme: { dark: { bgColor: 'indigo-950', borderColor: 'indigo-900' } },
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
