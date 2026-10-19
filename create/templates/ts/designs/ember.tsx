/**
 * Ember: warm paper and ink, one vermilion, and a serif for the headings.
 *
 * The whole design is in this file: the two palette families every component is drawn in (accent and
 * base), the page's colours and fonts, and the component styles, in light and dark. It is yours to edit.
 */
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import Box, { type BoxComponentStyles, type BoxStyleProps } from '@box-kite/react';
import type { ReactNode } from 'react';

const FONT_DISPLAY = "'Fraunces Variable', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const FONT_BODY = "'Inter Variable', system-ui, sans-serif";

/** The neutrals: page, text, borders. Repoint either family with a palette name ('stone') or a ramp like this. */
const BASE = {
  50: 'oklch(98.6% .004 75)',
  100: 'oklch(96.6% .006 72)',
  200: 'oklch(92.7% .009 68)',
  300: 'oklch(87.2% .012 64)',
  400: 'oklch(71.6% .017 60)',
  500: 'oklch(55.6% .019 56)',
  600: 'oklch(45.4% .017 52)',
  700: 'oklch(37.6% .015 50)',
  800: 'oklch(27.6% .01 52)',
  900: 'oklch(21.2% .008 52)',
  950: 'oklch(15.8% .006 52)',
} as const;

/** The accent: buttons, focus, selection. */
const ACCENT = {
  50: 'oklch(97.6% .018 70)',
  100: 'oklch(94.8% .04 66)',
  200: 'oklch(90.2% .074 60)',
  300: 'oklch(83.6% .118 54)',
  400: 'oklch(75.6% .162 48)',
  500: 'oklch(68.4% .19 42)',
  600: 'oklch(57.2% .196 36)',
  700: 'oklch(50.4% .178 33)',
  800: 'oklch(43.6% .148 32)',
  900: 'oklch(37.4% .118 33)',
  950: 'oklch(26.4% .08 33)',
} as const;

/** The focus mark every control shares: a vermilion ring off the edge, visible on any surface (3:1 or better). */
const RING: BoxComponentStyles = {
  outline: 2,
  outlineStyle: 'solid',
  outlineOffset: 2,
  // 600 on the paper: 500 there is 2.9:1, under the 3:1 a focus indicator owes.
  outlineColor: 'accent-600',
  theme: { dark: { outlineColor: 'accent-400' } },
};

/** A field's focus: the border turns vermilion and a soft halo grows out of it. */
const FIELD_FOCUS: BoxComponentStyles = {
  outline: 3,
  outlineOffset: 0,
  borderColor: 'accent-600',
  outlineColor: 'accent-500/20',
};

/** The surface every floating layer shares: white over the paper, a hairline, and a long warm shadow. */
const LAYER: BoxComponentStyles = {
  p: 1.5,
  borderRadius: 3,
  bgColor: 'white',
  borderColor: 'base-200',
  shadow: 'xl',
  shadowColor: 'base-950/12',
  theme: { dark: { bgColor: 'base-900', borderColor: 'white/10', shadowColor: 'black/50' } },
};

/** One row in a layer: rounded inside the rounded panel, a neutral highlight, the choice in the accent. */
const LAYER_ITEM: BoxComponentStyles = {
  borderRadius: 2,
  hover: { bgColor: 'base-100' },
  focus: { bgColor: 'base-100' },
  selected: { bgColor: 'accent-50', color: 'accent-800', hover: { bgColor: 'accent-100' } },
  theme: {
    dark: {
      hover: { bgColor: 'white/6' },
      focus: { bgColor: 'white/6' },
      selected: { bgColor: 'accent-500/15', color: 'accent-200', hover: { bgColor: 'accent-500/20' } },
    },
  },
};

/**
 * Where the keyboard is in a listbox: a fill, the way the pointer's hover is, since the two mean the same thing.
 * A forced-colors mode throws the fill away, so the outline comes back there.
 */
const LAYER_HIGHLIGHT: BoxComponentStyles = {
  outline: 0,
  bgColor: 'base-100',
  selected: { bgColor: 'accent-100' },
  forcedColors: { outline: 2, outlineColor: 'Highlight' },
  theme: { dark: { bgColor: 'white/8', selected: { bgColor: 'accent-500/25' } } },
};

/** What a field looks like at rest: white, a warm hairline, the faintest lift. */
const FIELD: BoxComponentStyles = {
  borderRadius: 2.5,
  borderColor: 'base-300',
  shadow: 'xs',
  shadowColor: 'base-950/6',
  hover: { borderColor: 'base-400' },
  focus: FIELD_FOCUS,
  theme: {
    dark: {
      bgColor: 'base-900',
      borderColor: 'white/12',
      hover: { borderColor: 'white/20' },
      focus: { borderColor: 'accent-400', outlineColor: 'accent-400/25' },
    },
  },
};

