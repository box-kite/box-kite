/** The Supabase project `/admin` reads from: its URL and the publishable key, which is public by design. */
export interface AdminConfig {
  url: string;
  key: string;
}

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt: number;
  userId: string;
  /** What the dashboard calls the account: the GitHub login, else the e-mail. */
  account: string;
}

const STORAGE_KEY = 'box-kite-admin-session';
/** Refreshed this long before it expires, so a request never carries a token that lapses on the way. */
const REFRESH_MARGIN = 60;

export function configFrom(url: string | undefined, key: string | undefined): AdminConfig | null {
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null;
}

/** GitHub sign-in through Supabase Auth; with no PKCE challenge it answers in the fragment of `redirectTo`. */
export function signInUrl(config: AdminConfig, redirectTo: string): string {
  return `${config.url}/auth/v1/authorize?provider=github&redirect_to=${encodeURIComponent(redirectTo)}`;
}

/** A JWT's payload, read and not verified: the database verifies it, and this only names the account. */
function claimsOf(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');

    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0)))) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sessionOf(accessToken: string, refreshToken: string, expiresAt: number): AdminSession | null {
  const claims = claimsOf(accessToken);
  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof claims.sub !== 'string' || !refreshToken) return null;

  const account = [metadata.user_name, claims.email, claims.sub].find(
    (value): value is string => typeof value === 'string' && value !== '',
  );

  return { accessToken, refreshToken, expiresAt, userId: claims.sub, account: account ?? claims.sub };
}

/** What a sign-in hands back in the URL's fragment: a session, the error it reported, or nothing to do with signing in. */
export function sessionFromHash(hash: string, now: number): AdminSession | { error: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const error = params.get('error_description') ?? params.get('error');
  if (error) return { error };

  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  const expiresAt = Number(params.get('expires_at')) || Math.floor(now / 1000) + (Number(params.get('expires_in')) || 3600);

  return (
    sessionOf(accessToken, params.get('refresh_token') ?? '', expiresAt) ?? { error: 'The sign-in returned a token that names nobody.' }
  );
}

export function readSession(storage: Pick<Storage, 'getItem'> | undefined): AdminSession | null {
  try {
    const stored = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as AdminSession | null;

    return stored && typeof stored.accessToken === 'string' && typeof stored.refreshToken === 'string' ? stored : null;
  } catch {
    return null;
  }
}

export function storeSession(storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined, session: AdminSession | null): void {
  try {
    if (session) storage?.setItem(STORAGE_KEY, JSON.stringify(session));
    else storage?.removeItem(STORAGE_KEY);
  } catch {
    // A browser that stores nothing signs in again next visit.
  }
}

/** The session as it is safe to send now: itself, a refreshed one, or `null` once the refresh token is refused too. */
export async function freshSession(
  config: AdminConfig,
  session: AdminSession,
  now: number,
  send: typeof fetch = fetch,
): Promise<AdminSession | null> {
  if (session.expiresAt - REFRESH_MARGIN > now / 1000) return session;

  const response = await send(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.key, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!response.ok) return null;

  const body = (await response.json()) as { access_token?: string; refresh_token?: string; expires_at?: number; expires_in?: number };
  if (!body.access_token) return null;

  return sessionOf(body.access_token, body.refresh_token ?? '', body.expires_at ?? Math.floor(now / 1000) + (body.expires_in ?? 3600));
}

/** Ends the session on the server as well; a failure there still signs the page out. */
export async function signOut(config: AdminConfig, session: AdminSession, send: typeof fetch = fetch): Promise<void> {
  await send(`${config.url}/auth/v1/logout`, {
    method: 'POST',
    headers: { apikey: config.key, authorization: `Bearer ${session.accessToken}` },
  }).catch(() => undefined);
}
