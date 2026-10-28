import { describe, expect, it, vi } from 'vitest';
import { configFrom, freshSession, readSession, sessionFromHash, signInUrl, storeSession } from './adminSession';

const CONFIG = { url: 'https://ref.supabase.co', key: 'sb_publishable_x' };
const NOW = Date.parse('2026-10-28T12:00:00Z');

const base64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = (claims: object) => `${base64({ alg: 'HS256' })}.${base64(claims)}.signature`;
const ACCESS = token({ sub: 'user-1', email: 'owner@example.com', user_metadata: { user_name: 'owner' } });

describe('the admin session', () => {
  it('needs both the URL and the key, and drops a trailing slash', () => {
    expect(configFrom('https://ref.supabase.co/', 'key')).toEqual({ url: 'https://ref.supabase.co', key: 'key' });
    expect(configFrom(undefined, 'key')).toBeNull();
    expect(configFrom('https://ref.supabase.co', '')).toBeNull();
  });

  it('signs in with GitHub and comes back to the page it left', () => {
    expect(signInUrl(CONFIG, 'https://www.box-kite.dev/admin/')).toBe(
      'https://ref.supabase.co/auth/v1/authorize?provider=github&redirect_to=https%3A%2F%2Fwww.box-kite.dev%2Fadmin%2F',
    );
  });

  it('reads the session a sign-in leaves in the fragment, named by its GitHub login', () => {
    const session = sessionFromHash(`#access_token=${ACCESS}&expires_at=1800000000&refresh_token=r1&token_type=bearer`, NOW);

    expect(session).toEqual({ accessToken: ACCESS, refreshToken: 'r1', expiresAt: 1800000000, userId: 'user-1', account: 'owner' });
  });

  it('reports a refused sign-in, and ignores a fragment that is not one', () => {
    expect(sessionFromHash('#error=access_denied&error_description=Signups+not+allowed', NOW)).toEqual({ error: 'Signups not allowed' });
    expect(sessionFromHash('#usage', NOW)).toBeNull();
    expect(sessionFromHash('', NOW)).toBeNull();
  });

  it('keeps a session in storage, and forgets one it cannot read', () => {
    const storage = new Map<string, string>();
    const store = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    };
    const session = { accessToken: ACCESS, refreshToken: 'r1', expiresAt: 1, userId: 'user-1', account: 'owner' };

    storeSession(store, session);
    expect(readSession(store)).toEqual(session);
    storeSession(store, null);
    expect(readSession(store)).toBeNull();
    storage.set('box-kite-admin-session', '{nope');
    expect(readSession(store)).toBeNull();
  });

  it('refreshes a token about to lapse, and gives up when the refresh is refused', async () => {
    const lapsing = { accessToken: ACCESS, refreshToken: 'r1', expiresAt: NOW / 1000 + 30, userId: 'user-1', account: 'owner' };
    const renewed = token({ sub: 'user-1', email: 'owner@example.com' });
    const send = vi.fn().mockResolvedValue(Response.json({ access_token: renewed, refresh_token: 'r2', expires_at: NOW / 1000 + 3600 }));

    expect(await freshSession(CONFIG, { ...lapsing, expiresAt: NOW / 1000 + 600 }, NOW, send)).toMatchObject({ refreshToken: 'r1' });
    expect(send).not.toHaveBeenCalled();
    expect(await freshSession(CONFIG, lapsing, NOW, send)).toMatchObject({
      accessToken: renewed,
      refreshToken: 'r2',
      account: 'owner@example.com',
    });
    expect(JSON.parse(send.mock.calls[0][1].body)).toEqual({ refresh_token: 'r1' });

    send.mockResolvedValue(new Response(null, { status: 400 }));
    expect(await freshSession(CONFIG, lapsing, NOW, send)).toBeNull();
  });
});
