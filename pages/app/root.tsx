import Box from '../../src/box';
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
      viewTransition
      globalStyles={{
        scrollbarWidth: 'thin',
        scrollbarColor: ['violet-500', 'transparent'],
        theme: { dark: { scrollbarColor: ['violet-700', 'transparent'] } },
      }}
    >
      <App />
    </Box.Theme>
  );
}
