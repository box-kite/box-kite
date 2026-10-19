/**
 * Azure: clear-sky blue on cool slate, frosted glass for what floats, and pills for what you press.
 *
 * The whole design is in this file: the two palette families every component is drawn in (accent and
 * base), the page's colours and fonts, and the component styles, in light and dark. It is yours to edit.
 */
import '@fontsource-variable/sora';
import '@fontsource-variable/inter';
import Box from '@box-kite/react';

const FONT_DISPLAY = "'Sora Variable', 'Inter Variable', 'Segoe UI', system-ui, sans-serif";
const FONT_BODY = "'Inter Variable', system-ui, sans-serif";

/** The neutrals: page, text, borders. Repoint either family with a palette name ('stone') or a ramp like this. */
const BASE = {
  50: 'oklch(98.4% .004 240)',
  100: 'oklch(96.4% .007 242)',
  200: 'oklch(92.6% .012 244)',
  300: 'oklch(87% .018 246)',
  400: 'oklch(71.4% .028 248)',
  500: 'oklch(55.8% .034 250)',
  600: 'oklch(45.6% .034 252)',
  700: 'oklch(37.8% .032 254)',
  800: 'oklch(27.8% .032 256)',
  900: 'oklch(21.4% .03 258)',
  950: 'oklch(15.6% .026 260)',
};

/** The accent: buttons, focus, selection. */
const ACCENT = {
  50: 'oklch(97.4% .013 236)',
  100: 'oklch(94.6% .028 236)',
  200: 'oklch(89.6% .055 237)',
  300: 'oklch(82.4% .095 239)',
  400: 'oklch(73.2% .145 242)',
  500: 'oklch(64.4% .162 246)',
  600: 'oklch(55.6% .155 250)',
  700: 'oklch(48.8% .145 253)',
  800: 'oklch(41.8% .128 255)',
  900: 'oklch(35.8% .108 257)',
  950: 'oklch(26.2% .075 259)',
};

/** The focus mark every control shares: an azure ring off the edge, 4.5:1 on the paper and 8:1 on the night. */
const RING = {
  outline: 2,
  outlineStyle: 'solid',
  outlineOffset: 2,
  outlineColor: 'accent-600',
  theme: { dark: { outlineColor: 'accent-400' } },
};

/** A field's focus: the border turns azure and a wide, soft halo grows out of it. */
const FIELD_FOCUS = {
  outline: 4,
  outlineOffset: 0,
  borderColor: 'accent-600',
  outlineColor: 'accent-500/18',
};

/** The surface every floating layer shares: frosted glass, a hairline, and a long shadow tinted by the sky. */
const LAYER = {
  p: 1.5,
  borderRadius: 4,
  bgColor: 'white/82',
  backdropBlur: 'lg',
  backdropSaturate: 180,
  borderColor: 'base-950/8',
  shadow: 'xl',
  shadowColor: 'accent-950/16',
  theme: { dark: { bgColor: 'base-900/80', borderColor: 'white/10', shadowColor: 'black/55' } },
};

/** One row in a layer: a pill inside the panel, an azure wash for the pointer, a deeper one for the choice. */
const LAYER_ITEM = {
  borderRadius: 2.5,
  hover: { bgColor: 'accent-500/8' },
  focus: { bgColor: 'accent-500/8' },
  selected: { bgColor: 'accent-500/12', color: 'accent-800', hover: { bgColor: 'accent-500/16' } },
  theme: {
    dark: {
      hover: { bgColor: 'white/6' },
      focus: { bgColor: 'white/6' },
      selected: { bgColor: 'accent-400/16', color: 'accent-200', hover: { bgColor: 'accent-400/22' } },
    },
  },
};

/** Where the keyboard is in a listbox: the pointer's wash, with the outline back in a forced-colors mode. */
const LAYER_HIGHLIGHT = {
  outline: 0,
  bgColor: 'accent-500/10',
  selected: { bgColor: 'accent-500/18' },
  forcedColors: { outline: 2, outlineColor: 'Highlight' },
  theme: { dark: { bgColor: 'white/8', selected: { bgColor: 'accent-400/26' } } },
};

