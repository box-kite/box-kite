import { Ref, forwardRef, RefAttributes } from 'react';
import Box, { BoxProps } from '../box';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';

/**
 * `Box` with `display: grid` on it — `inline` makes that `inline-grid`. It adds no props of its own:
 * `gridTemplateColumns`, `gridColumn`, `gap`, `placeItems` and the rest are Box props.
 *
 * @a11y A `<div>` unless `tag` says otherwise. Placing an item in a track does not move it in the
 * markup, so the tab order and a screen reader still follow source order — WCAG 1.3.2, and the reason a
 * grid that reads correctly is laid out in the order it reads.
 */
function GridImpl<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(props: BoxProps<TTag>, ref: Ref<ExtractElementFromTag<TTag>>) {
  const { inline, ...restProps } = props;

  return <Box ref={ref} display={inline ? 'inline-grid' : 'grid'} {...restProps} />;
}

const Grid = forwardRef(GridImpl);
Grid.displayName = 'Grid';

export default Grid as <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;
