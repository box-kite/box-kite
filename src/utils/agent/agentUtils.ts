/**
 * The model behind the agent chrome — `<ToolCallCard>`, `<ApprovalCard>` and `<Reasoning>`. Three
 * judgements, none of which needs React: what a status is *called*, how long a thought took in words, and
 * how a value a model invented becomes text that is safe to put on a page.
 *
 * The last one is the reason this file exists. A tool's arguments are whatever the model produced —
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
}

export default AgentUtils;
