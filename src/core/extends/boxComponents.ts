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

/**
 * `Box.components()`'s parameter: still infers `T`, but a hover reads a prop's JSDoc only off a declared property —
 * a bare `T` (or a `Record`) leaves it the caller's literal, which has none — so every level is mapped over its keys.
 */
export type ComponentsInput<T> = { [K in keyof T]: ComponentInput<T[K]> };
type ComponentInput<C> = BoxComponent &
  C & {
    variants?: { [V in keyof VariantsOf<C>]: BoxComponentStyles };
    children?: ComponentsInput<ChildrenOf<C>>;
  };
type VariantsOf<C> = C extends { variants?: infer V } ? V : Record<never, never>;
type ChildrenOf<C> = C extends { children?: infer Ch } ? Ch : Record<never, never>;

/**
 * What a tool call's JSON and a markdown fence are shown in. There is no `fontFamily` prop — a typeface
 * is a decision about a whole page rather than about one element — so it goes through `css`, which is
 * still a shared class.
 */
const FONT_MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** A list's hairline — its divider and a separated item's frame — mixed from the text, so it follows any theme. */
const HAIRLINE = 'color-mix(in oklab, currentColor 12%, transparent)';

/** What a list item's icon, avatar or thumbnail sits on. */
const MEDIA_FILL: BoxComponentStyles = { bgColor: 'currentColor/6' };

/**
 * A layer moving in or out by a transform is the containing block of every `position: fixed` descendant
 * — a password manager's badge on a field included — so `overflow: auto` scrolled to it until the transform
 * settled (#283). `overflow` waits for the end of the entrance and leaves at the start of the exit.
 */
const OVERFLOW_AFTER_ENTRANCE: BoxComponentStyles['css'] = {
  transitionProperty: 'all, overflow',
  transitionTimingFunction: 'ease, step-end',
};
const OVERFLOW_BEFORE_EXIT: BoxComponentStyles['css'] = { transitionTimingFunction: 'ease, step-start' };

/**
 * Safari's computed `position-area` (and the swapped margin) carries the flip, and loses it on both edges of a panel's life:
 * `@starting-style` resolves before the flip (#300) and a hidden popover drops it (#301). So the flip lands at once and leaves last.
 */
const ANCHORED_ENTRANCE: BoxComponentStyles['css'] = {
  transitionProperty: 'all, overflow, position-area, margin',
  transitionTimingFunction: 'ease, step-end, step-start, step-start',
};
const ANCHORED_EXIT: BoxComponentStyles['css'] = { transitionTimingFunction: 'ease, step-start, step-end, step-end' };

/** The keyboard's mark on a control in the DataGrid's list layout. */
const FOCUS_RING: BoxComponentStyles = { outline: 2, outlineStyle: 'solid', outlineOffset: 2, outlineColor: 'accent-500' };

/**
 * The DataGrid bottom bar's buttons. Quiet rather than links: they change the view, they do not go
 * anywhere — grey until hovered, so they sit beside the counts without shouting over them.
 */
const BAR_BUTTON: BoxComponentStyles = {
  display: 'inline-flex',
  ai: 'center',
  gap: 1.5,
  ms: -2,
  px: 2,
  py: 1,
  lineHeight: 20,
  borderRadius: 1.5,
  fontSize: 13,
  fontWeight: 500,
  color: 'base-600',
  bgColor: 'transparent',
  cursor: 'pointer',
  textWrap: 'nowrap',
  transition: 'colors',
  transitionDuration: 150,
  hover: { bgColor: 'base-100', color: 'base-900' },
  focusVisible: { outline: 2, outlineStyle: 'solid', outlineOffset: 0, outlineColor: 'accent-500' },
  theme: {
    dark: {
      color: 'base-400',
      hover: { bgColor: 'base-800', color: 'base-100' },
      focusVisible: { outlineColor: 'accent-400' },
    },
  },
};