/** A primary action: a vermilion that catches the light at the top edge, and a little weight under it. White text holds 4.8:1 at its lightest. */
const PRIMARY: BoxComponentStyles = {
  bgGradient: { linear: 'b', colors: ['accent-600', 'accent-700'] },
  bgColor: 'accent-600',
  color: 'white',
  ring: 1,
  ringColor: 'accent-800',
  insetShadow: 'xs',
  insetShadowColor: 'white/35',
  shadow: 'sm',
  shadowColor: 'accent-800/30',
  hover: { bgGradient: { linear: 'b', colors: ['accent-600', 'accent-600'] }, shadowColor: 'accent-800/40' },
  active: { bgGradient: { linear: 'b', colors: ['accent-700', 'accent-700'] }, insetShadow: 'none', translateY: 0.25 },
  disabled: { bgGradient: 'none', ring: 0, shadow: 'none', insetShadow: 'none', translateY: 0 },
  theme: {
    dark: {
      bgGradient: { linear: 'b', colors: ['accent-400', 'accent-500'] },
      color: 'base-950',
      ringColor: 'accent-500',
      insetShadowColor: 'white/40',
      shadowColor: 'accent-500/25',
      hover: { bgGradient: { linear: 'b', colors: ['accent-300', 'accent-500'] }, shadowColor: 'accent-400/35' },
      active: { bgGradient: { linear: 'b', colors: ['accent-500', 'accent-500'] } },
      disabled: { bgGradient: 'none', color: 'base-500' },
    },
  },
};

const display: BoxComponentStyles = {
  fontWeight: 500,
  letterSpacing: 'tight',
  css: { fontFamily: FONT_DISPLAY, fontOpticalSizing: 'auto' },
};

