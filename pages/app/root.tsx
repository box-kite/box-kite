import Box from '../../src/box';
import { mergeDeep } from '../../src/core/mergeDeep';
import type { BoxStyleProps } from '../../src/types';
import { DEFAULT_DESIGN, DESIGN_STORAGE_KEY, designTokens, THEME_STORAGE_KEY } from '../designs/designs';
import App from './app';

/**
 * Everything inside the router: the theme provider and the app. The browser entry and the prerender
 * pass share it, so the tree they render is the same one — anything only one of them renders is a
 * hydration mismatch.
 */
export default function Root() {
  return (
    <Box.Theme
      use="global"
      viewTransition="reveal"
      storageKey={THEME_STORAGE_KEY}
      design={DEFAULT_DESIGN}
      designStorageKey={DESIGN_STORAGE_KEY}
      globalStyles={GLOBAL_STYLES}
    >
      <App />
    </Box.Theme>
  );
}

const GLOBAL_STYLES = mergeDeep<BoxStyleProps>(
  {
    scrollbarWidth: 'thin',
    scrollbarColor: ['accent-500', 'transparent'],
    // The layout paints its background on a div, so the root scrollbar's track shows the canvas: give it the theme's scheme and colour.
    theme: {
      dark: { colorScheme: 'dark', bgColor: 'base-900', scrollbarColor: ['accent-700', 'transparent'] },
      light: { colorScheme: 'light', bgColor: 'white' },
    },
    // A hash link lands below the sticky header — the section bar on a wide screen, the mobile header on a phone.
    css: { scrollPaddingTop: '4.5rem' },
  },
  designTokens,
);
