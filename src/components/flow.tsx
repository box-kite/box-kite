import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps } from '../box';
import { mergeDeep } from '../core';
import { ExtractElementFromTag } from '../react/reactTypes';
import { BoxStyleProps, ComponentsAndVariants } from '../types';
import FlowUtils from '../utils/flow/flowUtils';

/** A role's paint: a palette token, an alias (`accent-500`), one with an alpha, or a `Box.extend()` colour. */
export type FlowPaint = NonNullable<BoxStyleProps['bgColor']>;

/** The roles a canvas is painted from, each one token for both themes or one per theme. */
export type FlowTokens = Partial<Record<FlowUtils.Role, FlowPaint | { light?: FlowPaint; dark?: FlowPaint }>>;

export interface FlowContainerProps<
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
> extends BoxProps<TTag, TKey> {
  /**
   * The canvas's roles — `surface`, `panel`, `text`, `border`, `grid`, `edge`, `selection`, `handle` — each a token for
   * both themes (`{ selection: 'sky-500' }`) or one per theme (`{ surface: { light: 'base-50', dark: 'base-950' } }`).
   * One `--xy-*` variable is plain `vars`, because the container is a Box.
   */
  tokens?: FlowTokens;
  /**
   * `'static'` zeroes every Box transition inside the canvas, layers' entrances included — for a canvas whose nodes
   * are Boxes moved or resized every frame, which the default `transition: all` would make trail the pointer.
   */
  motion?: 'static';
}

/**
 * The theming bridge for a React Flow canvas: a Box around `<ReactFlow>` that declares xyflow's `--xy-*` variables
 * from the palette in both themes, so the canvas names no colour and its dark mode belongs to the page. It imports
 * nothing from xyflow — pass `colorMode={flowColorMode(theme)}` to `<ReactFlow>` so its own `.dark` class agrees.
 *
 * @a11y A `<div>` with variables on it: no role, no name. React Flow owns the canvas's accessibility; a custom node
 * or edge gets a visible focus from `flowNodeStyles`/`flowEdgeStyles`.
 */
function FlowContainerImpl<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(
  props: FlowContainerProps<TTag>,
  ref: Ref<ExtractElementFromTag<TTag>>,
) {
  const { tokens, motion, vars, theme, ...boxProps } = props;
  const roles = tokens as FlowUtils.Tokens | undefined;

  // The caller's `vars` last, so one `--xy-*` variable is overridden with no prop of its own.
  const light = {
    ...FlowUtils.VARIABLES,
    ...FlowUtils.OUTLINE,
    ...FlowUtils.roleVariables('light', roles),
    ...(motion === 'static' ? FlowUtils.STATIC_MOTION : {}),
    ...vars,
  };
  const dark: NonNullable<typeof theme> = { dark: { vars: FlowUtils.roleVariables('dark', roles) } };

  return <Box ref={ref} vars={light} theme={theme ? mergeDeep(dark, theme) : dark} {...(boxProps as BoxProps<TTag>)} />;
}

const FlowContainerComponent = forwardRef(FlowContainerImpl);
FlowContainerComponent.displayName = 'FlowContainer';

/**
 * A React Flow canvas themed by the palette: `<FlowContainer height={120}><ReactFlow colorMode={flowColorMode(theme)} …/></FlowContainer>`.
 * Server-safe, and no `--xy-*` value is written outside this module, so a page without a canvas pays nothing for it.
 */
export const FlowContainer = FlowContainerComponent as <
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
>(
  props: FlowContainerProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;

/** `<ReactFlow colorMode>` from `Box.useTheme()`'s theme, so the canvas's own `.dark` class agrees with the page. */
export const flowColorMode = FlowUtils.colorMode;

/**
 * Spread on a custom node's root: a visible focus ring under Tab, which xyflow removes from every node and gives back
 * only to its four built-in types. An outline, so it survives forced colours; its colour is the container's `selection`.
 */
export const flowNodeStyles = {
  group: { 'react-flow__node/focusVisible': { outline: 2, outlineOffset: 2 } },
} satisfies BoxStyleProps;

/** Spread on a custom node's root when its `selected` prop is true — xyflow marks selection with a class no prop can address. */
export const flowNodeSelectedStyles = {
  outline: 1,
} satisfies BoxStyleProps;

/** Spread on a custom edge's path: a wider stroke under Tab. The colour is xyflow's own focus rule, which reads the `selection` role. */
export const flowEdgeStyles = {
  group: { 'react-flow__edge/focusVisible': { strokeWidth: 2 } },
} satisfies BoxStyleProps;
