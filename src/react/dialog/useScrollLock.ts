import React from 'react';
import { documentRoot } from '../../utils/environment/environmentUtils';
import { useIsomorphicLayoutEffect } from '../effects';
import useStyles from '../useStyles';

/**
 * How many layers are holding the lock. Module state is right: the lock is a property of the document,
 * and two dialogs open at once must not have the inner one's close unlock the page under the outer.
 */
let holders = 0;

/**
 * Stop the page behind a layer from scrolling, with a class rather than an inline style — so it is one
 * shared rule like every other value this library writes, and a consumer can see what did it. Returns
 * the style elements to render, which is element mode's way of getting a rule onto the page at all.
 *
 * `overflow: hidden` on `<html>` is the whole mechanism, which means two things worth knowing: the
 * scrollbar's width leaves the page as it is applied, so a document that wants no shift should carry
 * `scrollbarGutter="stable"`; and iOS Safari scrolls anyway, where nothing short of `position: fixed`
 * on the body holds it.
 */
export default function useScrollLock(enabled: boolean): React.ReactElement[] | undefined {
  const { classNames, styleElements } = useStyles({ overflow: 'hidden' }, false);
  // The engine's base class is always the first, and it is Box's own reset — `font-family: inherit` and
  // the rest of it. `<html>` is not a Box, so only the class the prop generated is put on it.
  const className = classNames.slice(1).join(' ');

  useIsomorphicLayoutEffect(() => {
    const root = documentRoot();
    if (!enabled || !root || !className) return;

    holders += 1;
    root.classList.add(className);

    return () => {
      holders -= 1;
      if (holders === 0) root.classList.remove(className);
    };
  }, [enabled, className]);

  return styleElements;
}
