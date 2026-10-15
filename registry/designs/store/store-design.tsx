'use client';
import Box from '@box-kite/react';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * The store's design: the built-in components restyled for this one brand, in light and dark. It registers
 * nothing — `Box.createComponents()` returns a design, and `StoreSurface` applies it to its subtree only, so
 * the store can sit inside an app that looks like something else.
 */
export const storeDesign = Box.createComponents({
  // The kiln glow: the one gradient the brand spends on an action, so a primary button is never in doubt.
  button: {
    styles: {
      bgColor: 'orange-700',
      bgGradient: { linear: 'r', colors: ['orange-700', 'rose-700'] },
      color: 'white',
      borderRadius: 999,
      px: 6,
      fontWeight: 600,
      shadow: 'md',
      shadowColor: 'orange-700/25',
      transition: 'all',
      hover: { bgGradient: { linear: 'r', colors: ['orange-800', 'rose-800'] }, translateY: -0.5, shadow: 'lg' },
      active: { translateY: 0, shadow: 'sm' },
      focus: { outlineColor: 'orange-300' },
      disabled: {
        bgGradient: { linear: 'r', colors: ['stone-200', 'stone-200'] },
        color: 'stone-500',
        shadow: 'none',
        hover: { bgGradient: { linear: 'r', colors: ['stone-200', 'stone-200'] }, translateY: 0 },
      },
      theme: {
        dark: {
          bgColor: 'orange-300',
          bgGradient: { linear: 'r', colors: ['amber-300', 'orange-300', 'rose-300'] },
          color: 'stone-950',
          shadowColor: 'orange-400/20',
          hover: { bgGradient: { linear: 'r', colors: ['amber-200', 'orange-200', 'rose-200'] } },
          focus: { outlineColor: 'orange-700' },
          disabled: {
            bgGradient: { linear: 'r', colors: ['stone-800', 'stone-800'] },
            color: 'stone-500',
            hover: { bgGradient: { linear: 'r', colors: ['stone-800', 'stone-800'] } },
          },
        },
      },
    },
    variants: {
      secondary: {
        bgColor: 'white/60',
        bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
        color: 'stone-900',
        borderColor: 'stone-300',
        shadow: 'none',
        hover: { bgColor: 'white', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, shadow: 'sm' },
        active: { bgColor: 'stone-100' },
        focus: { borderColor: 'stone-900', outlineColor: 'orange-300' },
        theme: {
          dark: {
            bgColor: 'white/5',
            bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
            color: 'stone-100',
            borderColor: 'stone-700',
            hover: { bgColor: 'white/10', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] } },
            active: { bgColor: 'stone-700' },
            focus: { borderColor: 'stone-300', outlineColor: 'orange-700' },
          },
        },
      },
      ghost: {
        bgColor: 'transparent',
        bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
        color: 'stone-700',
        shadow: 'none',
        hover: {
          bgColor: 'stone-900/5',
          bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
          translateY: 0,
          shadow: 'none',
        },
        active: { bgColor: 'stone-900/10' },
        disabled: { bgColor: 'transparent', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, color: 'stone-400' },
        theme: {
          dark: {
            bgColor: 'transparent',
            bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] },
            color: 'stone-300',
            hover: { bgColor: 'white/10', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] } },
            active: { bgColor: 'white/15' },
            disabled: { bgColor: 'transparent', bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, color: 'stone-600' },
          },
        },
      },
    },
  },
  textbox: {
    styles: {
      width: 'fit',
      borderColor: 'stone-300',
      bgColor: 'white',
      color: 'stone-900',
      hover: { borderColor: 'stone-400' },
      focus: { borderColor: 'orange-700', outlineColor: 'orange-200' },
      ariaAttr: { invalid: { borderColor: 'red-600', focus: { outlineColor: 'red-200' } } },
      theme: {
        dark: {
          bgColor: 'stone-900',
          color: 'stone-100',
          borderColor: 'stone-700',
          hover: { borderColor: 'stone-600' },
          focus: { borderColor: 'orange-400', outlineColor: 'orange-900' },
          ariaAttr: { invalid: { borderColor: 'red-400', focus: { outlineColor: 'red-900' } } },
        },
      },
    },
  },
  checkbox: {
    styles: {
      borderColor: 'stone-400',
      outlineColor: 'orange-200',
      hover: { borderColor: 'orange-600' },
      checked: { bgColor: 'orange-700', borderColor: 'orange-700' },
      theme: {
        dark: {
          borderColor: 'stone-500',
          outlineColor: 'orange-900',
          hover: { borderColor: 'orange-400' },
          checked: { bgColor: 'orange-600', borderColor: 'orange-600' },
        },
      },
    },
  },
  radioButton: {
    styles: {
      borderColor: 'stone-400',
      outlineColor: 'orange-200',
      hover: { borderColor: 'orange-600' },
      checked: { bgColor: 'orange-700', borderColor: 'orange-700' },
      theme: {
        dark: {
          borderColor: 'stone-500',
          outlineColor: 'orange-900',
          hover: { borderColor: 'orange-400' },
          checked: { bgColor: 'orange-600', borderColor: 'orange-600' },
        },
      },
    },
  },
  // The caption over a row of options rather than beside it: the row wraps, and the caption takes the first line whole.
  radioGroup: {
    variants: { horizontal: { flexWrap: 'wrap' } },
    children: {
      label: { styles: { width: 'fit', fontWeight: 600, color: 'stone-900', theme: { dark: { color: 'stone-100' } } } },
    },
  },
  dropdown: {
    styles: {
      width: 'fit',
      borderColor: 'stone-300',
      bgColor: 'white',
      color: 'stone-900',
      hover: { borderColor: 'stone-400' },
      focus: { borderColor: 'orange-700', outlineColor: 'orange-200' },
      theme: {
        dark: {
          bgColor: 'stone-900',
          color: 'stone-100',
          borderColor: 'stone-700',
          hover: { borderColor: 'stone-600' },
          focus: { borderColor: 'orange-400', outlineColor: 'orange-900' },
        },
      },
    },
    children: {
      items: {
        styles: {
          borderColor: 'stone-200',
          color: 'stone-900',
          theme: { dark: { bgColor: 'stone-900', borderColor: 'stone-700', color: 'stone-100' } },
        },
      },
      item: {
        styles: {
          hover: { bgColor: 'stone-100' },
          focus: { bgColor: 'orange-50' },
          selected: { bgColor: 'orange-50', hover: { bgColor: 'orange-100' } },
          theme: {
            dark: {
              hover: { bgColor: 'stone-800' },
              focus: { bgColor: 'stone-800' },
              selected: { bgColor: 'orange-950', hover: { bgColor: 'orange-900' } },
            },
          },
        },
        variants: { highlighted: { outlineColor: 'orange-600', theme: { dark: { outlineColor: 'orange-400' } } } },
      },
    },
  },
  progress: {
    styles: { height: 1.5, borderRadius: 999, bgColor: 'stone-200', theme: { dark: { bgColor: 'stone-800' } } },
    children: {
      fill: {
        styles: {
          borderRadius: 999,
          bgGradient: { linear: 'r', colors: ['amber-400', 'orange-500', 'rose-500'] },
          theme: { dark: { bgGradient: { linear: 'r', colors: ['amber-300', 'orange-400', 'rose-400'] } } },
        },
      },
    },
  },
  accordion: {
    children: {
      item: { styles: { borderColor: 'stone-200', theme: { dark: { borderColor: 'stone-800' } } } },
      trigger: {
        styles: {
          py: 4,
          fontSize: 15,
          fontWeight: 600,
          color: 'stone-900',
          hover: { color: 'orange-800' },
          ariaAttr: { expanded: { color: 'stone-900' } },
          focusVisible: { outlineColor: 'orange-600' },
          theme: { dark: { color: 'stone-100', hover: { color: 'orange-300' }, ariaAttr: { expanded: { color: 'stone-100' } } } },
        },
      },
      panel: { styles: { fontSize: 15, lineHeight: 24, color: 'stone-600', theme: { dark: { color: 'stone-400' } } } },
    },
  },
  tabs: {
    children: {
      tab: { styles: { focusVisible: { outlineColor: 'orange-600' } } },
      panel: { styles: { focusVisible: { outlineColor: 'orange-600' } } },
    },
  },
});

/** The headings' face: a book serif every system already has, so the store loads no font. */
export const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

/** The brand's gradient as type: spread it on a heading word or a label to set it in kiln light. */
export const kilnText = {
  bgGradient: { linear: 'r', colors: ['amber-600', 'orange-600', 'rose-600'] },
  bgClip: 'text',
  color: 'transparent',
  theme: { dark: { bgGradient: { linear: 'r', colors: ['amber-300', 'orange-300', 'rose-300'] } } },
} as const;

/** A card on the page: white, a hairline and a soft warm shadow, in both themes. */
export const card = {
  bgColor: 'white',
  b: 1,
  borderColor: 'stone-200/70',
  shadow: 'sm',
  shadowColor: 'orange-900/5',
  theme: { dark: { bgColor: 'stone-900', borderColor: 'white/10', shadow: 'none' } },
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
      <Box bgColor="orange-50" color="stone-900" theme={{ dark: { bgColor: 'stone-950', color: 'stone-100' } }}>
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
    <Box.Theme theme={theme} storageKey="tidewell-theme">
      <StoreSurface>
        <Box minHeight="fit-screen">{children}</Box>
      </StoreSurface>
    </Box.Theme>
  );
}
