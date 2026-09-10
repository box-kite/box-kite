import { useMemo, useRef, useState } from 'react';
import { ElementLike, isEventInside } from '../../utils/dom/domUtils';
import { supportsPopover } from '../../utils/environment/environmentUtils';
import { useEventCallback } from '../a11y/callbacks';
import useControllableState, { ChangeHandler, SetControllableState } from '../a11y/useControllableState';
import useDismiss from '../a11y/useDismiss';
import useFocusReturn from '../a11y/useFocusReturn';
import { useIsomorphicLayoutEffect } from '../effects';
import useIdentifier from '../identity/useIdentifier';

/** Why a layer opened or closed — every component built on this reports the same four. */
export type PopoverReason = 'trigger' | 'escape' | 'outside-pointer' | 'imperative';

/** What a trigger says it opens, which is the one thing the layers built on this disagree about. */
export type PopoverHasPopup = 'dialog' | 'menu';

/** The DOM attributes a trigger has to carry, whatever it opens. */
export interface PopoverTriggerAttributes<THasPopup extends PopoverHasPopup = PopoverHasPopup> {
  'aria-expanded': boolean;
  'aria-haspopup': THasPopup;
  'aria-controls'?: string;
  /** Only where the browser has no Popover API. On the platform path `popovertarget` does the toggling. */
  onClick?(event: React.MouseEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper. The `ref` is what the
 * layer is anchored to, so it is not optional decoration.
 *
 * It must be a **button**: `popovertarget` is what the browser toggles on, and it only reads it off one.
 */
export interface PopoverTrigger<THasPopup extends PopoverHasPopup = PopoverHasPopup> {
  ref: React.RefCallback<HTMLElement>;
  props: PopoverTriggerAttributes<THasPopup>;
}

export interface PopoverLayerOptions<THasPopup extends PopoverHasPopup = PopoverHasPopup, TReason extends string = never> {
  /** What the trigger says it opens. */
  haspopup: THasPopup;
  /** A consumer id wins over the generated one, and everything that names the layer follows it. */
  id?: string;
  /** What the generated id is prefixed with, so a debugger says which component it belongs to. */
  idPrefix: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: ChangeHandler<boolean, PopoverReason | TReason>;
  /**
   * The layer is open *and* laid out — the only moment focus can be moved into it. On the platform path
   * this is the `toggle` event rather than an effect on the open state, and the difference is not
   * academic: `beforetoggle` fires before the panel opens and a discrete event is flushed synchronously,
   * so an effect would run while `:popover-open` still does not match, which is `display: none` — and
   * focusing a hidden element does nothing at all (measured).
   */
  onOpened?(panel: HTMLElement): void;
  /**
   * It is about to close, and `heldFocus` says whether it has focus. Fired from `beforetoggle`, while the
   * panel is still shown, because that is the last moment focus can be moved without a flash: the platform
   * returns focus to whatever had it before the **outermost** layer opened, and for a nested one it does
   * nothing at all — focus drops to `<body>` (both measured in Chrome 152). A submenu puts focus back on
   * its own item from here.
   */
  onClosing?(heldFocus: boolean, trigger: HTMLElement | null): void;
  /**
   * More elements a press inside counts as inside, for the portal path only: a nested layer is portalled
   * out of the DOM it was declared in, so nothing about the tree says a press in it is a press in this
   * one. The platform answers that question itself, by the popover nesting rules.
   */
  inside?: readonly ElementLike[];
}

export interface PopoverLayer<THasPopup extends PopoverHasPopup = PopoverHasPopup, TReason extends string = never> {
  /** Whether the browser's Popover API is placing the layer in the top layer. `false` is the portal path. */
  platform: boolean;
  isOpen: boolean;
  setOpen: SetControllableState<boolean, PopoverReason | TReason>;
  id: string;
  /** What the trigger render prop is handed. */
  trigger: PopoverTrigger<THasPopup>;
  triggerElement: HTMLElement | null;
  /**
   * The trigger's id — what names a layer after the control that opened it, which is what APG asks of a
   * menu. One is written onto the trigger when it has none of its own.
   */
  triggerId?: string;
  /** Goes on the panel, on both paths. */
  setPanel: React.RefCallback<HTMLElement>;
  panelElement: HTMLElement | null;
}

/**
 * One conversation with the Popover API, for every component that opens a layer on it: the open state,
 * the platform mirror, the dismissal reasons, and the two primitives that stand in where the browser has
 * no popover at all. `Popover` is this plus a `role="dialog"` panel; `Menu` is this three times over —
 * once for the menu and once per open submenu.
 *
 * What the platform owns, measured in Chrome 152: the top layer, light dismiss (Escape and an outside
 * press), the toggle from a `popovertarget` trigger — including the press that closes an open layer from
 * its own trigger, with no reopen — and focus return for the outermost layer. What it does not own is
 * focus *into* the layer, focus return for a nested one, and any of the ARIA.
 */
export default function usePopoverLayer<THasPopup extends PopoverHasPopup, TReason extends string = never>(
  options: PopoverLayerOptions<THasPopup, TReason>,
): PopoverLayer<THasPopup, TReason> {
  const { haspopup, id, idPrefix, open, defaultOpen = false, onOpenChange, onOpened, onClosing, inside } = options;

  const generatedId = useIdentifier(idPrefix);
  // A consumer id wins, and `aria-controls`/`popovertarget` both have to name whichever won.
  const layerId = id ?? generatedId;
  const [isOpen, setOpen] = useControllableState<boolean, PopoverReason | TReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // The trigger element, as state rather than a ref: it is read during render (it is what the layer is
  // anchored to), and a ref read in render is both a lint error here and a real staleness bug.
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  // Starts on the platform path so a server render and the first client render agree: the panel is
  // rendered whether or not it is open, so what a server emits is the platform shape. A browser with
  // no Popover API says so in the first layout effect — before anything can have been focused inside,
  // which is what makes the correction safe here. The two paths are different *positions* in the React
  // tree, so it remounts the panel; `Overlay`, whose caller mounts it already open, cannot afford that
  // and reads the answer on its first render instead.
  const [platform, setPlatform] = useState(true);
  // What the DOM says, mirrored as state so the two can be compared on a commit. Without it a controlled
  // layer the browser closed would stay closed: `isOpen` never changed, so nothing would re-render.
  const [domOpen, setDomOpen] = useState(false);
  const [triggerId, setTriggerId] = useState<string>();
  // What the last input was, read when the platform tells us it closed: a ToggleEvent carries no reason.
  const dismissReason = useRef<PopoverReason>('imperative');
  // Whether the panel had focus when it started closing, read at `beforetoggle` while it still does.
  const heldFocus = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!supportsPopover()) setPlatform(false);
  }, []);

  const opened = useEventCallback(onOpened);
  const closing = useEventCallback(onClosing);

  // The platform's own state, mirrored back. `beforetoggle` is cancelable opening and *not* closing, so
  // a controlled consumer can refuse to open but never to close — the sync effect re-shows it instead.
  const handleBeforeToggle = useEventCallback((event: Event) => {
    const toggle = event as Event & { newState: string };
    const next = toggle.newState === 'open';
    const target = event.currentTarget as HTMLElement;

    if (next && open === false) {
      event.preventDefault();
      return;
    }

    if (!next) {
      heldFocus.current = target.contains(document.activeElement);
      closing(heldFocus.current, triggerElement);
    }

    setDomOpen(next);

    const reason = next ? 'trigger' : dismissReason.current;
    dismissReason.current = 'imperative';
    setOpen(next, { reason, event });
  });

  // `toggle` is queued until after the state really changed, and it fires whoever opened the panel — the
  // browser, or the sync effect below.
  const handleToggle = useEventCallback((event: Event) => {
    const target = event.currentTarget as HTMLElement;

    if ((event as Event & { newState: string }).newState === 'open') opened(target);
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
  // A close cannot be refused, so a controlled layer the browser dismissed is put back here rather than
  // argued with — `domOpen` is what makes that commit happen when `isOpen` itself never changed.
  //
  // It is compared against `domOpen` rather than against `:popover-open` because a discrete event is
  // flushed synchronously: React re-renders and runs this *inside* the browser's own show operation,
  // where the selector does not match yet and `showPopover` throws `InvalidStateError` (measured).
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

  // An id to name the layer by, on the same terms as the attribute below: the trigger is an element the
  // component was handed, and one it does not carry cannot be rendered onto it. Not removed again — an id
  // is inert, where a live `popovertarget` on an element outliving its layer is not.
  useIsomorphicLayoutEffect(() => {
    if (!triggerElement) return;

    if (!triggerElement.id) triggerElement.setAttribute('id', `${layerId}-trigger`);
    setTriggerId(triggerElement.id);
  }, [triggerElement, layerId]);

  // The trigger is an element the component was handed, so its attribute is written on rather than
  // rendered — the way `useAnchorPosition` writes an anchor's name. `popovertarget` is what makes the
  // browser own the toggle, and with it the press that closes an open layer from its own trigger.
  useIsomorphicLayoutEffect(() => {
    if (!platform || !triggerElement) return;

    triggerElement.setAttribute('popovertarget', layerId);

    return () => triggerElement.removeAttribute('popovertarget');
  }, [platform, triggerElement, layerId]);

  // The portal path, where the panel really mounts and unmounts: `display: none` is not involved, so the
  // open state is the moment focus can move in, and the two primitives supply what the platform would.
  useIsomorphicLayoutEffect(() => {
    if (platform || !isOpen || !panel) return;

    opened(panel);
  }, [platform, isOpen, panel, opened]);

  useDismiss({
    enabled: !platform && isOpen,
    inside: [panel, triggerElement, ...(inside ?? [])],
    onDismiss: (reason, event) => setOpen(false, { reason: reason as PopoverReason, event }),
  });

  useFocusReturn({ enabled: !platform && isOpen, returnTo: triggerElement });

  const handleTriggerClick = useEventCallback((event: React.MouseEvent) => {
    setOpen((current) => !current, { reason: 'trigger', event });
  });

  const trigger = useMemo<PopoverTrigger<THasPopup>>(
    () => ({
      ref: setTriggerElement,
      props: {
        'aria-expanded': isOpen,
        'aria-haspopup': haspopup,
        'aria-controls': isOpen ? layerId : undefined,
        // Only where the platform has no `popovertarget` to do it. A click handler on the platform path
        // would fight the light dismiss: it closes on `pointerdown`, so the `click` after it reads
        // "closed" and opens the layer straight back up (measured).
        ...(platform ? {} : { onClick: handleTriggerClick }),
      },
    }),
    [handleTriggerClick, haspopup, isOpen, layerId, platform],
  );

  return { platform, isOpen, setOpen, id: layerId, trigger, triggerElement, triggerId, setPanel, panelElement: panel };
}