Box.components({
  // The serif, wherever the library or the site names a heading.
  h1: { styles: display },
  h2: { styles: display },
  h3: { styles: display },

  button: {
    styles: {
      ...PRIMARY,
      px: 4.5,
      borderRadius: 2.5,
      fontWeight: 600,
      focusVisible: RING,
    },
    variants: {
      secondary: {
        bgGradient: 'none',
        bgColor: 'white',
        color: 'base-900',
        ring: 0,
        insetShadow: 'none',
        borderColor: 'base-300',
        shadow: 'xs',
        shadowColor: 'base-950/8',
        hover: { bgGradient: 'none', bgColor: 'base-50', borderColor: 'base-400' },
        active: { bgGradient: 'none', bgColor: 'base-100' },
        theme: {
          dark: {
            bgGradient: 'none',
            bgColor: 'white/4',
            color: 'base-100',
            borderColor: 'white/12',
            insetShadow: 'none',
            shadow: 'none',
            hover: { bgGradient: 'none', bgColor: 'white/8', borderColor: 'white/20' },
            active: { bgGradient: 'none', bgColor: 'white/12' },
          },
        },
      },
      ghost: {
        bgGradient: 'none',
        ring: 0,
        insetShadow: 'none',
        shadow: 'none',
        hover: { bgGradient: 'none', bgColor: 'base-100' },
        active: { bgGradient: 'none', bgColor: 'base-200', translateY: 0 },
        theme: {
          dark: {
            bgGradient: 'none',
            color: 'base-300',
            shadow: 'none',
            hover: { bgGradient: 'none', bgColor: 'white/6' },
            active: { bgGradient: 'none', bgColor: 'white/10' },
          },
        },
      },
    },
  },

  textbox: { styles: FIELD },
  textarea: { styles: FIELD },
  dropdown: {
    styles: FIELD,
    children: {
      items: { styles: { ...LAYER, gap: 0.5 } },
      item: { styles: LAYER_ITEM, variants: { highlighted: LAYER_HIGHLIGHT } },
      unselect: { styles: { borderRadius: 2 }, variants: { highlighted: LAYER_HIGHLIGHT } },
      selectAll: { styles: { borderRadius: 2 }, variants: { highlighted: LAYER_HIGHLIGHT } },
    },
  },
  combobox: {
    styles: { ...FIELD, hasDisabled: { bgColor: 'base-100' } },
    children: {
      items: { styles: { ...LAYER, gap: 0.5 } },
      item: { styles: LAYER_ITEM, variants: { highlighted: LAYER_HIGHLIGHT } },
      chip: {
        styles: {
          borderRadius: 1.5,
          bgColor: 'accent-50',
          color: 'accent-800',
          theme: { dark: { bgColor: 'accent-500/15', color: 'accent-200' } },
        },
      },
    },
  },

  checkbox: {
    styles: {
      borderRadius: 1.5,
      borderColor: 'base-300',
      focusVisible: RING,
      checked: { bgColor: 'accent-600', borderColor: 'accent-600' },
      indeterminate: { bgColor: 'accent-600', borderColor: 'accent-600' },
      theme: {
        dark: {
          borderColor: 'white/20',
          checked: { bgColor: 'accent-500', borderColor: 'accent-500' },
          indeterminate: { bgColor: 'accent-500', borderColor: 'accent-500' },
        },
      },
    },
  },
  radioButton: {
    styles: {
      borderColor: 'base-300',
      focusVisible: RING,
      checked: { bgColor: 'accent-600', borderColor: 'accent-600' },
      theme: { dark: { borderColor: 'white/20', checked: { bgColor: 'accent-500', borderColor: 'accent-500' } } },
    },
  },
  switch: {
    styles: {
      bgColor: 'base-300',
      insetShadow: 'xs',
      insetShadowColor: 'base-950/15',
      before: { shadow: 'sm', shadowColor: 'base-950/25' },
      focusVisible: RING,
      checked: { bgColor: 'accent-600', hover: { bgColor: 'accent-700' } },
      theme: {
        dark: {
          bgColor: 'white/15',
          hover: { bgColor: 'white/20' },
          checked: { bgColor: 'accent-500', hover: { bgColor: 'accent-400' } },
        },
      },
    },
  },
  slider: {
    children: {
      track: { styles: { height: 1.5, borderRadius: 2, theme: { dark: { bgColor: 'white/10' } } } },
      fill: {
        styles: {
          bgGradient: { linear: 'r', colors: ['accent-400', 'accent-600'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['accent-500', 'accent-300'] } } },
        },
      },
      thumb: {
        styles: {
          width: 4.5,
          height: 4.5,
          ms: -2.25,
          b: 0,
          ring: 1,
          ringColor: 'base-950/10',
          shadow: 'md',
          shadowColor: 'base-950/20',
          hover: { ringColor: 'accent-500' },
          focusVisible: RING,
          theme: { dark: { bgColor: 'base-50', ringColor: 'black/40', hover: { ringColor: 'accent-400' } } },
        },
      },
    },
  },
  progress: {
    styles: { height: 1.5, borderRadius: 2, theme: { dark: { bgColor: 'white/10' } } },
    children: {
      fill: {
        styles: {
          borderRadius: 2,
          bgGradient: { linear: 'r', colors: ['accent-400', 'accent-600'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['accent-500', 'accent-300'] } } },
        },
      },
    },
  },

  dialog: {
    styles: {
      p: 7,
      borderRadius: 5,
      borderColor: 'base-200',
      shadow: 'xxl',
      shadowColor: 'base-950/25',
      backdrop: { bgColor: 'base-950/35', backdropBlur: 'xs' },
      theme: {
        dark: {
          bgColor: 'base-900',
          borderColor: 'white/10',
          shadowColor: 'black/60',
          backdrop: { bgColor: 'black/55' },
        },
      },
    },
    children: {
      title: { styles: { ...display, fontSize: 24, lineHeight: 30 } },
      description: { styles: { color: 'base-500', theme: { dark: { color: 'base-400' } } } },
    },
  },
  popover: { styles: { ...LAYER, p: 4, borderRadius: 3.5 } },
  menu: {
    styles: LAYER,
    children: {
      item: { styles: { ...LAYER_ITEM, px: 2.5 } },
      separator: { styles: { mx: -1.5, theme: { dark: { borderColor: 'white/8' } } } },
    },
  },
  tooltip: {
    styles: {
      borderRadius: 2,
      bgColor: 'base-900',
      shadow: 'md',
      shadowColor: 'base-950/20',
      theme: { dark: { bgColor: 'base-50', color: 'base-950' } },
    },
  },
  toaster: {
    children: {
      toast: { styles: { ...LAYER, py: 3.5, ps: 4.5, borderRadius: 3.5, b: 1 } },
      action: { styles: { borderRadius: 2 } },
      close: { styles: { borderRadius: 2 } },
    },
  },

  tabs: {
    children: {
      list: { styles: { gap: 2, borderColor: 'base-200', theme: { dark: { borderColor: 'white/10' } } } },
      tab: {
        styles: {
          px: 1,
          mx: 1,
          fontWeight: 500,
          color: 'base-500',
          hover: { color: 'base-900' },
          selected: { color: 'base-900', fontWeight: 600 },
          theme: { dark: { color: 'base-400', hover: { color: 'base-50' }, selected: { color: 'base-50' } } },
        },
        variants: {
          underline: {
            selected: { borderColor: 'accent-600' },
            theme: { dark: { selected: { borderColor: 'accent-400' } } },
          },
        },
      },
      indicator: { styles: { borderRadius: 1, bgGradient: { linear: 'r', colors: ['accent-400', 'accent-600'] } } },
    },
  },
  accordion: {
    children: {
      item: { styles: { theme: { dark: { borderColor: 'white/10' } } } },
      trigger: {
        styles: {
          py: 4,
          fontSize: 15,
          hover: { color: 'accent-700' },
          ariaAttr: { expanded: { color: 'base-900' } },
          theme: { dark: { ariaAttr: { expanded: { color: 'base-50' } } } },
        },
      },
    },
  },

  datagrid: {
    styles: {
      borderRadius: 4,
      borderColor: 'base-200',
      shadow: 'sm',
      shadowColor: 'base-950/6',
      theme: { dark: { bgColor: 'base-900', borderColor: 'white/10', shadow: 'none' } },
    },
    children: {
      header: {
        // Opaque: the header is sticky, so a translucent fill lets the rows scroll through it. The lift is a layer over it.
        styles: {
          bgColor: 'base-50',
          theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] } } },
        },
        children: {
          hover: {
            styles: { before: { bgColor: 'accent-500/8' }, theme: { dark: { before: { bgColor: 'accent-400/12' } } } },
          },
          cell: {
            styles: {
              letterSpacing: 'wide',
              textTransform: 'uppercase',
              fontSize: 11,
              // 600, not 500: at 11px uppercase 500 on the paper is right at 4.5:1.
              color: 'base-600',
              borderColor: 'base-200',
              ariaAttr: { 'sort=ascending': { color: 'accent-700' }, 'sort=descending': { color: 'accent-700' } },
              theme: {
                dark: {
                  color: 'base-400',
                  borderColor: 'white/10',
                  ariaAttr: { 'sort=ascending': { color: 'accent-300' }, 'sort=descending': { color: 'accent-300' } },
                },
              },
            },
            variants: {
              // The group over its columns: darker and calmer, so the two tiers read as a hierarchy.
              isGroup: { color: 'base-700', letterSpacing: 'normal', theme: { dark: { color: 'base-300' } } },
              isPinned: {
                theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] } } },
              },
              hasHoverPill: {
                before: { bgColor: 'accent-500/8' },
                theme: { dark: { before: { bgColor: 'accent-400/12' } } },
              },
            },
          },
        },
      },
      // The filters belong to the header, so they share its fill and its bottom line is the one between header and body.
      filter: {
        children: {
          row: {
            styles: {
              bgColor: 'base-50',
              borderColor: 'base-300',
              theme: {
                dark: {
                  bgColor: 'base-900',
                  bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] },
                  borderColor: 'white/10',
                },
              },
            },
          },
          cell: {
            variants: {
              isPinned: {
                bgColor: 'base-50',
                theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] } } },
              },
            },
            children: { input: { styles: { borderRadius: 2 } } },
          },
        },
      },
    },
  },
  widget: {
    styles: {
      borderRadius: 4,
      shadow: 'sm',
      shadowColor: 'base-950/6',
      theme: { dark: { borderColor: 'white/10', shadow: 'none' } },
    },
    children: { title: { styles: { ...display, fontSize: 16, lineHeight: 22 } } },
  },
  toolCall: { styles: { borderRadius: 3, theme: { dark: { borderColor: 'white/10' } } } },
  approval: {
    styles: {
      borderRadius: 3,
      before: { bgGradient: { linear: 'b', colors: ['amber-400', 'accent-500'] } },
      theme: { dark: { borderColor: 'white/10' } },
    },
  },
  markdown: {
    children: {
      heading: { styles: display },
      code: {
        styles: {
          borderRadius: 1.5,
          bgColor: 'accent-50',
          color: 'accent-800',
          theme: { dark: { bgColor: 'accent-500/12', color: 'accent-200' } },
        },
      },
      codeBlock: { styles: { borderRadius: 3 } },
      quote: { styles: { borderColor: 'accent-400', fontStyle: 'italic' } },
    },
  },
  list: {
    variants: { card: { borderRadius: 4, theme: { dark: { bgColor: 'base-900' } } } },
  },
  calendar: {
    children: {
      day: {
        variants: {
          selected: { bgColor: 'accent-600', theme: { dark: { bgColor: 'accent-500', color: 'base-950' } } },
        },
      },
    },
  },
});

/** The page itself: set on <html>, so every component, popover and dialog inherits it. */
const page: BoxStyleProps = {
  vars: Box.palette({ accent: ACCENT, base: BASE }),
  css: { fontFamily: FONT_BODY },
  selection: { bgColor: 'accent-400/28' },
  theme: {
    light: { colorScheme: 'light', bgColor: 'base-50', color: 'base-900' },
    dark: { colorScheme: 'dark', bgColor: 'base-950', color: 'base-100' },
  },
};

/** Light or dark follows the system until the reader picks one, and the pick is kept under `storageKey`. */
export default function Design({ children }: { children: ReactNode }) {
  return (
    <Box.Theme use="global" storageKey="theme" globalStyles={page}>
      {children}
    </Box.Theme>
  );
}
