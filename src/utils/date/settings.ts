/** What the date layer falls back on when a call names no locale and no zone. */
export interface DateSettings {
  /** A BCP 47 tag. Unset, the runtime's own default — the browser's language, or the server's. */
  locale?: string;
  /**
   * The reader's IANA zone, when the runtime is not the reader. Unset, `'local'` means the runtime's own
   * zone: the browser's in a browser and the server's on a server. A server that knows the reader's zone —
   * from the cookie `zoneCookie()` writes — sets it here, or passes it to the call.
   */
  timeZone?: string;
}

let settings: DateSettings = {};
let systemZoneCache: string | undefined;
let systemLocaleCache: string | undefined;

/** Merges into what is set; `undefined` clears one key. Returns what was set before, so a test can put it back. */
export function configureDates(next: DateSettings): DateSettings {
  const previous = settings;
  settings = { ...settings, ...next };

  return previous;
}

export function dateSettings(): Readonly<DateSettings> {
  return settings;
}

/** The runtime's own IANA zone: the browser's, or the server's — `process.env.TZ`, which is UTC in most containers. */
export function systemZone(): string {
  if (systemZoneCache === undefined) {
    try {
      systemZoneCache = new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      systemZoneCache = 'UTC';
    }
  }

  return systemZoneCache;
}

/** The reader's zone: the configured one, or the runtime's. */
export function localZone(): string {
  return settings.timeZone ?? systemZone();
}

export function systemLocale(): string {
  if (systemLocaleCache === undefined) {
    try {
      systemLocaleCache = new Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
    } catch {
      systemLocaleCache = 'en-US';
    }
  }

  return systemLocaleCache;
}

export function defaultLocale(): string {
  return settings.locale ?? systemLocale();
}

/** Forgets the runtime's zone and locale, for a test that changes `TZ` under a running process. */
export function resetSystemCaches(): void {
  systemZoneCache = undefined;
  systemLocaleCache = undefined;
}

const COOKIE = 'tz';

/** A `document.cookie` string carrying the browser's zone, so a server rendering the next request can read it. */
export function zoneCookie(zone: string = systemZone(), name: string = COOKIE): string {
  return `${name}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
}

/** The zone out of a `Cookie` header, or `undefined` — the server half of `zoneCookie()`. */
export function readZoneCookie(header: string | null | undefined, name: string = COOKIE): string | undefined {
  if (!header) return undefined;

  for (const pair of header.split(';')) {
    const at = pair.indexOf('=');
    if (at > 0 && pair.slice(0, at).trim() === name) {
      try {
        return decodeURIComponent(pair.slice(at + 1).trim()) || undefined;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}
