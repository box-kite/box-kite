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
          // Short rather than off while the value is being moved. Off is exact and *steps*: a value on
          // a grid can only be at its grid positions, so a 1-in-100 slider moves 3.2px at a time on a
          // 320px track and reads as jumpy (#145). 80ms interpolates between them — measured at 79% of
          // frames moving against 22%, for 5.6px of average lag, where 120ms costs 42px.
          tracking: { transitionDuration: 80, motionReduce: { transition: 'none' } },
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
          tracking: { transitionDuration: 80, motionReduce: { transition: 'none' } },
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
