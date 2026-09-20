import { anthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';
import { APPROVAL_THRESHOLD, ORDERS } from '../../agent/orders';

/**
 * The server half of the tool loop: two tools, one of which stops for a person. `needsApproval` is what
 * makes the SDK pause rather than execute, and the pause arrives at the client as a tool part in the
 * `approval-requested` state — which is an `<ApprovalCard>` and nothing else.
 */
export const maxDuration = 30;

const SYSTEM = `You are a support agent for an online shop, in Moldova, working in MDL.

Use searchOrders before refunding anything, and refund only the order the customer asked about. Say what
you are doing in one or two sentences. Never claim a refund went through before the tool has answered.`;

const tools = {
  searchOrders: tool({
    description: 'Find orders by customer name, order id or status.',
    inputSchema: z.object({ query: z.string().describe('A customer name, an order id, or a status.') }),
    execute: async ({ query }) => {
      const needle = query.trim().toLowerCase();

      return ORDERS.filter((order) => `${order.id}` === needle || order.customer.toLowerCase().includes(needle) || order.status === needle);
    },
  }),
  refundOrder: tool({
    description: 'Refund an order in full. Money leaves the account and it cannot be undone.',
    inputSchema: z.object({ orderId: z.number(), amount: z.number().describe('The refund in MDL.') }),
    // The whole gate. A small refund goes through; a large one waits for somebody, and the loop stops
    // where it is until the answer comes back from the client.
    needsApproval: async ({ amount }) => amount > APPROVAL_THRESHOLD,
    execute: async ({ orderId, amount }) => {
      const order = ORDERS.find((candidate) => candidate.id === orderId);

      if (!order) throw new Error(`There is no order ${orderId}.`);

      return { orderId, amount, refunded: true, customer: order.customer };
    },
  }),
};

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  if (!process.env.ANTHROPIC_API_KEY) {
    // The example builds and smoke-tests with no key, so the missing one is an answer rather than a crash.
    return Response.json(
      { error: 'Set ANTHROPIC_API_KEY to run the agent. The page works without one; the model does not.' },
      { status: 503 },
    );
  }

  const result = streamText({
    model: anthropic('claude-sonnet-5'),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
