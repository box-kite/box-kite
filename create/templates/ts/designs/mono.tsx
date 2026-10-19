/**
 * Mono: ink #16191e on white in single pixels, with 1px edges, focus as the second pixel and no gradients.
 *
 * The whole design is in this file: the two palette families every component is drawn in (accent and
 * base), the page's colours and fonts, and the component styles, in light and dark. It is yours to edit.
 */
import '@fontsource-variable/roboto';
import Box, { type BoxComponentStyles, type BoxStyleProps } from '@box-kite/react';
import type { ReactNode } from 'react';

const FONT_BODY = "'Roboto Variable', 'Helvetica Neue', Arial, sans-serif";

/** The neutrals: page, text, borders. Repoint either family with a palette name ('stone') or a ramp like this. */
const BASE = {
  50: '#f7f8f9',
  100: '#eff1f3',
  200: '#e2e5e9',
  300: '#cdd1d7',
  400: '#9ba2ad',
  500: '#6b7380',
  600: '#4f5763',
  700: '#3b424d',
  800: '#2c323b',
  900: '#1d2127',
  950: '#16191e',
} as const;

/** The accent: buttons, focus, selection. */
const ACCENT = {
  50: '#f7f8f9',
  100: '#eff1f3',
  200: '#e2e5e9',
  300: '#cdd1d7',
  400: '#8c939e',
  500: '#2c323b',
  600: '#16191e',
  700: '#101216',
  800: '#0b0d10',
  900: '#08090b',
  950: '#050607',
} as const;

const INK = 'base-950';
const PAPER = 'base-50';

/** A filled control's focus: one pixel of page, then one of ink — the second pixel, kept apart so it shows on a fill. */
const RING_APART: BoxComponentStyles = {
  outline: 1,
  outlineStyle: 'solid',
  outlineOffset: 1,
  outlineColor: INK,
  theme: { dark: { outlineColor: PAPER } },
};

/** An outlined control's focus: the border turns ink and a second pixel sits right on it, so the line is 2px. */
const RING_TIGHT: BoxComponentStyles = {
  outline: 1,
  outlineStyle: 'solid',
  outlineOffset: 0,
  outlineColor: INK,
  borderColor: INK,
  theme: { dark: { outlineColor: PAPER, borderColor: PAPER } },
};

/** What floats: white, a hairline, and the one shadow the design allows — short and soft, so it lifts without glowing. */
const LAYER: BoxComponentStyles = {
  p: 1,
  b: 1,
  borderRadius: 1.5,
  bgColor: 'white',
  borderColor: 'base-200',
  shadow: 'lg',
  shadowColor: 'black/8',
  theme: { dark: { bgColor: 'base-900', borderColor: 'base-800', shadowColor: 'black/40' } },
};

/** One row in a layer: a grey fill under the pointer, the choice marked by weight rather than by colour. */
const LAYER_ITEM: BoxComponentStyles = {
  borderRadius: 1,
  hover: { bgColor: 'base-100' },
  focus: { bgColor: 'base-100' },
  selected: { bgColor: 'base-100', color: INK, fontWeight: 500, hover: { bgColor: 'base-200' } },
  theme: {
    dark: {
      hover: { bgColor: 'base-800' },
      focus: { bgColor: 'base-800' },
      selected: { bgColor: 'base-800', color: PAPER, hover: { bgColor: 'base-700' } },
    },
  },
};

/** Where the keyboard is in a listbox: the pointer's fill, with the outline back in a forced-colors mode. */
const LAYER_HIGHLIGHT: BoxComponentStyles = {
  outline: 0,
  bgColor: 'base-100',
  selected: { bgColor: 'base-200' },
  forcedColors: { outline: 2, outlineColor: 'Highlight' },
  theme: { dark: { bgColor: 'base-800', selected: { bgColor: 'base-700' } } },
};

/** A field at rest: white, a grey hairline that darkens under the pointer and turns to two pixels of ink on focus. */
const FIELD: BoxComponentStyles = {
  borderRadius: 1.5,
  borderColor: 'base-300',
  bgColor: 'white',
  shadow: 'none',
  hover: { borderColor: 'base-500' },
  focus: RING_TIGHT,
  theme: {
    dark: {
      bgColor: 'base-950',
      borderColor: 'base-700',
      hover: { borderColor: 'base-500' },
      focus: { outlineColor: PAPER, borderColor: PAPER },
    },
  },
};

