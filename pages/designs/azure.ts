import Box from '../../src/box';
import type { BoxComponentStyles } from '../../src/types';
import { token } from './codeToken';
import { AZURE_FONT_DISPLAY } from './designs';

/**
 * Azure: clear-sky blue on cool slate, frosted glass for everything that floats, pills for everything you press,
 * and a geometric sans for the display type. The palette is two `Box.palette()` families on `<html>`
 * (`designs.ts`); this object is the shape, the depth and the light, applied under `data-design="azure"`.
 */

/** The focus mark every control shares: an azure ring off the edge, 4.5:1 on the paper and 8:1 on the night. */
const RING: BoxComponentStyles = {
  outline: 2,
  outlineStyle: 'solid',
  outlineOffset: 2,
  outlineColor: 'accent-600',
  theme: { dark: { outlineColor: 'accent-400' } },
};

/** A field's focus: the border turns azure and a wide, soft halo grows out of it. */
const FIELD_FOCUS: BoxComponentStyles = { outline: 4, outlineOffset: 0, borderColor: 'accent-600', outlineColor: 'accent-500/18' };

/** The surface every floating layer shares: frosted glass, a hairline, and a long shadow tinted by the sky. */
const LAYER: BoxComponentStyles = {
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
const LAYER_ITEM: BoxComponentStyles = {
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
const LAYER_HIGHLIGHT: BoxComponentStyles = {
  outline: 0,
  bgColor: 'accent-500/10',
  selected: { bgColor: 'accent-500/18' },
  forcedColors: { outline: 2, outlineColor: 'Highlight' },
  theme: { dark: { bgColor: 'white/8', selected: { bgColor: 'accent-400/26' } } },
};

/** What a field looks like at rest: white, a cool hairline, a lift you feel more than see. */
const FIELD: BoxComponentStyles = {
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
const PRIMARY: BoxComponentStyles = {
  bgGradient: { linear: 'r', colors: ['accent-600', 'accent-700'] },
  bgColor: 'accent-600',
  color: 'white',
  insetShadow: 'xs',
  insetShadowColor: 'white/30',
  shadow: 'md',
  shadowColor: 'accent-600/28',
  hover: { shadow: 'lg', shadowColor: 'accent-500/40', translateY: -0.25 },
  active: { bgGradient: { linear: 'r', colors: ['accent-700', 'accent-700'] }, shadow: 'sm', insetShadow: 'none', translateY: 0 },
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

const display: BoxComponentStyles = {
  fontWeight: 600,
  letterSpacing: 'tight',
  css: { fontFamily: AZURE_FONT_DISPLAY },
};

export const azure = Box.components(
  {
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
        track: { styles: { height: 1.5, borderRadius: 2, bgColor: 'base-200', theme: { dark: { bgColor: 'white/10' } } } },
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
          dark: { bgColor: 'base-900/88', borderColor: 'white/10', shadowColor: 'black/60', backdrop: { bgColor: 'black/55' } },
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
            underline: { selected: { borderColor: 'accent-600' }, theme: { dark: { selected: { borderColor: 'accent-400' } } } },
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
            theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] }, shadow: 'none' } },
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
                isPinned: { theme: { dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] } } } },
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
                  dark: { bgColor: 'base-900', bgGradient: { linear: 'b', colors: ['white/3', 'white/3'] }, borderColor: 'white/10' },
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
      styles: { borderRadius: 5, shadow: 'sm', shadowColor: 'accent-950/6', theme: { dark: { borderColor: 'white/10', shadow: 'none' } } },
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
        day: { variants: { selected: { bgColor: 'accent-600', theme: { dark: { bgColor: 'accent-400', color: 'base-950' } } } } },
      },
    },

    // The site's own. Everything above this line is the design `npm create @box-kite` hands an app.
    display: { styles: display, variants: { hero: { fontWeight: 700, letterSpacing: 'tight' } } },
    // Sky into shallow water rather than into pink, which over a blue would read as purple. The cyan end holds 3.4:1.
    heroAccent: {
      styles: {
        bgGradient: { linear: 'r', colors: ['accent-700', 'accent-500', 'cyan-600'] },
        theme: { dark: { bgGradient: { linear: 'r', colors: ['accent-400', 'accent-300', 'cyan-300'] } } },
      },
    },
    // Every code surface, in a syntax theme of Azure's own: night sky and paper, a sky-blue keyword, mint
    // strings, apricot numbers and one periwinkle for properties, so the cool hues still stand apart.
    code: {
      styles: { css: { color: '#DCE6F2' }, theme: { light: { bgColor: 'white', css: { color: '#1B2533' } } } },
      children: {
        header: { styles: { theme: { dark: { borderColor: 'white/8' }, light: { bgColor: 'base-50', borderColor: 'base-200' } } } },
        action: {
          styles: { borderRadius: 999, theme: { dark: { bgColor: 'white/6', color: 'base-300', hover: { bgColor: 'white/12' } } } },
        },
        gutter: { styles: { theme: { dark: { color: 'base-600' }, light: { css: { color: '#A3B0C2' } } } } },
        lineNumber: { variants: { current: { theme: { dark: { color: 'base-300' }, light: { css: { color: '#5A6B82' } } } } } },
        field: {
          styles: {
            theme: {
              dark: { caretColor: 'accent-300', selection: { css: { backgroundColor: 'oklch(46% .12 250 / .45)' } } },
              light: { caretColor: 'accent-700', selection: { css: { backgroundColor: 'oklch(90% .06 236)' } } },
            },
          },
        },
        token: {
          children: {
            keyword: token('#7CC4FF', '#0B63B6'),
            control: token('#C3A6FF', '#7044C2'),
            string: token('#7EE0B8', '#0F7A55'),
            number: token('#FFB37A', '#B45309'),
            literal: token('#7CC4FF', '#0B63B6'),
            comment: token('#7A8CA6', '#66768C', { fontStyle: 'italic' }),
            regex: token('#FF8FA3', '#BE123C'),
            variable: token('#DCE6F2', '#1B2533'),
            function: token('#7FE7F2', '#0E7490'),
            property: token('#A5B8FF', '#3B4FC4'),
            type: token('#C3A6FF', '#7044C2'),
            operator: token('#93A4BA', '#5A6B82'),
            punctuation: token('#93A4BA', '#5A6B82'),
            bracket1: token('#FFD479', '#A16207'),
            bracket2: token('#C3A6FF', '#7044C2'),
            bracket3: token('#7FE7F2', '#0E7490'),
            tagBracket: token('#7A8CA6', '#66768C'),
            tag: token('#7CC4FF', '#0B63B6'),
            component: token('#7FE7F2', '#0E7490'),
            text: token('#DCE6F2', '#1B2533'),
            attribute: token('#A5B8FF', '#3B4FC4'),
            attributeValue: token('#7EE0B8', '#0F7A55'),
            nesting: token('#C3A6FF', '#7044C2'),
            componentProp: token('#A5B8FF', '#3B4FC4'),
            event: token('#FFD479', '#A16207'),
            reserved: token('#7CC4FF', '#0B63B6', { fontStyle: 'italic' }),
            unknown: token('#A5B8FF', '#3B4FC4', {
              css: { textDecorationLine: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: '3px' },
              theme: { dark: { css: { textDecorationColor: '#FF8FA3' } }, light: { css: { textDecorationColor: '#BE123C' } } },
            }),
          },
        },
      },
    },
    designPicker: {
      children: {
        trigger: { styles: { borderRadius: 999 } },
        card: { styles: { borderRadius: 5 } },
        modes: { styles: { borderRadius: 999 } },
        mode: { styles: { borderRadius: 999 } },
      },
    },
  },
  { design: 'azure' },
);
