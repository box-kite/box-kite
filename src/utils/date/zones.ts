import { DateTimeFields, fieldsToMs, floorDiv, MS_PER_DAY, MS_PER_MINUTE, msToFields } from './calendar';
import { localZone, systemZone } from './settings';

/**
 * Where a zone input points: `'local'` is the reader (`localZone()`), `'system'` the runtime, `'utc'` UTC,
 * and anything else an IANA name (`'Europe/Chisinau'`) or a fixed offset (`'+03:00'`).
 */
export type ZoneInput = 'local' | 'system' | 'utc' | (string & {});

/**
 * What to do with a wall-clock time a zone skips or repeats — Temporal's four answers. `'compatible'` takes
 * the later reading of a skipped time and the earlier of a repeated one, which is what every OS does.
 */
export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

const OFFSET = /^([+-])(\d{2}):?(\d{2})(?::?(\d{2}))?$/;
const validity = new Map<string, string | null>();
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Minutes east of UTC for a fixed offset (`'+03:00'`, `'-0530'`), or `undefined` for anything else. */
export function fixedOffset(zone: string): number | undefined {
  if (zone === 'UTC') return 0;

  const match = OFFSET.exec(zone);
  if (!match) return undefined;

  const minutes = Number(match[2]) * 60 + Number(match[3]) + Number(match[4] ?? 0) / 60;

  return match[1] === '-' ? -minutes : minutes;
}

/** `+03:00`, `-05:30`, `+00:00`. A historical offset carrying seconds keeps them. */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const total = Math.round(Math.abs(minutes) * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const seconds = total % 60;

  return `${sign}${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}${seconds ? `:${pad(seconds)}` : ''}`;
}

/** The canonical name for an IANA zone, or `null` when the runtime does not know it. Cached: constructing a formatter is ~40µs. */
function canonicalIana(zone: string): string | null {
  let known = validity.get(zone);
  if (known === undefined) {
    try {
      // The name as given, cased the way the runtime cases it: `europe/chisinau` comes back `Europe/Chisinau`.
      known = new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
    } catch {
      known = null;
    }
    validity.set(zone, known);
  }

  return known;
}

/** The zone an input resolves to: `'UTC'`, a fixed offset in `+hh:mm` form, an IANA name — or `null` for nonsense. */
export function normalizeZone(zone: ZoneInput | undefined): string | null {
  if (zone === undefined || zone === 'local') return localZone();
  if (zone === 'system') return systemZone();

  const trimmed = zone.trim();
  if (/^(utc|z|gmt|etc\/utc|etc\/gmt|etc\/uct|uct|universal|zulu|etc\/universal|etc\/zulu)$/i.test(trimmed)) return 'UTC';

  const offset = fixedOffset(trimmed);
  if (offset !== undefined) return offset === 0 ? 'UTC' : formatOffset(offset);

  const iana = canonicalIana(trimmed);

  return iana && /^(utc|etc\/utc|etc\/gmt)$/i.test(iana) ? 'UTC' : iana;
}

export function isValidZone(zone: string): boolean {
  return normalizeZone(zone) !== null;
}

/** `normalizeZone`, with nonsense as an error rather than a `null` to forget about. */
export function requireZone(zone: ZoneInput | undefined): string {
  const resolved = normalizeZone(zone);
  if (resolved === null) throw new RangeError(`Unknown time zone: ${String(zone)}`);

  return resolved;
}

function zoneFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(zone, formatter);
  }

  return formatter;
}

/** The wall clock an IANA zone shows at an instant, read off `formatToParts`. */
function ianaWall(zone: string, epoch: number): number {
  const parts = zoneFormatter(zone).formatToParts(epoch);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const era = parts.find((part) => part.type === 'era')?.value ?? 'A';
  const year = read('year');
  const wall = fieldsToMs({
    // Firefox writes the era as `B`, Chrome as `BC`: either way the year counts backwards from 1.
    year: era.startsWith('B') ? 1 - year : year,
    month: read('month'),
    day: read('day'),
    // Chromium answers midnight as hour 24 (crbug 1045791).
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
    millisecond: 0,
  });

  return wall + (epoch - floorDiv(epoch, 1000) * 1000);
}

/** Minutes east of UTC that `zone` is at `epoch` — `+180` for Chisinau in summer, `-240` for New York. */
export function offsetAt(zone: string, epoch: number): number {
  const fixed = fixedOffset(zone);
  if (fixed !== undefined) return fixed;
  // The runtime's own zone needs no formatter at all.
  if (zone === systemZone()) return -new Date(epoch).getTimezoneOffset();

  return (ianaWall(zone, epoch) - epoch) / MS_PER_MINUTE;
}

/** The wall clock `zone` shows at `epoch`. */
export function wallAt(zone: string, epoch: number): DateTimeFields {
  return msToFields(epoch + offsetAt(zone, epoch) * MS_PER_MINUTE);
}

/**
 * The instant a wall-clock time names in `zone`. A day either side of it brackets every offset the zone could
 * be at, so the candidates are at most two: none in a spring-forward gap, two in a fall-back overlap.
 * Returns `null` only for `'reject'` on a time that is skipped or repeated.
 */
export function wallToEpoch(fields: DateTimeFields, zone: string, disambiguation: Disambiguation = 'compatible'): number | null {
  const wall = fieldsToMs(fields);
  const fixed = fixedOffset(zone);
  if (fixed !== undefined) return wall - fixed * MS_PER_MINUTE;

  const before = offsetAt(zone, wall - MS_PER_DAY);
  const after = offsetAt(zone, wall + MS_PER_DAY);
  const candidates = [...new Set([wall - before * MS_PER_MINUTE, wall - after * MS_PER_MINUTE])]
    .filter((epoch) => epoch + offsetAt(zone, epoch) * MS_PER_MINUTE === wall)
    .sort((a, b) => a - b);

  if (candidates.length === 1) return candidates[0];
  if (disambiguation === 'reject') return null;
  if (candidates.length === 2) return disambiguation === 'later' ? candidates[1] : candidates[0];

  // A gap: the clock jumped over this time. Read it with the offset from before the jump to land after it
  // (`'compatible'`/`'later'`), or with the one from after to land before it.
  return disambiguation === 'earlier' ? wall - after * MS_PER_MINUTE : wall - before * MS_PER_MINUTE;
}

let zoneList: string[] | undefined;

/** Every IANA zone the runtime knows, `UTC` first. */
export function timeZones(): readonly string[] {
  if (!zoneList) {
    const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const names = supported ? supported('timeZone') : [];
    zoneList = ['UTC', ...names.filter((name) => name !== 'UTC')];
  }

  return zoneList;
}
