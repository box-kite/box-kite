import { anthropic } from '@ai-sdk/anthropic';
import { specSchema } from '@box-kite/react/catalog';
import { jsonSchema, streamObject } from 'ai';
import { ALLOWED, DATA_SHAPE } from '../../generative/allowed';

/**
 * The live half of the generative-UI loop: a prompt in, a stream of JSON out, constrained by the catalog
 * the page renders against. The model composes a tree of component names and props — it runs no code, and
 * it reaches no data: every value in the spec it writes is a `$data` path the page resolves.
 */
export const maxDuration = 30;

const SYSTEM = `You lay out dashboards for a React app.

Compose a tree of the components the schema allows. Put every widget in the dashboard's layout: one
layout item per widget, ids matching, twelve columns wide, and widgets that do not overlap.

Never write a value into the tree. The app's data is:

${DATA_SHAPE}

Bind to it with { "$data": "<path>" } — a chart's data, a ring's value, a grid's rows. Give every chart a
label saying what it shows.`;

export async function POST(request: Request) {
  const { prompt } = (await request.json()) as { prompt?: string };

  if (!process.env.ANTHROPIC_API_KEY) {
    // The example builds and smoke-tests with no key, so the missing one is an answer rather than a crash.
    return Response.json(
      { error: 'Set ANTHROPIC_API_KEY to generate a dashboard. The page works without one; the model does not.' },
      { status: 503 },
    );
  }

  const result = streamObject({
    model: anthropic('claude-sonnet-5'),
    // The constraint is the catalog, as a tree: component names are an enum of what this app allows, and
    // each one's props are its own schema. `bindings` is what lets a prop be a `$data` path.
    schema: jsonSchema(specSchema(ALLOWED, { bindings: true }) as never),
    system: SYSTEM,
    prompt: prompt ?? 'Show me how sales are going.',
  });

  return result.toTextStreamResponse();
}
