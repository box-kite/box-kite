'use client';
import { useChat } from '@ai-sdk/react';
import Box from '@box-kite/react';
import { ApprovalCard, Reasoning, StreamingText, ToolCallCard, type ToolCallStatus } from '@box-kite/react/components/agent';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import Skeleton from '@box-kite/react/components/skeleton';
import Textbox from '@box-kite/react/components/textbox';
import {
  DefaultChatTransport,
  getToolName,
  isStaticToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import { useState } from 'react';
import '../elementMode';

/**
 * The tool loop, drawn: what the agent thought, what it ran, what it wants permission to do, and what it
 * says. Every part of the turn is one component from `@box-kite/react/components/agent` — no chat
 * framework, no stylesheet, and the only mapping is the one below.
 *
 * AI SDK reports six tool states. Four of them are a `<ToolCallCard>` status; the other two are an
 * approval, which is a different component rather than a fifth status — a decision is not a stage a call
 * passes through, it is a question somebody has to answer.
 */
const STATUS: Record<string, ToolCallStatus> = {
  'input-streaming': 'pending',
  'input-available': 'running',
  'output-available': 'success',
  'output-error': 'error',
};

const PROMPTS = ['Elena Rusu wants order 4182 refunded.', 'What has Andrei Popa ordered?', 'Refund order 4184 — it arrived damaged.'];

export default function AgentPage() {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [failure, setFailure] = useState<string | null>(null);

  const { messages, sendMessage, addToolApprovalResponse, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/agent' }),
    // Answering an approval is not a new message: this is what resumes the loop the tool stopped.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError: (error) => setFailure(error.message),
  });

  const busy = status === 'submitted' || status === 'streaming';

  const ask = () => {
    setFailure(null);
    sendMessage({ text: prompt });
  };

  return (
    <Flex d="column" gap={6} maxWidth={200} mx="auto">
      <Box>
        <H2 fontSize={18} fontWeight={600}>
          A tool loop, in components
        </H2>
        <P mt={2} fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
          A refund over 5,000 MDL stops for a person. Everything below is <code>components/agent</code>.
        </P>
      </Box>

      <Flex gap={3} ai="center" flexWrap="wrap">
        <Textbox
          flex1
          minWidth={80}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          props={{ 'aria-label': 'What to ask the agent' }}
        />
        <Button onClick={ask} disabled={busy}>
          {busy ? 'Working…' : 'Ask'}
        </Button>
      </Flex>

      <Flex gap={2} flexWrap="wrap">
        {PROMPTS.map((suggestion) => (
          <Button key={suggestion} variant="secondary" fontSize={12} onClick={() => setPrompt(suggestion)}>
            {suggestion}
          </Button>
        ))}
      </Flex>

      {failure ? (
        <Box p={4} borderRadius={2} b={1} borderColor="amber-500" fontSize={14}>
          {failure}
        </Box>
      ) : null}

      <Flex d="column" gap={5}>
        {messages.map((message) => (
          <Turn key={message.id} message={message} onDecision={addToolApprovalResponse} />
        ))}
        {status === 'submitted' && <Skeleton lines={2} label="The agent is thinking" />}
      </Flex>
    </Flex>
  );
}

type Decide = (options: { id: string; approved: boolean }) => void;

/** One message, part by part, in the order the stream produced them. */
function Turn({ message, onDecision }: { message: UIMessage; onDecision: Decide }) {
  const mine = message.role === 'user';

  return (
    <Flex d="column" gap={3} ai={mine ? 'end' : 'stretch'}>
      {message.parts.map((part, index) => {
        if (part.type === 'text') {
          return mine ? (
            <Box key={index} px={4} py={2} borderRadius={3} bgColor="indigo-600" color="white" fontSize={14} maxWidth={140}>
              {part.text}
            </Box>
          ) : (
            // `state` is `streaming` until the part is closed, which is exactly what the caret is for.
            <StreamingText key={index} text={part.text} streaming={part.state === 'streaming'} />
          );
        }

        if (part.type === 'reasoning') {
          return (
            <Reasoning key={index} streaming={part.state === 'streaming'} open={part.state === 'streaming'}>
              {part.text}
            </Reasoning>
          );
        }

        return isStaticToolUIPart(part) ? <ToolPart key={index} part={part} onDecision={onDecision} /> : null;
      })}
    </Flex>
  );
}

/** A tool call: a card in four of its states, and a decision in the other two. */
function ToolPart({ part, onDecision }: { part: ToolUIPart; onDecision: Decide }) {
  const name = getToolName(part);

  if (part.state === 'approval-requested') {
    return (
      <ApprovalCard
        title={`${name} needs a person`}
        description={part.approval.requestReason ?? 'This is over the amount a tool may refund on its own, and it cannot be undone.'}
        input={part.input}
        onDecisionChange={(decision) => onDecision({ id: part.approval.id, approved: decision === 'approved' })}
      />
    );
  }

  // Answered, and the loop has not come back yet: the same card, showing what was decided.
  if (part.state === 'approval-responded') {
    return <ApprovalCard title={`${name} needs a person`} input={part.input} decision={part.approval.approved ? 'approved' : 'rejected'} />;
  }

  return (
    <ToolCallCard
      name={name}
      status={STATUS[part.state] ?? 'pending'}
      input={part.input}
      output={part.state === 'output-available' ? part.output : undefined}
      error={part.state === 'output-error' ? part.errorText : undefined}
    />
  );
}
