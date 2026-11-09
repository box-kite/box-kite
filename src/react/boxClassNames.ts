import { classNames, ClassNameType } from '../core';
import { ResolvedBoxStyles } from './resolveStyles';

/**
 * What `useClassNames` hands back: the class attribute for an element this library does not render
 * itself, and — in element mode only — the `<style>` elements those classes need.
 */
export interface BoxClassNames {
  /** The whole `class` attribute, the engine's classes and the caller's own, already joined. */
  className: string;
  /**
   * Element mode only: the hoistable `<style>` elements the classes need. Render them beside the
   * element (React 19 lifts them into `<head>`). Undefined in every other mode, where the CSS has
   * already gone to a stylesheet and there is nothing left to render.
   */
  styles?: ResolvedBoxStyles['styleElements'];
}

/**
 * The resolved styles as a class attribute. Hook-free, so the client entry and the Server-Component
 * one give `useClassNames` the same shape — the only difference between them is whether resolving
 * the styles scheduled a flush effect. `base: false` drops the reset class, which the engine always puts first.
 */
export default function boxClassNames(
  { classNames: styleClasses, styleElements }: ResolvedBoxStyles,
  userClassName?: ClassNameType,
  base = true,
) {
  const engineClasses = base ? styleClasses : styleClasses.slice(1);

  return { className: classNames(engineClasses, userClassName).join(' '), styles: styleElements } satisfies BoxClassNames;
}
