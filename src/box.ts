import React, { Ref, RefAttributes, useState } from 'react';
import { BoxExtends, getDefaultEngine, Springs, startViewTransition } from './core';
import boxClassNames, { BoxClassNames } from './react/boxClassNames';
import boxComponent from './react/boxComponent';
import { BoxClassNameProps, BoxCoreProps } from './react/boxProps';
import buildTagProps from './react/boxTagProps';
import useVisibility from './react/hooks/useVisibility';
import { ExtractElementFromTag } from './react/reactTypes';
import Theme from './react/theme/theme';
import useStyles, { StylesContext } from './react/useStyles';
import { ComponentsAndVariants } from './types';

interface HoverElementProps {
  tag: string;
  tagProps: Record<string, unknown>;
  render: (state: { isHover: boolean }) => React.ReactNode;
}

// Hover-callback children need state, so they get a component of their own and every other Box holds none.
function HoverElement({ tag, tagProps, render }: HoverElementProps) {
  const [isHover, setIsHover] = useState(false);

  return React.createElement(
    tag,
    { ...tagProps, onMouseEnter: () => setIsHover(true), onMouseLeave: () => setIsHover(false) },
    render({ isHover }),
  );
}

/**
 * Box's render as a hook, for a component that is a Box with defaults: called from its own `forwardRef`, it
 * makes that component one fiber rather than a wrapper around a second one. `Flex`, `H1` and `Button` are this.
 *
 * ```tsx
 * const Card = forwardRef<HTMLDivElement, BoxProps>((props, ref) => useBoxElement({ p: 4, ...props }, ref));
 * ```
 */
export function useBoxElement<TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxCoreProps<TTag, TKey>,
  ref?: Ref<ExtractElementFromTag<TTag>>,
): React.ReactNode {
  const { tag = 'div', children } = props;
  const { classNames, styleElements } = useStyles(props, tag === 'svg');
  const tagProps = buildTagProps(props, classNames);

  ref && (tagProps.ref = ref);

  const element =
    typeof children === 'function'
      ? React.createElement(HoverElement, { tag, tagProps, render: children })
      : React.createElement(tag, tagProps, children);

  // Element mode: the CSS travels with the markup. The style elements are siblings rather than
  // children — a void tag (`input`, `img`) cannot have children — and React 19 hoists them into `<head>`.
  return styleElements ? React.createElement(React.Fragment, null, styleElements, element) : element;
}

interface BoxType {
  <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
    props: BoxCoreProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
  ): React.ReactNode;
  extend: typeof BoxExtends.extend;
  components: typeof BoxExtends.components;
  keyframes: typeof BoxExtends.keyframes;
  /** A spring of your own, sampled into `{ easing, duration }` — the two halves the timing and duration props take. */
  spring: typeof Springs.spring;
  Theme: typeof Theme;
  useTheme: typeof Theme.useTheme;
  getVariableValue: (name: string) => string;
  /** Explicit engine configuration (class-name hashing, style sink). Call once, before the first render. */
  configure: typeof StylesContext.configure;
  /** Run a DOM change inside a view transition where the browser has one, and plainly where it has not. */
  viewTransition: typeof startViewTransition;
}

const Box = boxComponent(useBoxElement, 'Box') as unknown as BoxType;

Box.extend = BoxExtends.extend;
Box.components = BoxExtends.components;
Box.keyframes = BoxExtends.keyframes;
Box.spring = Springs.spring;
Box.Theme = Theme;
Box.useTheme = Theme.useTheme;
Box.getVariableValue = (name: string) => getDefaultEngine().getVariableValue(name);
Box.configure = StylesContext.configure;
Box.viewTransition = startViewTransition;

export default Box;

export type BoxProps<
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
> = React.ComponentProps<typeof Box<TTag, TKey>>;
export type BoxTagProps<
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
> = Required<BoxProps<TTag, TKey>>['props'];

/**
 * Box props as a class attribute, for an element Box cannot render: an icon from `lucide-react`, a
 * `motion.div`, a router's `NavLink`. They take a `className` and nothing else, and `style` is what this
 * library exists not to write.
 *
 * ```tsx
 * const { className, styles } = useClassNames({ color: 'sky-500', hover: { color: 'sky-300' } });
 *
 * return <>{styles}<NavLink className={className} to="/" /></>;
 * ```
 *
 * `styles` is defined in element mode only, where the CSS travels as `<style href precedence>` elements;
 * elsewhere it is undefined and rendering it costs nothing, so that line is what to write either way.
 * `{ svg: true }` picks the SVG reset — `Icon` is this hook plus that flag.
 */
export function useClassNames<TKey extends keyof ComponentsAndVariants = never>(
  props: BoxClassNameProps<TKey>,
  options?: { svg?: boolean },
): BoxClassNames {
  return boxClassNames(useStyles(props, options?.svg === true), props.className);
}

export { useVisibility };

export type { BoxClassNames, BoxClassNameProps };
