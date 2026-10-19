import { Ref, RefAttributes } from 'react';
import { BoxProps, useBoxElement } from '../box';
import boxComponent from '../react/boxComponent';
import { DateProvider, DateProviderProps, useDateEnvironment } from '../react/date/dateEnvironment';
import { ComponentsAndVariants } from '../types';
import { format, FormatOptions, formatRelative, RelativeOptions } from '../utils/date/format';
import { toIso } from '../utils/date/iso';
import { read } from '../utils/date/value';
import { ZoneInput } from '../utils/date/zones';

export { DateProvider };
export type { DateProviderProps };

type DateTimeBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'time', TKey>, 'tag' | 'children'>;

export interface DateTimeProps<TKey extends keyof ComponentsAndVariants = never> extends DateTimeBoxProps<TKey> {
  /** What to show: any ISO string, a `Date` or epoch milliseconds. Nothing is rendered for a non-value. */
  value: string | number | Date | null | undefined;
  /** Whose wall clock an instant is shown on. Default `'local'`, the reader's. A date or a time has no zone. */
  zone?: ZoneInput;
  /** The reader's language. Default the reader's own. */
  locale?: string;
  /** How to write it — `{ dateStyle: 'long' }`, `{ month: 'short', day: 'numeric' }`. Default by kind. */
  format?: Omit<FormatOptions, 'locale' | 'zone'>;
  /** `3 minutes ago`, `tomorrow` instead of the date. An object passes `now`, `numeric` and `style`. */
  relative?: boolean | Omit<RelativeOptions, 'locale' | 'zone'>;
}

/**
 * A date or a time, written for whoever is reading: in their language and on their wall clock, inside a real
 * `<time datetime>` that keeps the exact value for a machine.
 *
 * ```tsx
 * <DateTime value={order.createdAt} />                          // Oct 19, 2026, 2:30 PM — the reader's zone
 * <DateTime value={order.createdAt} zone="utc" format={{ timeStyle: 'short', timeZoneName: 'short' }} />
 * <DateTime value={comment.postedAt} relative />                // 3 minutes ago
 * ```
 *
 * **It cannot cause a hydration error.** A server does not know the reader's zone, so the server and the
 * hydrating browser both write the value in the fallback (`UTC` and `en-US`, or what a `DateProvider` above
 * says), and the render after hydration switches to the reader's own. A server that knows the zone — off the
 * cookie `zoneCookie()` writes — passes it to a `DateProvider` and the first paint is already right.
 *
 * In a Server Component with nothing to hydrate, `format()` from `@box-kite/react/date` is the same text with no
 * component at all.
 *
 * @a11y The text is what is read out; `datetime` carries the canonical value for anything that parses the page.
 */
function DateTimeImpl<TKey extends keyof ComponentsAndVariants = never>(props: DateTimeProps<TKey>, ref: Ref<HTMLTimeElement>) {
  const { value, zone, locale: localeProp, format: options, relative, props: tagProps, ...restProps } = props;
  const environment = useDateEnvironment({ locale: localeProp, zone });
  const parsed = read(value);
  const canonical = parsed && toIso(parsed);
  const text = canonical
    ? relative
      ? formatRelative(canonical, { ...(relative === true ? {} : relative), locale: environment.locale, zone: environment.zone })
      : format(canonical, { ...options, locale: environment.locale, zone: environment.zone })
    : '';

  return useBoxElement(
    {
      tag: 'time',
      display: 'inline',
      ...restProps,
      // A relative time is "now" minus the value, and now moves between a server render and hydration.
      props: { dateTime: canonical ?? undefined, suppressHydrationWarning: relative ? true : undefined, ...tagProps },
      children: text,
    } as BoxProps<'time', TKey>,
    ref,
  );
}

const DateTime = boxComponent(DateTimeImpl, 'DateTime');

export default DateTime as <TKey extends keyof ComponentsAndVariants = never>(
  props: DateTimeProps<TKey> & RefAttributes<HTMLTimeElement>,
) => React.ReactNode;
