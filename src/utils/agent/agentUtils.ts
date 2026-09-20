/**
 * The model behind the agent chrome — `<ToolCallCard>`, `<ApprovalCard>`, `<Reasoning>` and
 * `<StreamingText>`. Four judgements, none of which needs React: what a status is *called*, how long a
 * thought took in words, how a value a model invented becomes text that is safe to put on a page, and
 * which part of a message arrived since the last render.
 *
 * The third is the reason this file exists. A tool's arguments are whatever the model produced —
 * possibly circular, possibly a `BigInt`, possibly a megabyte — and `JSON.stringify` answers those three
 * with a throw, a throw and a frozen tab. Components render, models decide.
 */
/**
 * Where a tool call is. The four states every agent runtime reports under its own spelling: AI SDK's
 * `input-streaming`/`input-available`/`output-available`/`output-error`, and the plainer words the card
 * shows. Declared out here rather than inside the namespace so a prop naming it resolves to its values —
 * a catalog that printed the alias would constrain nothing.
 */
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

/** What was decided about an action the agent asked permission for. `null` is "not yet". */
export type ApprovalDecision = 'approved' | 'rejected';

namespace AgentUtils {
  /**
   * The word beside the dot. A status shown as a colour alone is a status a forced-colors mode throws
   * away and a screen reader never hears, so every state is spelled out.
   */
  const STATUS_LABELS: Readonly<Record<ToolCallStatus, string>> = {
    pending: 'Pending',
    running: 'Running',
    success: 'Done',
    error: 'Failed',
  };

  export function statusLabel(status: ToolCallStatus): string {
    return STATUS_LABELS[status] ?? STATUS_LABELS.pending;
  }

  /** The decisions, in the same voice: what the card says once a button has been pressed. */
  const DECISION_LABELS: Readonly<Record<ApprovalDecision, string>> = {
    approved: 'Approved',
    rejected: 'Rejected',
  };

  export function decisionLabel(decision: ApprovalDecision): string {
    return DECISION_LABELS[decision] ?? '';
  }

  /**
   * How much of a value the card will show. Past this the text is cut and a line says how much was left —
   * a model that returned a 4 MB tool result should cost a scroll bar, not the frame it is painted in.
   */
  export const VALUE_LIMIT = 20_000;

  /** A value that is already text is shown as it stands; everything else is JSON a person can read. */
  function stringify(value: unknown): string {
    if (typeof value === 'string') return value;

    try {
      // `undefined` at the top level stringifies to `undefined` (the value, not the string), and a
      // `BigInt` or a circular structure throws — all three land on the fallback below.
      const text = JSON.stringify(value, replacer, 2);

      return typeof text === 'string' ? text : String(value);
    } catch {
      return String(value);
    }
  }

  /**
   * The two things `JSON.stringify` cannot do for itself. A `BigInt` throws rather than serialising, and a
   * function is dropped silently — which in a tool's arguments reads as the model having omitted it.
   */
  function replacer(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') return `${value}`;
    if (typeof value === 'function') return '[Function]';

    return value;
  }

  export interface FormattedValue {
    text: string;
    /** How many characters were cut, or `0`. The card says so rather than showing text that stops. */
    truncated: number;
  }

  /** A tool's input, output or error as text, capped. The one place a model's own data becomes a page. */
  export function formatValue(value: unknown, limit: number = VALUE_LIMIT): FormattedValue {
    const text = stringify(value);

    if (text.length <= limit) return { text, truncated: 0 };

    return { text: text.slice(0, limit), truncated: text.length - limit };
  }

  /** Whether there is anything to show at all — `null` and `undefined` are absence, `0` and `''` are not. */
  export function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null;
  }

  /**
   * A count with its thousands grouped, done here rather than with `toLocaleString`: the number lands in
   * prerendered HTML, and a separator that differs between the server's locale and the reader's is a
   * hydration mismatch nobody would look for.
   */
  export function formatCount(value: number): string {
    return `${Math.trunc(value)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * How long a thought took, in the units a reader thinks in: milliseconds under a second, then seconds,
   * then minutes and seconds. Rounded down for the minutes so "1m 0s" is a minute rather than two.
   */
  export function formatDuration(milliseconds: number): string {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return '';

    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;

    const seconds = milliseconds / 1000;

    if (seconds < 60) return `${seconds < 10 ? Math.round(seconds * 10) / 10 : Math.round(seconds)}s`;

    const minutes = Math.floor(seconds / 60);

    return `${minutes}m ${Math.round(seconds - minutes * 60)}s`;
  }

  /**
   * One run of text that arrived together, and the identity React keys it by. Keys are never reused, so a
   * run that is still fading is never handed a different run's text half way through its entrance.
   */
  export interface StreamSegment {
    key: number;
    text: string;
  }

  /**
   * A streaming message between two renders: the text that has settled, and the last few runs to arrive,
   * which are the ones still fading in.
   */
  export interface StreamState {
    settled: string;
    segments: readonly StreamSegment[];
    /** Monotone, and carried across a reset — a key a fading run still holds is never handed out twice. */
    nextKey: number;
  }

  /**
   * How many runs stay animated at once. The rest settle, so a message of any length is one text node plus
   * this many spans — the reason the entrance costs the same at the first token and the ten-thousandth.
   */
  export const STREAM_WINDOW = 8;

  /** A message that is already whole: all of it settled, none of it animating. */
  export function initialStream(text: string): StreamState {
    return { settled: text, segments: [], nextKey: 0 };
  }

  /** Everything on the page, settled and still arriving. */
  export function streamText(state: StreamState): string {
    return state.segments.reduce((text, segment) => text + segment.text, state.settled);
  }

  /**
   * The next state for the text as it now stands. Pure, and keyed on the text itself rather than on a
   * counter, so advancing twice with the same message is the same as advancing once.
   */
  export function advanceStream(state: StreamState, text: string, window: number = STREAM_WINDOW): StreamState {
    const rendered = streamText(state);

    if (text === rendered) return state;

    // Anything but an append is a different message — a regenerate, an edit, a retry — and fading in the
    // part of it that happens to differ would read as the model having written just that part now.
    if (!text.startsWith(rendered)) return { settled: text, segments: [], nextKey: state.nextKey };

    const arrived = [...state.segments, { key: state.nextKey, text: text.slice(rendered.length) }];
    const settling = Math.max(0, arrived.length - Math.max(0, window));

    return {
      settled: arrived.slice(0, settling).reduce((prefix, segment) => prefix + segment.text, state.settled),
      segments: arrived.slice(settling),
      nextKey: state.nextKey + 1,
    };
  }
}

export default AgentUtils;
