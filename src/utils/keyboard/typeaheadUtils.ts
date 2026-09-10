/**
 * Type-to-find over a list, which every APG list pattern asks for and all of them the same way: a
 * listbox, a menu, a tree. Framework-free, so the buffer is a plain object the caller keeps.
 */
namespace TypeaheadUtils {
  /** How long a buffer stays open, per APG. */
  export const TIMEOUT = 1000;

  /** What a caller keeps between keystrokes: what has been typed, and when the last key arrived. */
  export interface Buffer {
    query: string;
    at: number;
  }

  /** A key that types a character, rather than one that commands something. */
  export function isPrintable(event: { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean }): boolean {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  /** Whether the buffer is still the one the user is typing into. */
  export function isOpen(buffer: Buffer, timeStamp: number): boolean {
    return buffer.query !== '' && timeStamp - buffer.at < TIMEOUT;
  }

  /** Adds a keystroke, starting a fresh buffer when the last one has expired, and returns what to search for. */
  export function push(buffer: Buffer, key: string, timeStamp: number): string {
    buffer.query = isOpen(buffer, timeStamp) ? buffer.query + key : key;
    buffer.at = timeStamp;

    return buffer.query;
  }

  /**
   * The item a query points at, or `-1`. One character — or the same one repeated, which is how a user
   * cycles through a letter — searches from *after* the current item; a longer buffer is a real prefix
   * and searches from it, so further letters narrow instead of skipping.
   */
  export function target(
    query: string,
    from: number,
    count: number,
    textOf: (index: number) => string,
    isDisabled?: (index: number) => boolean,
  ): number {
    if (count === 0) return -1;

    const chars = [...query];
    const repeated = chars.every((char) => char === chars[0]);
    const needle = (repeated ? chars[0] : query).toLowerCase();
    const start = repeated ? from + 1 : from;

    for (let offset = 0; offset < count; offset++) {
      const index = (((start + offset) % count) + count) % count;

      if (isDisabled?.(index)) continue;
      if (textOf(index).trim().toLowerCase().startsWith(needle)) return index;
    }

    return -1;
  }
}

export default TypeaheadUtils;
