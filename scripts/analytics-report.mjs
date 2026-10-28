// The site's page views, read back out of Workers Analytics Engine: `npm run analytics:report -- 7` for the last seven days.
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Account Analytics Read). Columns: workers/analytics/src/events.ts.

const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } = process.env;
const days = Number(process.argv[2] ?? 7);

if (!account || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token with Account Analytics Read).');
  process.exit(1);
}
if (!Number.isInteger(days) || days < 1 || days > 90) {
  console.error('Days is a whole number from 1 to 90; the dataset keeps three months.');
  process.exit(1);
}

// blob1 name, blob2 page, blob3 sessionId, blob4 reason, blob7 referrer, blob8 country. A view counts as its sample interval.
const views = `FROM box_kite_events WHERE blob1 = 'router.navigate' AND timestamp > NOW() - INTERVAL '${days}' DAY`;
const QUERIES = {
  Pages: `SELECT blob2 AS page, SUM(_sample_interval) AS views, COUNT(DISTINCT blob3) AS sessions ${views} GROUP BY page ORDER BY views DESC LIMIT 30`,
  'Per day': `SELECT formatDateTime(toStartOfInterval(timestamp, INTERVAL '1' DAY), '%Y-%m-%d') AS day, SUM(_sample_interval) AS views, COUNT(DISTINCT blob3) AS sessions ${views} GROUP BY day ORDER BY day`,
  'Came from': `SELECT blob7 AS referrer, SUM(_sample_interval) AS visits ${views} AND blob4 = 'load' AND blob7 != '' GROUP BY referrer ORDER BY visits DESC LIMIT 20`,
  Countries: `SELECT blob8 AS country, SUM(_sample_interval) AS visits ${views} AND blob4 = 'load' GROUP BY country ORDER BY visits DESC LIMIT 20`,
};

for (const [title, sql] of Object.entries(QUERIES)) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: `${sql} FORMAT JSON`,
  });
  if (!response.ok) {
    console.error(`${title}: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  console.log(`\n${title}, last ${days} days`);
  console.table((await response.json()).data);
}
