import { describe, expect, it } from 'vitest';
import ToolInterop, { ToolPart } from './toolInterop';

describe('ToolInterop.toolPart', () => {
  describe('AI SDK', () => {
    it.each([
      ['input-streaming', 'pending'],
      ['input-available', 'running'],
      ['output-available', 'success'],
      ['output-error', 'error'],
    ] as const)('maps %s to %s', (state, status) => {
      expect(ToolInterop.toolPart({ type: 'tool-search', state })).toMatchObject({ kind: 'call', status });
    });

    it('reads a request for permission as a question rather than a stage', () => {
      const part = ToolInterop.toolPart({ state: 'approval-requested', input: { id: 4182 }, approval: { id: 'a1' } });

      expect(part).toEqual({ kind: 'approval', status: 'pending', decision: null, input: { id: 4182 } });
    });

    it.each([
      [true, 'approved'],
      [false, 'rejected'],
    ] as const)('reads approved=%s as %s', (approved, decision) => {
      expect(ToolInterop.toolPart({ state: 'approval-responded', approval: { id: 'a1', approved } })?.decision).toBe(decision);
    });

    it('carries the error text a failed call reports', () => {
      expect(ToolInterop.toolPart({ state: 'output-error', errorText: 'No such order' })?.error).toBe('No such order');
    });
  });

  describe('assistant-ui', () => {
    it.each([
      ['running', 'running'],
      ['complete', 'success'],
      ['incomplete', 'error'],
    ] as const)('maps status.type %s to %s', (type, status) => {
      expect(ToolInterop.toolPart({ toolName: 'search', status: { type } })).toMatchObject({ kind: 'call', status });
    });

    it('reads requires-action as the question, whatever its reason', () => {
      const part = ToolInterop.toolPart({ status: { type: 'requires-action', reason: 'interrupt' }, args: { q: 'refunds' } });

      expect(part).toMatchObject({ kind: 'approval', status: 'pending', input: { q: 'refunds' } });
    });

    it('takes the error off the status object it is nested in', () => {
      expect(ToolInterop.toolPart({ status: { type: 'incomplete', error: 'timed out' } })?.error).toBe('timed out');
    });
  });

  describe('CopilotKit', () => {
    it.each([
      ['inProgress', 'pending'],
      ['executing', 'running'],
      ['complete', 'success'],
    ] as const)('maps %s to %s', (status, mapped) => {
      expect(ToolInterop.toolPart({ status, args: {} })).toMatchObject({ kind: 'call', status: mapped });
    });

    // `renderAndWaitForResponse` is the whole of its human-in-the-loop, and `respond` in hand is the
    // only thing that tells it apart from a call the runtime is executing itself.
    it('reads an executing action holding respond as the question', () => {
      const part = ToolInterop.toolPart({ status: 'executing', args: { order: 4182 }, respond: () => {} });

      expect(part).toMatchObject({ kind: 'approval', status: 'pending' });
    });

    it('reads the result under the name CopilotKit gives it', () => {
      expect(ToolInterop.toolPart({ status: 'complete', args: {}, result: { ok: true } })?.output).toEqual({ ok: true });
    });
  });

  it('answers nothing for what is not a tool part at all', () => {
    for (const value of [null, undefined, 'text', 42, [], { type: 'text', text: 'hello' }, { state: 'unheard-of' }]) {
      expect(ToolInterop.toolPart(value)).toBeNull();
    }
  });
});

describe('ToolInterop.applyEvent', () => {
  // AG-UI is the odd one out: there is no part to map, only events to fold.
  const fold = (events: unknown[]) => events.reduce<Record<string, ToolPart>>((parts, event) => ToolInterop.applyEvent(parts, event), {});

  it('folds a call from start to result', () => {
    const parts = fold([
      { type: 'TOOL_CALL_START', toolCallId: 't1', toolCallName: 'searchOrders' },
      { type: 'TOOL_CALL_ARGS', toolCallId: 't1', delta: '{"q"' },
      { type: 'TOOL_CALL_END', toolCallId: 't1' },
      { type: 'TOOL_CALL_RESULT', toolCallId: 't1', content: '3 orders' },
    ]);

    expect(parts.t1).toMatchObject({ kind: 'call', status: 'success', output: '3 orders' });
  });

  it('is running once the arguments are in and before the result is', () => {
    const parts = fold([
      { type: 'TOOL_CALL_START', toolCallId: 't1' },
      { type: 'TOOL_CALL_END', toolCallId: 't1' },
    ]);

    expect(parts.t1.status).toBe('running');
  });

  it('turns a call into a question when the run is interrupted', () => {
    const parts = fold([
      { type: 'TOOL_CALL_START', toolCallId: 't1' },
      { type: 'INTERRUPT', toolCallId: 't1' },
    ]);

    expect(parts.t1).toMatchObject({ kind: 'approval', status: 'pending' });
  });

  it('keeps each call to itself and hands the same object back for an event it cannot use', () => {
    const parts = fold([
      { type: 'TOOL_CALL_START', toolCallId: 't1' },
      { type: 'TOOL_CALL_START', toolCallId: 't2' },
      { type: 'TOOL_CALL_END', toolCallId: 't2' },
    ]);

    expect(parts.t1.status).toBe('pending');
    expect(parts.t2.status).toBe('running');
    expect(ToolInterop.applyEvent(parts, { type: 'TEXT_MESSAGE_CONTENT', delta: 'hi' })).toBe(parts);
  });
});
