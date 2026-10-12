import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NotFoundPage from '../pages/notFoundPage';
import { routes } from '../site/routes';
import { MOVED_ROUTES } from '../site/site';
import Layout from './layout';
import pageFor from './routePages';

/** One route's page: the module itself once loaded, a suspending stand-in while its chunk arrives. */
function RoutePage({ path }: { path: string }) {
  // Both halves of `pageFor` are memoized per path, so the identity this returns is stable and the
  // remount the rule guards against cannot happen — but which half answers is only knowable here,
  // after `preloadPage` has run.
  const Page = pageFor(path);

  // eslint-disable-next-line react-hooks/static-components
  return <Page />;
}

export default function App() {
  return (
    <Layout>
      {/* The router navigates inside a transition, so React keeps the previous page on screen while the
          next one's chunk arrives, and this fallback never renders — measured, including with a
          synchronous update landing mid-flight. The wait itself is what prefetchPage is for. */}
      <Suspense fallback={null}>
        <Routes>
          {routes.map(({ path }) => (
            <Route key={path} path={path} element={<RoutePage path={path} />} />
          ))}
          {Object.entries(MOVED_ROUTES).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