const baseComponents = {
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
      color: 'base-900',
      borderColor: 'base-200',
      shadow: 'large',
      theme: {
        dark: { bgColor: 'base-800', borderColor: 'base-700', color: 'base-100' },
      },
      // Opening is a first style resolution — `display: none` to shown — which is the moment
      // `@starting-style` names; `allow-discrete` is what holds `display` and `overlay` back on the way
      // out, so the exit is a transition rather than a `<Presence>`. Every Box already transitions `all`,
      // which carries both of those (measured).
      startingStyle: { opacity: 0, scale: 0.96, overflow: 'hidden' },
      transitionBehavior: 'allow-discrete',
      css: OVERFLOW_AFTER_ENTRANCE,
      // `display: none` is declared here rather than left to the UA's own `dialog:not([open])` rule,
      // because any author rule outranks that one — and every Box carries `display: block`, so without
      // this a closed dialog stays laid out over the page. Measured: the one thing a test environment
      // cannot see, having no UA dialog styles of its own.
      not: { open: { opacity: 0, scale: 0.96, display: 'none', overflow: 'hidden', css: OVERFLOW_BEFORE_EXIT } },
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
          color: 'base-600',
          theme: {
            dark: { color: 'base-400' },
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
      color: 'base-900',
      borderColor: 'base-300',
      shadow: 'medium',
      overflow: 'auto',
      theme: {
        dark: { bgColor: 'base-800', borderColor: 'base-700', color: 'base-100' },
      },
      // The panel is displayed when it opens — from `display: none` on the platform path, by mounting on
      // the other — and both are a first style resolution, which is the moment `@starting-style` names.
      startingStyle: { opacity: 0, translateY: -1, overflow: 'hidden' },
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
        css: ANCHORED_ENTRANCE,
        not: { open: { opacity: 0, translateY: -1, display: 'none', overflow: 'hidden', css: ANCHORED_EXIT } },
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
      color: 'base-900',
      borderColor: 'base-300',
      shadow: 'medium',
      overflow: 'auto',
      theme: {
        dark: { bgColor: 'base-800', borderColor: 'base-700', color: 'base-100' },
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
        // The menu has no `overflow` step, but it flips like the popover panel does (#300, #301).
        css: { transitionProperty: 'all, position-area, margin', transitionTimingFunction: 'ease, step-start, step-start' },
        not: { open: { opacity: 0, translateY: -1, display: 'none', css: { transitionTimingFunction: 'ease, step-end, step-end' } } },
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
          hover: { bgColor: 'base-100' },
          focus: { bgColor: 'base-100', outline: 0 },
          // A disabled item is `aria-disabled` rather than `disabled`, because APG asks that it stay
          // focusable — so the attribute is what styles it.
          ariaAttr: {
            disabled: { color: 'base-400', cursor: 'default', hover: { bgColor: 'transparent' }, focus: { bgColor: 'transparent' } },
          },
          // A forced-colors mode throws every background away, and the highlight is a background: these
          // two are the only pair those modes keep, so without them focus reads identically on and off.
          forcedColors: { focus: { bgColor: 'Highlight', color: 'HighlightText' } },
          theme: {
            dark: {
              hover: { bgColor: 'base-700' },
              focus: { bgColor: 'base-700' },
              ariaAttr: {
                disabled: { color: 'base-500', hover: { bgColor: 'transparent' }, focus: { bgColor: 'transparent' } },
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
          color: 'base-500',
          theme: { dark: { color: 'base-400' } },
        },
      },
      separator: {
        styles: {
          my: 1,
          bt: 1,
          borderColor: 'base-200',
          theme: { dark: { borderColor: 'base-700' } },
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
          borderColor: 'base-200',
          // Deliberately **not** a scroll container. The selected tab's indicator overhangs this rule by
          // 1px to sit on it, and naming one axis is enough to lose that: `overflow` computes a `visible`
          // companion to an `auto` up to `auto`, so `overflowX: 'auto'` alone turned the 1px into a 15px
          // *vertical* scrollbar on every horizontal tablist. Scrolling a list that outgrows its
          // container is the consumer's to solve; doing it here costs the overlap.
          theme: { dark: { borderColor: 'base-700' } },
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
          color: 'base-600',
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
          hover: { color: 'base-900' },
          selected: { color: 'accent-600' },
          disabled: { color: 'base-400', cursor: 'default', hover: { color: 'base-400' } },
          // Inside the underline rather than around it: a ring drawn outside would sit under the
          // neighbouring tab, since the list scrolls and clips.
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: -2, borderRadius: 1 },
          // Every colour is gone in a forced-colors mode, so the selected tab has to be told apart with
          // one of the pair those modes keep — otherwise it reads exactly like the rest.
          forcedColors: { selected: { color: 'Highlight' } },
          theme: {
            dark: {
              color: 'base-400',
              hover: { color: 'base-100' },
              selected: { color: 'accent-400' },
              disabled: { color: 'base-600', hover: { color: 'base-600' } },
            },
          },
        },
        variants: {
          // In a vertical list the indicator turns with it, onto the inline end the list's rule is on.
          vertical: { textAlign: 'start', bb: 0, be: 2, mb: 0, me: -0.25 },
          // The tab colours its own border in. Declared here rather than in `selected` because the
          // travelling indicator turns it off, and a colour declared once is better than three undone.
          underline: {
            selected: { borderColor: 'accent-500' },
            forcedColors: { selected: { borderColor: 'Highlight' } },
            theme: { dark: { selected: { borderColor: 'accent-400' } } },
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
          bgColor: 'accent-500',
          forcedColors: { bgColor: 'Highlight' },
          theme: { dark: { bgColor: 'accent-400' } },
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
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2, borderRadius: 1 },
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
          borderColor: 'base-200',
          theme: { dark: { borderColor: 'base-700' } },
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
          color: 'base-900',
          bgColor: 'transparent',
          b: 0,
          cursor: 'pointer',
          transition: 'colors',
          hover: { color: 'accent-600' },
          // The open state is the button's own `aria-expanded`, so it needs no variant: the attribute
          // the pattern already has to write is the selector.
          ariaAttr: { expanded: { color: 'accent-600' } },
          disabled: { color: 'base-400', cursor: 'default', hover: { color: 'base-400' } },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: -2, borderRadius: 1 },
          forcedColors: { ariaAttr: { expanded: { color: 'Highlight' } } },
          theme: {
            dark: {
              color: 'base-100',
              hover: { color: 'accent-400' },
              ariaAttr: { expanded: { color: 'accent-400' } },
              disabled: { color: 'base-600', hover: { color: 'base-600' } },
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
          color: 'base-700',
          theme: { dark: { color: 'base-300' } },
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
          bgColor: 'base-200',
          // The fill's own corners are square, so the track is what rounds both ends of it.
          overflow: 'hidden',
          theme: { dark: { bgColor: 'base-700' } },
        },
        variants: {
          vertical: { width: 1.5, height: 'fit' },
        },
      },
      fill: {
        styles: {
          position: 'absolute',
          insetY: 0,
          bgColor: 'accent-500',
          theme: { dark: { bgColor: 'accent-400' } },
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
          borderColor: 'accent-500',
          shadow: 'xs',
          hover: { borderColor: 'accent-600' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2 },
          theme: { dark: { bgColor: 'base-900', borderColor: 'accent-400', hover: { borderColor: 'accent-300' } } },
          // A thumb whose only signal is its fill disappears in a forced-colors mode.
          forcedColors: { bgColor: 'ButtonFace', borderColor: 'ButtonText' },
        },
        variants: {
          vertical: { ms: 0, mb: -2 },
          disabled: { cursor: 'default', borderColor: 'base-400', hover: { borderColor: 'base-400' } },
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
      bgColor: 'base-200',
      overflow: 'hidden',
      theme: { dark: { bgColor: 'base-700' } },
    },
    children: {
      fill: {
        styles: {
          position: 'absolute',
          insetY: 0,
          insetStart: 0,
          bgColor: 'accent-500',
          // The width is the value, so it is the one thing here that moves.
          transition: 'size',
          theme: { dark: { bgColor: 'accent-400' } },
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
          borderColor: 'base-300',
          color: 'base-900',
          shadow: 'medium',
          fontSize: 14,
          lineHeight: 20,
          theme: { dark: { bgColor: 'base-800', borderColor: 'base-700', color: 'base-100' } },
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
          loading: { before: { bgColor: 'base-400' } },
        },
      },
      message: {
        styles: { fontWeight: 500, color: 'base-900', theme: { dark: { color: 'base-100' } } },
      },
      description: {
        styles: { fontSize: 13, lineHeight: 18, color: 'base-600', theme: { dark: { color: 'base-400' } } },
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
          borderColor: 'base-300',
          bgColor: 'transparent',
          color: 'base-900',
          cursor: 'pointer',
          transition: 'colors',
          hover: { bgColor: 'base-100' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 1 },
          theme: {
            dark: { borderColor: 'base-600', color: 'base-100', hover: { bgColor: 'base-700' } },
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
          color: 'base-500',
          cursor: 'pointer',
          transition: 'colors',
          hover: { color: 'base-900', bgColor: 'base-100' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: -2 },
          // `borderStyle` on both, and it is the trap: a pseudo-element carries none of `._b`, whose
          // `border: 0 solid` is what every other border in this file is leaning on — so a width with
          // no style computes to `0px none` and the cross is invisible (measured in Chrome 153).
          before: { position: 'absolute', width: 2.5, height: 0, bt: 1, borderStyle: 'solid', borderColor: 'currentColor', rotate: 45 },
          after: { position: 'absolute', width: 2.5, height: 0, bt: 1, borderStyle: 'solid', borderColor: 'currentColor', rotate: -45 },
          theme: {
            dark: { color: 'base-400', hover: { color: 'base-100', bgColor: 'base-700' } },
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
          bgColor: 'base-900/80',
          color: 'base-50',
          startingStyle: { opacity: 0 },
          theme: { dark: { bgColor: 'base-100/80', color: 'base-900' } },
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
      bgColor: 'base-900',
      color: 'base-50',
      theme: {
        dark: { bgColor: 'base-100', color: 'base-900' },
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
      bgColor: 'accent-600',
      color: 'white',
      fontWeight: 500,
      py: 2.5,
      px: 5,
      borderRadius: 2,
      b: 0,
      cursor: 'pointer',
      hover: {
        bgColor: 'accent-700',
      },
      active: {
        bgColor: 'accent-800',
      },
      focusVisible: {
        outline: 2,
        outlineStyle: 'solid',
        outlineOffset: 2,
        outlineColor: 'accent-500',
      },
      disabled: {
        bgColor: 'base-200',
        color: 'base-400',
        cursor: 'not-allowed',
        hover: {
          bgColor: 'base-200',
        },
      },
      theme: {
        dark: {
          bgColor: 'accent-500',
          hover: {
            bgColor: 'accent-400',
          },
          active: {
            bgColor: 'accent-600',
          },
          focusVisible: {
            outlineColor: 'accent-400',
          },
          disabled: {
            bgColor: 'base-800',
            color: 'base-600',
            hover: {
              bgColor: 'base-800',
            },
          },
        },
      },
    },
    variants: {
      secondary: {
        bgColor: 'white',
        color: 'base-900',
        b: 1,
        borderColor: 'base-300',
        hover: {
          bgColor: 'base-50',
        },
        active: {
          bgColor: 'base-100',
        },
        focusVisible: {
          borderColor: 'accent-500',
          outlineColor: 'accent-500',
        },
        disabled: {
          bgColor: 'base-50',
          color: 'base-400',
          borderColor: 'base-200',
        },
        theme: {
          dark: {
            bgColor: 'base-800',
            color: 'base-100',
            borderColor: 'base-700',
            hover: {
              bgColor: 'base-700',
            },
            active: {
              bgColor: 'base-600',
            },
            focusVisible: {
              borderColor: 'accent-400',
              outlineColor: 'accent-400',
            },
            disabled: {
              bgColor: 'base-900',
              color: 'base-600',
              borderColor: 'base-800',
            },
          },
        },
      },
      ghost: {
        bgColor: 'transparent',
        color: 'base-700',
        hover: {
          bgColor: 'base-100',
        },
        active: {
          bgColor: 'base-200',
        },
        disabled: {
          bgColor: 'transparent',
          color: 'base-400',
        },
        theme: {
          dark: {
            bgColor: 'transparent',
            color: 'base-300',
            hover: {
              bgColor: 'base-800',
            },
            active: {
              bgColor: 'base-700',
            },
            disabled: {
              bgColor: 'transparent',
              color: 'base-600',
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
      borderColor: 'base-300',
      bgColor: 'white',
      color: 'base-900',
      borderRadius: 2,
      p: 3,
      px: 4,
      lineHeight: 20,
      hover: {
        borderColor: 'base-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'accent-500',
        outlineColor: 'accent-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'base-100',
        color: 'base-400',
        borderColor: 'base-200',
      },
      theme: {
        dark: {
          bgColor: 'base-800',
          color: 'base-100',
          borderColor: 'base-700',
          hover: {
            borderColor: 'base-600',
          },
          focus: {
            borderColor: 'accent-400',
            outlineColor: 'accent-900',
          },
          disabled: {
            bgColor: 'base-900',
            color: 'base-600',
            borderColor: 'base-800',
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
      borderColor: 'base-300',
      bgColor: 'white',
      color: 'base-900',
      borderRadius: 2,
      p: 3,
      px: 4,
      hover: {
        borderColor: 'base-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'accent-500',
        outlineColor: 'accent-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'base-100',
        color: 'base-400',
        borderColor: 'base-200',
        resize: 'none',
      },
      theme: {
        dark: {
          bgColor: 'base-800',
          color: 'base-100',
          borderColor: 'base-700',
          hover: {
            borderColor: 'base-600',
          },
          focus: {
            borderColor: 'accent-400',
            outlineColor: 'accent-900',
          },
          disabled: {
            bgColor: 'base-900',
            color: 'base-600',
            borderColor: 'base-800',
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
      borderColor: 'base-300',
      borderRadius: 1,
      p: 2,
      cursor: 'pointer',
      // Quick, and colours only. The ring wears its colour before it is drawn, or it fades in from black.
      transition: 'colors',
      transitionDuration: 100,
      outlineColor: 'accent-200',
      hover: {
        borderColor: 'accent-400',
      },
      // The keyboard's ring only: drawn on every click it was noise, and in a DataGrid it flashed on each row selected.
      focusVisible: {
        outline: 2,
        outlineOffset: 2,
      },
      checked: {
        bgColor: 'accent-500',
        borderColor: 'accent-500',
        bgImage: 'bg-img-checked',
      },
      // Filled like a tick, with a white dash: the dash used to be a fixed violet no design could reach.
      indeterminate: {
        bgColor: 'accent-500',
        borderColor: 'accent-500',
        bgImage: 'bg-img-indeterminate',
      },
      disabled: {
        cursor: 'not-allowed',
        borderColor: 'base-200',
        checked: {
          bgColor: 'base-300',
        },
        indeterminate: {
          bgColor: 'base-300',
        },
        hover: {
          borderColor: 'base-200',
        },
      },
      theme: {
        dark: {
          borderColor: 'base-600',
          hover: {
            borderColor: 'accent-400',
          },
          outlineColor: 'accent-900',
          checked: {
            bgColor: 'accent-500',
            borderColor: 'accent-500',
          },
          indeterminate: {
            bgColor: 'accent-500',
            borderColor: 'accent-500',
          },
          disabled: {
            borderColor: 'base-700',
            checked: {
              bgColor: 'base-600',
            },
            indeterminate: {
              bgColor: 'base-600',
            },
            hover: {
              borderColor: 'base-700',
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
      borderColor: 'base-300',
      borderRadius: 3,
      p: 2,
      cursor: 'pointer',
      // Quick, and colours only. The ring wears its colour before it is drawn, or it fades in from black.
      transition: 'colors',
      transitionDuration: 100,
      outlineColor: 'accent-200',
      hover: {
        borderColor: 'accent-400',
      },
      // The keyboard's ring only: drawn on every click it was noise, and in a DataGrid it flashed on each row selected.
      focusVisible: {
        outline: 2,
        outlineOffset: 2,
      },
      checked: {
        bgColor: 'accent-500',
        borderColor: 'accent-500',
        bgImage: 'bg-img-radio',
      },
      disabled: {
        checked: {
          bgColor: 'base-300',
          borderColor: 'base-200',
        },
        cursor: 'not-allowed',
        borderColor: 'base-200',
        hover: {
          borderColor: 'base-200',
        },
      },
      theme: {
        dark: {
          borderColor: 'base-600',
          hover: {
            borderColor: 'accent-400',
          },
          outlineColor: 'accent-900',
          checked: {
            bgColor: 'accent-500',
            borderColor: 'accent-500',
          },
          disabled: {
            borderColor: 'base-700',
            checked: {
              bgColor: 'base-600',
            },
            hover: {
              borderColor: 'base-700',
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
          color: 'base-700',
          theme: { dark: { color: 'base-300' } },
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
      bgColor: 'base-300',
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
        bgColor: 'base-400',
      },
      focusVisible: {
        outline: 2,
        outlineStyle: 'solid',
        outlineOffset: 2,
        outlineColor: 'accent-500',
      },
      checked: {
        bgColor: 'accent-500',
        hover: {
          bgColor: 'accent-600',
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
        bgColor: 'base-200',
        hover: {
          bgColor: 'base-200',
        },
        checked: {
          bgColor: 'base-300',
          hover: {
            bgColor: 'base-300',
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
          bgColor: 'base-600',
          hover: {
            bgColor: 'base-500',
          },
          focusVisible: {
            outlineColor: 'accent-400',
          },
          checked: {
            bgColor: 'accent-500',
            hover: {
              bgColor: 'accent-400',
            },
          },
          disabled: {
            bgColor: 'base-700',
            hover: {
              bgColor: 'base-700',
            },
            checked: {
              bgColor: 'base-600',
              hover: {
                bgColor: 'base-600',
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
      color: 'base-900',
      b: 1,
      borderColor: 'base-300',
      borderRadius: 2,
      lineHeight: 20,
      transition: 'none',
      hover: {
        borderColor: 'base-400',
      },
      // `focus` is `:focus-within`, so the shell lights up for the field inside it.
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'accent-500',
        outlineColor: 'accent-200',
      },
      // The shell is a `<div>` and takes no `disabled` of its own: the state belongs to the field in it.
      hasDisabled: {
        cursor: 'not-allowed',
        bgColor: 'base-100',
        color: 'base-400',
        borderColor: 'base-300',
      },
      theme: {
        dark: {
          bgColor: 'base-800',
          color: 'base-100',
          borderColor: 'base-700',
          hover: {
            borderColor: 'base-600',
          },
          focus: {
            borderColor: 'accent-400',
            outlineColor: 'accent-900',
          },
          hasDisabled: {
            bgColor: 'base-900',
            color: 'base-500',
            borderColor: 'base-700',
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
          color: 'base-700',
          theme: {
            dark: {
              color: 'base-300',
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
            color: 'base-400',
          },
          disabled: {
            cursor: 'not-allowed',
          },
          theme: {
            dark: {
              placeholder: {
                color: 'base-500',
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
          bgColor: 'base-100',
          color: 'base-800',
          whiteSpace: 'nowrap',
          theme: {
            dark: {
              bgColor: 'base-700',
              color: 'base-100',
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
          color: 'base-500',
          cursor: 'pointer',
          hover: {
            bgColor: 'base-300',
            color: 'base-900',
          },
          theme: {
            dark: {
              color: 'base-400',
              hover: {
                bgColor: 'base-600',
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
          color: 'base-500',
          theme: {
            dark: {
              color: 'base-400',
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
          borderColor: 'base-300',
          color: 'base-900',
          shadow: 'medium',
          theme: {
            dark: {
              bgColor: 'base-800',
              borderColor: 'base-700',
              color: 'base-100',
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
            bgColor: 'base-100',
          },
          selected: {
            bgColor: 'accent-50',
          },
          ariaAttr: {
            disabled: {
              cursor: 'not-allowed',
              color: 'base-400',
              hover: {
                bgColor: 'transparent',
              },
            },
          },
          theme: {
            dark: {
              hover: {
                bgColor: 'base-700',
              },
              selected: {
                bgColor: 'accent-900',
              },
              ariaAttr: {
                disabled: {
                  color: 'base-500',
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
            outlineColor: 'accent-500',
            theme: {
              dark: {
                outlineColor: 'accent-400',
              },
            },
          },
          create: {
            color: 'accent-600',
            theme: {
              dark: {
                color: 'accent-300',
              },
            },
          },
        },
      },
      message: {
        styles: {
          px: 2,
          py: 1.5,
          color: 'base-500',
          lineHeight: 20,
          theme: {
            dark: {
              color: 'base-400',
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
      color: 'base-900',
      b: 1,
      borderColor: 'base-300',
      borderRadius: 2,
      userSelect: 'none',
      lineHeight: 20,
      width: 'fit-content',
      transition: 'none',
      hover: {
        borderColor: 'base-400',
      },
      focus: {
        outline: 2,
        outlineOffset: 0,
        borderColor: 'accent-500',
        outlineColor: 'accent-200',
      },
      disabled: {
        cursor: 'not-allowed',
        bgColor: 'base-100',
        color: 'base-400',
        borderColor: 'base-300',
      },
      theme: {
        dark: {
          bgColor: 'base-800',
          color: 'base-100',
          borderColor: 'base-700',
          hover: {
            borderColor: 'base-600',
          },
          focus: {
            borderColor: 'accent-400',
            outlineColor: 'accent-900',
          },
          disabled: {
            bgColor: 'base-900',
            color: 'base-500',
            borderColor: 'base-700',
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
          borderColor: 'base-300',
          color: 'base-900',
          shadow: 'medium',
          theme: {
            dark: {
              bgColor: 'base-800',
              borderColor: 'base-700',
              color: 'base-100',
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
          // An option is a choice, not prose: dragging across the list while choosing must not paint a
          // selection, and a range stranded elsewhere on the page must not reach in here. The trigger
          // has said the same since it shipped.
          userSelect: 'none',
          hover: {
            bgColor: 'base-100',
          },
          focus: {
            bgColor: 'accent-50',
          },
          selected: {
            bgColor: 'accent-50',
            cursor: 'default',
            hover: {
              bgColor: 'accent-100',
            },
          },
          theme: {
            dark: {
              hover: {
                bgColor: 'base-700',
              },
              focus: {
                bgColor: 'base-700',
              },
              selected: {
                bgColor: 'accent-900',
                hover: {
                  bgColor: 'accent-800',
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
            outlineColor: 'accent-500',
            theme: {
              dark: {
                outlineColor: 'accent-400',
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
          color: 'base-500',
          hover: {
            bgColor: 'base-100',
          },
          focus: {
            bgColor: 'base-100',
          },
          selected: {
            bgColor: 'base-100',
            cursor: 'default',
          },
          theme: {
            dark: {
              color: 'base-400',
              hover: {
                bgColor: 'base-700',
              },
              focus: {
                bgColor: 'base-700',
              },
              selected: {
                bgColor: 'base-700',
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
            outlineColor: 'accent-500',
            theme: {
              dark: {
                outlineColor: 'accent-400',
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
          color: 'base-500',
          hover: {
            bgColor: 'base-100',
          },
          focus: {
            bgColor: 'base-100',
          },
          selected: {
            bgColor: 'base-100',
            cursor: 'default',
          },
          theme: {
            dark: {
              color: 'base-400',
              hover: {
                bgColor: 'base-700',
              },
              focus: {
                bgColor: 'base-700',
              },
              selected: {
                bgColor: 'base-700',
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
            outlineColor: 'accent-500',
            theme: {
              dark: {
                outlineColor: 'accent-400',
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
          color: 'base-400',
          theme: {
            dark: {
              color: 'base-500',
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
      borderColor: 'base-200',
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
          bgColor: 'base-900',
          borderColor: 'base-800',
        },
      },
    },
    variants: {
      // `clip` rather than `hidden`: the corners still clip, but the grid stops being a scroll container, so the
      // list's selection bar can stick to the bottom of the viewport.
      list: { css: { overflow: 'clip' } },
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
              bgColor: 'accent-100',
              theme: {
                dark: {
                  bgColor: 'accent-950',
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
                  bgColor: 'accent-500',
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
                      bgColor: 'accent-400',
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
          borderColor: 'base-200',
          color: 'base-900',
          gap: 3,
          ai: 'center',
          bgColor: 'white',
          theme: {
            dark: {
              bgColor: 'base-900',
              borderColor: 'base-800',
              color: 'base-100',
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
                  // Neutral: a count is information, and the grid's one accent is indigo.
                  bgColor: 'base-100',
                  color: 'base-600',
                  css: { fontVariantNumeric: 'tabular-nums' },
                  theme: {
                    dark: {
                      bgColor: 'base-800',
                      color: 'base-300',
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
                  color: 'base-700',
                  width: 4,
                  theme: {
                    dark: {
                      color: 'base-300',
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
                  borderColor: 'base-300',
                  bgColor: 'white',
                  borderRadius: 2,
                  py: 2,
                  ps: 3,
                  pe: 2,
                  color: 'base-800',
                  fontSize: 14,
                  fontWeight: 500,
                  shadow: 'small',
                  theme: {
                    dark: {
                      bgColor: 'base-800',
                      borderColor: 'base-700',
                      color: 'base-200',
                    },
                  },
                },
                children: {
                  icon: {
                    styles: {
                      width: 3,
                      color: 'base-500',
                      cursor: 'pointer',
                      hover: {
                        color: 'base-700',
                      },
                      theme: {
                        dark: {
                          color: 'base-400',
                          hover: {
                            color: 'base-200',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          // The columns button wears the export buttons' chrome, so the top bar's controls read as one set.
          columnVisibility: {
            clean: true,
            styles: {
              display: 'inline-flex',
              ai: 'center',
              gap: 1.5,
              b: 1,
              borderColor: 'base-300',
              bgColor: 'white',
              borderRadius: 2,
              py: 1.5,
              px: 2.5,
              color: 'base-700',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 16,
              cursor: 'pointer',
              textWrap: 'nowrap',
              transition: 'colors',
              transitionDuration: 150,
              hover: { bgColor: 'base-50', color: 'base-900' },
              ariaAttr: { expanded: { bgColor: 'base-100', color: 'base-900' } },
              focusVisible: { outline: 2, outlineStyle: 'solid', outlineOffset: 2, outlineColor: 'accent-500' },
              theme: {
                dark: {
                  bgColor: 'base-800',
                  borderColor: 'base-700',
                  color: 'base-300',
                  hover: { bgColor: 'base-700', color: 'base-100' },
                  ariaAttr: { expanded: { bgColor: 'base-700', color: 'base-100' } },
                  focusVisible: { outlineColor: 'accent-400' },
                },
              },
            },
            children: {
              // How many columns are on screen, shown only while some are not: amber for some, red for none.
              badge: {
                styles: {
                  fontSize: 11,
                  lineHeight: 16,
                  fontWeight: 600,
                  px: 1.5,
                  borderRadius: 1,
                  bgColor: 'amber-100',
                  color: 'amber-800',
                  theme: { dark: { bgColor: 'amber-400/15', color: 'amber-300' } },
                },
                variants: {
                  empty: {
                    bgColor: 'red-100',
                    color: 'red-700',
                    theme: { dark: { bgColor: 'red-400/15', color: 'red-300' } },
                  },
                },
              },
              panel: {
                styles: {
                  d: 'column',
                  // Sized by its content: a translation's toolbar or a long header must widen it, not spill out.
                  width: 'max-content',
                  minWidth: 64,
                  css: { maxWidth: 'calc(100vw - 2rem)' },
                  fontSize: 13,
                },
              },
              search: {
                styles: {
                  position: 'relative',
                  ai: 'center',
                  p: 2,
                  bb: 1,
                  borderColor: 'base-200',
                  theme: { dark: { borderColor: 'base-700' } },
                },
              },
              searchIcon: {
                styles: {
                  position: 'absolute',
                  insetStart: 4.5,
                  pointerEvents: 'none',
                  color: 'base-400',
                  theme: { dark: { color: 'base-500' } },
                },
              },
              searchInput: {
                styles: {
                  width: 'fit',
                  b: 1,
                  borderColor: 'base-300',
                  borderRadius: 1.5,
                  bgColor: 'white',
                  color: 'base-900',
                  py: 1.5,
                  ps: 7,
                  pe: 2,
                  fontSize: 13,
                  lineHeight: 20,
                  hover: { borderColor: 'base-400' },
                  focus: { outline: 2, outlineOffset: 0, borderColor: 'accent-500', outlineColor: 'accent-200' },
                  placeholder: { color: 'base-400' },
                  theme: {
                    dark: {
                      bgColor: 'base-900',
                      color: 'base-100',
                      borderColor: 'base-600',
                      hover: { borderColor: 'base-500' },
                      focus: { borderColor: 'accent-400', outlineColor: 'accent-900' },
                      placeholder: { color: 'base-500' },
                    },
                  },
                },
              },
              toolbar: {
                styles: {
                  jc: 'space-between',
                  ai: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                  rowGap: 1,
                  ps: 3,
                  pe: 1.5,
                  py: 1.5,
                  bb: 1,
                  borderColor: 'base-200',
                  theme: { dark: { borderColor: 'base-700' } },
                },
              },
              count: {
                styles: {
                  fontSize: 12,
                  color: 'base-500',
                  textWrap: 'nowrap',
                  theme: { dark: { color: 'base-400' } },
                },
              },
              action: {
                clean: true,
                styles: {
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 16,
                  color: 'accent-600',
                  cursor: 'pointer',
                  textWrap: 'nowrap',
                  hover: { bgColor: 'accent-50' },
                  focusVisible: { outline: 2, outlineStyle: 'solid', outlineOffset: 0, outlineColor: 'accent-500' },
                  disabled: { color: 'base-400', cursor: 'default', hover: { bgColor: 'transparent' } },
                  theme: {
                    dark: {
                      color: 'accent-300',
                      hover: { bgColor: 'accent-400/15' },
                      focusVisible: { outlineColor: 'accent-400' },
                      disabled: { color: 'base-500', hover: { bgColor: 'transparent' } },
                    },
                  },
                },
              },
              list: {
                styles: {
                  d: 'column',
                  p: 1.5,
                  maxHeight: 80,
                  overflow: 'auto',
                },
              },
              section: {
                styles: {
                  d: 'column',
                },
                variants: {
                  // Ungrouped columns after a group: a rule says they are not part of it.
                  divided: {
                    bt: 1,
                    mt: 1,
                    pt: 1,
                    borderColor: 'base-200',
                    theme: { dark: { borderColor: 'base-700' } },
                  },
                },
              },
              group: {
                styles: {
                  px: 2,
                  pt: 2,
                  pb: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: 'base-500',
                  theme: { dark: { color: 'base-400' } },
                },
              },
              // The label wraps the switch, so the whole row is the hit target; the switch sits at the end.
              item: {
                styles: {
                  width: 'fit',
                  d: 'row-reverse',
                  jc: 'space-between',
                  ai: 'center',
                  gap: 3,
                  px: 2,
                  py: 1.5,
                  borderRadius: 1.5,
                  color: 'base-700',
                  lineHeight: 20,
                  hover: { bgColor: 'base-100' },
                  theme: { dark: { color: 'base-200', hover: { bgColor: 'base-700' } } },
                },
              },
              empty: {
                styles: {
                  px: 3,
                  py: 4,
                  textAlign: 'center',
                  color: 'base-500',
                  theme: { dark: { color: 'base-400' } },
                },
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
                  borderColor: 'base-300',
                  bgColor: 'white',
                  borderRadius: 2,
                  py: 1.5,
                  px: 2.5,
                  color: 'base-700',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textWrap: 'nowrap',
                  transition: 'colors',
                  transitionDuration: 150,
                  hover: {
                    bgColor: 'base-50',
                    color: 'base-900',
                  },
                  focusVisible: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: 2,
                    outlineColor: 'accent-500',
                  },
                  theme: {
                    dark: {
                      bgColor: 'base-800',
                      borderColor: 'base-700',
                      color: 'base-300',
                      hover: {
                        bgColor: 'base-700',
                        color: 'base-100',
                      },
                      focusVisible: {
                        outlineColor: 'accent-400',
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
              borderColor: 'base-200',
              theme: {
                dark: {
                  bgColor: 'base-900',
                  borderColor: 'base-800',
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
                outlineColor: 'accent-500',
              },
              theme: {
                dark: {
                  focusVisible: {
                    outlineColor: 'accent-400',
                  },
                },
              },
            },
            variants: {
              isPinned: {
                position: 'sticky',
                bgColor: 'base-50',
                zIndex: 2,
                theme: {
                  dark: {
                    bgColor: 'base-800',
                  },
                },
              },
              isFirstStartPinned: {},
              isLastStartPinned: {
                be: 1,
                borderColor: 'base-200',
                theme: {
                  dark: {
                    borderColor: 'base-700',
                  },
                },
              },
              isFirstEndPinned: {
                bs: 1,
                borderColor: 'base-200',
                theme: {
                  dark: {
                    borderColor: 'base-700',
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
                  borderColor: 'base-200',
                  borderRadius: 1,
                  position: 'relative',
                  width: 'fit',
                  focus: {
                    borderColor: 'accent-500',
                    outline: 2,
                    outlineOffset: 0,
                    outlineColor: 'accent-200',
                  },
                  theme: {
                    dark: {
                      borderColor: 'base-700',
                      focus: {
                        borderColor: 'accent-400',
                        outlineColor: 'accent-900',
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
          bgColor: 'base-50',
          theme: {
            dark: {
              bgColor: 'base-800',
            },
          },
        },
        children: {
          // `headerHover: 'sliding'`: one pill for the whole header, placed by inline px over the hovered cell.
          // The edge it travels towards is the quick one and the other catches up, which is the water.
          // Above the pinned cells so it reaches them, which is why it is a tint and takes no pointer.
          hover: {
            styles: {
              position: 'absolute',
              zIndex: 3,
              pointerEvents: 'none',
              opacity: 0,
              css: {
                transition:
                  'opacity calc(var(--transitionTime) * .6) ease, ' +
                  'right calc(var(--transitionTime) * 1.2) cubic-bezier(.25, 1, .5, 1), ' +
                  'left calc(var(--transitionTime) * 2) cubic-bezier(.65, 0, .35, 1), ' +
                  'top calc(var(--transitionTime) * 1.4) cubic-bezier(.25, 1, .5, 1), ' +
                  'bottom calc(var(--transitionTime) * 1.4) cubic-bezier(.25, 1, .5, 1)',
              },
              before: {
                position: 'absolute',
                inset: 1,
                borderRadius: 1,
                bgColor: 'base-900/5',
              },
              theme: { dark: { before: { bgColor: 'white/10' } } },
            },
            variants: {
              visible: { opacity: 1 },
              backward: {
                css: {
                  transition:
                    'opacity calc(var(--transitionTime) * .6) ease, ' +
                    'left calc(var(--transitionTime) * 1.2) cubic-bezier(.25, 1, .5, 1), ' +
                    'right calc(var(--transitionTime) * 2) cubic-bezier(.65, 0, .35, 1), ' +
                    'top calc(var(--transitionTime) * 1.4) cubic-bezier(.25, 1, .5, 1), ' +
                    'bottom calc(var(--transitionTime) * 1.4) cubic-bezier(.25, 1, .5, 1)',
                },
              },
              // Shown from nothing: it fades in where it is, since travelling from the last cell it left is noise.
              entering: { css: { transition: 'opacity calc(var(--transitionTime) * .6) ease' } },
            },
          },
          cell: {
            styles: {
              borderColor: 'base-200',
              bb: 1,
              minHeight: 12,
              position: 'relative',
              transition: 'none',
              // A label, not data: small, tracked and muted, so the eye reads down the values rather than
              // along the headings. The weight carries it at this size where the colour no longer does.
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: 'base-500',
              py: 3.5,
              // The cell is where the keyboard lives in a grid, so it has to show where it is — an *inset* outline,
              // since an outset ring on the first or last column would be clipped by the scroll container.
              // Deliberately no `zIndex`: a focused cell that outranked the pinned columns would slide over them on a
              // horizontal scroll instead of under, which is the one thing pinning promises.
              focusVisible: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'accent-500',
              },
              theme: {
                dark: {
                  borderColor: 'base-700',
                  color: 'base-400',
                  focusVisible: {
                    outlineColor: 'accent-400',
                  },
                },
              },
            },
            variants: {
              isPinned: {
                position: 'sticky',
                zIndex: 2,
                bgColor: 'base-50',
                theme: {
                  dark: {
                    bgColor: 'base-800',
                  },
                },
              },
              isFirstStartPinned: {},
              isLastStartPinned: {
                be: 1,
                borderColor: 'base-200',
                theme: {
                  dark: {
                    borderColor: 'base-700',
                  },
                },
              },
              isFirstEndPinned: {
                bs: 1,
                borderColor: 'base-200',
                theme: {
                  dark: {
                    borderColor: 'base-700',
                  },
                },
              },
              isLastEndPinned: {},
              isSortable: {
                cursor: 'pointer',
                hover: { color: 'base-900' },
                // The resizer is inside the cell, so the cell is `:hover` over it too — but a press there resizes.
                // `:has()` outranks `:hover`, and the theme is restated because its scope adds a class of its own.
                has: { '.resizer:hover': { color: 'base-500' } },
                theme: { dark: { hover: { color: 'base-100' }, has: { '.resizer:hover': { color: 'base-400' } } } },
              },
              // An inset pill rather than the whole cell, and a tint, so it reads on a pinned cell's own fill too.
              hasHoverPill: {
                before: {
                  position: 'absolute',
                  // Longhands, so the resizer variants below replace one side rather than race a shorthand.
                  insetY: 1,
                  insetStart: 1,
                  insetEnd: 1,
                  borderRadius: 1,
                  pointerEvents: 'none',
                  opacity: 0,
                  bgColor: 'base-900/5',
                  css: { transition: 'opacity calc(var(--transitionTime) * .6) ease' },
                },
                hover: { before: { opacity: 1 } },
                has: { '.resizer:hover': { before: { opacity: 0 } } },
                theme: { dark: { before: { bgColor: 'white/10' } } },
              },
              // One pixel more on the resizer's side: its line is this cell's last pixel, so the pill keeps
              // the same 4px from it as the neighbour's pill does from the other side.
              isPillBeforeResizer: { before: { insetEnd: 1.25 } },
              isPillAfterResizer: { before: { insetStart: 1.25 } },
              isRowSelection: {},
              isRowNumber: { jc: 'center' },
              // A column group's own cell ("Personal Info" over its columns), so a design can set the tier apart.
              isGroup: {},
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
                  borderColor: 'base-200',
                  display: 'flex',
                  jc: 'center',
                  ai: 'center',
                  transition: 'none',
                  // Quiet by default: one of these sits in every header cell. `gray-500` rather than the
                  // `gray-400` that looks right — a control owes 3:1 and `gray-400` on `gray-50` is 2.49.
                  color: 'base-500',
                  // A tint, so it stacks on the cell's hover pill instead of matching it: the pill is about the
                  // grey a flat `gray-200` would be, and in the dark theme the same as `gray-700`.
                  hover: { bgColor: 'base-900/12', color: 'base-800' },
                  theme: {
                    dark: {
                      color: 'base-400',
                      hover: { bgColor: 'white/15', color: 'base-100' },
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
                      color: 'base-900',
                      width: 56,
                      b: 1,
                      borderColor: 'base-300',
                      borderRadius: 3,
                      display: 'flex',
                      d: 'column',
                      py: 2,
                      overflow: 'hidden',
                      shadow: 'medium',
                      theme: {
                        dark: {
                          bgColor: 'base-800',
                          borderColor: 'base-700',
                          color: 'base-100',
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
                          color: 'base-900',
                          hover: { bgColor: 'accent-50' },
                          theme: {
                            dark: {
                              color: 'base-100',
                              hover: { bgColor: 'base-700' },
                            },
                          },
                        },
                        children: {
                          icon: {
                            styles: {
                              width: 4,
                              color: 'accent-950',
                              theme: {
                                dark: {
                                  color: 'accent-300',
                                },
                              },
                            },
                          },
                          separator: {
                            styles: {
                              bb: 1,
                              my: 2,
                              borderColor: 'base-300',
                              theme: {
                                dark: {
                                  borderColor: 'base-700',
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
                  bgColor: 'base-400',
                  group: { 'resizer/hover': { bgColor: 'accent-500' } },
                  // The separator is its own tab stop, and a bar two pixels wide has no room for a ring inside it, so the
                  // outline sits around it. `opacity` is here rather than on the element because a resizer that only
                  // appears on hover is a tab stop nobody could follow, and a pseudo rule outranks the base one.
                  focusVisible: {
                    opacity: 1,
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineColor: 'accent-500',
                    bgColor: 'accent-500',
                  },
                  theme: {
                    dark: {
                      bgColor: 'base-600',
                      group: { 'resizer/hover': { bgColor: 'accent-400' } },
                      focusVisible: {
                        outlineColor: 'accent-400',
                        bgColor: 'accent-400',
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
              borderColor: 'base-100',
              transition: 'none',
              ai: 'center',
              color: 'base-900',
              // The one thing a data grid cannot do without and the registry has no prop for: without it a
              // column of numbers is ragged, because a proportional `1` is narrower than a `0`.
              css: { fontVariantNumeric: 'tabular-nums' },
              group: {
                'grid-row/hover': { bgColor: 'base-50' },
                // A group row is tinted because it is a group, not because it can be opened: since #162 the
                // open state is on the expand button, and a tree row carries an `aria-expanded` of its own.
                'grid-row/data-group-row': { bgColor: 'base-50' },
                // Selection had no appearance at all: `isRowSelected` was declared on this node and applied
                // by nothing, so a selected row was legible only by its own checkbox.
                'grid-row/aria-selected=true': { bgColor: 'accent-50' },
              },
              theme: {
                dark: {
                  borderColor: 'base-800',
                  color: 'base-100',
                  group: {
                    'grid-row/hover': { bgColor: 'base-800' },
                    'grid-row/data-group-row': { bgColor: 'base-800' },
                    'grid-row/aria-selected=true': { bgColor: 'accent-950' },
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
                  'grid-row/hover': { bgColor: 'base-50' },
                  'grid-row/data-group-row': { bgColor: 'base-50' },
                  'grid-row/aria-selected=true': { bgColor: 'accent-50' },
                },
                theme: {
                  dark: {
                    bgColor: 'base-900',
                    group: {
                      'grid-row/hover': { bgColor: 'base-800' },
                      'grid-row/data-group-row': { bgColor: 'base-800' },
                      'grid-row/aria-selected=true': { bgColor: 'accent-950' },
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
              // A cell inside the marked block, but not the one the arrows carry on from — that keeps the
              // ring instead, which is how a sheet says where typing would land. It carries the row states
              // for the reason `isPinned` does: it paints a background, so a hovered or selected row under
              // it would otherwise win the colour and the block would disappear one row at a time.
              isInRange: {
                bgColor: 'accent-50',
                group: {
                  'grid-row/hover': { bgColor: 'accent-100' },
                  'grid-row/data-group-row': { bgColor: 'accent-50' },
                  'grid-row/aria-selected=true': { bgColor: 'accent-100' },
                },
                theme: {
                  dark: {
                    bgColor: 'accent-950',
                    group: {
                      'grid-row/hover': { bgColor: 'accent-900' },
                      'grid-row/data-group-row': { bgColor: 'accent-950' },
                      'grid-row/aria-selected=true': { bgColor: 'accent-900' },
                    },
                  },
                },
              },
              // The current cell: where the arrows carry on from, what Ctrl+C copies, and the corner a
              // Shift+arrow moves. Owned by the model rather than by a pseudo-class (bug #64), so a
              // *clicked* cell wears it — `:focus-visible` matches no pointer — and it survives the grid
              // losing focus, without which a copy has nothing to act on.
              isCurrentCell: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'accent-500',
                theme: { dark: { outlineColor: 'accent-400' } },
              },
              // The cell being edited. It stops clipping — a control as tall as the row is cut at both
              // ends by the cell's own `overflow` — and paints its own surface, since a pinned neighbour
              // would otherwise show through an editor that has no background of its own. It hands text
              // selection back, which the body takes away wherever cells are marked with a drag.
              isEditing: {
                overflow: 'visible',
                zIndex: 2,
                bgColor: 'white',
                userSelect: 'text',
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'accent-500',
                theme: {
                  dark: {
                    bgColor: 'base-900',
                    outlineColor: 'accent-400',
                  },
                },
              },
              // A refused value, on the cell rather than on the editor inside it: two rings on the same
              // rectangle means the editing one paints over this one and a refusal reads as an ordinary
              // edit (measured in Chrome 152). Declared after `isEditing`, so it wins the outline — and
              // it draws the whole ring rather than just recolouring one, because a paste refused on a
              // cell has no editor open behind it to have drawn one.
              isInvalid: {
                outline: 2,
                outlineStyle: 'solid',
                outlineOffset: -2,
                outlineColor: 'red-500',
                theme: { dark: { outlineColor: 'red-400' } },
              },
              // Muted, but only as far as contrast allows: `gray-400` on white measures 2.60:1 and `gray-500`
              // on `gray-900` 3.67:1, so the quiet-looking pair is the one that fails both ways round.
              isRowNumber: { jc: 'end', color: 'base-500', theme: { dark: { color: 'base-400' } } },
              isRowSelection: {},
              isFirstLeaf: {},
              isLastLeaf: {},
              isEmptyCell: {},
              isRowDetail: {},
              // An expanded row and the drawer under it are one block: the row takes the drawer's surface and
              // gives up the hairline between them, so the panel reads as hanging off the row rather than as
              // the row after it. Neutral rather than tinted, so it stays legible beside a *selected* row.
              isExpanded: {
                bgColor: 'base-50',
                bb: 0,
                // The row keeps its hover, one step off the surface it now has: the grid's own row hover is
                // the colour this row is already painted, so an expanded row would have stopped answering.
                group: { 'grid-row/hover': { bgColor: 'base-100' } },
                theme: {
                  dark: {
                    // Darker than the grid, not lighter: a well is what a drawer should read as, and
                    // `gray-800` reads as raised against a `gray-900` grid.
                    bgColor: 'base-950',
                    group: { 'grid-row/hover': { bgColor: 'base-900' } },
                  },
                },
              },
              // The accent runs down the inline start of the row and on down the drawer — the only thing
              // tying a panel this tall back to the row that opened it. Logical, so it mirrors with the text.
              isExpandedFirstLeaf: {
                bs: 2,
                borderColor: 'accent-500',
                theme: {
                  dark: {
                    borderColor: 'accent-400',
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
                      color: 'base-950',
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
                      bgColor: 'base-200',
                      animation: 'pulse',
                      theme: {
                        dark: {
                          bgColor: 'base-800',
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
                      color: 'base-500',
                      hover: { color: 'base-900', bgColor: 'base-100' },
                      theme: {
                        dark: {
                          color: 'base-400',
                          hover: { color: 'base-100', bgColor: 'base-800' },
                        },
                      },
                    },
                    variants: {
                      // Open: the chevron takes the accent everything else in the grid opens in.
                      isExpanded: {
                        color: 'accent-600',
                        theme: { dark: { color: 'accent-400' } },
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
                  color: 'base-500',
                  hover: { color: 'base-900' },
                  theme: {
                    dark: {
                      color: 'base-400',
                      hover: { color: 'base-100' },
                    },
                  },
                },
                variants: {
                  // Open: the chevron takes the accent the row's own bar is drawn in.
                  isExpanded: {
                    color: 'accent-600',
                    theme: { dark: { color: 'accent-400' } },
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
              borderColor: 'base-200',
              bgColor: 'base-50',
              // What a panel opening below the fold scrolls to. `nearest` aligns the panel's own top
              // when it is taller than the viewport, which would push the row that opened it off the
              // screen — a scroll margin one row deep makes that row part of what gets revealed.
              css: { scrollMarginBlockStart: 'var(--row-height)' },
              theme: {
                dark: {
                  borderColor: 'base-800',
                  bgColor: 'base-950',
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
                  borderColor: 'accent-500',
                  // The panel is the detail row's single cell, so it holds focus like any other.
                  focusVisible: {
                    outline: 2,
                    outlineStyle: 'solid',
                    outlineOffset: -2,
                    outlineColor: 'accent-500',
                  },
                  theme: {
                    dark: {
                      borderColor: 'accent-400',
                      focusVisible: {
                        outlineColor: 'accent-400',
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
          borderColor: 'base-200',
          theme: {
            dark: {
              bgColor: 'base-900',
              borderColor: 'base-800',
            },
          },
        },
        children: {
          cell: {
            styles: {
              fontWeight: 600,
              color: 'base-900',
              theme: { dark: { color: 'base-50' } },
            },
          },
          label: {
            styles: {
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.2,
              color: 'base-500',
              theme: {
                dark: {
                  color: 'base-400',
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
          borderColor: 'base-200',
          // A narrow grid wraps the bar rather than pushing its last button out of reach.
          flexWrap: 'wrap',
          columnGap: 4,
          rowGap: 0,
          ai: 'center',
          fontSize: 13,
          color: 'base-500',
          theme: {
            dark: {
              bgColor: 'base-900',
              borderColor: 'base-800',
              color: 'base-400',
            },
          },
        },
        children: {
          info: {
            styles: { textWrap: 'nowrap' },
          },
          clearFilters: {
            clean: true,
            styles: BAR_BUTTON,
          },
          // The selection's count and its buttons, at the far end: the rows and the selection are two subjects.
          selection: {
            styles: { ai: 'center', flexWrap: 'wrap', columnGap: 4, rowGap: 0, ms: 'auto' },
          },
          action: {
            clean: true,
            styles: BAR_BUTTON,
            variants: {
              // "Show selected" while it is on: a toggle has to look pressed, not only say so to a screen reader.
              pressed: {
                bgColor: 'accent-50',
                color: 'accent-700',
                hover: { bgColor: 'accent-100', color: 'accent-800' },
                theme: {
                  dark: { bgColor: 'accent-500/15', color: 'accent-300', hover: { bgColor: 'accent-500/25', color: 'accent-200' } },
                },
              },
            },
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
      // The grid on a phone: a row is a list item, divided rather than carded (NN/g, "Cards"). Only the paint is
      // here, because every engine entry carries this tree; the layout is in the list's own chunk.
      list: {
        styles: {},
        children: {
          toolbar: {
            styles: { bb: 1, borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } },
            children: {
              count: { styles: { color: 'base-500', theme: { dark: { color: 'base-400' } } } },
              search: {
                styles: {
                  bgColor: 'base-100',
                  focus: { outline: 2, outlineStyle: 'solid', outlineColor: 'accent-500', bgColor: 'white' },
                  theme: { dark: { bgColor: 'base-800', focus: { bgColor: 'base-900' } } },
                },
              },
              button: {
                clean: true,
                styles: {
                  b: 1,
                  borderColor: 'base-200',
                  color: 'base-700',
                  active: { bgColor: 'base-100' },
                  focusVisible: FOCUS_RING,
                  theme: { dark: { borderColor: 'base-700', color: 'base-200', active: { bgColor: 'base-800' } } },
                },
                variants: {
                  active: {
                    bgColor: 'accent-50',
                    borderColor: 'accent-200',
                    color: 'accent-700',
                    theme: { dark: { bgColor: 'accent-500/15', borderColor: 'accent-500/40', color: 'accent-300' } },
                  },
                },
              },
              chip: { styles: { bgColor: 'base-100', theme: { dark: { bgColor: 'base-800' } } } },
            },
          },
          // The rows themselves are `List.Item`s, styled by the `list` tree. These are the grid's own inside one: a tree's
          // chevron and the row-detail toggle, and the detail panel under it.
          toggle: {
            clean: true,
            styles: { color: 'accent-600', focusVisible: FOCUS_RING, theme: { dark: { color: 'accent-300' } } },
          },
          detail: { styles: { bgColor: 'base-50', theme: { dark: { bgColor: 'base-800/60' } } } },
          button: {
            clean: true,
            styles: {
              b: 1,
              borderColor: 'base-200',
              color: 'base-700',
              active: { bgColor: 'base-100' },
              disabled: { opacity: 0.4 },
              focusVisible: FOCUS_RING,
              theme: { dark: { borderColor: 'base-700', color: 'base-200', active: { bgColor: 'base-800' } } },
            },
          },
          // What a selection is for sits where a thumb is: pinned to the bottom of the screen while rows are ticked.
          selectionBar: {
            styles: { bgColor: 'base-900', color: 'white', theme: { dark: { bgColor: 'base-100', color: 'base-900' } } },
          },
          // The sort, the filters and the record view: a modal `<dialog>` docked to the bottom edge, where a thumb
          // is, that slides up as it opens and back down as it closes.
          sheet: {
            styles: {
              m: 0,
              mt: 'auto',
              p: 0,
              width: 'fit',
              b: 0,
              borderRadiusTop: 5,
              bgColor: 'white',
              color: 'base-900',
              shadow: 'large',
              css: { maxWidth: 'none', maxHeight: 'calc(100dvh - 2rem)', ...OVERFLOW_AFTER_ENTRANCE },
              startingStyle: { translateY: '1/1', overflow: 'hidden' },
              transitionBehavior: 'allow-discrete',
              not: { open: { translateY: '1/1', display: 'none', overflow: 'hidden', css: OVERFLOW_BEFORE_EXIT } },
              backdrop: { bgColor: 'black/40', transition: 'opacity', startingStyle: { opacity: 0 }, not: { open: { opacity: 0 } } },
              theme: { dark: { bgColor: 'base-900', color: 'base-100' } },
            },
            children: {
              line: { styles: { borderColor: 'base-100', theme: { dark: { borderColor: 'base-800' } } } },
              input: {
                styles: {
                  b: 1,
                  borderColor: 'base-300',
                  bgColor: 'white',
                  focus: { outline: 2, outlineStyle: 'solid', outlineOffset: -1, outlineColor: 'accent-500' },
                  theme: { dark: { bgColor: 'base-800', borderColor: 'base-700' } },
                },
              },
              chip: {
                clean: true,
                styles: {
                  b: 1,
                  borderColor: 'base-300',
                  focusVisible: FOCUS_RING,
                  ariaAttr: { pressed: { bgColor: 'accent-600', borderColor: 'accent-600', color: 'white' } },
                  theme: { dark: { borderColor: 'base-600', ariaAttr: { pressed: { bgColor: 'accent-500', borderColor: 'accent-500' } } } },
                },
              },
              button: {
                clean: true,
                styles: {
                  color: 'base-700',
                  active: { bgColor: 'base-100' },
                  disabled: { opacity: 0.3 },
                  focusVisible: FOCUS_RING,
                  theme: { dark: { color: 'base-200', active: { bgColor: 'base-800' } } },
                },
              },
              primary: {
                clean: true,
                styles: {
                  bgColor: 'accent-600',
                  color: 'white',
                  active: { bgColor: 'accent-700' },
                  focusVisible: FOCUS_RING,
                  theme: { dark: { bgColor: 'accent-500', active: { bgColor: 'accent-600' } } },
                },
              },
            },
          },
        },
      },
    },
  },
  // A dashboard is a CSS grid and nothing else: a widget's place is `grid-column`/`grid-row`, which is a
  // class, so a layout of any size costs no measured pixel and no inline style until one is being dragged.
  dashboard: {
    styles: {
      position: 'relative',
      display: 'grid',
      // Its own width decides how many columns there are, not the page's — so the same dashboard is
      // arranged in a main column and stacked in a sidebar, with nothing listening for a resize.
      container: true,
      gridTemplateColumns: 1,
      gap: 4,
      // The height of one row, which every item's `h` is counted in. A variable rather than a prop
      // because it is per instance and `grid-auto-rows` has none — and as a variable a consumer can
      // still set it per breakpoint or per theme.
      css: { gridAutoRows: 'var(--dashboard-row, 6rem)' },
    },
    variants: {
      // While a widget is held: a drag must not select the text under the pointer, and on a touch screen
      // it must not scroll the page out from under the widget instead of moving it.
      dragging: { userSelect: 'none', css: { touchAction: 'none' } },
    },
    children: {
      // Where the held widget will land, drawn in its snapped cell while the widget itself follows the
      // pointer. It is placed by the same grid props every widget uses, so it costs one more class.
      placeholder: {
        styles: {
          borderRadius: 2,
          b: 2,
          borderStyle: 'dashed',
          borderColor: 'accent-400',
          bgColor: 'accent-500/10',
          pointerEvents: 'none',
          theme: { dark: { borderColor: 'accent-500' } },
          forcedColors: { borderColor: 'Highlight' },
        },
      },
    },
  },
  // The chrome round whatever a widget shows: a title bar, the four states a panel fed by a request can
  // be in, and the two handles that only exist where there is room to arrange anything.
  widget: {
    styles: {
      // The corner handle is placed against this, which is also why it is here rather than on the header.
      position: 'relative',
      display: 'flex',
      d: 'column',
      // A grid item's floor is its content, so a tall widget would push its own row open without this.
      minHeight: 0,
      overflow: 'hidden',
      bgColor: 'white',
      b: 1,
      borderColor: 'base-200',
      borderRadius: 2,
      shadow: 'xs',
      theme: { dark: { bgColor: 'base-900', borderColor: 'base-800' } },
      // A widget added to a dashboard arrives rather than appearing. Plain props only, and nothing here
      // transitions per frame, so it costs the drag nothing.
      startingStyle: { opacity: 0, scale: 0.98 },
    },
    variants: {
      // The held one. `transition: none` is the whole reason this variant exists: every Box carries a
      // 250ms `all`, which would otherwise interpolate the per-frame translate a drag writes and leave
      // the widget a fifth of a second behind the pointer (#151).
      dragging: { shadow: 'large', zIndex: 10, cursor: 'grabbing', transition: 'none' },
      // The keyboard's equivalent: picked up, waiting for the arrows. A ring rather than a shadow,
      // because it has to be visible in a forced-colors mode where every shadow is thrown away.
      grabbed: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2 },
    },
    children: {
      header: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          px: 4,
          py: 3,
          bb: 1,
          borderColor: 'base-100',
          theme: { dark: { borderColor: 'base-800' } },
        },
      },
      // The title and its description, stacked, so the bar itself stays one row however many lines they are.
      label: {
        styles: { display: 'flex', d: 'column', flexGrow: 1, minWidth: 0 },
      },
      title: {
        styles: {
          // A long title truncates rather than pushing the actions off the end of the bar.
          minWidth: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          fontSize: 14,
          lineHeight: 20,
          fontWeight: 600,
          color: 'base-900',
          m: 0,
          theme: { dark: { color: 'base-100' } },
        },
      },
      description: {
        styles: { fontSize: 12, lineHeight: 16, color: 'base-500', theme: { dark: { color: 'base-400' } } },
      },
      actions: { styles: { display: 'flex', ai: 'center', gap: 1 } },
      // Both handles are this one node: a bare button, invisible until the dashboard is in edit mode and
      // shown by a container query rather than by state, since the arrangement can only be edited where
      // the grid is rendering the space the layout is written in. `corner` is the resize one — the same
      // button, in the corner, with the one thing that cannot mirror on its own.
      handle: {
        styles: {
          display: 'none',
          ai: 'center',
          jc: 'center',
          width: 6,
          height: 6,
          p: 0,
          b: 0,
          borderRadius: 1,
          bgColor: 'transparent',
          color: 'base-400',
          cursor: 'grab',
          hover: { bgColor: 'base-100', color: 'base-700' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 1 },
          theme: { dark: { color: 'base-500', hover: { bgColor: 'base-800', color: 'base-200' } } },
        },
        variants: {
          editable: { display: 'flex' },
          grabbed: { cursor: 'grabbing', color: 'accent-600', theme: { dark: { color: 'accent-400' } } },
          // A resize cursor names a physical diagonal, so it is the one part of this that a logical inset
          // cannot mirror for itself.
          corner: { position: 'absolute', bottom: 0, insetEnd: 0, cursor: 'nwse-resize', rtl: { cursor: 'nesw-resize' } },
        },
      },
      body: {
        styles: { flexGrow: 1, minHeight: 0, p: 4, overflow: 'auto', fontSize: 14, lineHeight: 20 },
      },
      // What stands in the body when there is nothing to draw: the empty state, and the error with its
      // retry. One node for both, because they differ in their words rather than in their shape.
      message: {
        styles: {
          display: 'flex',
          d: 'column',
          ai: 'center',
          jc: 'center',
          gap: 2,
          height: 'fit',
          textAlign: 'center',
          fontSize: 13,
          lineHeight: 18,
          color: 'base-500',
          theme: { dark: { color: 'base-400' } },
        },
        variants: {
          error: { color: 'red-600', theme: { dark: { color: 'red-400' } } },
        },
      },
      // The retry an error state offers. A link rather than a button to look at: the widget has already
      // said something went wrong, and a second filled button would compete with the page's own.
      retry: {
        styles: {
          p: 0,
          b: 0,
          bgColor: 'transparent',
          color: 'accent-600',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'underline',
          hover: { color: 'accent-700' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2, borderRadius: 1 },
          theme: { dark: { color: 'accent-400', hover: { color: 'accent-300' } } },
        },
      },
      // The loading state: bars where the content will be. `pulse` is a registered preset, so it stops
      // itself under `prefers-reduced-motion` with nothing declared here.
      skeleton: {
        styles: {
          display: 'flex',
          d: 'column',
          gap: 2,
          height: 'fit',
          animation: 'pulse',
        },
        children: {
          bar: {
            styles: { height: 3, borderRadius: 1, bgColor: 'base-200', theme: { dark: { bgColor: 'base-800' } } },
          },
        },
      },
    },
  },
  // One call an agent made. A card whose header is a button only when there is something under it, and
  // whose body opens in the same one-row grid `Accordion` uses — equal values share a class, so the
  // fourth copy of that mechanism in this file costs nothing.
  toolCall: {
    styles: {
      display: 'flex',
      d: 'column',
      // A rounded card whose header tints on hover: without this the tint squares off the top corners.
      overflow: 'hidden',
      bgColor: 'white',
      b: 1,
      borderColor: 'base-200',
      borderRadius: 2,
      fontSize: 13,
      lineHeight: 18,
      theme: { dark: { bgColor: 'base-900', borderColor: 'base-800' } },
    },
    children: {
      header: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          // The whole row, so the target is the header rather than the words in it.
          width: 'fit',
          px: 3,
          py: 2,
          m: 0,
          b: 0,
          textAlign: 'start',
          bgColor: 'transparent',
          color: 'base-900',
          theme: { dark: { color: 'base-100' } },
        },
        variants: {
          // Only when there is a body to open: a card with nothing under it renders a row, not a control,
          // so nothing here may make a plain row look pressable.
          interactive: {
            cursor: 'pointer',
            transition: 'colors',
            hover: { bgColor: 'base-50' },
            focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: -2 },
            theme: { dark: { hover: { bgColor: 'base-800' } } },
          },
        },
      },
      // The name and its line of prose, stacked, so the header stays one row however long either is.
      summary: {
        styles: { display: 'flex', d: 'column', gap: 0.5, flexGrow: 1, minWidth: 0 },
      },
      name: {
        styles: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontWeight: 600, css: { fontFamily: FONT_MONO } },
      },
      description: {
        styles: { fontSize: 12, lineHeight: 16, color: 'base-500', theme: { dark: { color: 'base-400' } } },
      },
      // The state, in a word. A transparent border in every mode so a forced-colors one can draw the chip
      // without the row changing height when it does.
      status: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 1.5,
          flexShrink: 0,
          px: 2,
          py: 0.5,
          b: 1,
          borderColor: 'transparent',
          borderRadius: 2,
          fontSize: 11,
          lineHeight: 16,
          fontWeight: 500,
          bgColor: 'base-100',
          color: 'base-700',
          forcedColors: { borderColor: 'CanvasText' },
          theme: { dark: { bgColor: 'base-800', color: 'base-300' } },
        },
        variants: {
          pending: {},
          running: { bgColor: 'accent-50', color: 'accent-700', theme: { dark: { bgColor: 'accent-950', color: 'accent-300' } } },
          success: { bgColor: 'emerald-50', color: 'emerald-700', theme: { dark: { bgColor: 'emerald-950', color: 'emerald-300' } } },
          error: { bgColor: 'red-50', color: 'red-700', theme: { dark: { bgColor: 'red-950', color: 'red-300' } } },
        },
        children: {
          dot: {
            styles: { width: 1.5, height: 1.5, borderRadius: 4, bgColor: 'currentColor', flexShrink: 0 },
            variants: {
              // A registered preset, so it stops itself under `prefers-reduced-motion` with nothing here.
              running: { animation: 'pulse' },
            },
          },
        },
      },
      arrow: {
        styles: { width: 1.5, height: 1.5, bt: 1.5, br: 1.5, borderColor: 'currentColor', rotate: 135, opacity: 0.6, flexShrink: 0 },
        variants: {
          open: { rotate: -45 },
        },
      },
      track: {
        styles: { display: 'grid', css: { gridTemplateRows: '1fr' } },
        variants: {
          closed: { css: { gridTemplateRows: '0fr' }, visibility: 'hidden' },
        },
      },
      clip: {
        styles: { minHeight: 0, overflow: 'hidden' },
      },
      body: {
        styles: { display: 'flex', d: 'column', gap: 3, px: 3, pb: 3 },
      },
      section: {
        styles: { display: 'flex', d: 'column', gap: 1 },
      },
      label: {
        styles: {
          fontSize: 11,
          lineHeight: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'base-500',
          theme: { dark: { color: 'base-400' } },
        },
      },
      // What the model actually sent, as it stands. Capped in height rather than in the card: a long
      // result scrolls where it is instead of making the transcript around it unreadable.
      value: {
        styles: {
          m: 0,
          p: 2,
          borderRadius: 1,
          bgColor: 'base-50',
          color: 'base-800',
          fontSize: 12,
          lineHeight: 18,
          maxHeight: 64,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          css: { fontFamily: FONT_MONO, wordBreak: 'break-word' },
          theme: { dark: { bgColor: 'base-950', color: 'base-200' } },
        },
      },
      truncated: {
        styles: { fontSize: 11, lineHeight: 16, color: 'base-500', theme: { dark: { color: 'base-400' } } },
      },
    },
  },
  // The gate in front of something the agent wants to do: the same surface a tool call is, with the one
  // thing that says it is waiting for an answer.
  approval: {
    styles: {
      position: 'relative',
      display: 'flex',
      d: 'column',
      gap: 3,
      p: 4,
      // Room for the bar, which is drawn rather than bordered — `borderColor` takes all four sides, so
      // an accent on one edge is the toaster's trick: an absolutely positioned `before`.
      ps: 5,
      b: 1,
      borderRadius: 2,
      overflow: 'hidden',
      bgColor: 'white',
      borderColor: 'base-200',
      fontSize: 13,
      lineHeight: 18,
      before: { position: 'absolute', insetStart: 0, insetY: 0, width: 1, bgColor: 'amber-500' },
      theme: { dark: { bgColor: 'base-900', borderColor: 'base-800' } },
    },
    variants: {
      // Amber until it is answered, and then the colour of the answer — beside the word, never instead
      // of it, since a forced-colors mode keeps one and throws the other away.
      approved: { before: { bgColor: 'emerald-500' } },
      rejected: { before: { bgColor: 'base-400' } },
    },
    children: {
      title: {
        styles: { fontSize: 14, lineHeight: 20, fontWeight: 600, color: 'base-900', theme: { dark: { color: 'base-100' } } },
      },
      description: {
        styles: { color: 'base-600', theme: { dark: { color: 'base-400' } } },
      },
      section: {
        styles: { display: 'flex', d: 'column', gap: 1 },
      },
      label: {
        styles: {
          fontSize: 11,
          lineHeight: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'base-500',
          theme: { dark: { color: 'base-400' } },
        },
      },
      value: {
        styles: {
          m: 0,
          p: 2,
          borderRadius: 1,
          bgColor: 'base-50',
          color: 'base-800',
          fontSize: 12,
          lineHeight: 18,
          maxHeight: 64,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          css: { fontFamily: FONT_MONO, wordBreak: 'break-word' },
          theme: { dark: { bgColor: 'base-950', color: 'base-200' } },
        },
      },
      truncated: {
        styles: { fontSize: 11, lineHeight: 16, color: 'base-500', theme: { dark: { color: 'base-400' } } },
      },
      // No gap: the decision's live region is always rendered and is empty until there is a decision, so
      // a gap here would be a gap around nothing for as long as the card is unanswered.
      footer: {
        styles: { display: 'flex', ai: 'center', jc: 'flex-end' },
      },
      actions: {
        styles: { display: 'flex', ai: 'center', gap: 2 },
      },
      button: {
        styles: {
          px: 3,
          py: 2,
          b: 1,
          borderRadius: 1,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'colors',
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2 },
          disabled: { opacity: 0.6, cursor: 'default' },
        },
        variants: {
          approve: {
            bgColor: 'accent-600',
            borderColor: 'accent-600',
            color: 'white',
            hover: { bgColor: 'accent-700', borderColor: 'accent-700' },
            disabled: { hover: { bgColor: 'accent-600', borderColor: 'accent-600' } },
          },
          reject: {
            bgColor: 'transparent',
            borderColor: 'base-300',
            color: 'base-700',
            hover: { bgColor: 'base-100' },
            disabled: { hover: { bgColor: 'transparent' } },
            theme: { dark: { borderColor: 'base-700', color: 'base-200', hover: { bgColor: 'base-800' } } },
          },
        },
      },
      decision: {
        styles: { fontWeight: 600 },
        variants: {
          approved: { color: 'emerald-700', theme: { dark: { color: 'emerald-300' } } },
          rejected: { color: 'base-600', theme: { dark: { color: 'base-400' } } },
        },
      },
    },
  },
  // What the model was thinking: a disclosure with no card round it, because a chain of thought is an
  // aside in a transcript rather than a section of one.
  reasoning: {
    styles: { display: 'flex', d: 'column', gap: 1 },
    children: {
      trigger: {
        styles: {
          display: 'flex',
          ai: 'center',
          gap: 2,
          p: 0,
          b: 0,
          textAlign: 'start',
          bgColor: 'transparent',
          cursor: 'pointer',
          transition: 'colors',
          fontSize: 13,
          lineHeight: 18,
          fontWeight: 500,
          color: 'base-500',
          hover: { color: 'base-700' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2, borderRadius: 1 },
          theme: { dark: { color: 'base-400', hover: { color: 'base-200' } } },
        },
        variants: {
          streaming: { animation: 'pulse' },
        },
      },
      // Before the label rather than after it, so closed it points along the reading order — one
      // `:dir(rtl)` rule, the way the submenu chevron does it — and open it points down in both.
      arrow: {
        styles: {
          width: 1.5,
          height: 1.5,
          bt: 1.5,
          br: 1.5,
          borderColor: 'currentColor',
          rotate: 45,
          opacity: 0.6,
          flexShrink: 0,
          rtl: { rotate: -135 },
        },
        variants: {
          open: { rotate: 135, rtl: { rotate: 135 } },
        },
      },
      duration: {
        styles: { fontSize: 11, lineHeight: 16, fontWeight: 400, opacity: 0.8 },
      },
      track: {
        styles: { display: 'grid', css: { gridTemplateRows: '1fr' } },
        variants: {
          closed: { css: { gridTemplateRows: '0fr' }, visibility: 'hidden' },
        },
      },
      clip: {
        styles: { minHeight: 0, overflow: 'hidden' },
      },
      // A rule down the inline start, so a right-to-left transcript draws it on the right with nothing
      // declared twice.
      body: {
        styles: {
          ps: 3,
          bs: 2,
          borderColor: 'base-200',
          fontSize: 13,
          lineHeight: 20,
          color: 'base-600',
          whiteSpace: 'pre-wrap',
          theme: { dark: { borderColor: 'base-800', color: 'base-400' } },
        },
      },
    },
  },
  // Markdown rendered by somebody else's parser, with this engine's classes on it. The root is what a
  // caller wraps the renderer in; every node below inherits its size and colour, so restyling the prose
  // is one place. Each inline node says `display: inline` — the base class is `block`.
  markdown: {
    styles: { fontSize: 14, lineHeight: 22, color: 'base-700', theme: { dark: { color: 'base-300' } } },
    children: {
      heading: {
        styles: { fontWeight: 600, mt: 5, mb: 2, color: 'base-900', theme: { dark: { color: 'base-100' } } },
        variants: {
          level1: { fontSize: 24, lineHeight: 32 },
          level2: { fontSize: 20, lineHeight: 28 },
          level3: { fontSize: 17, lineHeight: 24 },
          level4: { fontSize: 15, lineHeight: 22 },
          level5: { fontSize: 14, lineHeight: 20 },
          level6: { fontSize: 13, lineHeight: 18, color: 'base-500', theme: { dark: { color: 'base-400' } } },
        },
      },
      paragraph: { styles: { my: 2 } },
      link: {
        styles: {
          display: 'inline',
          color: 'accent-600',
          textDecoration: 'underline',
          hover: { color: 'accent-700' },
          focusVisible: { outline: 2, outlineColor: 'accent-500', outlineOffset: 2, borderRadius: 1 },
          theme: { dark: { color: 'accent-400', hover: { color: 'accent-300' } } },
        },
      },
      list: {
        styles: { my: 2, ps: 5, listStyle: 'disc' },
        variants: { ordered: { listStyle: 'decimal' } },
      },
      item: { styles: { display: 'list-item', my: 1 } },
      quote: {
        styles: {
          my: 3,
          ps: 4,
          bs: 2,
          borderColor: 'base-300',
          color: 'base-600',
          theme: { dark: { borderColor: 'base-700', color: 'base-400' } },
        },
      },
      // The chip. A fenced block never wears it, because `pre` renders the fence itself.
      code: {
        styles: {
          display: 'inline',
          px: 1,
          py: 0.25,
          borderRadius: 1,
          fontSize: 13,
          bgColor: 'base-100',
          css: { fontFamily: FONT_MONO },
          color: 'pink-700',
          theme: { dark: { bgColor: 'base-800', color: 'pink-300' } },
        },
      },
      codeBlock: {
        styles: {
          position: 'relative',
          my: 3,
          p: 3,
          borderRadius: 2,
          overflow: 'auto',
          bgColor: 'base-900',
          color: 'base-100',
          fontSize: 13,
          lineHeight: 20,
          css: { fontFamily: FONT_MONO },
          theme: { dark: { bgColor: 'base-950' } },
        },
        children: {
          language: {
            styles: { position: 'absolute', top: 2, insetEnd: 3, fontSize: 11, color: 'base-400', userSelect: 'none' },
          },
          code: { styles: { display: 'block', css: { fontFamily: FONT_MONO } } },
        },
      },
      rule: {
        styles: { my: 5, bt: 1, borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } },
      },
      image: { styles: { my: 3, maxWidth: 'fit', borderRadius: 2 } },
      // The scroller is the wrapper rather than the table: a table that scrolls itself loses its layout.
      tableWrap: { styles: { my: 3, overflow: 'auto' } },
      table: { styles: { display: 'table', width: 'fit', fontSize: 13, css: { borderCollapse: 'collapse' } } },
      row: {
        styles: { display: 'table-row', bb: 1, borderColor: 'base-200', theme: { dark: { borderColor: 'base-800' } } },
      },
      cell: {
        styles: { display: 'table-cell', px: 3, py: 2, textAlign: 'start', css: { verticalAlign: 'top' } },
        variants: { header: { fontWeight: 600, color: 'base-900', theme: { dark: { color: 'base-100' } } } },
      },
      inline: {
        styles: { display: 'inline' },
        variants: {
          strong: { fontWeight: 600, color: 'base-900', theme: { dark: { color: 'base-100' } } },
          struck: { textDecoration: 'line-through', opacity: 0.7 },
        },
      },
      checkbox: { styles: { display: 'inline-block', me: 1.5, accentColor: 'accent-600' } },
    },
  },
  // Where content will be. Two elements per bar rather than one, because the gloss travels and the bar
  // it travels inside has to clip it.
  skeleton: {
    styles: { display: 'flex', d: 'column', gap: 2, width: 'fit' },
    children: {
      bar: {
        styles: {
          position: 'relative',
          overflow: 'hidden',
          height: 3,
          borderRadius: 1,
          bgColor: 'base-200',
          theme: { dark: { bgColor: 'base-800' } },
        },
        variants: {
          // A paragraph's last line stops short of the margin, and bars of one length read as a table.
          short: { width: '3/5' },
          // Far past any avatar, so one radius rounds every size the caller gives.
          circle: { width: 10, height: 'auto', aspectRatio: 'square', borderRadius: 100 },
        },
      },
      // A named duration is outside what `--transitionTime` zeroes, so the sweep has to stop itself.
      gloss: {
        styles: {
          position: 'absolute',
          inset: 0,
          bgGradient: { linear: 'r', colors: ['transparent', 'white/60', 'transparent'] },
          animationName: 'rb-skeleton-sweep',
          animationDuration: 1600,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          rtl: { animationDirection: 'reverse' },
          motionReduce: { animationName: 'none' },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['transparent', 'white/10', 'transparent'] } } },
        },
      },
    },
  },
  // What the agent is saying, as it arrives. Two children and no third: the settled text is a bare text
  // node, because wrapping it would be an element that grows without bound.
  streamingText: {
    styles: { whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 22, color: 'base-700', theme: { dark: { color: 'base-300' } } },
    children: {
      // Opacity alone, and `display: inline` rather than the base class's `block`: a transform on an
      // inline box does nothing, and inline-block would stop a run wrapping mid-word.
      segment: {
        styles: { display: 'inline', transition: 'opacity', startingStyle: { opacity: 0 } },
      },
      // `1em` and `0.5em` rather than the rem scale, because a caret follows the text it sits in.
      caret: {
        styles: {
          display: 'inline-block',
          ms: 0.5,
          borderRadius: 0.5,
          bgColor: 'currentColor',
          animation: 'pulse',
          css: { width: '0.5em', height: '1em', verticalAlign: 'text-bottom' },
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

// The list family, in an object of its own. One literal holding every tree is a type too long for the
// declaration emitter to write out (TS7056), so the export is two named halves rather than one.
const listComponents = {
  // A list of things a person reads and picks from. Paint only, since every engine entry carries this tree: the
  // geometry is the parts' own default props. Most of it is mixed from `currentColor`, so it follows any theme
  // without a second rule, and the look reaches the items as custom properties — a list has no context to pass.
  list: {
    styles: {},
    variants: {
      plain: { vars: { 'list-divider': 'transparent' } },
      card: {
        b: 1,
        borderColor: 'currentColor/12',
        borderRadius: 3,
        bgColor: 'white',
        // `clip`, not `hidden`: the corners clip and the list is still no scroll container, so a sticky label sticks.
        css: { overflow: 'clip' },
        theme: { dark: { bgColor: 'base-900' } },
      },
      separated: {
        display: 'flex',
        d: 'column',
        gap: 2,
        vars: { 'list-divider': 'transparent', 'list-item-frame': `1px solid ${HAIRLINE}`, 'list-item-radius': '0.75rem' },
      },
    },
    children: {
      item: {
        styles: {
          // The line between items is the component's `::before`; this is its colour, which `plain` and `separated`
          // take away from up the tree.
          before: { css: { backgroundColor: `var(--list-divider, ${HAIRLINE})` } },
          // Pressable when it holds a `List.Action`, so the states are read off that rather than a prop.
          has: {
            '[data-list-action]:active': { bgColor: 'currentColor/8' },
            '[data-list-action][aria-current]:not([aria-current=false])': { bgColor: 'accent-500/15' },
            '[data-list-action]:disabled': { opacity: 0.5 },
          },
          pointerFine: { has: { '[data-list-action]:hover': { bgColor: 'currentColor/4' } } },
        },
        variants: {
          // Its own hover too, or the item's hover tint would replace the selection while the pointer is on it.
          selected: { bgColor: 'accent-500/10', pointerFine: { has: { '[data-list-action]:hover': { bgColor: 'accent-500/15' } } } },
          // A `SortableList` item under the pointer: lifted over its neighbours and following the pointer with no lag.
          lifted: { zIndex: 2, bgColor: 'white', shadow: 'lg', transition: 'none', theme: { dark: { bgColor: 'base-900' } } },
          // One the keyboard picked up.
          grabbed: { zIndex: 1, bgColor: 'accent-500/10', ring: 2, ringColor: 'accent-500' },
          // The commit a drop lands in: the items' offsets go back to zero there, and must not transition from them.
          settling: { transition: 'none' },
        },
      },
      media: { styles: {}, variants: { icon: MEDIA_FILL, avatar: MEDIA_FILL, image: MEDIA_FILL } },
      // The quieter half of an item: an overline, a description, a secondary row, a meta value, a field's label, a
      // chevron. A palette pair rather than a mix, since a mix inside a mix would fade twice.
      muted: { styles: { color: 'base-500', theme: { dark: { color: 'base-400' } } } },
      // The item's one primary action: the ring round the item it covers. `disabled` here is the state; as a part's
      // default prop it would be the attribute.
      action: {
        styles: {
          disabled: { cursor: 'not-allowed' },
          focusVisible: { after: { outline: 2, outlineStyle: 'solid', outlineOffset: -2, outlineColor: 'accent-500' } },
        },
      },
      // A group's label, opaque so a sticky one hides the items scrolling under it.
      label: { styles: { color: 'base-600', bgColor: 'base-50', theme: { dark: { color: 'base-300', bgColor: 'base-800' } } } },
    },
  },
  // A list item that slides aside to show the commands under it. Paint only, for the reason `list` is.
  swipeItem: {
    styles: {},
    children: {
      // Under the finger exactly while it is held: a transition would trail every frame of the drag.
      row: { styles: {}, variants: { dragging: { transition: 'none', userSelect: 'none' } } },
      tray: { styles: {}, variants: { dragging: { transition: 'none' } } },
      action: {
        styles: {
          color: 'white',
          bgColor: 'base-500',
          focusVisible: { outline: 2, outlineStyle: 'solid', outlineOffset: -4, outlineColor: 'white' },
          forcedColors: { b: 1, borderColor: 'ButtonText' },
        },
        variants: {
          accent: { bgColor: 'accent-600' },
          warning: { bgColor: 'amber-700' },
          danger: { bgColor: 'red-600' },
          // Carried far enough that letting go performs it: the outermost action takes the whole tray.
          armed: { nth: { first: { flexGrow: 1000 } } },
        },
      },
    },
  },
  // A list whose items are put in order by hand. The handle is the one part of its own.
  sortableList: {
    styles: {},
    children: {
      handle: {
        styles: {
          color: 'base-500',
          cursor: 'grab',
          borderRadius: 2,
          theme: { dark: { color: 'base-400' } },
          pointerFine: { hover: { bgColor: 'currentColor/8' } },
          focusVisible: FOCUS_RING,
        },
        variants: { grabbed: { cursor: 'grabbing', color: 'accent-600', theme: { dark: { color: 'accent-400' } } } },
      },
    },
  },
} satisfies Components;

/** A borderless control inside a date widget: a paging arrow, a calendar's title, a picker's buttons. */
const QUIET_CONTROL: BoxComponentStyles = {
  bgColor: 'transparent',
  cursor: 'pointer',
  hover: { bgColor: 'currentColor/8' },
  focusVisible: FOCUS_RING,
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
};

/** What a chosen day, month or time looks like. White on indigo reads in either theme, so it has no dark twin. */
const CHOSEN: BoxComponentStyles = { bgColor: 'accent-600', color: 'white', hover: { bgColor: 'accent-700' } };

/** The quieter half of a date widget — a separator, a weekday, a day of the next month — mixed from the text. */
const DATE_MUTED: BoxComponentStyles = { color: 'currentColor/55' };

// The date family, in an object of its own for the reason `listComponents` is. Paint only, and mixed from
// `currentColor` so a rule follows any theme with no dark twin: every engine entry carries this tree.
const dateComponents = {
  // A date, a time or both, typed a segment at a time. The frame is the text box's.
  dateField: {
    extends: 'textbox',
    styles: { px: 3, py: 2 },
    variants: {
      compact: { px: 2, py: 1, fontSize: 13 },
      invalid: { borderColor: 'red-500', hover: { borderColor: 'red-500' }, focus: { borderColor: 'red-500', outlineColor: 'red-500/30' } },
      disabled: { cursor: 'not-allowed', opacity: 0.6 },
    },
    children: {
      label: { styles: { fontWeight: 500 } },
      // Lit while it has the focus, the way a native field selects the part being edited.
      segment: {
        styles: { caretColor: 'transparent', outline: 0, focus: CHOSEN },
        variants: { placeholder: DATE_MUTED, disabled: {} },
      },
      literal: { styles: DATE_MUTED },
      zone: { styles: DATE_MUTED },
      // The input the browser validates `required` on: present, focusable by the browser, and never seen.
      validation: { styles: { position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none' } },
    },
  },
  // A month of days on APG's grid keys.
  calendar: {
    styles: {},
    children: {
      nav: { styles: QUIET_CONTROL },
      title: { styles: { ...QUIET_CONTROL, fontWeight: 600 } },
      weekday: { styles: { ...DATE_MUTED, fontWeight: 500 } },
      weekNumber: { styles: DATE_MUTED },
      // The cell carries a range's band and the day inside it the caps, so the band runs unbroken along a week.
      cell: {
        styles: {},
        variants: {
          rangeMiddle: { bgColor: 'accent-500/15' },
          rangeStart: { bgColor: 'accent-500/15', borderRadiusStart: 999 },
          rangeEnd: { bgColor: 'accent-500/15', borderRadiusEnd: 999 },
        },
      },
      day: {
        styles: { cursor: 'pointer', hover: { bgColor: 'currentColor/8' }, focusVisible: FOCUS_RING },
        variants: {
          // Today is a ring rather than a fill, so it never reads as chosen.
          today: { insetRing: 1, insetRingColor: 'accent-500' },
          selected: CHOSEN,
          outside: DATE_MUTED,
          blocked: { opacity: 0.4, cursor: 'not-allowed', hover: { bgColor: 'transparent' } },
          unavailable: { ...DATE_MUTED, textDecoration: 'line-through', cursor: 'not-allowed' },
        },
      },
      zoomItem: { styles: QUIET_CONTROL, variants: { today: { insetRing: 1, insetRingColor: 'accent-500' }, selected: CHOSEN } },
    },
  },
  // What a picker adds to its field (a `dateField`) and to its panel (a `popover`).
  datePicker: {
    styles: {},
    children: {
      // One end of a range: a field with no frame of its own, inside the range's.
      part: { styles: {} },
      trigger: { styles: { ...QUIET_CONTROL, color: 'currentColor/70' } },
      // A `pickOnly` field's button: the frame draws the focus, so the button draws nothing of its own.
      value: { styles: { cursor: 'pointer', disabled: { cursor: 'not-allowed' } }, variants: { placeholder: DATE_MUTED } },
      icon: { styles: { color: 'currentColor/70' } },
      clear: { styles: { ...QUIET_CONTROL, color: 'currentColor/55' } },
      presets: { styles: { borderColor: 'currentColor/12' } },
      preset: { styles: QUIET_CONTROL, variants: { selected: CHOSEN } },
      times: { styles: { borderColor: 'currentColor/12' } },
      time: { styles: QUIET_CONTROL, variants: { selected: CHOSEN } },
      // What stands in for the list when no time is within `min`/`max`.
      empty: { styles: { ...DATE_MUTED, borderColor: 'currentColor/12' } },
    },
  },
} satisfies Components;

const boxComponents: typeof baseComponents & typeof listComponents & typeof dateComponents = {
  ...baseComponents,
  ...listComponents,
  ...dateComponents,
};

export default boxComponents;
