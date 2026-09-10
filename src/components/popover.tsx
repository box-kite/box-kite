import { FunctionComponent } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import { ChangeHandler } from '../react/a11y/useControllableState';
import useAnchorPosition from '../react/anchor/useAnchorPosition';
import usePopoverLayer, {
  PopoverReason,
  PopoverTrigger as PopoverLayerTrigger,
  PopoverTriggerAttributes as PopoverLayerTriggerAttributes,
} from '../react/popover/usePopoverLayer';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import Overlay from './overlay';

export type { PopoverReason };

/** The DOM attributes the trigger has to carry. */
export type PopoverTriggerAttributes = PopoverLayerTriggerAttributes<'dialog'>;

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
export type PopoverTrigger = PopoverLayerTrigger<'dialog'>;

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
 * **The panel keeps the side it chose when it opened.** Chrome re-evaluates `position-try-fallbacks` on
 * scroll for an ordinary positioned element and never for one in the top layer (measured in 152), so a
 * panel left open while the page scrolls does not flip when its side runs out of room. Every open picks
 * the right side; it is only a scroll *while* open that this affects. See `Overlay`, which shares it.
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

  const handleOpened = useEventCallback((panel: HTMLElement) => {
    // After the browser has had its go: an `autofocus` inside is applied by `showPopover` itself.
    if (!autoFocus || panel.contains(document.activeElement)) return;

    panel.focus();
  });

  const {
    platform,
    isOpen,
    id: popoverId,
    trigger: triggerBag,
    triggerElement,
    setPanel,
  } = usePopoverLayer({
    haspopup: 'dialog',
    idPrefix: 'popover',
    id: restProps.id,
    open,
    defaultOpen,
    onOpenChange,
    onOpened: handleOpened,
  });

  const position = useAnchorPosition({ side, align, offset, flip, matchWidth, anchor: triggerElement });

  const naming = { 'aria-label': label, 'aria-labelledby': labelledBy };
  const boxProps = restProps as PopoverBoxProps<TKey>;

  if (!platform) {
    return (
      <>
        {trigger(triggerBag)}
        {isOpen && (
          <Overlay
            contentRef={setPanel}
            anchor={triggerElement}
            side={side}
            align={align}
            offset={offset}
            flip={flip}
            matchWidth={matchWidth}
            component="popover"
            {...(boxProps as PopoverBoxProps<'popover'>)}
            id={popoverId}
            props={{ role: 'dialog', ...naming, tabIndex: -1, ...contentProps }}
          >
            {children}
          </Overlay>
        )}
      </>
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

const Popover = PopoverImpl;
(Popover as FunctionComponent).displayName = 'Popover';

export default Popover;
