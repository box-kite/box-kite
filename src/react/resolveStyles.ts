/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { ComponentsRegistry, getDefaultEngine } from '../core';
import { BoxStyleProps } from '../types';
import styleElementsOf from './styleElements';

export interface ResolvedBoxStyles {
  classNames: string[];
  /**
   * Element mode only: the hoistable `<style>` elements this Box's classes need, the engine's base
   * element first. Undefined in every other mode, where the CSS has already gone to a stylesheet.
   */
  styleElements?: React.ReactElement[];
}

/**
 * Resolve a Box's classes with no hook at all — the render path a Server Component takes. In element mode
 * what those classes need comes back as elements to render, so there is nothing to flush. Its own module
 * for that reason: the RSC entry must reach this without pulling in `useStyles` and its flush effect.
 */
export default function resolveStyles(
  props: BoxStyleProps<any>,
  isSvg: boolean,
  components?: ComponentsRegistry,
): ResolvedBoxStyles & { signature: string | null } {
  const { classNames, signature, styleElements } = getDefaultEngine().resolveClassNames(props, isSvg, components);

  return { classNames, signature, styleElements: styleElementsOf(styleElements) };
}
