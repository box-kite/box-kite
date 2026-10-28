-- Its own migration so the tables above can be tried on a Postgres with no pg_cron.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('analytics-rollup', '15 0 * * *', 'select public.analytics_rollup()');
