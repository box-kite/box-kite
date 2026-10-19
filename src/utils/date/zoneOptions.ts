import { formatOffset, offsetAt, timeZones } from './zones';

/** One zone as a list offers it. */
export interface ZoneOption {
  /** The IANA name, `Europe/Chisinau` — the value. */
  id: string;
  /** The place, `Chisinau`, which is what people look for. */
  city: string;
  /** The part before the place, `Europe`. */
  region: string;
  /** Minutes east of UTC right now. */
  offset: number;
  /** `UTC+03:00`. */
  offsetText: string;
  /** The label a list shows and searches: `Chisinau (UTC+03:00)`. */
  label: string;
}

/** Every zone, or those given, with the offset each is at `at` — ordered west to east, then by place. */
export function zoneOptions(zones: readonly string[] = timeZones(), at: number = Date.now()): ZoneOption[] {
  return zones
    .map((id) => {
      const offset = id === 'UTC' ? 0 : offsetAt(id, at);
      const parts = id.split('/');
      const city = parts[parts.length - 1].replace(/_/g, ' ');
      const offsetText = `UTC${offset === 0 ? '' : formatOffset(offset)}`;

      return {
        id,
        city,
        region: parts.length > 1 ? parts.slice(0, -1).join('/').replace(/_/g, ' ') : '',
        offset,
        offsetText,
        label: `${city} (${offsetText})`,
      };
    })
    .sort((a, b) => a.offset - b.offset || a.city.localeCompare(b.city));
}

/** Matches a query against the place, the region, the IANA name and the offset, so `chis`, `europe` and `+3` all find Chisinau. */
export function matchZone(option: ZoneOption, query: string): boolean {
  const needle = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!needle) return true;

  const offsetHours = option.offsetText.replace(/:00$/, '').replace(/([+-])0/, '$1');
  const haystack = `${option.id} ${option.city} ${option.region} ${option.offsetText} ${offsetHours} gmt${option.offsetText.slice(3)}`
    .toLowerCase()
    .replace(/_/g, ' ');

  return haystack.includes(needle);
}
