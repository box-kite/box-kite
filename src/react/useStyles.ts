/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDefaultEngine, StylesConfiguration } from '../core';
import { BoxStyleProps } from '../types';
import { useIsomorphicInsertionEffect } from './effects';
import resolveStyles, { ResolvedBoxStyles } from './resolveStyles';
import styleElementsOf from './styleElements';

// React's own recommendation for injecting CSS-in-JS rules — see `useIsomorphicInsertionEffect`
// for why an insertion effect rather than a layout one, and what happens off the browser.
const useFlushEffect = useIsomorphicInsertionEffect;

export type { StylesConfiguration };

export default function useStyles(props: BoxStyleProps<any>, isSvg: boolean): ResolvedBoxStyles {
  const { classNames, signature, styleElements } = resolveStyles(props, isSvg);

  // Flush during the commit, before anything can paint or measure. Keyed on the stable signature
  // so it only re-runs when the class list changes; a cache hit added no rules, and a miss (new
  // signature) fires the effect and the flush drains all pending rules globally. Falls back to
  // `props` when the signature is null. Rules queued by a render that never commits are not lost
  // either — the engine schedules a microtask flush of its own when it queues them.
  useFlushEffect(() => {
    getDefaultEngine().flushSync();
  }, [signature ?? props]);

  return { classNames, styleElements };
}

/**
 * Rules that target a root selector (`html`) instead of a class. Returns their style elements in
 * element mode — global styles belong to no Box, so the caller has to render them itself.
 */
export function useGlobalStyles(props: BoxStyleProps<any> | undefined, selector: string): React.ReactElement[] | undefined {
  const descriptors = props ? getDefaultEngine().addGlobalStyles(props, selector) : undefined;

  useFlushEffect(() => {
    getDefaultEngine().flushSync();
  }, [props, selector]);

  return styleElementsOf(descriptors);
}

/** Engine controls for the default instance. For an isolated engine use `createStyleEngine()`. */
export namespace StylesContext {
  /** Write every pending rule now. The React binding calls this from an insertion effect. */
  export function flushSync() {
    getDefaultEngine().flushSync();
  }

  export function clear() {
    getDefaultEngine().clear();
  }

  /** The CSS emitted so far, as text. Flushes first — see `StyleEngine.getStyles`. */
  export function getStyles() {
    return getDefaultEngine().getStyles();
  }

  /** The CSS as a `<style>` element the browser can adopt — see `StyleEngine.getStyleTag`. */
  export function getStyleTag() {
    return getDefaultEngine().getStyleTag();
  }

  /** The id of the `<style>` element the default engine writes to. */
  export function styleElementId() {
    return getDefaultEngine().styleElementId;
  }

  /** Apply explicit engine configuration. Call before the first render — cached class names are dropped when the configuration changes. */
  export function configure(config: StylesConfiguration) {
    getDefaultEngine().configure(config);
  }
}
