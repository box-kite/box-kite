import { BoxComponentStyles } from '../../types';
import { DARK_PALETTE, PALETTE, paletteVariables } from '../../utils/chart/chartPalette';

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
  // The `<dialog>` element, `role="dialog"` and `role="alertdialog"` alike — one node, because an alert
  // dialog looks like a dialog and differs only in what it does. Deliberately says almost **nothing about
  // position or size**: the UA stylesheet centres a modal one in the viewport (`position: fixed`,
  // `inset: 0`, `margin: auto`) and caps it at `calc(100% - 6px - 2em)`, which is better than anything
  // this could express, and it is the look that has to be overridden rather than the geometry.
  dialog: {
    styles: {
      // The one exception, and the reason it is one: `._b` declares `margin: 0`, which outranks the UA's
      // `margin: auto` — so without this the dialog sits in the top corner instead of the middle of the
      // viewport. Measured in Chrome 152; same family as the `display` rule below.
      m: 'auto',
      p: 6,
      b: 1,
      borderRadius: 3,
      bgColor: 'white',
      color: 'gray-900',
      borderColor: 'gray-200',
      shadow: 'large',
      theme: {
        dark: { bgColor: 'gray-800', borderColor: 'gray-700', color: 'gray-100' },
      },
      // Opening is a first style resolution — `display: none` to shown — which is the moment
      // `@starting-style` names; `allow-discrete` is what holds `display` and `overlay` back on the way
      // out, so the exit is a transition rather than a `<Presence>`. Every Box already transitions `all`,
      // which carries both of those (measured).
      startingStyle: { opacity: 0, scale: 0.96 },
      transitionBehavior: 'allow-discrete',
      // `display: none` is declared here rather than left to the UA's own `dialog:not([open])` rule,
      // because any author rule outranks that one — and every Box carries `display: block`, so without
      // this a closed dialog stays laid out over the page. Measured: the one thing a test environment
      // cannot see, having no UA dialog styles of its own.
      not: { open: { opacity: 0, scale: 0.96, display: 'none' } },
      // The backdrop is a pseudo-element, so it inherits none of the above and transitions nothing unless
      // it says so. Only a modal dialog has one to paint; the rule still resolves for the other kind,
      // there is simply no box (measured — a non-modal dialog computes this and shows nothing).
      backdrop: {
        bgColor: 'black/50',
        transition: 'opacity',
        startingStyle: { opacity: 0 },
        not: { open: { opacity: 0 } },
      },
    },
    children: {
      title: {
        styles: {
          fontSize: 18,
          fontWeight: 600,
          lineHeight: 26,
          m: 0,
        },
      },
      description: {
        styles: {
          fontSize: 14,
          lineHeight: 22,
          mt: 2,
          mb: 0,
          color: 'gray-600',
          theme: {
            dark: { color: 'gray-400' },
          },
        },
      },
    },
  },
  // The `role="dialog"` panel. It carries the UA stylesheet's `[popover]` look underneath it — a border,
  // padding and the system colours — so every one of those is declared here rather than inherited.
  popover: {
    styles: {
      width: 'fit-content',
      p: 4,
      b: 1,
      borderRadius: 2,
      bgColor: 'white',
      color: 'gray-900',
      borderColor: 'gray-300',
      shadow: 'medium',
      overflow: 'auto',
      theme: {
        dark: { bgColor: 'gray-800', borderColor: 'gray-700', color: 'gray-100' },
      },
      // The panel is displayed when it opens — from `display: none` on the platform path, by mounting on
      // the other — and both are a first style resolution, which is the moment `@starting-style` names.
      startingStyle: { opacity: 0, translateY: -1 },
    },
    variants: {
      // The exit, on the top-layer path only, where the panel is hidden rather than unmounted: losing
      // `:popover-open` *is* the exit, and `allow-discrete` holds `display` back until it has run. Every
      // Box already transitions `all`, and `all` carries `display` and `overlay` too (measured) — so this
      // is one prop rather than a `<Presence>`. Off on the fallback path, where the panel really unmounts
      // and `:popover-open` would never match, leaving the rule to hide it permanently.
      // `display: none` is declared here rather than left to the UA stylesheet's own
      // `[popover]:not(:popover-open)` rule, because any author rule outranks that one — and every Box
      // carries `display: block`, so without this a closed panel stays laid out over the page. Measured:
      // it is the one thing the test environment cannot see, since it has no UA popover styles either.
      topLayer: {
        transitionBehavior: 'allow-discrete',
        not: { open: { opacity: 0, translateY: -1, display: 'none' } },
      },
    },
  },
  // The `role="menu"` panel and everything in it. Same UA `[popover]` look underneath as the popover
  // panel, so the border, the padding and the system colours are all declared here.
  menu: {
    styles: {
      display: 'flex',
      d: 'column',
      minWidth: 44,
      width: 'fit-content',
      maxHeight: 80,
      p: 1,
      b: 1,
      borderRadius: 2,
      bgColor: 'white',
      color: 'gray-900',
      borderColor: 'gray-300',
      shadow: 'medium',
      overflow: 'auto',
      theme: {
        dark: { bgColor: 'gray-800', borderColor: 'gray-700', color: 'gray-100' },
      },
      // Opening is the panel's first style resolution — `display: none` to shown on the platform path,
      // and mounting on the other — which is the moment `@starting-style` names.
      startingStyle: { opacity: 0, translateY: -1 },
    },
    variants: {
      // The exit, on the top-layer path only, where the panel is hidden rather than unmounted: losing
      // `:popover-open` *is* the exit, and `allow-discrete` holds `display` back until it has run.
      // `display: none` is declared rather than left to the UA's `[popover]:not(:popover-open)` rule,
      // because any author rule outranks that one — and every Box carries `display: block`, so without
      // it a closed menu stays laid out over the page. The same pair `popover` carries, for the same
      // measured reason.
      topLayer: {
        transitionBehavior: 'allow-discrete',
        not: { open: { opacity: 0, translateY: -1, display: 'none' } },
      },
    },
    children: {
      // One `role="menuitem"`, and the two that carry a state. The highlight is drawn on `:focus`
      // because in a menu focus *is* the highlight — the pointer moves it, so hover and the keyboard
      // cannot disagree — with `hover` beside it for the frame before focus lands.
      item: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          width: 'fit',
          px: 2,
          py: 1.5,
          borderRadius: 1,
          fontSize: 14,
          lineHeight: 20,
          textAlign: 'start',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          transition: 'none',
          hover: { bgColor: 'gray-100' },
          focus: { bgColor: 'gray-100', outline: 0 },
          // A disabled item is `aria-disabled` rather than `disabled`, because APG asks that it stay
          // focusable — so the attribute is what styles it.
          ariaAttr: {
            disabled: { color: 'gray-400', cursor: 'default', hover: { bgColor: 'transparent' }, focus: { bgColor: 'transparent' } },
          },
          // A forced-colors mode throws every background away, and the highlight is a background: these
          // two are the only pair those modes keep, so without them focus reads identically on and off.
          forcedColors: { focus: { bgColor: 'Highlight', color: 'HighlightText' } },
          theme: {
            dark: {
              hover: { bgColor: 'gray-700' },
              focus: { bgColor: 'gray-700' },
              ariaAttr: {
                disabled: { color: 'gray-500', hover: { bgColor: 'transparent' }, focus: { bgColor: 'transparent' } },
              },
            },
          },
        },
        variants: {
          // An item that opens a submenu: its arrow sits at the far end, whichever end that is.
          sub: { jc: 'space-between' },
        },
      },
      // The fixed slot a tick or a dot goes in, so the text of every item in a menu lines up whether or
      // not that item carries a state.
      indicator: {
        styles: { display: 'flex', ai: 'center', jc: 'center', width: 4, height: 4, ms: -0.5 },
      },
      // A tick, drawn with two borders rather than an asset: the library ships no icons, and a check
      // mark is two lines. Physical sides on purpose — a tick is not mirrored in a right-to-left menu.
      check: {
        styles: { width: 2.5, height: 1.25, bl: 2, bb: 2, borderColor: 'currentColor', borderRadius: 0.25, rotate: -45, mb: 0.5 },
      },
      // The radio group's dot. A radius at least half the box is how a circle is written here.
      dot: {
        styles: { width: 1.5, height: 1.5, borderRadius: 1.5, bgColor: 'currentColor' },
      },
      // The chevron on an item that opens a submenu, drawn the way the tick is. It points the way the
      // submenu comes out, so in a right-to-left menu it points the other way — one `:dir(rtl)` rule.
      arrow: {
        styles: {
          width: 1.5,
          height: 1.5,
          bt: 1.5,
          br: 1.5,
          borderColor: 'currentColor',
          rotate: 45,
          ms: 2,
          opacity: 0.6,
          rtl: { rotate: -135 },
        },
      },
      group: {
        styles: { display: 'flex', d: 'column' },
      },
      // A group's heading. `role="presentation"`, since a menu owns items, groups and separators and
      // nothing else — what makes it a name at all is the group's `aria-labelledby`.
      label: {
        styles: {
          px: 2,
          py: 1,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 16,
          color: 'gray-500',
          theme: { dark: { color: 'gray-400' } },
        },
      },
      separator: {
        styles: {
          my: 1,
          bt: 1,
          borderColor: 'gray-200',
          theme: { dark: { borderColor: 'gray-700' } },
        },
      },
    },
  },
  // The tabs widget: the wrapper, the `role="tablist"`, one tab and one panel. Underlined tabs rather
  // than a segmented control, because the underline is the one indicator that survives a forced-colors
  // mode — a background would be thrown away and selection would read identically on and off.
  tabs: {
    styles: { display: 'flex', d: 'column', gap: 4 },
    variants: {
      // A vertical list sits beside its panels instead of over them, so the axis of the whole widget turns.
      vertical: { d: 'row', gap: 6, ai: 'start' },
    },
    children: {
      list: {
        styles: {
          display: 'flex',
          d: 'row',
          gap: 1,
          ai: 'center',
          bb: 1,
          borderColor: 'gray-200',
          // Deliberately **not** a scroll container. The selected tab's indicator overhangs this rule by
          // 1px to sit on it, and naming one axis is enough to lose that: `overflow` computes a `visible`
          // companion to an `auto` up to `auto`, so `overflowX: 'auto'` alone turned the 1px into a 15px
          // *vertical* scrollbar on every horizontal tablist. Scrolling a list that outgrows its
          // container is the consumer's to solve; doing it here costs the overlap.
          theme: { dark: { borderColor: 'gray-700' } },
        },
        variants: {
          // The rule moves to the inline end, which mirrors in a right-to-left page where `br` would not.
          vertical: { d: 'column', ai: 'stretch', gap: 0.5, bb: 0, be: 1 },
          // The travelling indicator is positioned against the list, and only this variant has one: a
          // consumer's own absolutely positioned child inside a tab would otherwise start resolving
          // against the list instead of whatever it was written under.
          sliding: { position: 'relative' },
        },
      },
      tab: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          px: 3,
          py: 2,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: 500,
          color: 'gray-600',
          bgColor: 'transparent',
          b: 0,
          // The border the indicator is drawn on, pulled over the list's own 1px rule so the two read as
          // one line. Carried by every tab whichever indicator is in use, so the two measure the same. The
          // margin is on the ÷4 scale — `-1` would be 4px and leave a gap only a browser shows.
          bb: 2,
          borderColor: 'transparent',
          mb: -0.25,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          transition: 'colors',
          hover: { color: 'gray-900' },
          selected: { color: 'indigo-600' },
          disabled: { color: 'gray-400', cursor: 'default', hover: { color: 'gray-400' } },
          // Inside the underline rather than around it: a ring drawn outside would sit under the
          // neighbouring tab, since the list scrolls and clips.
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: -2, borderRadius: 1 },
          // Every colour is gone in a forced-colors mode, so the selected tab has to be told apart with
          // one of the pair those modes keep — otherwise it reads exactly like the rest.
          forcedColors: { selected: { color: 'Highlight' } },
          theme: {
            dark: {
              color: 'gray-400',
              hover: { color: 'gray-100' },
              selected: { color: 'indigo-400' },
              disabled: { color: 'gray-600', hover: { color: 'gray-600' } },
            },
          },
        },
        variants: {
          // In a vertical list the indicator turns with it, onto the inline end the list's rule is on.
          vertical: { textAlign: 'start', bb: 0, be: 2, mb: 0, me: -0.25 },
          // The tab colours its own border in. Declared here rather than in `selected` because the
          // travelling indicator turns it off, and a colour declared once is better than three undone.
          underline: {
            selected: { borderColor: 'indigo-500' },
            forcedColors: { selected: { borderColor: 'Highlight' } },
            theme: { dark: { selected: { borderColor: 'indigo-400' } } },
          },
        },
      },
      // The one indicator for the whole list, travelling between tabs instead of being drawn by each.
      // Nothing declares a transition: the base class already transitions every property on
      // `--transitionTime`, which is also what stops the travel under `prefers-reduced-motion`.
      indicator: {
        styles: {
          position: 'absolute',
          // Exactly where the tab's own border sits: over the list's 1px rule, matching the tab's `mb`.
          // Physical, because the block axis does not mirror — `be` would be wrong here and right below.
          bottom: -0.25,
          height: 0.5,
          bgColor: 'indigo-500',
          forcedColors: { bgColor: 'Highlight' },
          theme: { dark: { bgColor: 'indigo-400' } },
        },
        variants: {
          // The bar turns with the list: along the block axis, on the inline end. `bottom` goes back to
          // `auto` because the instance sets `top` and `height`, and all three would over-constrain it.
          vertical: { bottom: 'auto', insetEnd: -0.25, height: 'auto', width: 0.5 },
        },
      },
      // The optional container that takes the height of the panel on screen, so a switch between panels
      // of different heights is a transition rather than a jump.
      panels: {
        styles: {
          width: 'fit',
          // A flex container so the formatting context never changes: without one, the clip below would
          // stop a consumer's margin collapsing out of the panel halfway through every transition.
          display: 'flex',
          d: 'column',
          // Narrowed from the base class's `all`, which would animate a consumer's own padding with it.
          transition: 'size',
        },
        variants: {
          // Only while the height is actually travelling. A permanent clip would cut the focus ring off
          // every element sitting at a panel's edge, since at rest the container is exactly that tall.
          resizing: { overflow: 'hidden' },
        },
      },
      panel: {
        styles: {
          width: 'fit',
          fontSize: 14,
          lineHeight: 20,
          // The panel is a tab stop of its own (APG), and a container is not what a focus ring is for.
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: 2, borderRadius: 1 },
          startingStyle: { opacity: 0, translateY: 1 },
        },
        variants: {
          // A panel kept mounted while another is selected. Declared rather than left to the UA's
          // `[hidden]` rule, because every Box carries `display: block` and any author rule outranks it.
          hidden: { display: 'none' },
        },
      },
    },
  },
  // A disclosure, and a set of them. The height animation is a *class* rather than a measurement: the
  // panel sits in a one-row grid whose track runs `1fr` to `0fr`, so nothing is observed, nothing is
  // written per instance, and a hundred items share one rule where a measured height would be a hundred.
  // `visibility` is what takes the closed content out of the tab order and the accessibility tree — and
  // unlike `display`, it has a before-change style, so the exit needs no `allow-discrete`, the entrance
  // needs no `@starting-style`, and a server-rendered open panel does not animate itself open on load.
  accordion: {
    styles: { display: 'flex', d: 'column' },
    children: {
      item: {
        styles: {
          bb: 1,
          borderColor: 'gray-200',
          theme: { dark: { borderColor: 'gray-700' } },
        },
      },
      // The heading APG asks the button be wrapped in. It carries no look of its own: the level says
      // where the section sits in the document outline, and must not also decide how the header reads.
      heading: {
        styles: { display: 'flex' },
      },
      trigger: {
        styles: {
          display: 'flex',
          ai: 'center',
          jc: 'space-between',
          gap: 2,
          // The whole row, so the pointer target is the header rather than the words in it.
          width: 'fit',
          py: 3,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: 500,
          textAlign: 'start',
          color: 'gray-900',
          bgColor: 'transparent',
          b: 0,
          cursor: 'pointer',
          transition: 'colors',
          hover: { color: 'indigo-600' },
          // The open state is the button's own `aria-expanded`, so it needs no variant: the attribute
          // the pattern already has to write is the selector.
          ariaAttr: { expanded: { color: 'indigo-600' } },
          disabled: { color: 'gray-400', cursor: 'default', hover: { color: 'gray-400' } },
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: -2, borderRadius: 1 },
          forcedColors: { ariaAttr: { expanded: { color: 'Highlight' } } },
          theme: {
            dark: {
              color: 'gray-100',
              hover: { color: 'indigo-400' },
              ariaAttr: { expanded: { color: 'indigo-400' } },
              disabled: { color: 'gray-600', hover: { color: 'gray-600' } },
            },
          },
        },
      },
      // The chevron, drawn with two borders the way the menu's arrow and its tick are — the library
      // ships no icons. Pointing down closed and up open, and the turn animates on `._b`'s own
      // transition. Physical sides on purpose: an accordion opens downwards in every reading order.
      arrow: {
        styles: { width: 1.5, height: 1.5, bt: 1.5, br: 1.5, borderColor: 'currentColor', rotate: 135, opacity: 0.6, flexShrink: 0 },
        variants: {
          open: { rotate: -45 },
        },
      },
      // The mechanism, in two elements the component keeps for itself. A grid of one row, so the
      // panel's own height is what `1fr` resolves to and no number is ever written down.
      track: {
        styles: {
          display: 'grid',
          // The registry has no fraction value for a track list, and this is the one place that wants
          // one — `css` is where a property with no prop goes, and it still compiles to a shared class.
          css: { gridTemplateRows: '1fr' },
        },
        variants: {
          // `visibility` rather than `display`: it is animatable, flipping to hidden only once the
          // track has finished closing and back to visible the instant it opens, which is exactly the
          // two moments the content may not be reachable.
          closed: { css: { gridTemplateRows: '0fr' }, visibility: 'hidden' },
        },
      },
      // Why the panel is not itself the grid item: **padding cannot be squeezed**, so an item carrying
      // any floors the `0fr` track at exactly that much. Measured in Chrome 152 — the panel's own
      // `8px + 16px` left every closed section a permanent 24px stub, and stopped the height moving at
      // 45% of the transition while the text stayed painted until `visibility` flipped at 100%, which
      // is the "content is still visible" of bug #142. This element carries nothing that has a size.
      clip: {
        styles: { minHeight: 0, overflow: 'hidden' },
      },
      panel: {
        styles: {
          // Room above for a focus ring on a control at the very top of the panel: the clip above it is
          // permanent, and a ring is drawn outside the box it belongs to. Padding is safe here and
          // nowhere above: this element is inside the clip rather than being the grid item.
          pt: 2,
          pb: 4,
          fontSize: 14,
          lineHeight: 20,
          color: 'gray-700',
          theme: { dark: { color: 'gray-300' } },
        },
      },
    },
  },
  // One disclosure on its own: the same mechanism with no heading, no group and no keyboard, since a
  // lone button needs none. The two trees are separate but their rules are not — identical values share
  // one class, so the second component's mechanism costs nothing.
  collapsible: {
    styles: { display: 'flex', d: 'column', gap: 2 },
    children: {
      track: {
        styles: { display: 'grid', css: { gridTemplateRows: '1fr' } },
        variants: {
          closed: { css: { gridTemplateRows: '0fr' }, visibility: 'hidden' },
        },
      },
      clip: {
        styles: { minHeight: 0, overflow: 'hidden' },
      },
      panel: {
        styles: { fontSize: 14, lineHeight: 20 },
      },
    },
  },
  // Everything a slider paints is a shared class; where its thumbs *are* is the one thing that is not,
  // and that lives in an inline style. The geometry is logical throughout (`insetStart`, `ms`), so a
  // right-to-left page draws the minimum on the right with nothing declared twice.
  slider: {
    styles: {
      position: 'relative',
      display: 'flex',
      ai: 'center',
      width: 'fit',
      // Taller than the track, so the thumb has somewhere to be and the press target is a finger's worth.
      height: 5,
      cursor: 'pointer',
      // A drag on a touch screen must not also scroll the page. No prop for it, and one element wants it.
      css: { touchAction: 'none' },
      // A drag that highlights the label beside it reads as broken; the press is cancelled too, and this
      // covers the pointer that arrives already down.
      userSelect: 'none',
    },
    variants: {
      vertical: { d: 'column', jc: 'flex-end', width: 5, height: 40 },
      disabled: { cursor: 'default', opacity: 0.5 },
    },
    children: {
      track: {
        styles: {
          position: 'relative',
          width: 'fit',
          height: 1.5,
          borderRadius: 1,
          bgColor: 'gray-200',
          // The fill's own corners are square, so the track is what rounds both ends of it.
          overflow: 'hidden',
          theme: { dark: { bgColor: 'gray-700' } },
        },
        variants: {
          vertical: { width: 1.5, height: 'fit' },
        },
      },
      fill: {
        styles: {
          position: 'absolute',
          insetY: 0,
          bgColor: 'indigo-500',
          theme: { dark: { bgColor: 'indigo-400' } },
        },
        variants: {
          // A vertical slider fills from the bottom, so the axis the inline style writes swaps with it.
          vertical: { insetY: 'auto', insetX: 0 },
          // Short while the value is being moved: off is exact and *steps* (3.2px at a time on a
          // 1-in-100 slider). Eased *out* rather than linear or eased — a restarted transition only ever
          // shows its first half, which on this curve is the straight part, so it glides while held and
          // still decelerates on the one transition that finishes. Linear rode 1.4 steps behind the
          // value and stopped dead; this is 0.9 and lands at 0.6 of cruising speed (#146).
          tracking: { transitionDuration: 60, transitionTimingFunction: 'ease-out', motionReduce: { transition: 'none' } },
        },
      },
      thumb: {
        styles: {
          position: 'absolute',
          width: 4,
          height: 4,
          // Half its own width back along the axis, so the thumb is centred on its value rather than
          // starting at it. Logical, so it mirrors with the inset the inline style writes.
          ms: -2,
          borderRadius: 4,
          bgColor: 'white',
          b: 2,
          borderColor: 'indigo-500',
          shadow: 'xs',
          hover: { borderColor: 'indigo-600' },
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: 2 },
          theme: { dark: { bgColor: 'gray-900', borderColor: 'indigo-400', hover: { borderColor: 'indigo-300' } } },
          // A thumb whose only signal is its fill disappears in a forced-colors mode.
          forcedColors: { bgColor: 'ButtonFace', borderColor: 'ButtonText' },
        },
        variants: {
          vertical: { ms: 0, mb: -2 },
          disabled: { cursor: 'default', borderColor: 'gray-400', hover: { borderColor: 'gray-400' } },
          // The same on the thumb, and both parts must carry it or they come apart (#144). A named
          // duration is outside the reduced-motion default, which only zeroes `--transitionTime`.
          tracking: { transitionDuration: 60, transitionTimingFunction: 'ease-out', motionReduce: { transition: 'none' } },
        },
      },
    },
  },
  // The bar itself is the track — there is nothing to put between them — so the component is two
  // elements and the outer one carries `role="progressbar"`.
  progress: {
    styles: {
      position: 'relative',
      width: 'fit',
      height: 2,
      borderRadius: 1,
      bgColor: 'gray-200',
      overflow: 'hidden',
      theme: { dark: { bgColor: 'gray-700' } },
    },
    children: {
      fill: {
        styles: {
          position: 'absolute',
          insetY: 0,
          insetStart: 0,
          bgColor: 'indigo-500',
          // The width is the value, so it is the one thing here that moves.
          transition: 'size',
          theme: { dark: { bgColor: 'indigo-400' } },
          forcedColors: { bgColor: 'Highlight' },
        },
        variants: {
          // Nothing to fill: a bar that crosses the track and starts over. Its duration is named in
          // milliseconds, so it sits outside the `--transitionTime` the reduced-motion default zeroes
          // and has to stop itself.
          indeterminate: {
            width: '2/5',
            animationName: 'rb-progress-sweep',
            animationDuration: 1100,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            transition: 'none',
            rtl: { animationDirection: 'reverse' },
            motionReduce: { animationName: 'none', width: 'fit', opacity: 0.5 },
          },
        },
      },
    },
  },
  // The viewport: a region pinned to one corner, in the top layer, holding whatever is on screen. It
  // paints nothing itself — `pointerEvents: none` is what lets a press in the gaps between toasts reach
  // the page underneath, which a fixed strip across a corner would otherwise swallow (measured).
  toaster: {
    styles: {
      position: 'fixed',
      display: 'flex',
      d: 'column',
      gap: 3,
      maxWidth: 'fit-screen',
      pointerEvents: 'none',
      // The UA `[popover]` look, which is a bordered box pinned to all four edges: every part of it has
      // to go, and the two that are not obviously decoration are the ones that bit. `inset: 0` leaves a
      // corner-pinned stack over-constrained — `top` and `left` win over the two sides a variant sets,
      // so it sat in the top-left corner — and `overflow: auto` makes the viewport a scroll container,
      // which clips the toasts' own shadows. Both measured in Chrome 153.
      m: 0,
      p: 0,
      b: 0,
      bgColor: 'transparent',
      overflow: 'visible',
      top: 'auto',
      bottom: 'auto',
      insetStart: 'auto',
      insetEnd: 'auto',
      // Only the fallback path reads this. In the top layer nothing can be above it.
      zIndex: 1000,
    },
    variants: {
      // Pinned by the inline *sides*, so `start` is the left of a left-to-right page and the right of a
      // right-to-left one with nothing declared twice. Longhands throughout rather than `insetX`: a
      // variant *merges* into the styles above, so it has to replace the `auto` it is overriding, and a
      // shorthand would sort ahead of the longhand it left behind instead.
      topStart: { top: 4, insetStart: 4 },
      topEnd: { top: 4, insetEnd: 4 },
      topCenter: { top: 4, insetStart: 4, insetEnd: 4, ai: 'center' },
      bottomStart: { bottom: 4, insetStart: 4 },
      bottomEnd: { bottom: 4, insetEnd: 4 },
      bottomCenter: { bottom: 4, insetStart: 4, insetEnd: 4, ai: 'center' },
    },
    children: {
      toast: {
        styles: {
          // The viewport passes presses through; a toast is the thing that has to catch them.
          pointerEvents: 'auto',
          position: 'relative',
          display: 'flex',
          d: 'column',
          gap: 1,
          width: 88,
          maxWidth: 'fit',
          py: 3,
          ps: 4,
          // Room for the close button, which is absolutely positioned so the text wraps under nothing.
          pe: 9,
          b: 1,
          borderRadius: 2,
          overflow: 'hidden',
          bgColor: 'white',
          borderColor: 'gray-300',
          color: 'gray-900',
          shadow: 'medium',
          fontSize: 14,
          lineHeight: 20,
          theme: { dark: { bgColor: 'gray-800', borderColor: 'gray-700', color: 'gray-100' } },
          // The accent, drawn as a bar rather than a border because only `borderColor` exists and it
          // takes all four sides. Transparent until a kind names a colour, so the geometry is declared
          // once; `before` carries its own `content: ''`.
          before: { position: 'absolute', insetStart: 0, insetY: 0, width: 1, bgColor: 'transparent' },
          // It mounts, so the entrance is a first style resolution and costs no JavaScript. The exit is
          // `<Presence>`, which holds the node while `data-state="closed"` runs on `._b`'s transition.
          startingStyle: { opacity: 0, translateY: 3, scale: 0.96 },
          dataAttr: { 'state=closed': { opacity: 0, scale: 0.96, pointerEvents: 'none' } },
        },
        variants: {
          // A stack pinned to the top of the viewport comes *down* into place and leaves the same way.
          fromTop: { startingStyle: { translateY: -3 } },
          success: { before: { bgColor: 'emerald-500' } },
          error: { before: { bgColor: 'red-500' } },
          warning: { before: { bgColor: 'amber-500' } },
          info: { before: { bgColor: 'sky-500' } },
          loading: { before: { bgColor: 'gray-400' } },
        },
      },
      message: {
        styles: { fontWeight: 500, color: 'gray-900', theme: { dark: { color: 'gray-100' } } },
      },
      description: {
        styles: { fontSize: 13, lineHeight: 18, color: 'gray-600', theme: { dark: { color: 'gray-400' } } },
      },
      action: {
        styles: {
          alignSelf: 'start',
          mt: 1,
          py: 1,
          px: 2,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: 500,
          borderRadius: 1,
          b: 1,
          borderColor: 'gray-300',
          bgColor: 'transparent',
          color: 'gray-900',
          cursor: 'pointer',
          transition: 'colors',
          hover: { bgColor: 'gray-100' },
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: 1 },
          theme: {
            dark: { borderColor: 'gray-600', color: 'gray-100', hover: { bgColor: 'gray-700' } },
          },
        },
      },
      // The cross, two rotated rules rather than an icon — the library ships none, and `before` and
      // `after` are one element each, which is exactly two.
      close: {
        styles: {
          position: 'absolute',
          top: 2,
          insetEnd: 2,
          width: 6,
          height: 6,
          display: 'flex',
          ai: 'center',
          jc: 'center',
          borderRadius: 1,
          b: 0,
          bgColor: 'transparent',
          color: 'gray-500',
          cursor: 'pointer',
          transition: 'colors',
          hover: { color: 'gray-900', bgColor: 'gray-100' },
          focusVisible: { outline: 2, outlineColor: 'indigo-500', outlineOffset: -2 },
          // `borderStyle` on both, and it is the trap: a pseudo-element carries none of `._b`, whose
          // `border: 0 solid` is what every other border in this file is leaning on — so a width with
          // no style computes to `0px none` and the cross is invisible (measured in Chrome 153).
          before: { position: 'absolute', width: 2.5, height: 0, bt: 1, borderStyle: 'solid', borderColor: 'currentColor', rotate: 45 },
          after: { position: 'absolute', width: 2.5, height: 0, bt: 1, borderStyle: 'solid', borderColor: 'currentColor', rotate: -45 },
          theme: {
            dark: { color: 'gray-400', hover: { color: 'gray-100', bgColor: 'gray-700' } },
          },
        },
      },
      // What the limit is holding back. It sits at the end of the stack furthest from the screen edge,
      // where the pile would be, and says how many messages are still waiting rather than hiding them.
      overflow: {
        styles: {
          pointerEvents: 'auto',
          alignSelf: 'center',
          py: 1,
          px: 2,
          borderRadius: 4,
          fontSize: 12,
          lineHeight: 16,
          fontWeight: 500,
          bgColor: 'gray-900/80',
          color: 'gray-50',
          startingStyle: { opacity: 0 },
          theme: { dark: { bgColor: 'gray-100/80', color: 'gray-900' } },
          forcedColors: { b: 1 },
        },
      },
    },
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
  // The wrapper a set of radios shares, and the label over it. The direction is a variant rather than
  // a prop the component computes, so `Box.components()` can restyle both orientations at once.
  radioGroup: {
    styles: { d: 'column', gap: 2 },
    variants: {
      horizontal: { d: 'row' },
    },
    children: {
      // The same label as a `Combobox`'s, which is the one a form control in this library wears.
      label: {
        styles: {
          fontSize: 14,
          color: 'gray-700',
          theme: { dark: { color: 'gray-300' } },
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
  combobox: {
    styles: {
      display: 'flex',
      width: 'fit-content',
      minWidth: 48,
      gap: 1,
      px: 2,
      py: 1.5,
      // The whole shell is the field's hit area, which is what the pointer handler makes true.
      cursor: 'text',
      bgColor: 'white',
      color: 'gray-900',
      b: 1,
      borderColor: 'gray-300',
      borderRadius: 2,
      lineHeight: 20,
      transition: 'none',
      hover: {
        borderColor: 'gray-400',
      },
      // `focus` is `:focus-within`, so the shell lights up for the field inside it.
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'indigo-500',
        outlineColor: 'indigo-200',
      },
      // The shell is a `<div>` and takes no `disabled` of its own: the state belongs to the field in it.
      hasDisabled: {
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
          hasDisabled: {
            bgColor: 'gray-900',
            color: 'gray-500',
            borderColor: 'gray-700',
          },
        },
      },
    },
    variants: {
      compact: {
        px: 1.5,
        py: 0.5,
        fontSize: 13,
      },
    },
    children: {
      label: {
        styles: {
          fontSize: 14,
          color: 'gray-700',
          theme: {
            dark: {
              color: 'gray-300',
            },
          },
        },
      },
      field: {
        styles: {
          // A zero basis that then grows is what lets chips wrap without the field pushing them around;
          // the minimum is what stops it collapsing to nothing once they have.
          width: 0,
          flexGrow: 1,
          minWidth: 12,
          b: 0,
          p: 0,
          bgColor: 'transparent',
          color: 'currentColor',
          outline: 0,
          lineHeight: 20,
          placeholder: {
            color: 'gray-400',
          },
          disabled: {
            cursor: 'not-allowed',
          },
          theme: {
            dark: {
              placeholder: {
                color: 'gray-500',
              },
            },
          },
        },
      },
      chip: {
        styles: {
          display: 'flex',
          gap: 1,
          ps: 2,
          pe: 1,
          py: 0.5,
          fontSize: 13,
          lineHeight: 18,
          borderRadius: 1,
          bgColor: 'gray-100',
          color: 'gray-800',
          whiteSpace: 'nowrap',
          theme: {
            dark: {
              bgColor: 'gray-700',
              color: 'gray-100',
            },
          },
        },
      },
      remove: {
        styles: {
          display: 'flex',
          width: 4,
          height: 4,
          b: 0,
          p: 0,
          borderRadius: 1,
          bgColor: 'transparent',
          color: 'gray-500',
          cursor: 'pointer',
          hover: {
            bgColor: 'gray-300',
            color: 'gray-900',
          },
          theme: {
            dark: {
              color: 'gray-400',
              hover: {
                bgColor: 'gray-600',
                color: 'white',
              },
            },
          },
        },
      },
      icon: {
        styles: {
          display: 'flex',
          ai: 'center',
          color: 'gray-500',
          theme: {
            dark: {
              color: 'gray-400',
            },
          },
        },
      },
      items: {
        styles: {
          display: 'flex',
          d: 'column',
          gap: 1,
          p: 1,
          b: 1,
          borderRadius: 2,
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
          // Mounted when it opens, so `@starting-style` is the whole entrance — no state and no effect.
          startingStyle: { opacity: 0, translateY: -1 },
        },
        // A popup collapses back into the field it came out of, so the 4px the exit covers changes sign
        // with the direction it opened in. The exit runs long after the flip is settled, which is why it
        // can be sure of the side and the entrance cannot.
        variants: {
          closed: { opacity: 0, translateY: -1, pointerEvents: 'none' },
          closedUp: { opacity: 0, translateY: 1, pointerEvents: 'none' },
        },
      },
      // The part that is not yours: what a windowed listbox renders its rows into. Its height is the
      // whole list's and its top padding is where the slice starts, both written as inline styles
      // because they change with the scroll — a class per pixel is a rule per frame that is never freed.
      window: {
        styles: {
          display: 'flex',
          d: 'column',
          gap: 1,
          // A flex item with a declared height still shrinks, and the padding sits inside it, not on top.
          flexShrink: 0,
          boxSizing: 'border-box',
          // Both numbers change on every scroll event, and every Box otherwise carries a 250ms `all`
          // transition — which animates the slice towards where it belongs and leaves it behind the
          // scroll the whole way there. Measured in Chrome: 165px of an asked-for 3456.
          transition: 'none',
        },
      },
      item: {
        styles: {
          display: 'flex',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          borderRadius: 1,
          lineHeight: 20,
          hover: {
            bgColor: 'gray-100',
          },
          selected: {
            bgColor: 'indigo-50',
          },
          ariaAttr: {
            disabled: {
              cursor: 'not-allowed',
              color: 'gray-400',
              hover: {
                bgColor: 'transparent',
              },
            },
          },
          theme: {
            dark: {
              hover: {
                bgColor: 'gray-700',
              },
              selected: {
                bgColor: 'indigo-900',
              },
              ariaAttr: {
                disabled: {
                  color: 'gray-500',
                },
              },
            },
          },
        },
        variants: {
          // Where the keyboard is. A listbox driven by `aria-activedescendant` holds no DOM focus
          // anywhere, so `:focus-within` never fires and the highlight has to be drawn from state. An
          // inset outline rather than a background: it reads over the selected row's own colour instead
          // of fighting it for the same declaration.
          highlighted: {
            outline: 2,
            // Without a style there is no outline at all: `outline-style` starts at `none`.
            outlineStyle: 'solid',
            outlineOffset: -2,
            outlineColor: 'indigo-500',
            theme: {
              dark: {
                outlineColor: 'indigo-400',
              },
            },
          },
          create: {
            color: 'indigo-600',
            theme: {
              dark: {
                color: 'indigo-300',
              },
            },
          },
        },
      },
      message: {
        styles: {
          px: 2,
          py: 1.5,
          color: 'gray-500',
          lineHeight: 20,
          theme: {
            dark: {
              color: 'gray-400',
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
      // A tight shadow rather than a large one: the border already separates the grid from the page, and a
      // deep drop shadow under a full-width table reads as a card floating for no reason.
      shadow: 'xs',
      // The grid's own type scale, inherited by every cell — 14px is the density a table is read at, and
      // setting it once here is what stops each part naming a size of its own.
      fontSize: 14,
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
      // What a failed block says. A sibling of the scroller rather than something inside it: measured in
      // Chrome 152, a strip inside sat at the top of the scrolled content and left the viewport with it.
      error: {
        styles: {
          gap: 3,
          ai: 'center',
          jc: 'center',
          py: 2,
          px: 4,
          bb: 1,
          fontSize: 13,
          bgColor: 'red-50',
          borderColor: 'red-200',
          color: 'red-700',
          theme: {
            dark: {
              bgColor: 'red-950',
              borderColor: 'red-900',
              color: 'red-300',
            },
          },
        },
        children: {
          message: {
            styles: {
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              textWrap: 'nowrap',
            },
          },
          retry: {
            clean: true,
            styles: {
              b: 1,
              borderColor: 'red-300',
              bgColor: 'white',
              borderRadius: 2,
              py: 1,
              px: 2.5,
              fontSize: 12,
              fontWeight: 500,
              color: 'red-700',
              cursor: 'pointer',
              textWrap: 'nowrap',
              transition: 'colors',
              transitionDuration: 150,
              hover: {
                bgColor: 'red-100',
              },
              focusVisible: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: 2,
                outlineColor: 'red-500',
              },
              theme: {
                dark: {
                  bgColor: 'red-900',
                  borderColor: 'red-800',
                  color: 'red-100',
                  hover: {
                    bgColor: 'red-800',
                  },
                },
              },
            },
          },
        },
      },
      // The bars carry the grid's own surface and are separated by a hairline rather than a fill: three
      // stacked greys (bar, header, rows) is what made the old grid read as a spreadsheet.
      topBar: {
        styles: {
          py: 3,
          px: 4,
          bb: 1,
          borderColor: 'gray-200',
          color: 'gray-900',
          gap: 3,
          ai: 'center',
          bgColor: 'white',
          theme: {
            dark: {
              bgColor: 'gray-900',
              borderColor: 'gray-800',
              color: 'gray-100',
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
          // Quiet: an export is something the page offers, not something it asks for, so the buttons
          // read as chrome until they are hovered.
          export: {
            styles: {},
            children: {
              button: {
                clean: true,
                styles: {
                  display: 'inline-flex',
                  ai: 'center',
                  gap: 1.5,
                  b: 1,
                  borderColor: 'gray-300',
                  bgColor: 'white',
                  borderRadius: 2,
                  py: 1.5,
                  px: 2.5,
                  color: 'gray-700',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textWrap: 'nowrap',
                  transition: 'colors',
                  transitionDuration: 150,
                  hover: {
                    bgColor: 'gray-50',
                    color: 'gray-900',
                  },
                  focusVisible: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: 2,
                    outlineColor: 'indigo-500',
                  },
                  theme: {
                    dark: {
                      bgColor: 'gray-800',
                      borderColor: 'gray-700',
                      color: 'gray-300',
                      hover: {
                        bgColor: 'gray-700',
                        color: 'gray-100',
                      },
                      focusVisible: {
                        outlineColor: 'indigo-400',
                      },
                    },
                  },
                },
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
              bgColor: 'white',
              bb: 1,
              borderColor: 'gray-200',
              theme: {
                dark: {
                  bgColor: 'gray-900',
                  borderColor: 'gray-800',
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
              // A label, not data: small, tracked and muted, so the eye reads down the values rather than
              // along the headings. The weight carries it at this size where the colour no longer does.
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: 'gray-500',
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
                  color: 'gray-400',
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
                  color: 'gray-900',
                },
                theme: {
                  dark: {
                    hover: {
                      // Not `gray-800`, which is the header's own background in this theme: a hover that
                      // paints the colour already there is a hover nobody can see.
                      bgColor: 'gray-700',
                      color: 'gray-100',
                    },
                  },
                },
              },
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
                  borderRadius: 1.5,
                  borderColor: 'gray-200',
                  display: 'flex',
                  jc: 'center',
                  ai: 'center',
                  transition: 'none',
                  // Quiet by default: one of these sits in every header cell. `gray-500` rather than the
                  // `gray-400` that looks right — a control owes 3:1 and `gray-400` on `gray-50` is 2.49.
                  color: 'gray-500',
                  hover: { bgColor: 'gray-200', color: 'gray-700' },
                  theme: {
                    dark: {
                      color: 'gray-400',
                      hover: { bgColor: 'gray-700', color: 'gray-200' },
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
                  // A hairline, not a rule: 2px of `gray-400` down every column boundary was what made a wide
                  // grid read as a spreadsheet. Halved rather than lightened — the colour is a control's, and
                  // `gray-400` on `gray-50` is already only 2.49:1.
                  width: 0.25,
                  height: 'fit',
                  bgColor: 'gray-400',
                  group: { 'resizer/hover': { bgColor: 'indigo-500' } },
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
                      bgColor: 'gray-600',
                      group: { 'resizer/hover': { bgColor: 'indigo-400' } },
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
              // A lighter hairline than the header's: the separator between two rows is the quietest line
              // in the grid, and at `gray-200` a screenful of them read as a spreadsheet grid.
              borderColor: 'gray-100',
              transition: 'none',
              ai: 'center',
              color: 'gray-900',
              // The one thing a data grid cannot do without and the registry has no prop for: without it a
              // column of numbers is ragged, because a proportional `1` is narrower than a `0`.
              css: { fontVariantNumeric: 'tabular-nums' },
              group: {
                'grid-row/hover': { bgColor: 'gray-50' },
                // A group row is tinted because it is a group, not because it can be opened: since #162 the
                // open state is on the expand button, and a tree row carries an `aria-expanded` of its own.
                'grid-row/data-group-row': { bgColor: 'gray-50' },
                // Selection had no appearance at all: `isRowSelected` was declared on this node and applied
                // by nothing, so a selected row was legible only by its own checkbox.
                'grid-row/aria-selected=true': { bgColor: 'indigo-50' },
              },
              // The ring says the *cell* holds focus: `:focus-within:not(:has(:focus))` is the cell itself, where
              // bare `focus` would light it up for a widget it holds — a selection checkbox, a tree chevron —
              // on top of that widget's own ring. `:focus-visible` is what it cannot be (bug #64): a pointer
              // never matches it, so a *clicked* cell drew nothing until an arrow key. Interim, until E6 owns a
              // current cell the roving state marks — which will be drawn for a widget's cell too, since the
              // tab stop does move there.
              focus: {
                not: {
                  hasFocus: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: -2,
                    outlineColor: 'indigo-500',
                  },
                },
              },
              theme: {
                dark: {
                  borderColor: 'gray-800',
                  color: 'gray-100',
                  group: {
                    'grid-row/hover': { bgColor: 'gray-800' },
                    'grid-row/data-group-row': { bgColor: 'gray-800' },
                    'grid-row/aria-selected=true': { bgColor: 'indigo-950' },
                  },
                  focus: {
                    not: { hasFocus: { outlineColor: 'indigo-400' } },
                  },
                },
              },
            },
            variants: {
              // A pinned cell paints its own background or the rows would show through it, so it has to
              // carry the row states too — otherwise hovering or selecting a row skipped its pinned columns.
              isPinned: {
                position: 'sticky',
                bgColor: 'white',
                zIndex: 1,
                group: {
                  'grid-row/hover': { bgColor: 'gray-50' },
                  'grid-row/data-group-row': { bgColor: 'gray-50' },
                  'grid-row/aria-selected=true': { bgColor: 'indigo-50' },
                },
                theme: {
                  dark: {
                    bgColor: 'gray-900',
                    group: {
                      'grid-row/hover': { bgColor: 'gray-800' },
                      'grid-row/data-group-row': { bgColor: 'gray-800' },
                      'grid-row/aria-selected=true': { bgColor: 'indigo-950' },
                    },
                  },
                },
              },
              isFirstStartPinned: {},
              // The pinned edge is a shadow rather than a border, so the frozen columns read as sitting
              // *over* the scrolled ones. `css` because `shadow` composes into one custom-property stack and
              // this is a single directional value no scale has; nothing else on this cell paints a shadow.
              isLastStartPinned: {
                css: { boxShadow: '4px 0 6px -4px rgb(15 23 42 / 0.15)' },
                theme: {
                  dark: { css: { boxShadow: '4px 0 6px -4px rgb(0 0 0 / 0.5)' } },
                },
              },
              isFirstEndPinned: {
                css: { boxShadow: '-4px 0 6px -4px rgb(15 23 42 / 0.15)' },
                theme: {
                  dark: { css: { boxShadow: '-4px 0 6px -4px rgb(0 0 0 / 0.5)' } },
                },
              },
              isLastEndPinned: {},
              // The cell being edited. It stops clipping — a control as tall as the row is cut at both
              // ends by the cell's own `overflow` — and paints its own surface, since a pinned neighbour
              // would otherwise show through an editor that has no background of its own.
              isEditing: {
                overflow: 'visible',
                zIndex: 2,
                bgColor: 'white',
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'indigo-500',
                theme: {
                  dark: {
                    bgColor: 'gray-900',
                    outlineColor: 'indigo-400',
                  },
                },
              },
              // A refused value, on the cell rather than on the editor inside it: two rings on the same
              // rectangle means the editing one paints over this one and a refusal reads as an ordinary
              // edit (measured in Chrome 152). Declared after `isEditing`, so it wins the outline.
              isInvalid: {
                outlineColor: 'red-500',
                theme: { dark: { outlineColor: 'red-400' } },
              },
              // Muted, but only as far as contrast allows: `gray-400` on white measures 2.60:1 and `gray-500`
              // on `gray-900` 3.67:1, so the quiet-looking pair is the one that fails both ways round.
              isRowNumber: { jc: 'end', color: 'gray-500', theme: { dark: { color: 'gray-400' } } },
              isRowSelection: {},
              isFirstLeaf: {},
              isLastLeaf: {},
              isEmptyCell: {},
              isRowDetail: {},
              // An expanded row and the drawer under it are one block: the row takes the drawer's surface and
              // gives up the hairline between them, so the panel reads as hanging off the row rather than as
              // the row after it. Neutral rather than tinted, so it stays legible beside a *selected* row.
              isExpanded: {
                bgColor: 'gray-50',
                bb: 0,
                // The row keeps its hover, one step off the surface it now has: the grid's own row hover is
                // the colour this row is already painted, so an expanded row would have stopped answering.
                group: { 'grid-row/hover': { bgColor: 'gray-100' } },
                theme: {
                  dark: {
                    // Darker than the grid, not lighter: a well is what a drawer should read as, and
                    // `gray-800` reads as raised against a `gray-900` grid.
                    bgColor: 'gray-950',
                    group: { 'grid-row/hover': { bgColor: 'gray-900' } },
                  },
                },
              },
              // The accent runs down the inline start of the row and on down the drawer — the only thing
              // tying a panel this tall back to the row that opened it. Logical, so it mirrors with the text.
              isExpandedFirstLeaf: {
                bs: 2,
                borderColor: 'indigo-500',
                theme: {
                  dark: {
                    borderColor: 'indigo-400',
                  },
                },
              },
              isExpandedLastLeaf: {},
            },
            children: {
              text: {
                styles: {},
              },
              // The open editor. It fills the cell rather than sitting in it, so the value stays exactly
              // where it was drawn and nothing shifts on the way in — the one thing that makes an inline
              // edit read as the cell rather than as a box over it.
              editor: {
                styles: {
                  px: 2,
                  gap: 1,
                },
                variants: {
                  // Being judged by an async validator. Quiet on purpose: a spinner in a cell the size of
                  // a word is noise, and the value is still there to read.
                  isPending: { opacity: 0.6 },
                },
              },
              // What a refused value says, in the top layer — a bubble inside the scroller would be
              // clipped away on the last row, which is the row a long grid is most often edited on.
              error: {
                styles: {
                  bgColor: 'red-600',
                  color: 'white',
                  fontSize: 12,
                  py: 1,
                  px: 2,
                  borderRadius: 1,
                  shadow: 'sm',
                  maxWidth: 64,
                  theme: {
                    dark: {
                      bgColor: 'red-500',
                      color: 'gray-950',
                    },
                  },
                },
              },
              // A cell whose block has not arrived. The bar carries the pulse rather than the row, which
              // is `display: contents` and animates nothing; `pulse` is a named preset, so it stops
              // itself under `prefers-reduced-motion` with nothing declared here.
              placeholder: {
                styles: {
                  height: 'fit',
                  width: 'fit',
                },
                children: {
                  bar: {
                    styles: {
                      height: 2,
                      borderRadius: 1,
                      bgColor: 'gray-200',
                      animation: 'pulse',
                      theme: {
                        dark: {
                          bgColor: 'gray-800',
                        },
                      },
                    },
                  },
                },
              },
              // The tree column's cell: the indent, the chevron and the value it belongs to. The whole
              // cell rather than the chevron alone, so a `Cell` renderer of the caller's own indents too.
              tree: {
                styles: {
                  gap: 1,
                  // Every level pushes the value along, so the cell has to be allowed to overflow its
                  // column rather than push the column wider than its neighbours.
                  minWidth: 0,
                },
                children: {
                  toggle: {
                    clean: true,
                    styles: {
                      width: 5,
                      height: 5,
                      flexShrink: 0,
                      borderRadius: 1,
                      color: 'gray-500',
                      hover: { color: 'gray-900', bgColor: 'gray-100' },
                      theme: {
                        dark: {
                          color: 'gray-400',
                          hover: { color: 'gray-100', bgColor: 'gray-800' },
                        },
                      },
                    },
                    variants: {
                      // Open: the chevron takes the accent everything else in the grid opens in.
                      isExpanded: {
                        color: 'indigo-600',
                        theme: { dark: { color: 'indigo-400' } },
                      },
                    },
                  },
                  // What a leaf puts where its chevron would be: the values line up in a column either way.
                  spacer: {
                    styles: {
                      width: 5,
                      flexShrink: 0,
                    },
                  },
                },
              },
              // The expand chevron. A control rather than data, so it is quieter than the row it sits in —
              // and only as quiet as a control's 3:1 allows.
              rowDetail: {
                clean: true,
                styles: {
                  color: 'gray-500',
                  hover: { color: 'gray-900' },
                  theme: {
                    dark: {
                      color: 'gray-400',
                      hover: { color: 'gray-100' },
                    },
                  },
                },
                variants: {
                  // Open: the chevron takes the accent the row's own bar is drawn in.
                  isExpanded: {
                    color: 'indigo-600',
                    theme: { dark: { color: 'indigo-400' } },
                  },
                },
              },
            },
          },
          // The drawer. It shares the expanded row's surface so the two read as one block, and closes on a
          // heavier hairline than a row separator — a rule that says the block ends here rather than that
          // another row follows.
          detailRow: {
            styles: {
              bb: 1,
              borderColor: 'gray-200',
              bgColor: 'gray-50',
              // What a panel opening below the fold scrolls to. `nearest` aligns the panel's own top
              // when it is taller than the viewport, which would push the row that opened it off the
              // screen — a scroll margin one row deep makes that row part of what gets revealed.
              css: { scrollMarginBlockStart: 'var(--row-height)' },
              theme: {
                dark: {
                  borderColor: 'gray-800',
                  bgColor: 'gray-950',
                },
              },
            },
            children: {
              content: {
                styles: {
                  // The other half of the accent on the expanded row's first cell. It goes here rather than
                  // on the row because this is the sticky box: the row is as wide as the scrolled content,
                  // so a border on it would slide out of view.
                  bs: 2,
                  borderColor: 'indigo-500',
                  // The panel is the detail row's single cell, so it holds focus like any other.
                  focusVisible: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: -2,
                    outlineColor: 'indigo-500',
                  },
                  theme: {
                    dark: {
                      borderColor: 'indigo-400',
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
              aggregate: {
                styles: {
                  fontWeight: 600,
                },
              },
            },
          },
          empty: {
            styles: {},
          },
        },
      },
      // The header's twin at the other edge. It carries a pinned cell's own background rather than the bars'
      // grey, because the cells pinned inside it keep theirs and the two sit side by side.
      footer: {
        styles: {
          position: 'sticky',
          bottom: 0,
          width: 'max-content',
          minWidth: 'fit',
          zIndex: 1,
          bgColor: 'white',
          bt: 1,
          borderColor: 'gray-200',
          theme: {
            dark: {
              bgColor: 'gray-900',
              borderColor: 'gray-800',
            },
          },
        },
        children: {
          cell: {
            styles: {
              fontWeight: 600,
              color: 'gray-900',
              theme: { dark: { color: 'gray-50' } },
            },
          },
          label: {
            styles: {
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: 'gray-500',
              theme: {
                dark: {
                  color: 'gray-400',
                },
              },
            },
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
          bgColor: 'white',
          bt: 1,
          borderColor: 'gray-200',
          gap: 4,
          ai: 'center',
          fontSize: 13,
          color: 'gray-500',
          theme: {
            dark: {
              bgColor: 'gray-900',
              borderColor: 'gray-800',
              color: 'gray-400',
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
  // The chart micro-primitives. Paint is a class and shape is an attribute, so what lives here is
  // everything about a drawing that is not its data — which is also everything worth restyling at once.
  sparkline: {
    styles: {
      overflow: 'visible',
      stroke: 'currentColor',
      fill: 'currentColor',
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      // The line is drawn into whatever box it is given, so it is the one primitive not to scale.
      // `non-scaling-stroke` is what keeps it one width thick after the stretch.
      vectorEffect: 'non-scaling-stroke',
    },
    children: {
      // The trend itself: a stroke with nothing inside it.
      line: { styles: { fill: 'none' } },
      // The fill under the line, as a second path — one closed path would stroke its own baseline.
      area: { styles: { stroke: 'none', fillOpacity: 0.2 } },
      bar: { styles: { stroke: 'none' } },
    },
  },
  progressRing: {
    styles: { stroke: 'currentColor', fill: 'none', strokeLinecap: 'round' },
    children: {
      // The unfilled part, as the same colour faded — so the track follows the theme with it.
      track: { styles: { strokeOpacity: 0.2 } },
      arc: { styles: {} },
    },
  },
  // A ring that stops short of a full turn: same paint, and the geometry that differs is a prop.
  // `extends` carries the root styles; the children are spelled out because the *types* are read off
  // this literal, and a node reached only through `extends` is one no caller could name.
  gauge: {
    extends: 'progressRing',
    children: {
      track: { styles: { strokeOpacity: 0.2 } },
      arc: { styles: {} },
    },
  },
  miniDonut: {
    styles: { fill: 'none' },
    children: {
      // The colour is the one thing a segment cannot share: it is per index, so it stays a prop.
      segment: { styles: {} },
    },
  },
  // The variables a chart somebody else draws reads, in both themes — the whole component, since it
  // paints nothing itself. An app re-skins every chart it has by overriding this one node.
  chartContainer: {
    styles: {
      vars: paletteVariables(PALETTE),
      theme: { dark: { vars: paletteVariables(DARK_PALETTE) } },
    },
  },
} satisfies Components;

export default boxComponents;
