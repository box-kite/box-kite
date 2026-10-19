import { createContext, useContext, useSyncExternalStore } from 'react';
import { dateSettings, defaultLocale, localZone } from '../../utils/date/settings';
import { normalizeZone, ZoneInput } from '../../utils/date/zones';

/** What a subtree knows about its reader: the language and the zone. */
export interface DateEnvironmentValue {
  /** A BCP 47 tag. */
  locale?: string;
  /** The reader's zone — what `'local'` means inside. */
  timeZone?: string;
}

const DateContext = createContext<DateEnvironmentValue>({});

export interface DateProviderProps extends DateEnvironmentValue {
  children?: React.ReactNode;
}

/**
 * Says who the reader is for every date component inside: their language and their zone. On a server that
 * read the zone off a cookie (`readZoneCookie`), this is what makes the first paint already right — the
 * server and the browser render the same text, and nothing changes after hydration.
 */
export function DateProvider({ locale, timeZone, children }: DateProviderProps) {
  const outer = useContext(DateContext);

  return (
    <DateContext.Provider value={{ locale: locale ?? outer.locale, timeZone: timeZone ?? outer.timeZone }}>{children}</DateContext.Provider>
  );
}

const noop = () => () => {};

/** Whether this render can see the browser: false on a server and while hydrating, true from the next render on. */
function useHasClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export interface DateEnvironment {
  locale: string;
  /** The zone resolved to a name: `UTC`, an IANA zone or a fixed offset. */
  zone: string;
  /** The reader's own zone, which is what `'local'` resolved to. */
  readerZone: string;
}

/**
 * The locale and zone a date component renders in. A prop wins, then a `DateProvider`, then
 * `configureDates()`, then the browser. **A server and a hydrating browser both use the fallback** — `UTC` and
 * `en-US` unless something above configured them — because neither can know the other's runtime, and two
 * renders that disagree are a hydration error. The render after hydration switches to the reader's own.
 */
export function useDateEnvironment(props: { locale?: string; zone?: ZoneInput } = {}): DateEnvironment {
  const context = useContext(DateContext);
  const client = useHasClient();
  const settings = dateSettings();

  const locale = props.locale ?? context.locale ?? (client ? defaultLocale() : (settings.locale ?? 'en-US'));
  const readerZone = context.timeZone ?? (client ? localZone() : (settings.timeZone ?? 'UTC'));
  const asked = props.zone === undefined || props.zone === 'local' ? readerZone : props.zone;

  return { locale, zone: normalizeZone(asked) ?? 'UTC', readerZone: normalizeZone(readerZone) ?? 'UTC' };
}
