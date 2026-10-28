import { AnalyticsTransport, beacon, consoleLog, createAnalytics } from '../../src/analytics';

/** `?interactions` in a URL turns the console log on in a production build, for the rest of the tab. */
export const LOG_FLAG = 'interactions';

let started = false;

/** Where a visit came from: the other site's host, never its path or query, and nothing for a link inside this site. */
export function referrerHost(referrer: string, host: string): string | undefined {
  const bare = (name: string) => name.replace(/^www\./, '');
  try {
    const from = new URL(referrer).hostname;

    return from && bare(from) !== bare(host) ? from : undefined;
  } catch {
    return undefined;
  }
}

/** Whether this tab asked for the log, remembering a `?interactions` it arrived with. */
export function logRequested(search: string): boolean {
  try {
    if (new URLSearchParams(search).has(LOG_FLAG)) sessionStorage.setItem(LOG_FLAG, '1');

    return sessionStorage.getItem(LOG_FLAG) === '1';
  } catch {
    return new URLSearchParams(search).has(LOG_FLAG);
  }
}

/**
 * The site's one subscription: every interaction, with its session, to the collector at `VITE_ANALYTICS_URL` when the build
 * names one, and to the console in development or where `?interactions` asks. With neither, nothing listens and nothing loads.
 */
export function startSiteAnalytics(endpoint: string | undefined, log: boolean): void {
  if (started) return;

  const send: AnalyticsTransport[] = [];
  if (endpoint) send.push(beacon(endpoint));
  if (log) send.push(consoleLog());
  if (send.length === 0) return;

  started = true;
  // Read as it happens while logging; batched for the collector otherwise.
  createAnalytics({ send, batch: log ? { wait: 0 } : undefined });
}
