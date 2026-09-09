import { FunctionComponent, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import useDismiss from '../react/a11y/useDismiss';
import useFocusReturn from '../react/a11y/useFocusReturn';
import useAnchorPosition from '../react/anchor/useAnchorPosition';
import { useIsomorphicLayoutEffect } from '../react/effects';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import { isEventInside } from '../utils/dom/domUtils';
import Overlay from './overlay';

/** Why the popover opened or closed — `onOpenChange` gets this alongside the event that did it. */
export type PopoverReason = 'trigger' | 'escape' | 'outside-pointer' | 'imperative';

/** The DOM attributes the trigger has to carry. */
export interface PopoverTriggerAttributes {
  'aria-expanded': boolean;
  'aria-haspopup': 'dialog';
  'aria-controls'?: string;
  /** Only where the browser has no Popover API. On the platform path `popovertarget` does the toggling. */
  onClick?(event: React.MouseEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper. The `ref` is what the
 * popover is anchored to, so it is not optional decoration (see `anchor` on `Overlay`).
 *
 * ```tsx
 * {(trigger) => <Button {...trigger}>Options</Button>}          // a Box component
 * {(trigger) => <button ref={trigger.ref} {...trigger.props}>}  // a plain element
 * ```
 *
 * It must be a **button**: `popovertarget` is what the browser toggles on, and it only reads it off one.
 */
export interface PopoverTrigger {
  ref: React.RefCallback<HTMLElement>;
  props: PopoverTriggerAttributes;
}

// `open` shadows the pseudo-class nesting key, and `flip` the CSS prop of that name — the `content`/`open`
// precedent `Tooltip` set. The component owns both states, and `:popover-open` is what styles this one.
type PopoverBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'open' | 'flip'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends PopoverBoxProps<TKey> {
  /** The trigger, handed the ref and props that wire it to the popover. It has to be a button. */
  trigger: (trigger: PopoverTrigger) => React.ReactNode;
  /** The panel's content. Rendered whether or not the popover is open — see the note on mounting. */
  children?: React.ReactNode;
  /** Controlled open state. Leave it out and the popover owns it. */
  open?: boolean;
  /** Whether it starts open, when the popover owns its own state. */
  defaultOpen?: boolean;
  /**
   * Fires with the new state and why it changed — `'trigger'`, `'escape'`, `'outside-pointer'` or
   * `'imperative'`. A close cannot be refused: the browser has already done it by the time this runs.
   */
  onOpenChange?: ChangeHandler<boolean, PopoverReason>;
  /** The panel's accessible name. `role="dialog"` has none of its own, and a dialog without one is unusable. */
  label?: string;
  /** Names the panel after an element already on the page, instead of `label`. */
  labelledBy?: string;
  /**
   * Which side of the trigger the panel sits on — `top`/`bottom` are the block axis, `start`/`end` the
   * inline one, so a panel beside its trigger mirrors in a right-to-left page. Default `'bottom'`.
   */
  side?: AnchorSide;
  /** Which of the trigger's edges to line the panel up with along the other axis. Default `'center'`. */
  align?: AnchorAlign;
  /** The gap between trigger and panel, on the ÷4 spacing scale. Default 2 — 8px. */
  offset?: number;
  /** Whether a side with no room may be swapped for its opposite. Default `true`. */
  flip?: boolean;
  /** Whether the panel is at least as wide as its trigger. Default `false` — a panel sizes to its content. */
  matchWidth?: boolean;
  /**
   * Whether opening moves focus into the panel. Default `true`, which is what APG asks of a dialog. An
   * `autofocus` attribute inside wins: the browser applies it first and this only acts on what is left.
   */
  autoFocus?: boolean;
}

/** Whether the browser has the Popover API. Asked per mount rather than cached, so a test can answer for it. */
function supportsPopover(): boolean {
  return typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';
}

/**
 * A panel anchored to a trigger, on the platform's own Popover API: the top layer, light dismiss and
 * focus return are the browser's, and the position is CSS anchor positioning.
 *
 * ```tsx
 * <Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>
 *   <Checkbox label="Only mine" />
 * </Popover>
 * ```
 *
 * **There is no portal.** A top-layer element paints above every stacking context and outside every
 * clipped ancestor, which is the whole class of bug a portal exists to work around — and because the
 * panel stays where it was declared in the DOM, it inherits the theme, the custom properties and the text
 * direction around it, and the tab order runs trigger → panel with nothing to arrange. (Measured against a
 * `z-index: 9999` sibling, a `transform`ed ancestor and an `overflow: hidden` one.)
 *
 * **The panel is always rendered**, and closed means `display: none` from the UA stylesheet. That is what
 * lets the browser own show and hide — and what makes the exit a plain CSS transition rather than a
 * `<Presence>`, since nothing unmounts. Content that is expensive to render should be gated by the
 * consumer: `{open && <Heavy />}`.
 *
 * Where the browser has no Popover API the panel is an `Overlay` — a portal — with `useDismiss` and
 * `useFocusReturn` supplying what the platform otherwise would.
 *
 * @a11y `role="dialog"` on the panel, named by `label` or `labelledBy`; the popover attribute supplies no
 * role at all, and a panel with none is announced as a group of orphaned content.
 * @a11y The trigger carries `aria-expanded`, `aria-haspopup="dialog"` and `aria-controls`, so the control
 * says what it operates and what state it is in.
 * @a11y Focus moves into the panel on open and back to the trigger on close. Nothing is trapped: this is a
 * non-modal dialog, so Tab leaves it, and the panel follows the trigger in the DOM either way.
 * @keyboard Enter, Space — On the trigger, toggles the panel.
 * @keyboard Escape — Closes it and returns focus to the trigger, from anywhere inside.
 * @keyboard Tab — Moves into the panel from the trigger, and out of the panel to whatever follows it.
 */
function PopoverImpl<TKey extends keyof ComponentsAndVariants = 'popover'>(props: Props<TKey>) {
  const {
    trigger,
    children,
    open,
    defaultOpen = false,
    onOpenChange,
    label,
    labelledBy,
    side = 'bottom',
    align = 'center',
    offset = 2,
    flip = true,
    matchWidth = false,
    autoFocus = true,
    props: contentProps,
    ...restProps
  } = props;

  const generatedId = useIdentifier('popover');
  // A consumer id wins, and `aria-controls`/`popovertarget` both have to name whichever won.
  const popoverId = restProps.id ?? generatedId;
  const [isOpen, setOpen] = useControllableState<boolean, PopoverReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // The trigger element, as state rather than a ref: it is read during render (it is what the panel is
  // anchored to), and a ref read in render is both a lint error here and a real staleness bug.
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [platform, setPlatform] = useState(true);
  // What the DOM says, mirrored as state so the two can be compared on a commit. Without it a controlled
  // popover the browser closed would stay closed: `isOpen` never changed, so nothing would re-render.
  const [domOpen, setDomOpen] = useState(false);
  // What the last input was, read when the platform tells us it closed: a ToggleEvent carries no reason.
  const dismissReason = useRef<PopoverReason>('imperative');

  const position = useAnchorPosition({ side, align, offset, flip, matchWidth, anchor: triggerElement });

  // Starts on the platform path so a server render and the first client render agree; a browser without
  // the API says so before it paints, the way `useAnchorPosition` does for anchor positioning.
  useIsomorphicLayoutEffect(() => {
    if (!supportsPopover()) setPlatform(false);
  }, []);

  // The platform's own state, mirrored back. `beforetoggle` is cancelable opening and *not* closing, so
  // a controlled consumer can refuse to open but never to close — the sync effect re-shows it instead.
  const handleBeforeToggle = useEventCallback((event: Event) => {
    const toggle = event as Event & { newState: string };
    const next = toggle.newState === 'open';

    if (next && open === false) {
      event.preventDefault();
      return;
    }

    setDomOpen(next);

    const reason = next ? 'trigger' : dismissReason.current;
    dismissReason.current = 'imperative';
    setOpen(next, { reason, event });
  });

  // Focus goes in on `toggle` rather than from an effect on `isOpen`, and the difference is not academic:
  // `beforetoggle` fires *before* the panel opens, a discrete event is flushed synchronously, so an effect
  // would run while `:popover-open` still does not match — and this component's own rules make that
  // `display: none`. Focusing a hidden element does nothing at all (measured). `toggle` is queued until
  // after the state really changed, and it fires whoever opened the panel, the browser or the effect below.
  const handleToggle = useEventCallback((event: Event) => {
    const target = event.currentTarget as HTMLElement;
    if ((event as Event & { newState: string }).newState !== 'open' || !autoFocus) return;
    // After the browser has had its go: an `autofocus` inside is applied by `showPopover` itself.
    if (!target.contains(document.activeElement)) target.focus();
  });

  // Ahead of the effect that shows the panel, and that ordering is the point: an effect declared after it
  // would miss the very first `beforetoggle`, leaving the DOM mirror below wrong from the start.
  // Listened for rather than declared as a prop because `onBeforeToggle` is React 19's spelling and React
  // 18 drops it, and both are supported — the same reason `popovertarget` is written as an attribute.
  useIsomorphicLayoutEffect(() => {
    if (!platform || !panel) return;

    const controller = new AbortController();
    panel.addEventListener('beforetoggle', handleBeforeToggle, { signal: controller.signal });
    panel.addEventListener('toggle', handleToggle, { signal: controller.signal });

    return () => controller.abort();
  }, [platform, panel, handleBeforeToggle, handleToggle]);

  // The one place the component tells the platform anything: whenever the two disagree, the state wins.
  // A close cannot be refused, so a controlled popover the browser dismissed is put back here rather
  // than argued with — `domOpen` is what makes that commit happen when `isOpen` itself never changed.
  //
  // It is compared against `domOpen` rather than against `:popover-open` because a discrete event is
  // flushed synchronously: React re-renders and runs this *inside* the browser's own show operation,
  // where the selector does not match yet and `showPopover` throws `InvalidStateError` (measured — the
  // one combination of the four that does). The mirror already knows where the platform is heading.
  useIsomorphicLayoutEffect(() => {
    if (!platform || !panel || isOpen === domOpen) return;

    if (isOpen) panel.showPopover();
    else panel.hidePopover();
  }, [isOpen, domOpen, panel, platform]);

  // Why it is about to close. The platform dismisses on `keydown`/`pointerdown` and fires `beforetoggle`
  // inside that dispatch, so a capture listener has already run and named the reason by then.
  useIsomorphicLayoutEffect(() => {
    if (!platform || !isOpen) return;

    const controller = new AbortController();
    const listen = (type: string, handler: (event: Event) => void) =>
      document.addEventListener(type, handler, { signal: controller.signal, capture: true });

    listen('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') dismissReason.current = 'escape';
    });
    listen('pointerdown', (event) => {
      const onTrigger = !!triggerElement && isEventInside(event, [triggerElement]);
      dismissReason.current = onTrigger ? 'trigger' : 'outside-pointer';
    });

    return () => controller.abort();
  }, [platform, isOpen, triggerElement]);

  // The trigger is an element the component was handed, so its attribute is written on rather than
  // rendered — the way `useAnchorPosition` writes an anchor's name. `popovertarget` is what makes the
  // browser own the toggle, and with it the press that closes an open popover from its own trigger.
  useIsomorphicLayoutEffect(() => {
    if (!platform || !triggerElement) return;

    triggerElement.setAttribute('popovertarget', popoverId);

    return () => triggerElement.removeAttribute('popovertarget');
  }, [platform, triggerElement, popoverId]);

  const handleTriggerClick = useEventCallback((event: React.MouseEvent) => {
    setOpen((current) => !current, { reason: 'trigger', event });
  });

  const triggerBag = useMemo<PopoverTrigger>(
    () => ({
      ref: setTriggerElement,
      props: {
        'aria-expanded': isOpen,
        'aria-haspopup': 'dialog',
        'aria-controls': isOpen ? popoverId : undefined,
        // Only where the platform has no `popovertarget` to do it. A click handler on the platform path
        // would fight the light dismiss: it closes on `pointerdown`, so the `click` after it reads
        // "closed" and opens the popover straight back up (measured).
        ...(platform ? {} : { onClick: handleTriggerClick }),
      },
    }),
    [handleTriggerClick, isOpen, platform, popoverId],
  );

  const naming = { 'aria-label': label, 'aria-labelledby': labelledBy };
  const boxProps = restProps as PopoverBoxProps<TKey>;

  if (!platform) {
    return (
      <PopoverFallback
        {...(boxProps as PopoverBoxProps<'popover'>)}
        trigger={trigger}
        triggerBag={triggerBag}
        triggerElement={triggerElement}
        isOpen={isOpen}
        setOpen={setOpen}
        id={popoverId}
        naming={naming}
        contentProps={contentProps}
        autoFocus={autoFocus}
        side={side}
        align={align}
        offset={offset}
        flip={flip}
        matchWidth={matchWidth}
      >
        {children}
      </PopoverFallback>
    );
  }

  return (
    <>
      {trigger(triggerBag)}
      <Box
        ref={setPanel}
        component={'popover' as TKey}
        {...boxProps}
        variant={[boxProps.variant, { topLayer: true }] as never}
        {...position.layerProps}
        id={popoverId}
        props={{
          popover: 'auto',
          role: 'dialog',
          ...naming,
          // Focusable by script, never by Tab: the panel is a container, and its own contents are the
          // tab stops. `autoFocus` lands here when nothing inside claimed it.
          tabIndex: -1,
          ...contentProps,
        }}
      >
        {children}
      </Box>
    </>
  );
}

interface FallbackProps extends PopoverBoxProps<'popover'> {
  trigger: (trigger: PopoverTrigger) => React.ReactNode;
  triggerBag: PopoverTrigger;
  triggerElement: HTMLElement | null;
  isOpen: boolean;
  setOpen: (next: boolean, details: { reason: PopoverReason; event?: Event | React.SyntheticEvent }) => void;
  naming: { 'aria-label'?: string; 'aria-labelledby'?: string };
  contentProps?: Record<string, unknown>;
  autoFocus: boolean;
  side: AnchorSide;
  align: AnchorAlign;
  offset: number;
  flip: boolean;
  matchWidth: boolean;
}

/**
 * The same popover where the browser has no Popover API: an `Overlay` — a portal — plus the two primitives
 * the platform would otherwise supply. It costs a portal's compromises back (the panel leaves the DOM it
 * was declared in, so the tab order and a local theme no longer follow it), which is the price of the
 * older browser rather than a choice.
 */
function PopoverFallback(props: FallbackProps) {
  const { trigger, triggerBag, triggerElement, isOpen, setOpen, naming, contentProps, autoFocus, children, ...rest } = props;
  const { side, align, offset, flip, matchWidth, id, ...boxProps } = rest;

  const panelRef = useRef<HTMLDivElement>(null);

  useDismiss({
    enabled: isOpen,
    inside: [panelRef, triggerElement],
    onDismiss: (reason, event) => setOpen(false, { reason: reason as PopoverReason, event }),
  });

  useFocusReturn({ enabled: isOpen, returnTo: triggerElement });

  useIsomorphicLayoutEffect(() => {
    const panel = panelRef.current;
    if (!isOpen || !panel || !autoFocus || panel.contains(document.activeElement)) return;

    panel.focus();
  }, [isOpen, autoFocus]);

  return (
    <>
      {trigger(triggerBag)}
      {isOpen && (
        <Overlay
          contentRef={panelRef}
          anchor={triggerElement}
          side={side}
          align={align}
          offset={offset}
          flip={flip}
          matchWidth={matchWidth}
          component="popover"
          {...boxProps}
          id={id}
          props={{ role: 'dialog', ...naming, tabIndex: -1, ...contentProps }}
        >
          {children}
        </Overlay>
      )}
    </>
  );
}

const Popover = PopoverImpl;
(Popover as FunctionComponent).displayName = 'Popover';

export default Popover;
