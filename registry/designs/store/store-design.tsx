'use client';
import Box from '@box-kite/react';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * The store's design: the built-in components restyled for this one brand, in light and dark. It registers
 * nothing — `Box.createComponents()` returns a design, and `StoreSurface` applies it to its subtree only, so
 * the store can sit inside an app that looks like something else.
 */
export const storeDesign = Box.createComponents({
  button: {
    styles: {
      bgColor: 'stone-900',
      color: 'stone-50',
      borderRadius: 999,
      px: 6,
      fontWeight: 600,
      hover: { bgColor: 'stone-700' },
      active: { bgColor: 'stone-800' },
      focus: { outlineColor: 'orange-400' },
      disabled: { bgColor: 'stone-200', color: 'stone-500', hover: { bgColor: 'stone-200' } },
      theme: {
        dark: {
          bgColor: 'stone-100',
          color: 'stone-900',
          hover: { bgColor: 'white' },
          active: { bgColor: 'stone-300' },
          focus: { outlineColor: 'orange-300' },
          disabled: { bgColor: 'stone-800', color: 'stone-500', hover: { bgColor: 'stone-800' } },
        },
      },
    },
    variants: {
      secondary: {
        bgColor: 'transparent',
        color: 'stone-900',
        borderColor: 'stone-300',
        hover: { bgColor: 'stone-100' },
        active: { bgColor: 'stone-200' },
        focus: { borderColor: 'stone-900', outlineColor: 'orange-400' },
        theme: {
          dark: {
            bgColor: 'transparent',
            color: 'stone-100',
            borderColor: 'stone-700',
            hover: { bgColor: 'stone-800' },
            active: { bgColor: 'stone-700' },
            focus: { borderColor: 'stone-300', outlineColor: 'orange-300' },
          },
        },
      },
      ghost: {
        color: 'stone-700',
        hover: { bgColor: 'stone-100' },
        active: { bgColor: 'stone-200' },
        theme: { dark: { color: 'stone-300', hover: { bgColor: 'stone-800' }, active: { bgColor: 'stone-700' } } },
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
      fill: { styles: { borderRadius: 999, bgColor: 'orange-700', theme: { dark: { bgColor: 'orange-400' } } } },
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
      <Box bgColor="stone-50" color="stone-900" theme={{ dark: { bgColor: 'stone-950', color: 'stone-100' } }}>
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
