# box-kite.dev analytics on Supabase

The site posts its interaction records with `beacon(VITE_ANALYTICS_URL)`, and they land here. One free Supabase project holds all of it:

- **`functions/collect`** receives the beacon.
  - It accepts only the site's origins, at most 50 records and 64 KB per request.
  - It caps every field and writes the rows with the service role.
  - A batch posted twice is kept once.
- **`migrations/`** holds the database side:
  - `analytics_events`: one row per record, with the rest of the record kept as JSONB.
  - `analytics_admins`: who may read.
  - `analytics_daily`: page views per day, kept for good.
  - `analytics_overview(days)`: everything the dashboard shows, in one call.
  - A nightly `pg_cron` job that updates the daily totals and prunes raw rows older than 90 days.
- **`/admin` on the site** is the dashboard: GitHub sign-in through Supabase Auth, read through row-level security. `/admin/?demo` shows it with sample data and needs none of this.

Nothing reaches a table through the publishable key. The anonymous role has no grants. A signed-in account reads only once its id is in `analytics_admins`, and nobody but the service role writes.

## Setting it up, once

1. Create a free project at supabase.com. Note its URL (`https://<ref>.supabase.co`) and its **publishable** key.
2. Link the repo and apply the migrations:

   ```sh
   npx supabase@2 login
   npx supabase@2 link --project-ref <ref>
   npx supabase@2 db push
   ```

3. Deploy the collector. `config.toml` already turns the JWT check off for it, since a beacon carries no token:

   ```sh
   npx supabase@2 functions deploy collect
   ```

4. Turn on GitHub sign-in:
   - On GitHub, create an OAuth app whose callback URL is `https://<ref>.supabase.co/auth/v1/callback`.
   - In Supabase, go to **Authentication → Sign In / Providers → GitHub** and paste the app's client id and secret.
   - Under **Authentication → URL Configuration**, add `https://www.box-kite.dev/admin/` to the redirect URLs.
   - Add `http://localhost:5173/admin/` there too, to sign in from `npm run dev`.
5. Set three repository variables, then re-run the Pages workflow:
   - `ANALYTICS_URL`: `https://<ref>.supabase.co/functions/v1/collect`
   - `SUPABASE_URL`: `https://<ref>.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable key
6. Open `/admin`, sign in with GitHub, and copy the `insert` it shows you into the SQL editor. That puts your account on the list.

## Knobs

- **Origins:** `ANALYTICS_ORIGINS` (a function secret, comma-separated) replaces the default `https://www.box-kite.dev,https://box-kite.dev`.
- **Write key:** a project with only the new `sb_secret_…` keys sets one as the `ANALYTICS_WRITE_KEY` secret. The collector then uses it instead of the injected `SUPABASE_SERVICE_ROLE_KEY`.
- **Retention:** the 90 days are in `analytics_rollup()`.
- **Storage:** the free plan's database is 500 MB, and the dashboard's Storage widget shows how much of it is used.
- **Pausing:** Supabase pauses a free project after a week with no requests. The site's own traffic keeps it awake.
