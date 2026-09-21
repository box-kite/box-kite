import React from 'react';
import { BoxExtends, getDefaultEngine, Springs, startViewTransition, StylesConfiguration } from './core';
import boxClassNames, { BoxClassNames } from './react/boxClassNames';
import { BoxClassNameProps, BoxCoreProps } from './react/boxProps';
import buildTagProps from './react/boxTagProps';
import resolveStyles from './react/resolveStyles';
import { ComponentsAndVariants } from './types';

/**
 * Box for React Server Components: what the `react-server` export condition resolves to, so a Server
 * Component importing the package lands here with no `'use client'` and no configuration. It calls no hook,
 * schedules no effect and never touches the DOM — its CSS travels as `<style href precedence>` elements
 * React hoists. Left in the client bundle: hover-callback children and `Box.Theme`, both of which need
 * state, while theme *styles* work here as always.
 */

// The engine has to be in element mode before the first render, and importing this entry is the
// earliest, most reliable moment: a Server Component has nowhere else to configure anything.
getDefaultEngine().configure({ sink: 'element' });

function Box<TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxCoreProps<TTag, TKey>,
): React.ReactNode {
  const { tag = 'div', children } = props;

  if (typeof children === 'function') {
    throw new Error(
      "[box-kite] Box children as a function track hover state, which needs the client Box — render it from a 'use client' module.",
    );
  }

  const { classNames, styleElements } = resolveStyles(props, tag === 'svg');

  return React.createElement(
    React.Fragment,
    null,
    styleElements,
    React.createElement(tag, buildTagProps(props, classNames) as React.ComponentProps<TTag>, children),
  );
}

interface RscBoxType {
  <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
    props: BoxCoreProps<TTag, TKey>,
  ): React.ReactNode;
  extend: typeof BoxExtends.extend;
  components: typeof BoxExtends.components;
  keyframes: typeof BoxExtends.keyframes;
  /** A spring of your own, sampled into `{ easing, duration }`. Pure arithmetic, so a Server Component can call it. */
  spring: typeof Springs.spring;
  getVariableValue: (name: string) => string;
  /** Explicit engine configuration. Element mode is already on; this is for the rest of it. */
  configure: (config: StylesConfiguration) => void;
  /**
   * Run a DOM change inside a view transition. Here for parity with the client entry — with no document
   * there is no transition, so on a server it is the update and nothing else.
   */
  viewTransition: typeof startViewTransition;
}

const RscBox = Box as RscBoxType;

RscBox.extend = BoxExtends.extend;
RscBox.components = BoxExtends.components;
RscBox.keyframes = BoxExtends.keyframes;
RscBox.spring = Springs.spring;
RscBox.getVariableValue = (name: string) => getDefaultEngine().getVariableValue(name);
RscBox.configure = (config: StylesConfiguration) => getDefaultEngine().configure(config);
RscBox.viewTransition = startViewTransition;

/**
 * The Server-Component half of `useClassNames` — see the client entry for what it is for. Not a hook
 * here and it does not need to be, since resolving in element mode produces the `<style>` elements
 * themselves. The `use` prefix stays so a component can move between the two entries unchanged.
 */
export function useClassNames<TKey extends keyof ComponentsAndVariants = never>(
  props: BoxClassNameProps<TKey>,
  options?: { svg?: boolean },
): BoxClassNames {
  return boxClassNames(resolveStyles(props, options?.svg === true), props.className);
}

export default RscBox;

export type { BoxClassNames, BoxClassNameProps };
