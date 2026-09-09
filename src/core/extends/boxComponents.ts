import { BoxComponentStyles } from '../../types';

export interface BoxComponent {
  extends?: string;
  clean?: boolean;
  styles?: BoxComponentStyles;
  variants?: Record<string, BoxComponentStyles>;
  children?: Record<string, BoxComponent>;
}

export type Components = Record<string, BoxComponent>;

const boxComponents = {
  h1: {
    styles: { fontSize: 14 * 2.5 },
  },
  h2: {
    styles: { fontSize: 14 * 2 },
  },
  h3: {
    styles: { fontSize: 14 * 1.75 },
  },
  h4: {
    styles: { fontSize: 14 * 1.5 },
  },
  h5: {
    styles: { fontSize: 14 * 1.25 },
  },
  h6: {
    styles: { fontSize: 14 * 1 },
  },
  span: {
    styles: { display: 'inline-block' },
  },
  // The `role="tooltip"` bubble. Inverted against the page on purpose: a tooltip is a temporary
  // overlay and has to read as one at a glance, whichever theme is underneath it.
  tooltip: {
    styles: {
      display: 'inline-block',
      maxWidth: 72,
      py: 1.5,
      px: 2.5,
      borderRadius: 1.5,
      fontSize: 13,
      lineHeight: 18,
      bgColor: 'gray-900',
      color: 'gray-50',
      theme: {
        dark: { bgColor: 'gray-100', color: 'gray-900' },
      },
      // Inversion is the only thing separating this bubble from the page, and a forced-colors mode
      // throws both colors away — leaving text floating over whatever it covers. A border is the
      // one edge those modes keep, so the bubble grows one exactly when it has nothing else.
      forcedColors: { b: 1 },
      // The bubble is mounted when it opens, and entering the DOM is the one moment CSS can animate
      // by itself: it starts transparent and 4px high, and `._b`'s transition covers the distance.
      startingStyle: { opacity: 0, translateY: -1 },
    },
    variants: {
      // The way back out, over the same distance. `<Presence>` holds the node while this runs, and a
      // layer on its way out is a picture rather than a control — hence no pointer events.
      closed: { opacity: 0, translateY: -1, pointerEvents: 'none' },
    },
  },
  button: {
    styles: {
      display: 'inline-flex',
      ai: 'center',
      jc: 'center',
      gap: 2,
      bgColor: 'indigo-600',
      color: 'white',
      fontWeight: 500,
      py: 2.5,
      px: 5,
      borderRadius: 2,
      b: 0,
      cursor: 'pointer',
      hover: {
        bgColor: 'indigo-700',
      },
      active: {
        bgColor: 'indigo-800',
      },
      focus: {
        outline: 2,
        outlineOffset: 2,
        outlineColor: 'indigo-200',
      },
      disabled: {
        bgColor: 'gray-200',
        color: 'gray-400',
        cursor: 'not-allowed',
        hover: {
          bgColor: 'gray-200',
        },
      },
      theme: {
        dark: {
          bgColor: 'indigo-500',
          hover: {
            bgColor: 'indigo-400',
          },
          active: {
            bgColor: 'indigo-600',
          },
          focus: {
            outlineColor: 'indigo-800',
          },
          disabled: {
            bgColor: 'gray-800',
            color: 'gray-600',
            hover: {
              bgColor: 'gray-800',
            },
          },
        },
      },
    },
    variants: {
      secondary: {
        bgColor: 'white',
        color: 'gray-900',
        b: 1,
        borderColor: 'gray-300',
        hover: {
          bgColor: 'gray-50',
        },
        active: {
          bgColor: 'gray-100',
        },
        focus: {
          borderColor: 'indigo-500',
          outlineColor: 'indigo-100',
        },
        disabled: {
          bgColor: 'gray-50',
          color: 'gray-400',
          borderColor: 'gray-200',
        },
        theme: {
          dark: {
            bgColor: 'gray-800',
            color: 'gray-100',
            borderColor: 'gray-700',
            hover: {
              bgColor: 'gray-700',
            },
            active: {
              bgColor: 'gray-600',
            },
            focus: {
              borderColor: 'indigo-400',
              outlineColor: 'indigo-900',
            },
            disabled: {
              bgColor: 'gray-900',
              color: 'gray-600',
              borderColor: 'gray-800',
            },
          },
        },
      },
      ghost: {
        bgColor: 'transparent',
        color: 'gray-700',
        hover: {
          bgColor: 'gray-100',
        },
        active: {
          bgColor: 'gray-200',
        },
        disabled: {
          bgColor: 'transparent',
          color: 'gray-400',
        },
        theme: {
          dark: {
            bgColor: 'transparent',
            color: 'gray-300',
            hover: {
              bgColor: 'gray-800',
            },
            active: {
              bgColor: 'gray-700',
            },
            disabled: {
              bgColor: 'transparent',
              color: 'gray-600',
            },
          },
        },
      },
    },
  },
  textbox: {
    styles: {
      display: 'inline-block',
      b: 1,
      borderColor: 'gray-300',
      bgColor: 'white',
      color: 'gray-900',
      borderRadius: 2,
      p: 3,
      px: 4,
      lineHeight: 20,
      hover: {
        borderColor: 'gray-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'indigo-500',
        outlineColor: 'indigo-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'gray-100',
        color: 'gray-400',
        borderColor: 'gray-200',
      },
      theme: {
        dark: {
          bgColor: 'gray-800',
          color: 'gray-100',
          borderColor: 'gray-700',
          hover: {
            borderColor: 'gray-600',
          },
          focus: {
            borderColor: 'indigo-400',
            outlineColor: 'indigo-900',
          },
          disabled: {
            bgColor: 'gray-900',
            color: 'gray-600',
            borderColor: 'gray-800',
          },
        },
      },
    },
    variants: {
      compact: {
        px: 2,
        py: 1,
        fontSize: 13,
      },
    },
  },
  textarea: {
    styles: {
      display: 'inline-block',
      b: 1,
      borderColor: 'gray-300',
      bgColor: 'white',
      color: 'gray-900',
      borderRadius: 2,
      p: 3,
      px: 4,
      hover: {
        borderColor: 'gray-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'indigo-500',
        outlineColor: 'indigo-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'gray-100',
        color: 'gray-400',
        borderColor: 'gray-200',
        resize: 'none',
      },
      theme: {
        dark: {
          bgColor: 'gray-800',
          color: 'gray-100',
          borderColor: 'gray-700',
          hover: {
            borderColor: 'gray-600',
          },
          focus: {
            borderColor: 'indigo-400',
            outlineColor: 'indigo-900',
          },
          disabled: {
            bgColor: 'gray-900',
            color: 'gray-600',
            borderColor: 'gray-800',
          },
        },
      },
    },
  },
  checkbox: {
    styles: {
      display: 'inline-block',
      appearance: 'none',
      b: 2,
      borderColor: 'gray-300',
      borderRadius: 1,
      p: 2,
      cursor: 'pointer',
      hover: {
        borderColor: 'indigo-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 2,
        outlineColor: 'indigo-200',
      },
      checked: {
        bgColor: 'indigo-500',
        borderColor: 'indigo-500',
        bgImage: 'bg-img-checked',
      },
      indeterminate: {
        borderColor: 'indigo-500',
        bgImage: 'bg-img-indeterminate',
      },
      disabled: {
        cursor: 'not-allowed',
        borderColor: 'gray-200',
        checked: {
          bgColor: 'gray-300',
        },
        hover: {
          borderColor: 'gray-200',
        },
      },
      theme: {
        dark: {
          borderColor: 'gray-600',
          hover: {
            borderColor: 'indigo-400',
          },
          focus: {
            outlineColor: 'indigo-900',
          },
          checked: {
            bgColor: 'indigo-500',
            borderColor: 'indigo-500',
          },
          indeterminate: {
            borderColor: 'indigo-500',
          },
          disabled: {
            borderColor: 'gray-700',
            checked: {
              bgColor: 'gray-600',
            },
            hover: {
              borderColor: 'gray-700',
            },
          },
        },
      },
    },
    variants: {
      datagrid: {},
    },
  },
  radioButton: {
    styles: {
      appearance: 'none',
      b: 1,
      borderColor: 'gray-300',
      borderRadius: 3,
      p: 2,
      cursor: 'pointer',
      hover: {
        borderColor: 'indigo-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 2,
        outlineColor: 'indigo-200',
      },
      checked: {
        bgColor: 'indigo-500',
        borderColor: 'indigo-500',
        bgImage: 'bg-img-radio',
      },
      disabled: {
        checked: {
          bgColor: 'gray-300',
          borderColor: 'gray-200',
        },
        cursor: 'not-allowed',
        borderColor: 'gray-200',
        hover: {
          borderColor: 'gray-200',
        },
      },
      theme: {
        dark: {
          borderColor: 'gray-600',
          hover: {
            borderColor: 'indigo-400',
          },
          focus: {
            outlineColor: 'indigo-900',
          },
          checked: {
            bgColor: 'indigo-500',
            borderColor: 'indigo-500',
          },
          disabled: {
            borderColor: 'gray-700',
            checked: {
              bgColor: 'gray-600',
            },
            hover: {
              borderColor: 'gray-700',
            },
          },
        },
      },
    },
  },
  // The track, with the thumb drawn as its `::before`. One element rather than two so the switch
  // stays a single native input: everything a screen reader, a form and the tab order need is on
  // the control itself, and the moving part is decoration the accessibility tree never sees.
  switch: {
    styles: {
      appearance: 'none',
      position: 'relative',
      display: 'inline-block',
      width: 9,
      height: 5,
      minWidth: 9,
      borderRadius: 5,
      bgColor: 'gray-300',
      cursor: 'pointer',
      transition: 'all',
      transitionDuration: 150,
      before: {
        position: 'absolute',
        top: 0.5,
        insetStart: 0.5,
        width: 4,
        height: 4,
        borderRadius: 4,
        bgColor: 'white',
        transition: 'all',
        transitionDuration: 150,
      },
      hover: {
        bgColor: 'gray-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 2,
        outlineColor: 'indigo-200',
      },
      checked: {
        bgColor: 'indigo-500',
        hover: {
          bgColor: 'indigo-600',
        },
        before: {
          translateX: 4,
          rtl: { translateX: -4 },
        },
      },
      // The only component that names its own duration, so the library-wide default cannot reach
      // it: that one zeroes `--transitionTime`, and these two asked for 150ms by name. The thumb
      // still ends up on the other side — it just arrives there rather than travelling.
      motionReduce: {
        transition: 'none',
        before: { transition: 'none' },
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'gray-200',
        hover: {
          bgColor: 'gray-200',
        },
        checked: {
          bgColor: 'gray-300',
          hover: {
            bgColor: 'gray-300',
          },
        },
      },
      // Forced colours flatten the palette, so a state signalled by fill alone reads identically on and
      // off — and the white thumb can disappear into the track. The APG answer is `ButtonText` on
      // `ButtonFace` with the pair inverted when checked, which system colours are what make sayable.
      forcedColors: {
        bgColor: 'ButtonFace',
        b: 1,
        borderColor: 'ButtonText',
        before: { bgColor: 'ButtonText' },
        hover: { bgColor: 'ButtonFace' },
        checked: {
          bgColor: 'ButtonText',
          hover: { bgColor: 'ButtonText' },
          before: { bgColor: 'ButtonFace' },
        },
        disabled: {
          bgColor: 'ButtonFace',
          borderColor: 'GrayText',
          before: { bgColor: 'GrayText' },
          hover: { bgColor: 'ButtonFace' },
          checked: {
            bgColor: 'GrayText',
            hover: { bgColor: 'GrayText' },
            before: { bgColor: 'ButtonFace' },
          },
        },
      },
      theme: {
        dark: {
          bgColor: 'gray-600',
          hover: {
            bgColor: 'gray-500',
          },
          focus: {
            outlineColor: 'indigo-900',
          },
          checked: {
            bgColor: 'indigo-500',
            hover: {
              bgColor: 'indigo-400',
            },
          },
          disabled: {
            bgColor: 'gray-700',
            hover: {
              bgColor: 'gray-700',
            },
            checked: {
              bgColor: 'gray-600',
              hover: {
                bgColor: 'gray-600',
              },
            },
          },
        },
      },
    },
  },
  dropdown: {
    styles: {
      display: 'inline-block',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      textAlign: 'start',
      gap: 2,
      p: 3,
      cursor: 'pointer',
      bgColor: 'white',
      color: 'gray-900',
      b: 1,
      borderColor: 'gray-300',
      borderRadius: 2,
      userSelect: 'none',
      lineHeight: 20,
      width: 'fit-content',
      transition: 'none',
      hover: {
        borderColor: 'gray-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'indigo-500',
        outlineColor: 'indigo-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'gray-100',
        color: 'gray-400',
        borderColor: 'gray-300',
      },
      theme: {
        dark: {
          bgColor: 'gray-800',
          color: 'gray-100',
          borderColor: 'gray-700',
          hover: {
            borderColor: 'gray-600',
          },
          focus: {
            borderColor: 'indigo-400',
            outlineColor: 'indigo-900',
          },
          disabled: {
            bgColor: 'gray-900',
            color: 'gray-500',
            borderColor: 'gray-700',
          },
        },
      },
    },
    variants: {
      compact: {
        px: 2,
        py: 1,
        fontSize: 13,
        height: 7.5,
      },
    },
    children: {
      items: {
        styles: {
          display: 'flex',
          d: 'column',
          gap: 1,
          p: 1,
          b: 1,
          borderRadius: 2,
          position: 'relative',
          bgColor: 'white',
          overflow: 'auto',
          maxHeight: 62,
          borderColor: 'gray-300',
          color: 'gray-900',
          shadow: 'medium',
          theme: {
            dark: {
              bgColor: 'gray-800',
              borderColor: 'gray-700',
              color: 'gray-100',
            },
          },
          // The popup is mounted when it opens, so `@starting-style` is its entrance and no state,
          // no effect and no JavaScript are involved in it. One direction, whichever way it opened:
          // the before-change style is computed from the popup's first style resolution, and which
          // side the browser flipped to is only knowable by forcing that resolution (measured).
          startingStyle: { opacity: 0, translateY: -1 },
        },
        // A popup collapses back into the trigger it came out of, so the 4px the exit covers changes
        // sign with the direction it opened in — `closed` and `closedUp` are that pair. The exit runs
        // long after the flip is settled, which is why it can be sure of the side and the entrance cannot.
        variants: {
          // The exit `<Presence>` holds the popup open for. Not clickable while it runs: a second
          // selection landing on a closing listbox would change the value the user just settled.
          closed: { opacity: 0, translateY: -1, pointerEvents: 'none' },
          closedUp: { opacity: 0, translateY: 1, pointerEvents: 'none' },
        },
      },
      item: {
        styles: {
          textWrap: 'nowrap',
          display: 'flex',
          width: 'fit',
          p: 3,
          cursor: 'pointer',
          borderRadius: 1,
          lineHeight: 20,
          hover: {
            bgColor: 'gray-100',
          },
          focus: {
            bgColor: 'indigo-50',
          },
          selected: {
            bgColor: 'indigo-50',
            cursor: 'default',
            hover: {
              bgColor: 'indigo-100',
            },
          },
          theme: {
            dark: {
              hover: {
                bgColor: 'gray-700',
              },
              focus: {
                bgColor: 'gray-700',
              },
              selected: {
                bgColor: 'indigo-900',
                hover: {
                  bgColor: 'indigo-800',
                },
              },
            },
          },
        },
        variants: {
          // Where the keyboard is. A listbox driven by `aria-activedescendant` holds no DOM focus
          // anywhere, so `:focus-within` never fires and the highlight has to be drawn from state.
          // An inset outline rather than a background: it reads over the selected row's own colour
          // instead of fighting it for the same declaration.
          highlighted: {
            outline: 2,
            // Without a style there is no outline at all: `outline-style` starts at `none`, and the
            // `focus` rules elsewhere only get away with omitting it because the UA supplies one.
            outlineStyle: 'solid',
            outlineOffset: -2,
            outlineColor: 'indigo-500',
            theme: {
              dark: {
                outlineColor: 'indigo-400',
              },
            },
          },
          compact: {
            px: 2,
            py: 1,
          },
          multiple: {
            selected: {
              cursor: 'pointer',
            },
          },
        },
      },
      unselect: {
        styles: {
          display: 'flex',
          width: 'fit',
          p: 3,
          cursor: 'pointer',
          lineHeight: 20,
          borderRadius: 1,
          color: 'gray-500',
          hover: {
            bgColor: 'gray-100',
          },
          focus: {
            bgColor: 'gray-100',
          },
          selected: {
            bgColor: 'gray-100',
            cursor: 'default',
          },
          theme: {
            dark: {
              color: 'gray-400',
              hover: {
                bgColor: 'gray-700',
              },
              focus: {
                bgColor: 'gray-700',
              },
              selected: {
                bgColor: 'gray-700',
              },
            },
          },
        },
        variants: {
          // Where the keyboard is. A listbox driven by `aria-activedescendant` holds no DOM focus
          // anywhere, so `:focus-within` never fires and the highlight has to be drawn from state.
          // An inset outline rather than a background: it reads over the selected row's own colour
          // instead of fighting it for the same declaration.
          highlighted: {
            outline: 2,
            // Without a style there is no outline at all: `outline-style` starts at `none`, and the
            // `focus` rules elsewhere only get away with omitting it because the UA supplies one.
            outlineStyle: 'solid',
            outlineOffset: -2,
            outlineColor: 'indigo-500',
            theme: {
              dark: {
                outlineColor: 'indigo-400',
              },
            },
          },
          compact: {
            px: 2,
            py: 1,
          },
        },
      },
      selectAll: {
        styles: {
          display: 'flex',
          width: 'fit',
          p: 3,
          cursor: 'pointer',
          lineHeight: 20,
          borderRadius: 1,
          color: 'gray-500',
          hover: {
            bgColor: 'gray-100',
          },
          focus: {
            bgColor: 'gray-100',
          },
          selected: {
            bgColor: 'gray-100',
            cursor: 'default',
          },
          theme: {
            dark: {
              color: 'gray-400',
              hover: {
                bgColor: 'gray-700',
              },
              focus: {
                bgColor: 'gray-700',
              },
              selected: {
                bgColor: 'gray-700',
              },
            },
          },
        },
        variants: {
          // Where the keyboard is. A listbox driven by `aria-activedescendant` holds no DOM focus
          // anywhere, so `:focus-within` never fires and the highlight has to be drawn from state.
          // An inset outline rather than a background: it reads over the selected row's own colour
          // instead of fighting it for the same declaration.
          highlighted: {
            outline: 2,
            // Without a style there is no outline at all: `outline-style` starts at `none`, and the
            // `focus` rules elsewhere only get away with omitting it because the UA supplies one.
            outlineStyle: 'solid',
            outlineOffset: -2,
            outlineColor: 'indigo-500',
            theme: {
              dark: {
                outlineColor: 'indigo-400',
              },
            },
          },
          compact: {
            px: 2,
            py: 1,
          },
        },
      },
      emptyItem: {
        styles: {
          display: 'flex',
          width: 'fit',
          p: 3,
          cursor: 'default',
          lineHeight: 20,
          borderRadius: 1,
          color: 'gray-400',
          theme: {
            dark: {
              color: 'gray-500',
            },
          },
        },
        variants: {
          compact: {
            px: 2,
            py: 1,
          },
        },
      },
      icon: {
        styles: {
          position: 'absolute',
          top: 0,
          insetEnd: 0,
          height: 'fit',
          px: 1.5,
        },
      },
    },
  },
  label: { styles: {} },
  datagrid: {
    styles: {
      b: 1,
      bgColor: 'white',
      borderColor: 'gray-200',
      overflow: 'hidden',
      borderRadius: 3,
      shadow: 'large',
      theme: {
        dark: {
          bgColor: 'gray-900',
          borderColor: 'gray-800',
        },
      },
    },
    children: {
      content: {
        styles: {},
      },
      // The indeterminate loading bar. The sticky wrapper is zero-height so toggling `loading` shifts no
      // layout; the 3px track overflows down over the first row, and sticky + inset-start + width:fit keeps
      // the rail spanning the visible width during a horizontal scroll.
      loader: {
        styles: {
          position: 'sticky',
          insetStart: 0,
          width: 'fit',
          height: 0,
          zIndex: 2,
        },
        children: {
          track: {
            styles: {
              position: 'absolute',
              top: 0,
              insetX: 0,
              overflow: 'hidden',
              bgColor: 'indigo-100',
              theme: {
                dark: {
                  bgColor: 'indigo-950',
                },
              },
            },
            children: {
              bar: {
                styles: {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  insetStart: 0,
                  bgColor: 'indigo-500',
                  animationName: 'rb-datagrid-loader',
                  animationDuration: 1100,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  // A duration named in milliseconds is outside the reduced-motion default, which only
                  // zeroes `--transitionTime` — so this sweep says when to stop on its own.
                  motionReduce: {
                    animationName: 'none',
                  },
                  theme: {
                    dark: {
                      bgColor: 'indigo-400',
                    },
                  },
                },
              },
            },
          },
        },
      },
      topBar: {
        styles: {
          py: 3,
          px: 4,
          bb: 1,
          borderColor: 'gray-200',
          color: 'gray-800',
          gap: 3,
          ai: 'center',
          bgColor: 'gray-50',
          theme: {
            dark: {
              bgColor: 'gray-800',
              borderColor: 'gray-700',
              color: 'gray-200',
            },
          },
        },
        children: {
          globalFilter: {
            styles: {
              display: 'flex',
              ai: 'center',
              gap: 2,
            },
            children: {
              stats: {
                styles: {
                  fontSize: 11,
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  bgColor: 'violet-100',
                  color: 'violet-700',
                  theme: {
                    dark: {
                      bgColor: 'violet-900',
                      color: 'violet-300',
                    },
                  },
                  textWrap: 'nowrap',
                },
              },
            },
          },
          columnGroups: {
            styles: {
              gap: 2,
              ai: 'center',
            },
            children: {
              icon: {
                styles: {
                  color: 'gray-700',
                  width: 4,
                  theme: {
                    dark: {
                      color: 'gray-300',
                    },
                  },
                },
              },
              separator: {
                styles: {},
              },
              item: {
                styles: {
                  gap: 2,
                  ai: 'center',
                  b: 1,
                  borderColor: 'gray-300',
                  bgColor: 'white',
                  borderRadius: 2,
                  py: 2,
                  ps: 3,
                  pe: 2,
                  color: 'gray-800',
                  fontSize: 14,
                  fontWeight: 500,
                  shadow: 'small',
                  theme: {
                    dark: {
                      bgColor: 'gray-800',
                      borderColor: 'gray-700',
                      color: 'gray-200',
                    },
                  },
                },
                children: {
                  icon: {
                    styles: {
                      width: 3,
                      color: 'gray-500',
                      cursor: 'pointer',
                      hover: {
                        color: 'gray-700',
                      },
                      theme: {
                        dark: {
                          color: 'gray-400',
                          hover: {
                            color: 'gray-200',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          columnVisibility: {
            styles: {},
            children: {
              badge: {
                styles: {},
              },
            },
          },
        },
      },
      filter: {
        styles: {},
        children: {
          row: {
            styles: {
              bgColor: 'gray-50',
              bb: 1,
              borderColor: 'gray-200',
              theme: {
                dark: {
                  bgColor: 'gray-800',
                  borderColor: 'gray-700',
                },
              },
            },
          },
          cell: {
            styles: {
              display: 'flex',
              ai: 'center',
              p: 2,
              transition: 'none',
              // The filter row is part of the grid the arrow keys walk, so its cells need the same
              // ring the header and body cells have.
              focusVisible: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'indigo-500',
              },
              theme: {
                dark: {
                  focusVisible: {
                    outlineColor: 'indigo-400',
                  },
                },
              },
            },
            variants: {
              isPinned: {
                position: 'sticky',
                bgColor: 'gray-50',
                zIndex: 2,
                theme: {
                  dark: {
                    bgColor: 'gray-800',
                  },
                },
              },
              isFirstStartPinned: {},
              isLastStartPinned: {
                be: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-700',
                  },
                },
              },
              isFirstEndPinned: {
                bs: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-700',
                  },
                },
              },
              isLastEndPinned: {},
            },
            children: {
              input: {
                styles: {
                  display: 'flex',
                  ai: 'center',
                  b: 1,
                  borderColor: 'gray-200',
                  borderRadius: 1,
                  position: 'relative',
                  width: 'fit',
                  focus: {
                    borderColor: 'indigo-500',
                    outline: 2,
                    outlineOffset: 0,
                    outlineColor: 'indigo-200',
                  },
                  theme: {
                    dark: {
                      borderColor: 'gray-700',
                      focus: {
                        borderColor: 'indigo-400',
                        outlineColor: 'indigo-900',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      header: {
        styles: {
          position: 'sticky',
          top: 0,
          width: 'max-content',
          minWidth: 'fit',
          zIndex: 1,
          bgColor: 'gray-50',
          theme: {
            dark: {
              bgColor: 'gray-800',
            },
          },
        },
        children: {
          cell: {
            styles: {
              borderColor: 'gray-200',
              bb: 1,
              minHeight: 12,
              position: 'relative',
              transition: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: 'gray-800',
              py: 3.5,
              // The cell is where the keyboard lives in a grid, so it has to show where it is — an *inset* outline,
              // since an outset ring on the first or last column would be clipped by the scroll container.
              // Deliberately no `zIndex`: a focused cell that outranked the pinned columns would slide over them on a
              // horizontal scroll instead of under, which is the one thing pinning promises.
              focusVisible: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'indigo-500',
              },
              theme: {
                dark: {
                  borderColor: 'gray-700',
                  color: 'gray-200',
                  focusVisible: {
                    outlineColor: 'indigo-400',
                  },
                },
              },
            },
            variants: {
              isPinned: {
                position: 'sticky',
                zIndex: 2,
                bgColor: 'gray-50',
                theme: {
                  dark: {
                    bgColor: 'gray-800',
                  },
                },
              },
              isFirstStartPinned: {},
              isLastStartPinned: {
                be: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-700',
                  },
                },
              },
              isFirstEndPinned: {
                bs: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-700',
                  },
                },
              },
              isLastEndPinned: {},
              isSortable: {
                cursor: 'pointer',
                hover: {
                  bgColor: 'gray-100',
                },
                theme: {
                  dark: {
                    hover: {
                      bgColor: 'gray-800',
                    },
                  },
                },
              },
              isRowSelected: {},
              isRowSelection: {},
              isRowNumber: { jc: 'center' },
              isFirstLeaf: {},
              isLastLeaf: {},
              isEmptyCell: {},
            },
            children: {
              contextMenu: {
                clean: true,
                styles: {
                  width: 6,
                  height: 6,
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderRadius: 1,
                  borderColor: 'gray-200',
                  display: 'flex',
                  jc: 'center',
                  ai: 'center',
                  transition: 'none',
                  color: 'gray-600',
                  hover: { bgColor: 'gray-300' },
                  theme: {
                    dark: {
                      color: 'gray-400',
                      hover: { bgColor: 'gray-700' },
                    },
                  },
                },
                children: {
                  icon: {
                    styles: {},
                  },
                  tooltip: {
                    styles: {
                      bgColor: 'white',
                      color: 'gray-900',
                      width: 56,
                      b: 1,
                      borderColor: 'gray-300',
                      borderRadius: 3,
                      display: 'flex',
                      d: 'column',
                      py: 2,
                      overflow: 'hidden',
                      shadow: 'medium',
                      theme: {
                        dark: {
                          bgColor: 'gray-800',
                          borderColor: 'gray-700',
                          color: 'gray-100',
                        },
                      },
                      startingStyle: { opacity: 0, translateY: -1 },
                    },
                    variants: {
                      // The exit, held open by `<Presence>`. A click on a closing menu would run its
                      // item a second time, and `toggleGrouping` twice is grouping never changed.
                      closed: { opacity: 0, translateY: -1, pointerEvents: 'none' },
                    },
                    children: {
                      item: {
                        clean: true,
                        styles: {
                          display: 'flex',
                          gap: 2,
                          p: 3,
                          cursor: 'pointer',
                          color: 'gray-900',
                          hover: { bgColor: 'violet-50' },
                          theme: {
                            dark: {
                              color: 'gray-100',
                              hover: { bgColor: 'gray-700' },
                            },
                          },
                        },
                        children: {
                          icon: {
                            styles: {
                              width: 4,
                              color: 'violet-950',
                              theme: {
                                dark: {
                                  color: 'violet-300',
                                },
                              },
                            },
                          },
                          separator: {
                            styles: {
                              bb: 1,
                              my: 2,
                              borderColor: 'gray-300',
                              theme: {
                                dark: {
                                  borderColor: 'gray-700',
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              resizer: {
                styles: {
                  width: 0.5,
                  height: 'fit',
                  bgColor: 'gray-400',
                  group: { 'resizer/hover': { bgColor: 'gray-600' } },
                  // The separator is its own tab stop, and a bar two pixels wide has no room for a ring inside it, so the
                  // outline sits around it. `opacity` is here rather than on the element because a resizer that only
                  // appears on hover is a tab stop nobody could follow, and a pseudo rule outranks the base one.
                  focusVisible: {
                    opacity: 1,
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineColor: 'indigo-500',
                    bgColor: 'indigo-500',
                  },
                  theme: {
                    dark: {
                      focusVisible: {
                        outlineColor: 'indigo-400',
                        bgColor: 'indigo-400',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      body: {
        styles: {},
        children: {
          cell: {
            styles: {
              bb: 1,
              borderColor: 'gray-200',
              transition: 'none',
              ai: 'center',
              group: { 'grid-row/hover': { bgColor: 'gray-100' } },
              // Same ring as the header cell: in a grid the cell is the thing that holds focus.
              focusVisible: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'indigo-500',
              },
              theme: {
                dark: {
                  borderColor: 'gray-800',
                  group: { 'grid-row/hover': { bgColor: 'gray-700' } },
                  focusVisible: {
                    outlineColor: 'indigo-400',
                  },
                },
              },
            },
            variants: {
              isPinned: {
                position: 'sticky',
                bgColor: 'white',
                zIndex: 1,
                theme: {
                  dark: {
                    bgColor: 'gray-900',
                  },
                },
              },
              isFirstStartPinned: {},
              isLastStartPinned: {
                be: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-800',
                  },
                },
              },
              isFirstEndPinned: {
                bs: 1,
                borderColor: 'gray-200',
                theme: {
                  dark: {
                    borderColor: 'gray-800',
                  },
                },
              },
              isLastEndPinned: {},
              isRowNumber: { jc: 'end' },
              isRowSelection: {},
              isRowSelected: {},
              isFirstLeaf: {},
              isLastLeaf: {},
              isEmptyCell: {},
              isRowDetail: {},
              isExpanded: {},
              isExpandedFirstLeaf: {},
              isExpandedLastLeaf: {},
            },
            children: {
              text: {
                styles: {},
              },
              rowDetail: {
                clean: true,
                styles: {},
                variants: {
                  isExpanded: {},
                },
              },
            },
          },
          detailRow: {
            styles: {
              bb: 1,
              borderColor: 'gray-200',
              theme: {
                dark: {
                  borderColor: 'gray-800',
                },
              },
            },
            children: {
              content: {
                styles: {
                  // The panel is the detail row's single cell, so it holds focus like any other.
                  focusVisible: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: -2,
                    outlineColor: 'indigo-500',
                  },
                  theme: {
                    dark: {
                      focusVisible: {
                        outlineColor: 'indigo-400',
                      },
                    },
                  },
                },
              },
            },
          },
          row: {
            styles: {},
          },
          groupRow: {
            styles: {},
            children: {
              expandButton: {
                clean: true,
                styles: {},
              },
            },
          },
          empty: {
            styles: {},
          },
        },
      },
      emptyColumns: {
        styles: {},
      },
      bottomBar: {
        styles: {
          py: 3,
          px: 4,
          lineHeight: 36,
          bgColor: 'gray-50',
          bt: 1,
          borderColor: 'gray-200',
          gap: 4,
          ai: 'center',
          fontSize: 14,
          color: 'gray-800',
          theme: {
            dark: {
              bgColor: 'gray-800',
              borderColor: 'gray-700',
              color: 'gray-200',
            },
          },
        },
        children: {
          info: {
            styles: {},
          },
          clearFilters: {
            styles: {},
          },
          pagination: {
            styles: {},
            children: {
              button: {
                clean: true,
                styles: {},
              },
              info: {
                styles: {},
              },
              pageSize: {
                styles: {},
              },
            },
          },
        },
      },
    },
  },
} satisfies Components;

export default boxComponents;
