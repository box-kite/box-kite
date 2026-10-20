import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import useDismiss from '../react/a11y/useDismiss';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import Overlay from './overlay';
import Presence from './presence';

/** Why the tooltip opened or closed — `onOpenChange` gets this alongside the event that did it. */
export type TooltipReason = 'hover' | 'focus' | 'pointer-leave' | 'blur' | 'escape';

/** The DOM attributes and handlers the trigger has to carry. */
export interface TooltipTriggerAttributes {
  'aria-describedby'?: string;
  onPointerEnter(event: React.PointerEvent): void;
  onPointerLeave(event: React.PointerEvent): void;
  onFocus(event: React.FocusEvent): void;
  onBlur(event: React.FocusEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper, because
 * `aria-describedby` only means something on the element the user lands on. The `ref` is what the
 * tooltip is positioned against, so it is not optional decoration (see `anchor` on `Overlay`).
 *
 * ```tsx
 * {(trigger) => <Button {...trigger}>Delete</Button>}          // a Box component
 * {(trigger) => <button ref={trigger.ref} {...trigger.props}>} // a plain element
 * ```
 */
export interface TooltipTrigger {
  ref: React.RefCallback<HTMLElement>;
  props: TooltipTriggerAttributes;
}

// `content` shadows the CSS prop of the same name, which is the right trade: the CSS one is for
// generated content on a pseudo-element, and the tooltip has no pseudo-element to generate onto. `open`
// shadows the pseudo-class nesting key for the same reason — the component owns that state, and the way
// to style it here is the `data-state` `<Presence>` already sets. `flip` is the placement one, which is
// the vocabulary `Overlay` and `useAnchorPosition` use for it.
type TooltipBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'children' | 'content' | 'open' | 'flip'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends TooltipBoxProps<TKey> {
  /** The description itself. Nothing renders while this is empty. */
  content?: React.ReactNode;
  /** The trigger, handed the ref and props that wire it to the tooltip. */
  children: (trigger: TooltipTrigger) => React.ReactNode;
  /** Controlled open state. Leave it out and the tooltip owns it. */
  open?: boolean;
  /** Whether it starts open, when the tooltip owns its own state. */
  defaultOpen?: boolean;
  /** Fires with the new state and why it changed — `'hover'`, `'focus'`, `'pointer-leave'`, `'blur'`
   * or `'escape'`. */
  onOpenChange?: ChangeHandler<boolean, TooltipReason>;
  /**
   * How long the pointer has to rest on the trigger, in ms. Default 300 — sweeping across a toolbar should
   * not light every control up. Focus ignores it: a keyboard user asked for the tooltip by arriving.
   */
  openDelay?: number;
  /** The grace period after the pointer leaves, in ms. Default 150, so the pointer can reach the tooltip (WCAG 1.4.13). */
  closeDelay?: number;
  /**
   * Which side of the trigger the bubble sits on — `top`/`bottom` are the block axis, `start`/`end` the
   * inline one. Default `'bottom'`, and a side with no room flips to its opposite either way.
   */
  side?: AnchorSide;
  /** Which of the trigger's edges to line the bubble up with along the other axis. Default `'center'`. */
  align?: AnchorAlign;
  /**
   * The gap between trigger and bubble, on the ÷4 spacing scale. Default 1 — 4px, which is near enough
   * for the pointer to cross without leaving the trigger (WCAG 1.4.13) and far enough to read as a layer.
   */
  offset?: number;
  /** Whether a side with no room may be swapped for its opposite. Default `true`. */
  flip?: boolean;
}

/**
 * The APG tooltip: a description that appears on hover *and* on focus and stays until the user is done
 * with it.
 *
 * ```tsx
 * <Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>
 * ```
 *
 * The trigger is a render prop rather than a cloned child: cloning would have to guess where a child
 * wants its DOM attributes (Box takes a `props` bag, a `<button>` takes them on top), and guessing wrong
 * on `aria-describedby` costs the thing the pattern is for. The component owns `role="tooltip"`, the
 * `aria-describedby`, and WCAG 1.4.13's three obligations — dismissible with Escape without moving focus,
 * hoverable, and never closed on a timer. Focus never enters it: a focusable tooltip is a mislabelled dialog.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 * @a11y `role="tooltip"` on the bubble and `aria-describedby` on the trigger, so the description is read
 * as part of the control rather than as text that happens to be nearby.
 * @a11y WCAG 1.4.13, all three parts: Escape dismisses it without moving focus, the pointer can travel
 * onto the bubble and read it, and nothing hides it on a timer.
 * @a11y The bubble is never in the tab order — a focusable tooltip is a dialog with the wrong role — and
 * it renders nothing at all while `content` is empty.
 * @keyboard Tab — Shows it as soon as the trigger has focus, ignoring `openDelay`: a keyboard user asked
 * for it by arriving.
 * @keyboard Escape — Hides it, leaving focus on the trigger. It stays hidden until the pointer or focus
 * leaves and comes back.
 * @keyboard Tab, again — Reaches the next control, and the tooltip closes behind it.
 * @keyboard (Pointer) Resting on the trigger — Shows it after `openDelay`, 300 ms by default: sweeping
 * across a toolbar should not light every control up.
 * @keyboard (Pointer) Leaving the trigger — Hides it after `closeDelay`, 150 ms — unless the pointer
 * lands on the tooltip itself.
 * @keyboard (Pointer) Moving onto the tooltip — Keeps it open for as long as the pointer is there, so a
 * long description can be read or selected.
 */
function Tooltip<TKey extends keyof ComponentsAndVariants = 'tooltip'>(props: Props<TKey>) {
  const {
    content,
    children,
    open,
    defaultOpen = false,
    onOpenChange,
    openDelay = 300,
    closeDelay = 150,
    side = 'bottom',
    align = 'center',
    offset = 1,
    flip = true,
    props: contentProps,
    ...restProps
  } = props;

  const generatedId = useIdentifier('tooltip');
  // A consumer id wins over the generated one, and `aria-describedby` has to name whichever won:
  // pointing at an id nothing carries is the same as having no tooltip at all.
  const tooltipId = restProps.id ?? generatedId;
  const [isOpen, setOpen] = useControllableState<boolean, TooltipReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // The trigger element, as state rather than a ref: it is read during render (it is what the
  // layer is positioned against), and a ref read in render is both a lint error here and a real
  // staleness bug — the first render after it attaches has to be the one that positions.
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Why the tooltip should still be showing, read when a scheduled close finally runs: the pointer
  // may have left the trigger for the tooltip itself, or the trigger may still hold focus.
  const overTrigger = useRef(false);
  const overContent = useRef(false);
  const focused = useRef(false);
  // Set by Escape. WCAG 1.4.13 asks for a dismissal that lasts — re-showing the tooltip because
  // the pointer never moved would put the user straight back where they were, with no way out.
  const dismissed = useRef(false);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const schedule = useCallback(
    (delay: number, run: () => void) => {
      cancel();

      // A zero delay runs inside the event that asked for it rather than a tick later: the
      // difference is visible to a test, and to a screen reader reading the trigger it just left.
      if (delay <= 0) {
        run();
        return;
      }

      timer.current = setTimeout(() => {
        timer.current = undefined;
        run();
      }, delay);
    },
    [cancel],
  );

  const scheduleClose = useCallback(
    (reason: TooltipReason, event: React.SyntheticEvent) => {
      schedule(closeDelay, () => {
        if (overTrigger.current || overContent.current || focused.current) return;

        setOpen(false, { reason, event });
      });
    },
    [closeDelay, schedule, setOpen],
  );

  // Escape only. An outside press needs no handling of its own: it moves focus off the trigger and
  // the pointer with it, and a tooltip holds no other state to dismiss.
  useDismiss({
    enabled: isOpen,
    outsidePointer: false,
    inside: [overlayRef],
    onDismiss: (reason, event) => {
      cancel();
      dismissed.current = true;
      setOpen(false, { reason: reason as TooltipReason, event });
    },
  });

  useEffect(() => cancel, [cancel]);

  // Open *and* something to say. `aria-describedby` follows this rather than `isOpen`, or an empty
  // `content` would leave the trigger pointing at an element that was never rendered.
  const showTooltip = isOpen && content !== undefined && content !== null;

  // Every handler goes through `useEventCallback`, which is also what keeps them out of the render
  // pass: `children(trigger)` is a call, and a function literal here that reads `overTrigger.current`
  // would make the whole bag a value the React Compiler rules will not let a render invoke.
  const handleTriggerEnter = useEventCallback((event: React.PointerEvent) => {
    overTrigger.current = true;
    if (dismissed.current) return;

    schedule(openDelay, () => setOpen(true, { reason: 'hover', event }));
  });

  const handleTriggerLeave = useEventCallback((event: React.PointerEvent) => {
    overTrigger.current = false;
    dismissed.current = false;
    scheduleClose('pointer-leave', event);
  });

  const handleTriggerFocus = useEventCallback((event: React.FocusEvent) => {
    focused.current = true;
    cancel();
    setOpen(true, { reason: 'focus', event });
  });

  const handleTriggerBlur = useEventCallback((event: React.FocusEvent) => {
    focused.current = false;
    dismissed.current = false;
    scheduleClose('blur', event);
  });

  const handleContentEnter = useEventCallback(() => {
    overContent.current = true;
    cancel();
  });

  const handleContentLeave = useEventCallback((event: React.PointerEvent) => {
    overContent.current = false;
    scheduleClose('pointer-leave', event);
  });

  const trigger = useMemo<TooltipTrigger>(
    () => ({
      ref: setTriggerElement,
      props: {
        'aria-describedby': showTooltip ? tooltipId : undefined,
        onPointerEnter: handleTriggerEnter,
        onPointerLeave: handleTriggerLeave,
        onFocus: handleTriggerFocus,
        onBlur: handleTriggerBlur,
      },
    }),
    [handleTriggerBlur, handleTriggerEnter, handleTriggerFocus, handleTriggerLeave, showTooltip, tooltipId],
  );

  return (
    <>
      {children(trigger)}
      {/* The bubble's entrance is `startingStyle` in its component styles; this is the other direction. */}
      <Presence present={showTooltip}>
        {(presence) => (
          <Overlay
            ref={overlayRef}
            contentRef={presence.ref}
            anchor={triggerElement}
            // Beside the trigger rather than over it, and sized to its own content: a description is
            // as long as it is, where a listbox lines up with the field it belongs to.
            side={side}
            align={align}
            offset={offset}
            flip={flip}
            matchWidth={false}
            component={'tooltip' as TKey}
            {...(restProps as TooltipBoxProps<TKey>)}
            variant={[restProps.variant, { closed: !presence.present }] as never}
            id={tooltipId}
            props={{
              role: 'tooltip',
              ...presence.props,
              ...contentProps,
              // Last, and deliberately not merged with whatever the consumer passed: these two are
              // what makes the tooltip hoverable, and WCAG 1.4.13 is not a default to override by
              // accident while adding an unrelated handler.
              onPointerEnter: handleContentEnter,
              onPointerLeave: handleContentLeave,
            }}
          >
            {content}
          </Overlay>
        )}
      </Presence>
    </>
  );
}

(Tooltip as FunctionComponent).displayName = 'Tooltip';

export default Tooltip;
