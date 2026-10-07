import { useEffect } from 'react';
import { hydrationFinished } from './hydration';

/**
 * Runs once the prerendered HTML has been adopted, so a `Reveal` mounting from here on is a real mount —
 * the one that animates. The prerendered stylesheet stays: the engine adopted it on the first render.
 */
export default function AfterHydration() {
  useEffect(() => {
    hydrationFinished();
  }, []);

  return null;
}
