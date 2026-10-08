import { Ref, RefAttributes } from 'react';
import { BoxProps, useBoxElement } from '../box';
import boxComponent from '../react/boxComponent';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';

/**
 * The engine's length scale is rem/4, so `0.25` is one pixel at the default root size. Not zero: some
 * screen readers skip a zero-sized element, and a zero-sized focusable one cannot be scrolled to.
 */
const ONE_PIXEL = 0.25;

/**
 * Content for screen readers that is not drawn on screen. `display: none` would take it out of the
 * accessibility tree along with the layout, so this clips the element to nothing instead and leaves it in
 * the tree and the tab order: absolute, one pixel with `overflow: hidden` and `clip-path: inset(50%)`, and
 * `white-space: nowrap`, without which a long string is wrapped into a one-pixel column and read a word
 * per line.
 */
function VisuallyHiddenImpl<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(
  props: BoxProps<TTag>,
  ref: Ref<ExtractElementFromTag<TTag>>,
) {
  return useBoxElement(
    {
      position: 'absolute',
      width: ONE_PIXEL,
      height: ONE_PIXEL,
      p: 0,
      b: 0,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      clipPath: 'inset(50%)',
      ...props,
    },
    ref,
  );
}

const VisuallyHidden = boxComponent(VisuallyHiddenImpl, 'VisuallyHidden');

export default VisuallyHidden as <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;