/** What a field looks like at rest: white, a cool hairline, a lift you feel more than see. */
const FIELD = {
  borderRadius: 3,
  borderColor: 'base-300',
  shadow: 'xs',
  shadowColor: 'accent-950/6',
  hover: { borderColor: 'base-400' },
  focus: FIELD_FOCUS,
  theme: {
    dark: {
      bgColor: 'white/4',
      borderColor: 'white/12',
      hover: { borderColor: 'white/22' },
      focus: { borderColor: 'accent-400', outlineColor: 'accent-400/22' },
    },
  },
};

/** A primary action: a pill of azure that glows a little brighter when the pointer finds it. White text holds 4.7:1 at its lightest. */
const PRIMARY = {
  bgGradient: { linear: 'r', colors: ['accent-600', 'accent-700'] },
  bgColor: 'accent-600',
  color: 'white',
  insetShadow: 'xs',
  insetShadowColor: 'white/30',
  shadow: 'md',
  shadowColor: 'accent-600/28',
  hover: { shadow: 'lg', shadowColor: 'accent-500/40', translateY: -0.25 },
  active: {
    bgGradient: { linear: 'r', colors: ['accent-700', 'accent-700'] },
    shadow: 'sm',
    insetShadow: 'none',
    translateY: 0,
  },
  disabled: { bgGradient: 'none', shadow: 'none', insetShadow: 'none', translateY: 0 },
  theme: {
    dark: {
      bgGradient: { linear: 'r', colors: ['accent-400', 'accent-300'] },
      color: 'base-950',
      insetShadowColor: 'white/45',
      shadowColor: 'accent-400/25',
      hover: { shadowColor: 'accent-300/35' },
      active: { bgGradient: { linear: 'r', colors: ['accent-400', 'accent-400'] } },
      disabled: { bgGradient: 'none', color: 'base-500' },
    },
  },
};

const display = {
  fontWeight: 600,
  letterSpacing: 'tight',
  css: { fontFamily: FONT_DISPLAY },
};

