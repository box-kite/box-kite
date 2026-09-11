import Box, { BoxProps } from '../box';
import { ComponentsAndVariants } from '../types';

export interface ProgressProps<TKey extends keyof ComponentsAndVariants = 'progress'> extends BoxProps<'div', TKey> {
  /** How far along it is. Leave it out for a task with no measurable end — the bar sweeps and reports nothing. */
  value?: number;
  /** The bottom of the range. Default `0`. */
  min?: number;
  /** The top of the range, and so what "full" means. Default `100`. */
  max?: number;
  /** What the bar is called. A progress bar has to be named — nothing about it is readable otherwise. */
  label?: string;
  /** The same, naming an element that already says it. */
  labelledBy?: string;
  /** The value as it should be read out: "3 of 10 files", "eleven minutes left". */
  format?: (value: number) => string;
}

/**
 * How far a task has got.
 *
 * ```tsx
 * <Progress label="Upload" value={62} />
 * <Progress label="Preparing" />
 * ```
 *
 * **No `value` is the indeterminate bar**, which is a state and not a number: `aria-valuenow` is left off
 * entirely — the one thing a reader must not be told is a progress that was never measured — and the bar
 * sweeps instead, stopping under `prefers-reduced-motion` because a named duration is outside what
 * `--transitionTime` zeroes.
 *
 * **The fill is an inline style and everything else is a class**, the exception `Slider` explains: a
 * percentage that moves with a download is a rule per frame if it goes in a class name. Where the value
 * is data rather than an animation, a `ProgressRing` from `components/chart` rounds it into a class
 * instead and pays nothing.
 *
 * It renders on a server — no state, no effect, no measurement — so a page can paint a real figure
 * before any JavaScript arrives.
 *
 * @a11y `role="progressbar"` with `aria-valuemin`, `aria-valuemax` and, when there is one, `aria-valuenow`.
 * @a11y `label` or `labelledBy` is what names it. A bar with neither is a percentage nobody can attach
 * to anything.
 * @a11y `format` writes `aria-valuetext`, for a value the number alone does not read as.
 */
export default function Progress<TKey extends keyof ComponentsAndVariants = 'progress'>(props: ProgressProps<TKey>) {
  const { value, min = 0, max = 100, label, labelledBy, format, props: tagProps, ...restProps } = props;

  const indeterminate = value === undefined;
  const clamped = indeterminate ? min : Math.min(Math.max(value, min), max);
  // A hundredth of a percent is finer than any screen and keeps two equal values one string.
  const fraction = max <= min ? 0 : Math.round(((clamped - min) / (max - min)) * 10000) / 100;

  return (
    <Box
      component={'progress' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      props={{
        role: 'progressbar',
        'aria-valuemin': min,
        'aria-valuemax': max,
        // Omitted rather than zeroed: a bar with no measurable end must not report one.
        'aria-valuenow': indeterminate ? undefined : clamped,
        'aria-valuetext': indeterminate ? undefined : format?.(clamped),
        'aria-label': label,
        'aria-labelledby': labelledBy,
        ...tagProps,
      }}
    >
      <Box component="progress.fill" variant={{ indeterminate }} style={indeterminate ? undefined : { inlineSize: `${fraction}%` }} />
    </Box>
  );
}

Progress.displayName = 'Progress';
