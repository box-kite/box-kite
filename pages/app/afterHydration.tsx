import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import { hydrationFinished } from './hydration';
import { logRequested, startSiteAnalytics } from './siteAnalytics';

// Module-wide, so StrictMode running the effect twice is not a second visit.
let reportedPath: string | undefined;

/**
 * Runs once the prerendered HTML has been adopted, so a `Reveal` mounting from here on is a real mount —
 * the one that animates. The prerendered stylesheet stays: the engine adopted it on the first render.
 * It also starts the site's analytics: to the build's collector, and to the console in development or wherever `?interactions` asks.
 */
export default function AfterHydration() {
  const { pathname } = useLocation();

  useEffect(() => {
    hydrationFinished();
    startSiteAnalytics(import.meta.env.VITE_ANALYTICS_URL, import.meta.env.DEV || logRequested(window.location.search));
  }, []);

  useEffect(() => {
    if (pathname === reportedPath) return;

    // A page view is the app's own moment, so it goes on the channel every component reports on.
    Box.reportInteraction({
      component: 'router',
      type: 'navigate',
      reason: reportedPath === undefined ? 'load' : 'route',
      value: pathname,
      details: { from: reportedPath },
    });
    reportedPath = pathname;
  }, [pathname]);

  return null;
}
