# The site's analytics collector

box-kite.dev sends every interaction through `@box-kite/react/analytics` with `beacon(VITE_ANALYTICS_URL)`. This Worker is the other end: it answers `POST www.box-kite.dev/api/events`, checks each record and writes it to the Workers Analytics Engine dataset `box_kite_events`. The route is on the site's own origin, so a beacon needs no CORS and goes to no third-party domain.

No IP address, user agent or cookie is stored. A row carries the event name, the page, the session id, the reason, the control's label, the previous page, the referring host, the country Cloudflare saw and the client's time. The columns are `BLOBS` in [`src/events.ts`](src/events.ts).

## Setting it up

1. `npx wrangler@4.151.3 login`, once, as the account that holds the `box-kite.dev` zone.
2. `npm run deploy:analytics`. The dataset is created by the first write.
3. Set the repository variable `ANALYTICS_URL` to `https://www.box-kite.dev/api/events` (Settings → Secrets and variables → Actions → Variables), then re-run the Pages workflow. The next build beacons there.

## Reading it

`npm run analytics:report -- 7` prints the top pages, views and sessions per day, where visits came from and the countries, for the last 7 days. It needs `CLOUDFLARE_ACCOUNT_ID` and a `CLOUDFLARE_API_TOKEN` with **Account Analytics Read**. Any other question is one SQL query against the same API, or a Grafana panel on it. The data is kept for three months.
