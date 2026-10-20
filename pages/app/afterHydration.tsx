import { lazy, Suspense, useEffect, useState } from 'react';
import Box from '../../src/box';
import { hydrationFinished, useHydrated } from './hydration';
import { interactionLine, logRequested } from './interactionLog';

// Fetched only by a tab that asked for it, so a visitor who never does pays nothing.
const InteractionPanel = lazy(() => import('./interactionPanel'));

/**
 * Runs once the prerendered HTML has been adopted, so a `Reveal` mounting from here on is a real mount —
 * the one that animates. The prerendered stylesheet stays: the engine adopted it on the first render.
 * It also opens the interaction log: the console in development, the panel wherever `?interactions` asks.
 */
export default function AfterHydration() {
  const [closed, setClosed] = useState(false);
  // After hydration, since the prerender cannot know the query string the visitor arrived with.
  const showLog = useHydrated() && !closed && logRequested(window.location.search);

  useEffect(() => {
    hydrationFinished();

    if (!import.meta.env.DEV) return;

    return Box.onInteraction((event) => {
      const { name, detail } = interactionLine(event);

      console.debug(`[interaction] ${name}`, detail, event);
    });
  }, []);

  return showLog ? (
    <Suspense fallback={null}>
      <InteractionPanel onClose={() => setClosed(true)} />
    </Suspense>
  ) : null;
}
