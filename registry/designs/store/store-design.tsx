'use client';
import Box from '@box-kite/react';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * The store's design: the built-in components restyled for this one brand, in light and dark. It registers
 * nothing — `Box.createComponents()` returns a design, and `StoreSurface` applies it to its subtree only, so
 * the store can sit inside an app that looks like something else.
 */
export const storeDesign = Box.createComponents({
  // The moonbeam: the one gradient the brand spends on an action, so a primary button is never in doubt.
  button: {
    styles: {
      bgColor: 'violet-600',
      bgGradient: { linear: 'r', colors: ['violet-600', 'fuchsia-600'] },
      color: 'white',
      borderRadius: 999,
      px: 6,
      fontWeight: 600,
      shadow: 'md',
      shadowColor: 'fuchsia-700/30',
      transition: 'all',
      hover: { bgGradient: { linear: 'r', colors: ['violet-700', 'fuchsia-700'] }, translateY: -0.5, shadow: 'lg' },
      active: { translateY: 0, shadow: 'sm' },
      focus: { outlineColor: 'violet-300' },
      disabled: {
        bgGradient: { linear: 'r', colors: ['slate-200', 'slate-200'] },
        color: 'slate-500',
        shadow: 'none',
        hover: { bgGradient: { linear: 'r', colors: ['slate-200', 'slate-200'] }, translateY: 0 },
      },
      theme: {
        dark: {
          bgColor: 'violet-300',
          bgGradient: { linear: 'r', colors: ['violet-300', 'fuchsia-300', 'pink-300'] },
          color: 'slate-950',
          shadowColor: 'violet-400/20',
          hover: { bgGradient: { linear: 'r', colors: ['violet-200', 'fuchsia-200', 'pink-200'] } },
          focus: { outlineColor: 'violet-600' },
          disabled: {
            bgGradient: { linear: 'r', colors: ['slate-800', 'slate-800'] },
            color: 'slate-500',
            hover: { bgGradient: { linear: 'r', colors: ['slate-800', 'slate-800'] } },
          },
        },
      },
    },
    variants: {
      secondary: {
        bgColor: 'white/60',
        bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
        color: 'slate-900',
        borderColor: 'slate-300',
        shadow: 'none',
        hover: { bgColor: 'white', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, shadow: 'sm' },
        active: { bgColor: 'slate-100' },
        focus: { borderColor: 'slate-900', outlineColor: 'violet-300' },
        theme: {
          dark: {
            bgColor: 'white/5',
            bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
            color: 'slate-100',
            borderColor: 'slate-700',
            hover: { bgColor: 'white/10', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] } },
            active: { bgColor: 'slate-700' },
            focus: { borderColor: 'slate-300', outlineColor: 'violet-600' },
          },
        },
      },
      ghost: {
        bgColor: 'transparent',
        bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
        color: 'slate-700',
        shadow: 'none',
        hover: {
          bgColor: 'slate-900/5',
          bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
          translateY: 0,
          shadow: 'none',
        },
        active: { bgColor: 'slate-900/10' },
        disabled: { bgColor: 'transparent', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, color: 'slate-400' },
        theme: {
          dark: {
            bgColor: 'transparent',
            bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
            color: 'slate-300',
            hover: { bgColor: 'white/10', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] } },
            active: { bgColor: 'white/15' },
            disabled: { bgColor: 'transparent', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, color: 'slate-600' },
          },
        },
      },
    },
  },
  textbox: {
    styles: {
      width: 'fit',
      borderColor: 'slate-300',
      bgColor: 'white',
      color: 'slate-900',
      hover: { borderColor: 'slate-400' },
      focus: { borderColor: 'violet-600', outlineColor: 'violet-200' },
      ariaAttr: { invalid: { borderColor: 'red-600', focus: { outlineColor: 'red-200' } } },
      theme: {
        dark: {
          bgColor: 'slate-900',
          color: 'slate-100',
          borderColor: 'slate-700',
          hover: { borderColor: 'slate-600' },
          focus: { borderColor: 'violet-400', outlineColor: 'violet-900' },
          ariaAttr: { invalid: { borderColor: 'red-400', focus: { outlineColor: 'red-900' } } },
        },
      },
    },
  },
  checkbox: {
    styles: {
      borderColor: 'slate-400',
      outlineColor: 'violet-200',
      hover: { borderColor: 'violet-600' },
      checked: { bgColor: 'violet-600', borderColor: 'violet-600' },
      theme: {
        dark: {
          borderColor: 'slate-500',
          outlineColor: 'violet-900',
          hover: { borderColor: 'violet-400' },
          checked: { bgColor: 'violet-600', borderColor: 'violet-600' },
        },
      },
    },
  },
  radioButton: {
    styles: {
      borderColor: 'slate-400',
      outlineColor: 'violet-200',
      hover: { borderColor: 'violet-600' },
      checked: { bgColor: 'violet-600', borderColor: 'violet-600' },
      theme: {
        dark: {
          borderColor: 'slate-500',
          outlineColor: 'violet-900',
          hover: { borderColor: 'violet-400' },
          checked: { bgColor: 'violet-600', borderColor: 'violet-600' },
        },
      },
    },
  },
  // The caption over a row of options rather than beside it: the row wraps, and the caption takes the first line whole.
  radioGroup: {
    variants: { horizontal: { flexWrap: 'wrap' } },
    children: {
      label: { styles: { width: 'fit', fontWeight: 600, color: 'slate-900', theme: { dark: { color: 'slate-100' } } } },
    },
  },
  dropdown: {
    styles: {
      width: 'fit',
      borderColor: 'slate-300',
      bgColor: 'white',
      color: 'slate-900',
      hover: { borderColor: 'slate-400' },
      focus: { borderColor: 'violet-600', outlineColor: 'violet-200' },
      theme: {
        dark: {
          bgColor: 'slate-900',
          color: 'slate-100',
          borderColor: 'slate-700',
          hover: { borderColor: 'slate-600' },
          focus: { borderColor: 'violet-400', outlineColor: 'violet-900' },
        },
      },
    },
    children: {
      items: {
        styles: {
          borderColor: 'slate-200',
          color: 'slate-900',
          theme: { dark: { bgColor: 'slate-900', borderColor: 'slate-700', color: 'slate-100' } },
        },
      },
      item: {
        styles: {
          hover: { bgColor: 'slate-100' },
          focus: { bgColor: 'violet-50' },
          selected: { bgColor: 'violet-50', hover: { bgColor: 'violet-100' } },
          theme: {
            dark: {
              hover: { bgColor: 'slate-800' },
              focus: { bgColor: 'slate-800' },
              selected: { bgColor: 'violet-950', hover: { bgColor: 'violet-900' } },
            },
          },
        },
        variants: { highlighted: { outlineColor: 'violet-600', theme: { dark: { outlineColor: 'violet-400' } } } },
      },
    },
  },
  progress: {
    styles: { height: 1.5, borderRadius: 999, bgColor: 'slate-200', theme: { dark: { bgColor: 'slate-800' } } },
    children: {
      fill: {
        styles: {
          borderRadius: 999,
          bgGradient: { linear: 'r', colors: ['violet-500', 'fuchsia-500', 'pink-400'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['violet-400', 'fuchsia-400', 'pink-300'] } } },
        },
      },
    },
  },
  accordion: {
    children: {
      item: { styles: { borderColor: 'slate-200', theme: { dark: { borderColor: 'slate-800' } } } },
      trigger: {
        styles: {
          py: 4,
          fontSize: 15,
          fontWeight: 600,
          color: 'slate-900',
          hover: { color: 'violet-700' },
          ariaAttr: { expanded: { color: 'slate-900' } },
          focusVisible: { outlineColor: 'violet-600' },
          theme: { dark: { color: 'slate-100', hover: { color: 'violet-300' }, ariaAttr: { expanded: { color: 'slate-100' } } } },
        },
      },
      panel: { styles: { fontSize: 15, lineHeight: 24, color: 'slate-600', theme: { dark: { color: 'slate-400' } } } },
    },
  },
  tabs: {
    children: {
      tab: { styles: { focusVisible: { outlineColor: 'violet-600' } } },
      panel: { styles: { focusVisible: { outlineColor: 'violet-600' } } },
    },
  },
});