Box.components({
  // The geometric sans, wherever the library or the site names a heading.
  h1: { styles: display },
  h2: { styles: display },
  h3: { styles: display },

  button: {
    styles: {
      ...PRIMARY,
      px: 5,
      borderRadius: 999,
      fontWeight: 600,
      transition: 'all',
      focusVisible: RING,
    },
    variants: {
      secondary: {
        bgGradient: 'none',
        bgColor: 'white/80',
        color: 'base-900',
        insetShadow: 'none',
        borderColor: 'base-300',
        shadow: 'xs',
        shadowColor: 'accent-950/8',
        hover: {
          bgGradient: 'none',
          bgColor: 'white',
          borderColor: 'accent-300',
          shadow: 'sm',
          shadowColor: 'accent-600/12',
          translateY: 0,
        },
        active: { bgGradient: 'none', bgColor: 'accent-50' },
        theme: {
          dark: {
            bgGradient: 'none',
            bgColor: 'white/5',
            color: 'base-100',
            borderColor: 'white/14',
            insetShadow: 'none',
            shadow: 'none',
            hover: { bgGradient: 'none', bgColor: 'white/9', borderColor: 'accent-400/50', shadow: 'none' },
            active: { bgGradient: 'none', bgColor: 'white/12' },
          },
        },
      },
      ghost: {
        bgGradient: 'none',
        insetShadow: 'none',
        shadow: 'none',
        hover: { bgGradient: 'none', bgColor: 'accent-500/8', shadow: 'none', translateY: 0 },
        active: { bgGradient: 'none', bgColor: 'accent-500/14' },
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
      unselect: { styles: { borderRadius: 2.5 }, variants: { highlighted: LAYER_HIGHLIGHT } },
      selectAll: { styles: { borderRadius: 2.5 }, variants: { highlighted: LAYER_HIGHLIGHT } },
    },
  },
  combobox: {
    styles: { ...FIELD, hasDisabled: { bgColor: 'base-100' } },
    children: {
      items: { styles: { ...LAYER, gap: 0.5 } },
      item: { styles: LAYER_ITEM, variants: { highlighted: LAYER_HIGHLIGHT } },
      chip: {
        styles: {
          borderRadius: 999,
          bgColor: 'accent-500/12',
          color: 'accent-800',
          theme: { dark: { bgColor: 'accent-400/16', color: 'accent-200' } },
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
          borderColor: 'white/22',
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
      theme: { dark: { borderColor: 'white/22', checked: { bgColor: 'accent-500', borderColor: 'accent-500' } } },
    },
  },
  switch: {
    styles: {
      bgColor: 'base-200',
      insetShadow: 'xs',
      insetShadowColor: 'accent-950/15',
      before: { shadow: 'sm', shadowColor: 'accent-950/25' },
      focusVisible: RING,
      checked: { bgColor: 'accent-600', hover: { bgColor: 'accent-700' } },
      theme: {
        dark: {
          bgColor: 'white/14',
          hover: { bgColor: 'white/20' },
          checked: { bgColor: 'accent-500', hover: { bgColor: 'accent-400' } },
        },
      },
    },
  },
  slider: {
    children: {
      track: {
        styles: { height: 1.5, borderRadius: 2, bgColor: 'base-200', theme: { dark: { bgColor: 'white/10' } } },
      },
      fill: {
        styles: {
          bgGradient: { linear: 'r', colors: ['accent-300', 'accent-600'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['accent-500', 'accent-300'] } } },
        },
      },
      thumb: {
        styles: {
          width: 4.5,
          height: 4.5,
          ms: -2.25,
          b: 0,
          bgColor: 'white',
          ring: 2,
          ringColor: 'accent-600',
          shadow: 'md',
          shadowColor: 'accent-900/25',
          hover: { ringColor: 'accent-700' },
          focusVisible: RING,
          theme: { dark: { bgColor: 'base-50', ringColor: 'accent-400', hover: { ringColor: 'accent-300' } } },
        },
      },
    },
  },
  progress: {
    styles: { height: 1.5, borderRadius: 2, bgColor: 'base-200', theme: { dark: { bgColor: 'white/10' } } },
    children: {
      fill: {
        styles: {
          borderRadius: 2,
          bgGradient: { linear: 'r', colors: ['accent-300', 'accent-600'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['accent-500', 'accent-300'] } } },
        },
      },
    },
  },

  dialog: {
    styles: {
      p: 7,
      borderRadius: 6,
      bgColor: 'white/90',
      backdropBlur: 'xl',
      backdropSaturate: 180,
      borderColor: 'base-950/6',
      shadow: 'xxl',
      shadowColor: 'accent-950/28',
      backdrop: { bgColor: 'accent-950/28', backdropBlur: 'sm' },
      theme: {
        dark: {
          bgColor: 'base-900/88',
          borderColor: 'white/10',
          shadowColor: 'black/60',
          backdrop: { bgColor: 'black/55' },
        },
      },
    },
    children: {
      title: { styles: { ...display, fontSize: 22, lineHeight: 28 } },
      description: { styles: { color: 'base-500', theme: { dark: { color: 'base-400' } } } },
    },
  },
  popover: { styles: { ...LAYER, p: 4, borderRadius: 5 } },
  menu: {
    styles: LAYER,
    children: {
      item: { styles: { ...LAYER_ITEM, px: 2.5 } },
      separator: { styles: { mx: -1.5, theme: { dark: { borderColor: 'white/8' } } } },
    },
  },
  tooltip: {
    styles: {
      borderRadius: 2.5,
      bgColor: 'base-900',
      shadow: 'md',
      shadowColor: 'accent-950/25',
      theme: { dark: { bgColor: 'base-50', color: 'base-950' } },
    },
  },
  toaster: {
    children: {
      toast: { styles: { ...LAYER, py: 3.5, ps: 4.5, borderRadius: 5, b: 1 } },
      action: { styles: { borderRadius: 999 } },
      close: { styles: { borderRadius: 999 } },
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
          selected: { color: 'accent-700', fontWeight: 600 },
          theme: { dark: { color: 'base-400', hover: { color: 'base-50' }, selected: { color: 'accent-300' } } },
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
          theme: { dark: { hover: { color: 'accent-300' }, ariaAttr: { expanded: { color: 'base-50' } } } },
        },
      },
    },
  },

  datagrid: {
    styles: {
      borderRadius: 4,
      borderColor: 'base-200',
      shadow: 'sm',
      shadowColor: 'accent-950/6',
      theme: { dark: { bgColor: 'base-900', borderColor: 'white/10', shadow: 'none' } },
    },
    children: {
      header: {
        // Opaque: the header is sticky, so a translucent fill lets the rows scroll through it. The lift is a layer over it.
        styles: {
          bgColor: 'base-50',
          // Glass can carry a lift: the sticky edge casts a breath of shadow on the rows under it.
          shadow: 'xs',
          shadowColor: 'accent-950/6',
          theme: {
            dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] }, shadow: 'none' },
          },
        },
        children: {
          hover: {
            styles: {
              before: { bgColor: 'accent-500/10', borderRadius: 999 },
              theme: { dark: { before: { bgColor: 'accent-400/14' } } },
            },
          },
          cell: {
            styles: {
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 'wide',
              color: 'base-500',
              borderColor: 'base-200',
              ariaAttr: { 'sort=ascending': { color: 'accent-600' }, 'sort=descending': { color: 'accent-600' } },
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
              isGroup: { color: 'base-700', theme: { dark: { color: 'base-300' } } },
              isPinned: {
                theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] } } },
              },
              hasHoverPill: {
                before: { bgColor: 'accent-500/10', borderRadius: 999 },
                theme: { dark: { before: { bgColor: 'accent-400/14' } } },
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
              borderColor: 'base-200',
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
            children: { input: { styles: { borderRadius: 999 } } },
          },
        },
      },
    },
  },
  widget: {
    styles: {
      borderRadius: 5,
      shadow: 'sm',
      shadowColor: 'accent-950/6',
      theme: { dark: { borderColor: 'white/10', shadow: 'none' } },
    },
    children: { title: { styles: { ...display, fontSize: 15, lineHeight: 22 } } },
  },
  toolCall: { styles: { borderRadius: 4, theme: { dark: { borderColor: 'white/10' } } } },
  approval: {
    styles: {
      borderRadius: 4,
      before: { bgGradient: { linear: 'b', colors: ['cyan-400', 'accent-600'] } },
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
          theme: { dark: { bgColor: 'accent-400/12', color: 'accent-200' } },
        },
      },
      codeBlock: { styles: { borderRadius: 4 } },
      quote: { styles: { borderColor: 'accent-400' } },
    },
  },
  list: {
    variants: { card: { borderRadius: 5, theme: { dark: { bgColor: 'base-900' } } } },
  },
  calendar: {
    children: {
      day: {
        variants: {
          selected: { bgColor: 'accent-600', theme: { dark: { bgColor: 'accent-400', color: 'base-950' } } },
        },
      },
    },
  },
});

/** The page itself: set on <html>, so every component, popover and dialog inherits it. */
const page = {
  vars: Box.palette({ accent: ACCENT, base: BASE }),
  css: { fontFamily: FONT_BODY },
  selection: { bgColor: 'accent-400/28' },
  theme: {
    light: { colorScheme: 'light', bgColor: 'base-50', color: 'base-900' },
    dark: { colorScheme: 'dark', bgColor: 'base-950', color: 'base-100' },
  },
};

/** Light or dark follows the system until the reader picks one, and the pick is kept under `storageKey`. */
export default function Design({ children }) {
  return (
    <Box.Theme use="global" storageKey="theme" globalStyles={page}>
      {children}
    </Box.Theme>
  );
}