/** The primary action: solid ink with a 1px edge of its own, so every button is the same height. Hover lifts it to #2c323b. */
const PRIMARY: BoxComponentStyles = {
  b: 1,
  bgGradient: 'none',
  bgColor: INK,
  borderColor: INK,
  color: 'white',
  shadow: 'none',
  hover: { bgColor: 'base-800', borderColor: 'base-800' },
  active: { bgColor: 'base-700', borderColor: 'base-700' },
  disabled: { bgColor: 'base-100', borderColor: 'base-200', color: 'base-400' },
  theme: {
    dark: {
      bgColor: PAPER,
      borderColor: PAPER,
      color: INK,
      hover: { bgColor: 'base-200', borderColor: 'base-200' },
      active: { bgColor: 'base-300', borderColor: 'base-300' },
      disabled: { bgColor: 'base-900', borderColor: 'base-800', color: 'base-600' },
    },
  },
};

/** The library's marks are white; on the dark page Mono fills a control with paper, so its mark is drawn in ink. */
const inkMark = (shape: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 20 20'>${shape}</svg>`)}")`;
const INK_TICK = inkMark(
  "<path fill='none' stroke='#16191E' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 10l3 3l6-6'/>",
);
const INK_DASH = inkMark(
  "<line stroke='#16191E' stroke-linecap='round' x1='6' y1='10' x2='14' y2='10' stroke-width='2' />",
);
const INK_DOT = inkMark("<circle fill='#16191E' cx='10' cy='10' r='5'/>");

const heading: BoxComponentStyles = { fontWeight: 500, letterSpacing: 'tight', css: { fontFamily: FONT_BODY } };

Box.components({
  h1: { styles: heading },
  h2: { styles: heading },
  h3: { styles: heading },

  button: {
    styles: { ...PRIMARY, px: 4, borderRadius: 1.5, fontWeight: 500, focusVisible: RING_APART },
    variants: {
      secondary: {
        bgColor: 'white',
        color: INK,
        borderColor: 'base-300',
        hover: { bgColor: 'base-50', borderColor: INK },
        active: { bgColor: 'base-100', borderColor: INK },
        focusVisible: RING_TIGHT,
        theme: {
          dark: {
            bgColor: 'transparent',
            color: PAPER,
            borderColor: 'base-700',
            hover: { bgColor: 'base-800', borderColor: 'base-500' },
            active: { bgColor: 'base-700', borderColor: 'base-500' },
            focusVisible: { outlineColor: PAPER, borderColor: PAPER },
          },
        },
      },
      ghost: {
        bgColor: 'transparent',
        color: 'base-700',
        borderColor: 'transparent',
        hover: { bgColor: 'base-100', borderColor: 'transparent', color: INK },
        active: { bgColor: 'base-200', borderColor: 'transparent' },
        theme: {
          dark: {
            bgColor: 'transparent',
            color: 'base-300',
            borderColor: 'transparent',
            hover: { bgColor: 'base-800', borderColor: 'transparent', color: PAPER },
            active: { bgColor: 'base-700', borderColor: 'transparent' },
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
      unselect: { styles: { borderRadius: 1 }, variants: { highlighted: LAYER_HIGHLIGHT } },
      selectAll: { styles: { borderRadius: 1 }, variants: { highlighted: LAYER_HIGHLIGHT } },
    },
  },
  combobox: {
    styles: { ...FIELD, hasDisabled: { bgColor: 'base-100' } },
    children: {
      items: { styles: { ...LAYER, gap: 0.5 } },
      item: { styles: LAYER_ITEM, variants: { highlighted: LAYER_HIGHLIGHT } },
      chip: {
        styles: {
          b: 1,
          borderRadius: 1,
          bgColor: 'white',
          borderColor: 'base-300',
          color: INK,
          theme: { dark: { bgColor: 'base-900', borderColor: 'base-700', color: PAPER } },
        },
      },
    },
  },

  checkbox: {
    styles: {
      // One pixel like every other edge, and a quarter more padding so the box stays 20px.
      b: 1,
      p: 2.25,
      borderRadius: 1,
      borderColor: 'base-400',
      hover: { borderColor: INK },
      focusVisible: RING_APART,
      checked: { bgColor: INK, borderColor: INK },
      indeterminate: { bgColor: INK, borderColor: INK },
      theme: {
        dark: {
          borderColor: 'base-500',
          hover: { borderColor: PAPER },
          checked: { bgColor: PAPER, borderColor: PAPER, css: { backgroundImage: INK_TICK } },
          indeterminate: { bgColor: PAPER, borderColor: PAPER, css: { backgroundImage: INK_DASH } },
        },
      },
    },
  },
  radioButton: {
    styles: {
      borderColor: 'base-400',
      focusVisible: RING_APART,
      checked: { bgColor: INK, borderColor: INK },
      hover: { borderColor: INK },
      theme: {
        dark: {
          borderColor: 'base-500',
          hover: { borderColor: PAPER },
          checked: { bgColor: PAPER, borderColor: PAPER, css: { backgroundImage: INK_DOT } },
        },
      },
    },
  },
  switch: {
    styles: {
      b: 1,
      bgColor: 'base-200',
      borderColor: 'base-300',
      insetShadow: 'none',
      before: { shadow: 'xs', shadowColor: 'black/20' },
      focusVisible: RING_APART,
      hover: { bgColor: 'base-300' },
      checked: { bgColor: INK, borderColor: INK, hover: { bgColor: 'base-800', borderColor: 'base-800' } },
      theme: {
        dark: {
          bgColor: 'base-800',
          borderColor: 'base-700',
          hover: { bgColor: 'base-700' },
          checked: {
            bgColor: PAPER,
            borderColor: PAPER,
            before: { bgColor: INK },
            hover: { bgColor: 'base-200', borderColor: 'base-200' },
          },
        },
      },
    },
  },
  slider: {
    children: {
      track: {
        styles: { height: 1, borderRadius: 0.5, bgColor: 'base-200', theme: { dark: { bgColor: 'base-800' } } },
      },
      fill: { styles: { bgGradient: 'none', bgColor: INK, theme: { dark: { bgGradient: 'none', bgColor: PAPER } } } },
      thumb: {
        styles: {
          width: 4,
          height: 4,
          ms: -2,
          b: 1,
          bgColor: 'white',
          borderColor: INK,
          ring: 0,
          shadow: 'sm',
          shadowColor: 'black/12',
          hover: { bgColor: 'base-100' },
          focusVisible: RING_APART,
          theme: { dark: { bgColor: INK, borderColor: PAPER, hover: { bgColor: 'base-800' } } },
        },
      },
    },
  },
  progress: {
    styles: { height: 1, borderRadius: 0.5, bgColor: 'base-200', theme: { dark: { bgColor: 'base-800' } } },
    children: {
      fill: {
        styles: {
          borderRadius: 0.5,
          bgGradient: 'none',
          bgColor: INK,
          theme: { dark: { bgGradient: 'none', bgColor: PAPER } },
        },
      },
    },
  },

  dialog: {
    styles: {
      p: 6,
      b: 1,
      borderRadius: 2,
      borderColor: 'base-200',
      shadow: 'xl',
      shadowColor: 'black/12',
      backdrop: { bgColor: 'base-950/40', backdropBlur: 'none' },
      theme: {
        dark: {
          bgColor: 'base-900',
          borderColor: 'base-800',
          shadowColor: 'black/50',
          backdrop: { bgColor: 'black/60' },
        },
      },
    },
    children: {
      title: { styles: { ...heading, fontSize: 20, lineHeight: 28 } },
      description: { styles: { color: 'base-500', theme: { dark: { color: 'base-400' } } } },
    },
  },
  popover: { styles: { ...LAYER, p: 4, borderRadius: 2 } },
  menu: {
    styles: LAYER,
    children: {
      item: { styles: { ...LAYER_ITEM, px: 2.5 } },
      separator: { styles: { mx: -1, borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } } },
    },
  },
  tooltip: {
    styles: {
      borderRadius: 1,
      bgColor: INK,
      color: 'white',
      shadow: 'none',
      theme: { dark: { bgColor: PAPER, color: INK } },
    },
  },
  toaster: {
    children: {
      toast: { styles: { ...LAYER, py: 3.5, ps: 4, borderRadius: 2 } },
      action: { styles: { borderRadius: 1 } },
      close: { styles: { borderRadius: 1 } },
    },
  },

  tabs: {
    children: {
      list: { styles: { gap: 1, borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } } },
      tab: {
        styles: {
          px: 1,
          mx: 1.5,
          fontWeight: 400,
          color: 'base-500',
          hover: { color: INK },
          selected: { color: INK, fontWeight: 500 },
          theme: { dark: { color: 'base-400', hover: { color: PAPER }, selected: { color: PAPER } } },
        },
        variants: {
          underline: { selected: { borderColor: INK }, theme: { dark: { selected: { borderColor: PAPER } } } },
        },
      },
      indicator: { styles: { borderRadius: 0, bgGradient: 'none', bgColor: INK, theme: { dark: { bgColor: PAPER } } } },
    },
  },
  accordion: {
    children: {
      item: { styles: { borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } } },
      trigger: {
        styles: {
          py: 4,
          fontSize: 15,
          fontWeight: 500,
          hover: { color: 'base-600' },
          ariaAttr: { expanded: { color: INK } },
          theme: { dark: { hover: { color: 'base-300' }, ariaAttr: { expanded: { color: PAPER } } } },
        },
      },
    },
  },

  datagrid: {
    styles: {
      borderRadius: 2,
      borderColor: 'base-200',
      shadow: 'none',
      theme: { dark: { bgColor: 'base-950', borderColor: 'base-800', shadow: 'none' } },
    },
    children: {
      // The header is the body's own surface, set apart by one line of ink under it — which is also the sticky
      // edge, so it needs no shadow. Opaque, since the rows scroll beneath it.
      header: {
        styles: {
          bb: 1,
          bgColor: 'white',
          borderColor: INK,
          theme: { dark: { bgColor: 'base-950', borderColor: 'white/60' } },
        },
        children: {
          hover: { styles: { before: { bgColor: 'base-900/4' }, theme: { dark: { before: { bgColor: 'white/6' } } } } },
          cell: {
            styles: {
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 'normal',
              color: 'base-600',
              borderColor: 'base-200',
              ariaAttr: {
                'sort=ascending': { color: INK, fontWeight: 600 },
                'sort=descending': { color: INK, fontWeight: 600 },
              },
              theme: {
                dark: {
                  color: 'base-400',
                  borderColor: 'base-800',
                  ariaAttr: { 'sort=ascending': { color: PAPER }, 'sort=descending': { color: PAPER } },
                },
              },
            },
            variants: {
              isGroup: { color: INK, fontWeight: 600, theme: { dark: { color: PAPER } } },
              isPinned: { bgColor: 'white', theme: { dark: { bgColor: 'base-950' } } },
              isSortable: { hover: { color: INK }, theme: { dark: { hover: { color: PAPER } } } },
              hasHoverPill: { before: { bgColor: 'base-900/4' }, theme: { dark: { before: { bgColor: 'white/6' } } } },
            },
          },
        },
      },
      // The ink line under the header is the one rule, so the filter row draws none of its own.
      filter: {
        children: {
          row: { styles: { bb: 0, bgColor: 'white', theme: { dark: { bgColor: 'base-950' } } } },
          cell: {
            variants: { isPinned: { bgColor: 'white', theme: { dark: { bgColor: 'base-950' } } } },
            children: {
              input: {
                styles: {
                  borderRadius: 1.5,
                  borderColor: 'base-300',
                  focus: RING_TIGHT,
                  theme: { dark: { borderColor: 'base-700', focus: { outlineColor: PAPER, borderColor: PAPER } } },
                },
              },
            },
          },
        },
      },
    },
  },
  widget: {
    styles: { borderRadius: 2, shadow: 'none', theme: { dark: { borderColor: 'base-800' } } },
    children: { title: { styles: { ...heading, fontSize: 15, lineHeight: 22 } } },
  },
  toolCall: { styles: { borderRadius: 2, theme: { dark: { borderColor: 'base-800' } } } },
  approval: {
    styles: {
      borderRadius: 2,
      before: { bgGradient: 'none', bgColor: INK, theme: { dark: { bgColor: PAPER } } },
      theme: { dark: { borderColor: 'base-800' } },
    },
  },
  markdown: {
    children: {
      heading: { styles: heading },
      code: {
        styles: {
          borderRadius: 1,
          bgColor: 'base-100',
          color: INK,
          theme: { dark: { bgColor: 'base-800', color: PAPER } },
        },
      },
      codeBlock: { styles: { borderRadius: 2 } },
      quote: { styles: { borderColor: INK, theme: { dark: { borderColor: PAPER } } } },
    },
  },
  list: {
    variants: { card: { borderRadius: 2, theme: { dark: { bgColor: 'base-900' } } } },
  },
  calendar: {
    children: {
      day: {
        variants: { selected: { bgColor: INK, color: 'white', theme: { dark: { bgColor: PAPER, color: INK } } } },
      },
    },
  },
});

/** The page itself: set on <html>, so every component, popover and dialog inherits it. */
const page: BoxStyleProps = {
  vars: Box.palette({ accent: ACCENT, base: BASE }),
  css: { fontFamily: FONT_BODY },
  selection: { bgColor: 'base-950/14' },
  theme: {
    light: { colorScheme: 'light', bgColor: 'white', color: 'base-950' },
    dark: { colorScheme: 'dark', bgColor: 'base-950', color: 'base-100', selection: { bgColor: 'base-50/22' } },
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
