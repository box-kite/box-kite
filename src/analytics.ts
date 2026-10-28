/**
 * `Box.onInteraction`, collected (`@box-kite/react/analytics`): every interaction as a flat JSON record carrying a session id,
 * batched, held until consent is granted and sent as the page is hidden. Framework-free: no React and no engine, only the channel.
 *
 * ```ts
 * const analytics = createAnalytics({ send: beacon('/collect') });
 * ```
 */
export { beacon, consoleLog, createAnalytics } from './utils/analytics/analytics';
export type { Analytics, AnalyticsConsent, AnalyticsEvent, AnalyticsOptions, AnalyticsTransport } from './utils/analytics/analytics';
