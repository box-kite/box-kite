/** The two ids an analytics record carries: one visit, and (only when asked for and consented to) one browser across visits. */

export const DEFAULT_SESSION_TIMEOUT = 30 * 60_000;

/** A random id: `crypto.randomUUID` where the page is secure, the same 122 random bits by hand where it is not. */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${'89ab'[parseInt(hex[16], 16) % 4]}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Private browsing, a sandboxed frame or a full quota all throw: the id then lives as long as the page does.
function read(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function write(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Kept in memory instead.
  }
}

const session = () => sessionStorage;
const local = () => localStorage;

export interface Identity {
  /** The visit `time` belongs to: a new one after `timeout` with nothing happening, and with every new tab. */
  sessionAt(time: number): string;
  /** The browser, across visits; the caller asks only once consent is granted. */
  visitor(): string;
  /** Consent withdrawn: both ids are forgotten, here and in storage. */
  forget(): void;
}

export function createIdentity(prefix: string, timeout: number): Identity {
  const sessionKey = `${prefix}.session`;
  const visitorKey = `${prefix}.visitor`;
  let current: { id: string; last: number } | undefined;
  let visitorId: string | undefined;

  return {
    sessionAt(time) {
      if (!current) {
        try {
          current = JSON.parse(read(session, sessionKey) ?? 'null') ?? undefined;
        } catch {
          current = undefined;
        }
      }
      if (!current || time - current.last > timeout) current = { id: randomId(), last: time };
      else current.last = Math.max(current.last, time);
      write(session, sessionKey, JSON.stringify(current));

      return current.id;
    },
    visitor() {
      visitorId ??= read(local, visitorKey) ?? randomId();
      write(local, visitorKey, visitorId);

      return visitorId;
    },
    forget() {
      current = undefined;
      visitorId = undefined;
      write(session, sessionKey, null);
      write(local, visitorKey, null);
    },
  };
}
