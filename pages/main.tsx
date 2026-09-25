import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Box from '../src/box';
import AfterHydration from './app/afterHydration';
import Root from './app/root';
import { preloadPage } from './app/routePages';
import { routes } from './site/routes';
import { routeFor } from './site/siteMeta';
import './extends';
import './index.css';

// The build prerenders every route with content-hashed class names (see `entry-server.tsx`); the
// browser has to name the same rules the same way, or hydration finds a different `class` on every
// element it adopts.
Box.configure({ classNames: 'stable' });

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <BrowserRouter>
      <Root />
      <AfterHydration />
    </BrowserRouter>
  </StrictMode>
);

if (container.hasChildNodes()) {
  // A prerendered page: `React.lazy` would suspend on the route being hydrated, and a hydration that
  // suspends throws away the HTML it was supposed to adopt — so that one chunk is fetched first.
  const route = routeFor(window.location.pathname, routes);

  (route ? preloadPage(route.path) : Promise.resolve()).then(() => hydrateRoot(container, tree));
} else {
  // The dev server and a preview of an unbuilt shell: nothing to adopt, render from scratch.
  createRoot(container).render(tree);
}
