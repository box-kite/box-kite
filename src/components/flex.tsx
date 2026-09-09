import { Ref, forwardRef, RefAttributes } from 'react';
import Box, { BoxProps } from '../box';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';

/**
 * `Box` with `display: flex` on it — `inline` makes that `inline-flex`. It adds no props of its own:
 * `d`, `jc`, `ai`, `gap`, `flexWrap` and the rest are Box props, so they nest in a breakpoint, a
 * theme or a container query like any other.
 *
 * @a11y A `<div>` unless `tag` says otherwise, and flex order is *visual* order: reordering items with
 * `order` or `flexDirection="row-reverse"` leaves the tab order and the reading order where the markup
 * put them, which is a WCAG 1.3.2 failure waiting to happen.
 */
function FlexImpl<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(props: BoxProps<TTag>, ref: Ref<ExtractElementFromTag<TTag>>) {
  const { inline, ...restProps } = props;

  return <Box ref={ref} display={inline ? 'inline-flex' : 'flex'} {...restProps} />;
}

const Flex = forwardRef(FlexImpl);
Flex.displayName = 'Flex';

export default Flex as <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;
