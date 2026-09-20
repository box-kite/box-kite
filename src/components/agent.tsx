import { FunctionComponent, ReactNode, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import AgentUtils, { ApprovalDecision, ToolCallStatus } from '../utils/agent/agentUtils';

export { AgentUtils };
export type { ApprovalDecision, ToolCallStatus };

/** Why a card opened or closed: a press on its header, which is also what Enter and Space on it produce. */
export type DisclosureReason = 'trigger';

/** Which button was pressed. The decision says what it meant; this says what the person did. */
export type ApprovalReason = 'approve' | 'reject';

/**
 * The chevron every card in this module turns, drawn with two borders the way the accordion's is — the
 * library ships no icons, and two identical rules share one class.
 */
function Arrow({ part, open }: { part: 'toolCall.arrow' | 'reasoning.arrow'; open: boolean }) {
  return <Box tag="span" component={part} variant={{ open }} props={{ 'aria-hidden': true }} />;
}

/**
 * Which card's nodes a labelled value renders into. Two identical sets rather than one shared one, the
 * way `Accordion` and `Collapsible` each own their mechanism: equal values share a class, so the second
 * set costs nothing, and either card can be restyled without the other following.
 */
const TOOL_PARTS = {
  section: 'toolCall.section',
  label: 'toolCall.label',
  value: 'toolCall.value',
  truncated: 'toolCall.truncated',
} as const;

const APPROVAL_PARTS = {
  section: 'approval.section',
  label: 'approval.label',
  value: 'approval.value',
  truncated: 'approval.truncated',
} as const;

type ValueParts = typeof TOOL_PARTS | typeof APPROVAL_PARTS;

/**
 * One value a model produced, under its word. A `<pre>` rather than a formatted tree: a tool's arguments
 * are JSON, and what a reader needs is to see exactly what was sent.
 */
function Section({ parts, label, value, limit }: { parts: ValueParts; label: ReactNode; value: unknown; limit?: number }) {
  const { text, truncated } = AgentUtils.formatValue(value, limit);

  return (
    <Box component={parts.section}>
      <Box component={parts.label}>{label}</Box>
      <Box tag="pre" component={parts.value}>
        {text}
      </Box>
      {truncated > 0 && <Box component={parts.truncated}>{`${AgentUtils.formatCount(truncated)} more characters, not shown`}</Box>}
    </Box>
  );
}

// `open` is a Box pseudo-class prop, and on both cards here it is the body's state — the precedent
// `Collapsible` set, and the reason it is omitted rather than renamed.
export interface ToolCallCardProps<TKey extends keyof ComponentsAndVariants = 'toolCall'> extends Omit<BoxProps<'div', TKey>, 'open'> {
  /** The tool's name, as the model called it. It is what the header reads. */
  name: ReactNode;
  /** A line under the name: what this call is for, in the app's own words. */
  description?: ReactNode;
  /** Where the call is. Default `pending`. */
  status?: ToolCallStatus;
  /** The arguments. A string is shown as it stands, anything else as the JSON a reader can check. */
  input?: unknown;
  /** What came back, shown the same way. */
  output?: unknown;
  /** What went wrong, shown in place of the output. */
  error?: unknown;
  /** Controlled: whether the body is open. */
  open?: boolean;
  /** Whether it starts open. Default `false` — a transcript of tool calls is a list, not a wall of JSON. */
  defaultOpen?: boolean;
  /** Fires when the header is pressed, with the body's new state. */
  onOpenChange?: ChangeHandler<boolean, DisclosureReason>;
  /** Whether the body can be opened at all. Default `true`; `false` leaves the header a plain row. */
  collapsible?: boolean;
  /** The word above the arguments. Default `Input`. */
  inputLabel?: ReactNode;
  /** The word above what came back. Default `Output`. */
  outputLabel?: ReactNode;
  /** The word above what went wrong. Default `Error`. */
  errorLabel?: ReactNode;
  /** How much of a value is shown before it is cut. Default `AgentUtils.VALUE_LIMIT` (20,000 characters). */
  valueLimit?: number;
  /** Anything else that belongs in the body, under the values. */
  children?: ReactNode;
}

/**
 * One call an agent made: what it ran, where it got to, and — when the header is opened — what went in
 * and what came back.
 *
 * ```tsx
 * <ToolCallCard name="searchOrders" status="success" input={{ query: 'refunds' }} output={rows} />
 * ```
 *
 * **The status is a word, not a colour.** Every state carries its own label beside the dot, because a
 * forced-colors mode throws a tint away and a screen reader never had it — the same rule the library's
 * own state styling follows.
 *
 * **A value is whatever the model produced**, so it is formatted rather than trusted: a circular
 * structure, a `BigInt` and a four-megabyte result all reach the page as text, capped at `valueLimit`
 * with a line saying how much was left. The judgement is `AgentUtils`, which needs no React.
 *
 * The four statuses are the ones every agent runtime reports under its own spelling — AI SDK's
 * `input-streaming`/`input-available`/`output-available`/`output-error` map onto them one for one.
 *
 * @a11y The header is a real `<button>` carrying `aria-expanded` and `aria-controls` when there is a body
 * to open, and a plain row when there is not — a control that discloses nothing is a control nobody wants
 * to land on.
 * @a11y `aria-busy` while the call is running, so a reader is told the card is not finished rather than
 * reading a half-written result as the answer.
 * @a11y The card announces nothing itself. The transcript it is rendered into is what does that, and a
 * live region inserted together with its content is not reliably announced.
 * @keyboard Tab — Focuses the header, and again leaves it. Nothing inside a closed body is reachable.
 * @keyboard Enter, Space — Opens the body, or closes it.
 */
function ToolCallCardImpl<TKey extends keyof ComponentsAndVariants = 'toolCall'>(props: ToolCallCardProps<TKey>) {
  const {
    name,
    description,
    status = 'pending',
    input,
    output,
    error,
    open,
    defaultOpen = false,
    onOpenChange,
    collapsible = true,
    inputLabel = 'Input',
    outputLabel = 'Output',
    errorLabel = 'Error',
    valueLimit,
    children,
    props: tagProps,
    ...restProps
  } = props;

  const identifier = useIdentifier('toolcall');
  const headerId = `${identifier}-header`;
  const bodyId = `${identifier}-body`;

  const [isOpen, setOpen] = useControllableState<boolean, DisclosureReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const handleClick = useEventCallback((event: React.MouseEvent) => setOpen((current) => !current, { reason: 'trigger', event }));

  const sections = [
    { key: 'input', label: inputLabel, value: input },
    { key: 'output', label: outputLabel, value: output },
    { key: 'error', label: errorLabel, value: error },
  ].filter((section) => AgentUtils.hasValue(section.value));

  // Nothing to disclose means no button: the header is a row of text, and the track below it is not
  // rendered at all rather than being an empty thing the keyboard can open.
  const hasBody = collapsible && (sections.length > 0 || children !== undefined);
  const expanded = hasBody && isOpen;

  // Every part is a `<span>`: where there is a body the header is a `<button>`, and a button holds
  // phrasing content. The stacking is the style tree's, so one element serves both headers.
  const header = (
    <>
      <Box tag="span" component="toolCall.summary">
        <Box tag="span" component="toolCall.name">
          {name}
        </Box>
        {description !== undefined && (
          <Box tag="span" component="toolCall.description">
            {description}
          </Box>
        )}
      </Box>
      <Box tag="span" component="toolCall.status" variant={status}>
        <Box tag="span" component="toolCall.status.dot" variant={{ running: status === 'running' }} props={{ 'aria-hidden': true }} />
        {AgentUtils.statusLabel(status)}
      </Box>
      {hasBody && <Arrow part="toolCall.arrow" open={expanded} />}
    </>
  );

  return (
    <Box
      component={'toolCall' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      props={{ 'aria-busy': status === 'running' || undefined, ...tagProps }}
    >
      {hasBody ? (
        <Box
          tag="button"
          component="toolCall.header"
          variant={{ interactive: true }}
          id={headerId}
          props={{ type: 'button', 'aria-expanded': expanded, 'aria-controls': bodyId, onClick: handleClick }}
        >
          {header}
        </Box>
      ) : (
        <Box component="toolCall.header" id={headerId}>
          {header}
        </Box>
      )}

      {hasBody && (
        // The same two elements `Accordion` opens in: a one-row grid running `1fr` to `0fr`, and a bare
        // clip inside it, because padding on a grid item floors the closed track at exactly that much.
        <Box component="toolCall.track" variant={{ closed: !expanded }}>
          <Box component="toolCall.clip">
            <Box component="toolCall.body" id={bodyId}>
              {sections.map((section) => (
                <Section key={section.key} parts={TOOL_PARTS} label={section.label} value={section.value} limit={valueLimit} />
              ))}
              {children}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export const ToolCallCard = ToolCallCardImpl;
(ToolCallCard as FunctionComponent).displayName = 'ToolCallCard';

export interface ApprovalCardProps<TKey extends keyof ComponentsAndVariants = 'approval'> extends BoxProps<'div', TKey> {
  /** What is about to happen, in one line. It names the card. */
  title: ReactNode;
  /** The consequence, where a title cannot carry it: what this will change, and whether it can be undone. */
  description?: ReactNode;
  /** The call itself, shown the way a `ToolCallCard` shows its input. */
  input?: unknown;
  /** The word above it. Default `Request`. */
  inputLabel?: ReactNode;
  /** Controlled: what has been decided. `null` is "not yet", and is what shows the two buttons. */
  decision?: ApprovalDecision | null;
  /** What it starts as. Default `null`. */
  defaultDecision?: ApprovalDecision | null;
  /** Fires when a button is pressed, with the decision and which button made it. */
  onDecisionChange?: ChangeHandler<ApprovalDecision | null, ApprovalReason>;
  /** The decision is on its way to a server: both buttons are disabled and the card reports `aria-busy`. */
  busy?: boolean;
  /** What the approving button says. Default `Approve`. */
  approveLabel?: ReactNode;
  /** What the refusing button says. Default `Reject`. */
  rejectLabel?: ReactNode;
  /**
   * Whether to put focus on the card when it mounts. Default `false` — an agent's turn arrives while the
   * reader is somewhere else, and taking focus from them is how a decision gets pressed by accident. It
   * lands on the *reject* button, which is APG's rule for a decision: the least destructive action.
   */
  autoFocus?: boolean;
  /** How much of the input is shown before it is cut. Default `AgentUtils.VALUE_LIMIT`. */
  valueLimit?: number;
  /** Anything else that belongs above the buttons. */
  children?: ReactNode;
}

/**
 * The gate in front of something an agent wants to do: what it is, and the two answers.
 *
 * ```tsx
 * <ApprovalCard
 *   title="Refund order #4182"
 *   description="6,400 MDL back to the customer. This cannot be undone."
 *   input={{ orderId: 4182 }}
 *   onDecisionChange={(decision) => respond(decision === 'approved')}
 * />
 * ```
 *
 * **One channel, not two.** `onDecisionChange(decision, { reason })` is the whole API: the decision says
 * what was chosen and the reason says which button chose it, which is the shape every other component in
 * the library reports through. It maps straight onto AI SDK 6's `needsApproval`, CopilotKit's
 * `renderAndWaitForResponse` and AG-UI's `INTERRUPT`.
 *
 * **The decision's own line is a live region that exists before there is anything in it**, so a reader is
 * told the card was answered. A region rendered together with its text is not reliably announced — the
 * rule the toaster's viewport already follows.
 *
 * @a11y `role="group"` named by the title, so the two buttons are read as belonging to one decision
 * rather than as loose controls in a transcript.
 * @a11y Focus is not taken on mount unless `autoFocus` is set, and then it lands on the least destructive
 * button. A card that grabs the keyboard is one that gets answered by accident.
 * @a11y `aria-busy` while `busy`, which is also when both buttons are disabled.
 * @keyboard Tab — Reaches the two buttons in order; Enter or Space presses one.
 */
function ApprovalCardImpl<TKey extends keyof ComponentsAndVariants = 'approval'>(props: ApprovalCardProps<TKey>) {
  const {
    title,
    description,
    input,
    inputLabel = 'Request',
    decision,
    defaultDecision = null,
    onDecisionChange,
    busy = false,
    approveLabel = 'Approve',
    rejectLabel = 'Reject',
    autoFocus = false,
    valueLimit,
    children,
    props: tagProps,
    ...restProps
  } = props;

  const identifier = useIdentifier('approval');
  const titleId = `${identifier}-title`;

  const [current, setDecision] = useControllableState<ApprovalDecision | null, ApprovalReason>({
    value: decision,
    defaultValue: defaultDecision,
    onChange: onDecisionChange,
  });

  const decide = (next: ApprovalDecision, reason: ApprovalReason) => (event: React.MouseEvent) => setDecision(next, { reason, event });

  return (
    <Box
      component={'approval' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={[restProps.variant, { approved: current === 'approved', rejected: current === 'rejected' }] as never}
      props={{ role: 'group', 'aria-labelledby': titleId, 'aria-busy': busy || undefined, ...tagProps }}
    >
      <Box component="approval.title" id={titleId}>
        {title}
      </Box>
      {description !== undefined && <Box component="approval.description">{description}</Box>}

      {AgentUtils.hasValue(input) && <Section parts={APPROVAL_PARTS} label={inputLabel} value={input} limit={valueLimit} />}

      {children}

      <Box component="approval.footer">
        {current === null && (
          <Box component="approval.actions">
            <Box
              tag="button"
              component="approval.button"
              variant={{ reject: true }}
              disabled={busy}
              props={{ type: 'button', autoFocus, onClick: decide('rejected', 'reject') }}
            >
              {rejectLabel}
            </Box>
            <Box
              tag="button"
              component="approval.button"
              variant={{ approve: true }}
              disabled={busy}
              props={{ type: 'button', onClick: decide('approved', 'approve') }}
            >
              {approveLabel}
            </Box>
          </Box>
        )}
        {/* Always rendered, so the region is there before it has anything to say. */}
        <Box
          component="approval.decision"
          variant={{ approved: current === 'approved', rejected: current === 'rejected' }}
          props={{ role: 'status' }}
        >
          {current === null ? null : AgentUtils.decisionLabel(current)}
        </Box>
      </Box>
    </Box>
  );
}

export const ApprovalCard = ApprovalCardImpl;
(ApprovalCard as FunctionComponent).displayName = 'ApprovalCard';

export interface ReasoningProps<TKey extends keyof ComponentsAndVariants = 'reasoning'> extends Omit<BoxProps<'div', TKey>, 'open'> {
  /** The header's words. Default `Reasoning`, or `Thinking…` while `streaming`. */
  label?: ReactNode;
  /** The thought itself. */
  children?: ReactNode;
  /** Controlled: whether it is open. */
  open?: boolean;
  /** Whether it starts open. Default `false` — a chain of thought is an aside, not the answer. */
  defaultOpen?: boolean;
  /** Fires when the header is pressed. */
  onOpenChange?: ChangeHandler<boolean, DisclosureReason>;
  /** Still arriving: the header says so and shimmers. Opening it is the app's — pass `open={streaming}`. */
  streaming?: boolean;
  /** How long the thought took, in milliseconds. Rendered beside the label as "Thought for 4s". */
  duration?: number;
}

/**
 * What the model was thinking, folded away.
 *
 * ```tsx
 * <Reasoning duration={4200}>{reasoningText}</Reasoning>
 * <Reasoning streaming open>{partial}</Reasoning>
 * ```
 *
 * **Closed by default**, because a chain of thought is an aside and a transcript of them is unreadable.
 * `streaming` changes what the header says and shimmers it; whether it also *opens* is the app's call,
 * since that is a value somebody may be controlling — `open={streaming}` is the usual answer.
 *
 * The same one-row grid `Collapsible` opens in, so nothing is measured and two identical rules share
 * one class.
 *
 * @a11y The header is a `<button>` with `aria-expanded` and `aria-controls`; the thought itself has no
 * role, because a region wants a name and a disclosure's trigger is not a heading.
 * @a11y `aria-busy` while it is streaming.
 * @keyboard Tab — Focuses the header, and again leaves it.
 * @keyboard Enter, Space — Opens the thought, or closes it.
 */
function ReasoningImpl<TKey extends keyof ComponentsAndVariants = 'reasoning'>(props: ReasoningProps<TKey>) {
  const { label, children, open, defaultOpen = false, onOpenChange, streaming = false, duration, props: tagProps, ...restProps } = props;

  const identifier = useIdentifier('reasoning');
  const triggerId = `${identifier}-trigger`;
  const bodyId = `${identifier}-body`;

  const [isOpen, setOpen] = useControllableState<boolean, DisclosureReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const handleClick = useEventCallback((event: React.MouseEvent) => setOpen((current) => !current, { reason: 'trigger', event }));

  const elapsed = duration === undefined ? '' : AgentUtils.formatDuration(duration);

  return (
    <Box
      component={'reasoning' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      props={{ 'aria-busy': streaming || undefined, ...tagProps }}
    >
      <Box
        tag="button"
        component="reasoning.trigger"
        variant={{ streaming }}
        id={triggerId}
        props={{ type: 'button', 'aria-expanded': isOpen, 'aria-controls': bodyId, onClick: handleClick }}
      >
        <Arrow part="reasoning.arrow" open={isOpen} />
        {label ?? (streaming ? 'Thinking…' : 'Reasoning')}
        {!streaming && elapsed !== '' && <Box tag="span" component="reasoning.duration">{`Thought for ${elapsed}`}</Box>}
      </Box>

      <Box component="reasoning.track" variant={{ closed: !isOpen }}>
        <Box component="reasoning.clip">
          <Box component="reasoning.body" id={bodyId}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export const Reasoning = ReasoningImpl;
(Reasoning as FunctionComponent).displayName = 'Reasoning';

export interface StreamingTextProps<TKey extends keyof ComponentsAndVariants = 'streamingText'> extends BoxProps<'div', TKey> {
  /** The message so far. Append to it — anything else is a different message and settles without fading. */
  text: string;
  /** Whether more is still coming. The caret shows while it is true, and the element reports `aria-busy`. */
  streaming?: boolean;
  /**
   * How many of the runs that arrived most recently stay faded in at once; the rest settle. Default
   * `AgentUtils.STREAM_WINDOW` (8), and `0` turns the entrance off altogether. A run is settled once this
   * many newer ones have arrived rather than after a time, so a stream fast enough to fill the window
   * inside one `--transitionTime` cuts the tail of the fade short — raise it if that shows.
   */
  window?: number;
  /** Whether to draw the caret while streaming. Default `true`. */
  caret?: boolean;
}

/**
 * What the agent is saying, as it arrives.
 *
 * ```tsx
 * <StreamingText text={message} streaming={status === 'streaming'} />
 * ```
 *
 * **Only what arrived fades in.** The text is one settled string plus the last few runs to arrive, so a
 * message that is already whole — a prerendered page, a transcript being read back — paints at once with
 * no animation, and one that is still arriving costs the same at the ten-thousandth token as at the
 * first. The judgement is `AgentUtils.advanceStream`, which needs no React.
 *
 * **The entrance is `@starting-style`, not a keyframe**, so it rides `--transitionTime` and disappears
 * under `prefers-reduced-motion` with nothing declared for it. The caret is the `pulse` preset, which
 * stops itself for the same reason.
 *
 * It takes `text` rather than children, because knowing what is new means comparing the message with the
 * message a moment ago, and a React tree is not a string.
 *
 * @a11y `aria-busy` while `streaming`. The element is **not** a live region: a region announcing every
 * token would read the message out a word at a time and again when it finished. What announces an
 * agent's turn is the transcript it lands in.
 */
function StreamingTextImpl<TKey extends keyof ComponentsAndVariants = 'streamingText'>(props: StreamingTextProps<TKey>) {
  const { text, streaming = false, window: fadeWindow = AgentUtils.STREAM_WINDOW, caret = true, props: tagProps, ...restProps } = props;

  const [state, setState] = useState(() => AgentUtils.initialStream(text));
  const next = AgentUtils.advanceStream(state, text, fadeWindow);

  // Adjusting state during render — React's own pattern for state derived from a prop, and safe here
  // because advancing is keyed on the text rather than on a counter: the extra pass is a no-op.
  if (next !== state) setState(next);

  return (
    <Box
      component={'streamingText' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      props={{ 'aria-busy': streaming || undefined, ...tagProps }}
    >
      {next.settled}
      {next.segments.map((segment) => (
        <Box key={segment.key} tag="span" component="streamingText.segment">
          {segment.text}
        </Box>
      ))}
      {streaming && caret && <Box tag="span" component="streamingText.caret" props={{ 'aria-hidden': true }} />}
    </Box>
  );
}

export const StreamingText = StreamingTextImpl;
(StreamingText as FunctionComponent).displayName = 'StreamingText';
