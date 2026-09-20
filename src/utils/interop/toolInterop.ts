/**
 * One vocabulary for where a tool call is, across the four runtimes that report it.
 *
 * `<ToolCallCard>` and `<ApprovalCard>` take a status and a decision; every runtime spells those out
 * differently and one of them does not hand you a part at all. This is the whole of the mapping, and it
 * is framework-free because the answer is a lookup, not a state machine.
 *
 * The split worth knowing: **a decision is not a stage a call passes through, it is a question somebody
 * answers** — so AI SDK's six states are two components rather than six statuses, and the runtimes that
 * report four are the ones whose human-in-the-loop lives somewhere else entirely.
 */
import type { ApprovalDecision, ToolCallStatus } from '../agent/agentUtils';

/** Which of the two cards a part belongs to. A call is shown; a question is answered. */
export type ToolPartKind = 'call' | 'approval';

/** A tool call in this library's words, whichever runtime's words arrived. */
export interface ToolPart {
  kind: ToolPartKind;
  /** Where the call is, for `<ToolCallCard status>`. An approval waiting on a person is `pending`. */
  status: ToolCallStatus;
  /** What was decided, for `<ApprovalCard decision>`. `null` is a question nobody has answered yet. */
  decision: ApprovalDecision | null;
  /** The arguments, where the part carried them under any of its runtimes' names. */
  input?: unknown;
  output?: unknown;
  /** The failure, as text, where the part reported one. */
  error?: string;
}

namespace ToolInterop {
  /** AI SDK 6/7 (`ai`): six `state` values, four of which are a call and two of which are a question. */
  const AI_SDK: Readonly<Record<string, ToolCallStatus | 'approval'>> = {
    'input-streaming': 'pending',
    'input-available': 'running',
    'output-available': 'success',
    'output-error': 'error',
    'approval-requested': 'approval',
    'approval-responded': 'approval',
  };

  /** CopilotKit (`useCopilotAction`): three. `executing` with a `respond` in hand is the question. */
  const COPILOT_KIT: Readonly<Record<string, ToolCallStatus>> = {
    inProgress: 'pending',
    executing: 'running',
    complete: 'success',
  };

  /** assistant-ui (`ToolCallMessagePartStatus`): a `type`, and `requires-action` is the question. */
  const ASSISTANT_UI: Readonly<Record<string, ToolCallStatus>> = {
    running: 'running',
    complete: 'success',
    incomplete: 'error',
    'requires-action': 'pending',
  };

  function record(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  }

  function text(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
  }

  /** The three names the same field goes by, in the order a part that carries two of them should be read. */
  function inputOf(part: Record<string, unknown>): unknown {
    return part.input ?? part.args ?? part.argsText;
  }

  function outputOf(part: Record<string, unknown>): unknown {
    return part.output ?? part.result;
  }

  /**
   * A part from any of the three runtimes that hand you one, in this library's words. `null` is a value
   * that is not a tool part at all — the caller decides what that means, since a half-streamed message
   * carrying nothing yet is ordinary.
   */
  export function toolPart(value: unknown): ToolPart | null {
    const part = record(value);
    if (part === null) return null;

    const input = inputOf(part);
    const output = outputOf(part);
    const state = text(part.state);

    // AI SDK, which is the only one of the three whose approval is a state rather than a second channel.
    if (state !== undefined && state in AI_SDK) {
      const mapped = AI_SDK[state];

      if (mapped !== 'approval') return { kind: 'call', status: mapped, decision: null, input, output, error: text(part.errorText) };

      const approval = record(part.approval);
      const approved = approval?.approved;

      return {
        kind: 'approval',
        status: 'pending',
        decision: typeof approved === 'boolean' ? (approved ? 'approved' : 'rejected') : null,
        input,
      };
    }

    const status = part.status;

    // assistant-ui, whose status is an object: `{ type: 'requires-action', reason }`.
    const shape = record(status);
    if (shape !== null) {
      const type = text(shape.type) ?? '';
      const requiresAction = type === 'requires-action';

      return {
        kind: requiresAction ? 'approval' : 'call',
        status: ASSISTANT_UI[type] ?? 'pending',
        decision: null,
        input,
        output,
        error: text(record(shape.error)?.message) ?? text(shape.error),
      };
    }

    // CopilotKit, whose status is a word. `respond` in hand is a call waiting on a person, which is the
    // whole of `renderAndWaitForResponse` — the runtime says nothing else about it.
    const word = text(status);
    if (word !== undefined && word in COPILOT_KIT) {
      const waiting = typeof part.respond === 'function' && word === 'executing';

      return {
        kind: waiting ? 'approval' : 'call',
        status: waiting ? 'pending' : COPILOT_KIT[word],
        decision: null,
        input,
        output,
      };
    }

    return null;
  }

  /**
   * AG-UI is the odd one out: it reports *events*, not parts, so a card needs a fold rather than a
   * mapping. One call per event, oldest first, keyed by `toolCallId`.
   */
  export function applyEvent(parts: Readonly<Record<string, ToolPart>>, event: unknown): Record<string, ToolPart> {
    const message = record(event);
    const id = text(message?.toolCallId);
    if (message === null || id === undefined) return parts as Record<string, ToolPart>;

    const type = text(message.type);
    const current = parts[id] ?? { kind: 'call' as const, status: 'pending' as const, decision: null };

    if (type === 'TOOL_CALL_START') return { ...parts, [id]: { ...current, kind: 'call', status: 'pending' } };
    if (type === 'TOOL_CALL_ARGS') return { ...parts, [id]: { ...current, status: 'pending' } };
    if (type === 'TOOL_CALL_END') return { ...parts, [id]: { ...current, status: 'running' } };

    if (type === 'TOOL_CALL_RESULT') {
      return { ...parts, [id]: { ...current, status: 'success', output: message.content ?? message.result } };
    }

    // An interrupt is the question: the run stopped and is waiting on a person, which is `<ApprovalCard>`.
    if (type === 'INTERRUPT' || type === 'RUN_INTERRUPT') {
      return { ...parts, [id]: { ...current, kind: 'approval', status: 'pending' } };
    }

    if (type === 'RUN_ERROR') return { ...parts, [id]: { ...current, status: 'error', error: text(message.message) } };

    return parts as Record<string, ToolPart>;
  }
}

export default ToolInterop;
