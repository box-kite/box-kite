import { useLayoutEffect, useMemo } from 'react';
import { documentOrNull } from '../../utils/environment/environmentUtils';
import Theme from '../theme/theme';

// Reference counts for theme classes, scoped to the portal container they apply to. Keyed by
// element (not process-global) so containers in different documents/roots cannot decrement each
// other's counts, and so the counts are collected with the container itself.
const themeRefCounts = new WeakMap<Element, Map<string, number>>();

function getThemeRefCounts(container: Element) {
  let counts = themeRefCounts.get(container);

  if (!counts) {
    counts = new Map<string, number>();
    themeRefCounts.set(container, counts);
  }

  return counts;
}

/**
 * The container every portalled layer shares, created on first use. Pass `false` on the top-layer path,
 * where nothing is portalled: the container is a DOM node plus a theme-class subscription, and a layer
 * that stays where it was declared inherits the theme instead of needing one copied onto it.
 */
export default function usePortalContainer(enabled = true) {
  const [theme] = Theme.useTheme();

  const portalContainer = useMemo(() => {
    if (!enabled) return null;

    // Runs during render, so it has to survive a server render: no document, no container, and
    // the caller renders no portal. (This used to work only because `ssg` installed a fake
    // `document` whose `getElementById` answered every id with its own style element.)
    const doc = documentOrNull();
    if (!doc) return null;

    const elId = 'box-kite-portal';
    let container = doc.getElementById(elId);

    if (!container) {
      container = document.createElement('div');
      container.id = elId;
      document.body.appendChild(container);
    }

    return container;
  }, [enabled]);

  // Update theme class when theme changes (with ref counting)
  useLayoutEffect(() => {
    if (!theme || !portalContainer) return;

    const counts = getThemeRefCounts(portalContainer);
    const count = counts.get(theme) ?? 0;
    counts.set(theme, count + 1);

    if (count === 0) {
      portalContainer.classList.add(theme);
    }

    return () => {
      const currentCount = counts.get(theme) ?? 1;
      const newCount = currentCount - 1;

      if (newCount <= 0) {
        counts.delete(theme);
        portalContainer.classList.remove(theme);
      } else {
        counts.set(theme, newCount);
      }
    };
  }, [portalContainer, theme]);

  return portalContainer;
}
