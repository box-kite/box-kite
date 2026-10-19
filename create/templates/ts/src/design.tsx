/**
 * Classic: the components as Box Kite ships them, indigo on gray in the system font.
 *
 * The page's colours and font are here, in light and dark. To make it yours, point the two palette families
 * every component is drawn in somewhere else, and give a component styles of its own with Box.components().
 */
import Box, { type BoxStyleProps } from '@box-kite/react';
import type { ReactNode } from 'react';

// A component's own styles, merged over the built-in ones, e.g. rounder buttons:
// Box.components({ button: { styles: { borderRadius: 999 } } });

/** The page itself: set on <html>, so every component, popover and dialog inherits it. */
const page: BoxStyleProps = {
  // A palette name ('orange', 'stone') or a ramp of your own ({ 50: 'oklch(…)', …, 950: 'oklch(…)' }).
  vars: Box.palette({ accent: 'indigo', base: 'gray' }),
  css: { fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  theme: {
    light: { colorScheme: 'light', bgColor: 'white', color: 'base-900' },
    dark: { colorScheme: 'dark', bgColor: 'base-950', color: 'base-100' },
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
