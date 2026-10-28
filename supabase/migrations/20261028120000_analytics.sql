-- The site's analytics: one row per record `beacon()` posts, written by the `collect` Edge Function with the service role.
create table public.analytics_events (
  -- The record's own id, so a batch posted twice is kept once.
  id text primary key,
  received_at timestamptz not null default now(),
  -- The client's time, clamped to the server's by the collector: rows in one request share a `received_at`.
  occurred_at timestamptz not null,
  name text not null,
  -- A page view's route, or the page anything else happened on.
  page text not null default '',
  session_id text not null,
  visitor_id text,
  reason text,
  label text,
  referrer text,
  country text,
  -- The rest of the record as it was sent: kind, component, type, value, details, source, trigger.
  data jsonb not null default '{}'
);

create index analytics_events_occurred_at on public.analytics_events (occurred_at);
create index analytics_events_name_occurred_at on public.analytics_events (name, occurred_at);

-- Who may read: a GitHub account signs in, and its `auth.users` id is added here by hand in the SQL editor.
create table public.analytics_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Page views per day and page, kept after the raw rows they were counted from are pruned.
create table public.analytics_daily (
  day date not null,
  page text not null,
  views integer not null,
  sessions integer not null,
  primary key (day, page)
);

alter table public.analytics_events enable row level security;
alter table public.analytics_admins enable row level security;
alter table public.analytics_daily enable row level security;

-- Nothing reaches these through the public key; the collector writes as the service role, which RLS does not stop.
revoke all on public.analytics_events, public.analytics_admins, public.analytics_daily from anon;
revoke insert, update, delete, truncate on public.analytics_events, public.analytics_admins, public.analytics_daily from authenticated;

create function public.analytics_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.analytics_admins where user_id = auth.uid());
$$;

create policy "Admins read events" on public.analytics_events
  for select to authenticated using ((select public.analytics_is_admin()));

create policy "Admins read daily totals" on public.analytics_daily
  for select to authenticated using ((select public.analytics_is_admin()));

-- Everything the dashboard's widgets show for the last `days` days, in one round trip. Refuses anyone not on the list.
create function public.analytics_overview(days integer default 7) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  span interval := make_interval(days => greatest(1, least(days, 400)));
  since timestamptz := now() - span;
begin
  if not public.analytics_is_admin() then
    raise exception 'Not on the analytics admin list' using errcode = '42501';
  end if;

  return (
    with recent as (
      select * from public.analytics_events where occurred_at >= since
    ),
    per_day as (
      select (occurred_at at time zone 'utc')::date as day,
        count(*) as events,
        count(*) filter (where name = 'router.navigate') as page_views,
        count(distinct session_id) as sessions
      from recent group by 1
    )
    select jsonb_build_object(
      'since', since,
      'totals', (
        select jsonb_build_object(
          'events', count(*),
          'pageViews', count(*) filter (where name = 'router.navigate'),
          'sessions', count(distinct session_id),
          'visitors', count(distinct visitor_id)
        ) from recent
      ),
      'previous', (
        select jsonb_build_object(
          'events', count(*),
          'pageViews', count(*) filter (where name = 'router.navigate'),
          'sessions', count(distinct session_id),
          'visitors', count(distinct visitor_id)
        ) from public.analytics_events where occurred_at >= since - span and occurred_at < since
      ),
      'days', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'day', series.day::date,
          'pageViews', coalesce(per_day.page_views, 0),
          'sessions', coalesce(per_day.sessions, 0),
          'events', coalesce(per_day.events, 0)
        ) order by series.day), '[]'::jsonb)
        from generate_series((since at time zone 'utc')::date, (now() at time zone 'utc')::date, interval '1 day') as series(day)
        left join per_day on per_day.day = series.day::date
      ),
      'pages', (
        select coalesce(jsonb_agg(to_jsonb(top) order by top.views desc), '[]'::jsonb) from (
          select page, count(*) as views, count(distinct session_id) as sessions
          from recent where name = 'router.navigate' group by page order by views desc limit 20
        ) top
      ),
      'referrers', (
        select coalesce(jsonb_agg(to_jsonb(top) order by top.sessions desc), '[]'::jsonb) from (
          select referrer, count(distinct session_id) as sessions
          from recent where coalesce(referrer, '') <> '' group by referrer order by sessions desc limit 15
        ) top
      ),
      'countries', (
        select coalesce(jsonb_agg(to_jsonb(top) order by top.sessions desc), '[]'::jsonb) from (
          select country, count(distinct session_id) as sessions
          from recent where coalesce(country, '') <> '' group by country order by sessions desc limit 15
        ) top
      ),
      'events', (
        select coalesce(jsonb_agg(to_jsonb(top) order by top.count desc), '[]'::jsonb) from (
          select name, count(*) as count
          from recent where name <> 'router.navigate' group by name order by count desc limit 20
        ) top
      ),
      'labels', (
        select coalesce(jsonb_agg(to_jsonb(top) order by top.count desc), '[]'::jsonb) from (
          select name, label, count(*) as count
          from recent where coalesce(label, '') <> '' group by name, label order by count desc limit 20
        ) top
      ),
      'storage', jsonb_build_object(
        'tables', pg_total_relation_size('public.analytics_events') + pg_total_relation_size('public.analytics_daily'),
        'database', pg_database_size(current_database())
      )
    )
  );
end;
$$;

-- The nightly job: the last week's page views folded into `analytics_daily` (again, for late arrivals), then raw rows past 90 days pruned.
create function public.analytics_rollup() returns void
language sql security definer set search_path = ''
as $$
  insert into public.analytics_daily (day, page, views, sessions)
  select (occurred_at at time zone 'utc')::date, page, count(*), count(distinct session_id)
  from public.analytics_events
  where name = 'router.navigate'
    and (occurred_at at time zone 'utc')::date between (now() at time zone 'utc')::date - 7 and (now() at time zone 'utc')::date - 1
  group by 1, 2
  on conflict (day, page) do update set views = excluded.views, sessions = excluded.sessions;

  delete from public.analytics_events where received_at < now() - interval '90 days';
$$;

revoke execute on function public.analytics_is_admin() from public, anon;
revoke execute on function public.analytics_overview(integer) from public, anon;
revoke execute on function public.analytics_rollup() from public, anon, authenticated;
grant execute on function public.analytics_is_admin() to authenticated;
grant execute on function public.analytics_overview(integer) to authenticated;
