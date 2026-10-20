import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { reportInteraction } from '../../src/box';
import { hydrationFinished, useHydrated } from './hydration';
import { interactionFeed, logRequested } from './interactionLog';

// Fetched only by a tab that asked for it, so a visitor who never does pays nothing.
const InteractionPanel = lazy(() => import('./interactionPanel'));
// Module-wide, so StrictMode running the effect twice is not a second visit.
let reportedPath: string | undefined;

/**
 * Runs once the prerendered HTML has been adopted, so a `Reveal` mounting from here on is a real mount —
 * the one that animates. The prerendered stylesheet stays: the engine adopted it on the first render.
 * It also starts the interaction log: the console in development, the panel wherever `?interactions` asks.
 */
export default function AfterHydration() {
  const [closed, setClosed] = useState(false);
  const { pathname } = useLocation();
  // After hydration, since the prerender cannot know the query string the visitor arrived with.
  const showLog = useHydrated() && !closed && logRequested(window.location.search);

  useEffect(() => {
    hydrationFinished();
  }, []);

  // Read here rather than off `showLog`, which turns true a render late — after the first page view was reported.
  useEffect(() => {
    if (import.meta.env.DEV || logRequested(window.location.search)) interactionFeed.start({ console: import.meta.env.DEV });
  }, []);

  useEffect(() => {
    if (pathname === reportedPath) return;

    // A page view is the app's own moment, so it goes on the channel every component reports on.
    reportInteraction({
      component: 'router',
      type: 'navigate',
      reason: reportedPath === undefined ? 'load' : 'route',
      value: pathname,
      details: { from: reportedPath },
    });
    reportedPath = pathname;
  }, [pathname]);

  return showLog ? (
    <Suspense fallback={null}>
      <InteractionPanel onClose={() => setClosed(true)} />
    </Suspense>
  ) : null;
}
