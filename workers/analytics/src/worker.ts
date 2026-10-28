import { DataPoint, MAX_BODY, toDataPoints } from './events';

export interface Env {
  EVENTS: { writeDataPoint(point: DataPoint): void };
  /** Comma-separated origins allowed to post. */
  ORIGINS: string;
}

/** The collector `beacon()` posts the site's records to: each one becomes a Workers Analytics Engine data point. */
export default {
  async fetch(request: Request & { cf?: { country?: string } }, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    // A browser always sends Origin on a POST, a beacon included; this keeps other sites out, not a determined script.
    if (!env.ORIGINS.split(',').includes(request.headers.get('origin') ?? '')) return new Response(null, { status: 403 });

    const body = await request.text();
    if (body.length > MAX_BODY) return new Response(null, { status: 413 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(null, { status: 400 });
    }
    toDataPoints(parsed, request.cf?.country ?? '').forEach((point) => env.EVENTS.writeDataPoint(point));

    return new Response(null, { status: 204 });
  },
};