/** The headings' face: the rounded sans each system already has, so the store loads no font. */
export const DISPLAY =
  "ui-rounded, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, system-ui, sans-serif";

/** Spread on a heading: the rounded face, heavy. Last among its props, so it wins the weight. */
export const heading = { fontWeight: 800, css: { fontFamily: DISPLAY } } as const;

/** The brand's gradient as type: spread it on a heading word or a label to set it in moonlight. */
export const glowText = {
  bgGradient: { linear: 'r', colors: ['violet-600', 'fuchsia-600', 'pink-500'] },
  bgClip: 'text',
  color: 'transparent',
  theme: { dark: { bgGradient: { linear: 'r', colors: ['violet-300', 'fuchsia-300', 'pink-300'] } } },
} as const;

/** A card on the page: white, a hairline and a soft violet shadow; a pane of night glass in the dark. */
export const card = {
  bgColor: 'white',
  b: 1,
  borderColor: 'violet-200/60',
  shadow: 'sm',
  shadowColor: 'violet-900/5',
  theme: { dark: { bgColor: 'white/5', borderColor: 'white/10', shadow: 'none' } },
} as const;

/**
 * Where the pages and blocks link to. A provider rather than constants, so the same pages work under any
 * router: wrap them in `<StoreLinks.Provider value={…}>` with your own routes.
 */
export interface StoreRoutes {
  shop: string;
  product: (slug: string) => string;
  cart: string;
  checkout: string;
}

export const StoreLinks = createContext<StoreRoutes>({
  shop: '/',
  product: (slug) => `/products/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
});

export const useStoreLinks = () => useContext(StoreLinks);

/** The design and the page colours, with no theme of its own: it follows whatever theme is around it. */
export function StoreSurface({ children }: { children: ReactNode }) {
  return (
    <Box.Components value={storeDesign}>
      <Box bgColor="violet-50" color="slate-900" theme={{ dark: { bgColor: 'slate-950', color: 'slate-100' } }}>
        {children}
      </Box>
    </Box.Components>
  );
}

/**
 * A whole store page: its own light/dark switch, remembered under its own key, around `StoreSurface`.
 * Without `theme` it opens in the reader's saved choice, then their system's.
 */
export function StoreTheme({ theme, children }: { theme?: string; children: ReactNode }) {
  return (
    <Box.Theme theme={theme} storageKey="moonpop-theme">
      <StoreSurface>
        <Box minHeight="fit-screen">{children}</Box>
      </StoreSurface>
    </Box.Theme>
  );
}
