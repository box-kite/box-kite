import { ReactNode } from 'react';
import Box, { BoxProps } from '../box';
import { ComponentsAndVariants } from '../types';
import VisuallyHidden from './visuallyHidden';

export interface SkeletonProps<TKey extends keyof ComponentsAndVariants = 'skeleton'> extends BoxProps<'div', TKey> {
  /** How many bars to draw. Default `1`; past that the last one is short, the way a paragraph's last line is. */
  lines?: number;
  /** A round placeholder — an avatar, a thumbnail. `width` sets its size and the height follows. */
  circle?: boolean;
  /**
   * What is loading, for a reader. It makes the skeleton a `role="status"` with the words in it, so put
   * it on the one skeleton that stands for a region and leave it off the rest — a screen of placeholders
   * each announcing itself is a screen nobody can listen to.
   */
  label?: ReactNode;
}

/**
 * Where content will be, while it is being fetched.
 *
 * ```tsx
 * <Skeleton lines={3} label="Loading orders" />
 * <Skeleton circle width={10} />
 * ```
 *
 * **Decoration by default**: with no `label` the whole thing is `aria-hidden`, because a reader told
 * "three empty bars" has been told nothing. What announces a load is the content arriving in a region the
 * page already had — which is also why a `label` is what somebody hears on *landing* rather than a
 * guaranteed announcement: a live region inserted together with its text is not reliably read out.
 *
 * The gloss crossing each bar is a named duration, so it sits outside what `--transitionTime` zeroes and
 * stops itself under `prefers-reduced-motion`. It renders on a server: no state, no effect, no measurement.
 *
 * @a11y `aria-hidden` unless `label` is given, and then `role="status"` naming what is on its way.
 */
export default function Skeleton<TKey extends keyof ComponentsAndVariants = 'skeleton'>(props: SkeletonProps<TKey>) {
  const { lines = 1, circle = false, label, props: tagProps, ...restProps } = props;

  const count = circle ? 1 : Math.max(1, Math.trunc(lines));

  return (
    <Box
      component={'skeleton' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      props={{ ...(label === undefined ? { 'aria-hidden': true } : { role: 'status' }), ...tagProps }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} component="skeleton.bar" variant={{ circle, short: !circle && count > 1 && index === count - 1 }}>
          <Box component="skeleton.gloss" />
        </Box>
      ))}
      {label !== undefined && <VisuallyHidden>{label}</VisuallyHidden>}
    </Box>
  );
}
