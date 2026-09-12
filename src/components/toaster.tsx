import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import Box, { BoxProps } from '../box';
import usePresence from '../react/animation/usePresence';
import { useIsomorphicLayoutEffect } from '../react/effects';
import usePortalContainer from '../react/hooks/usePortalContainer';
import { ComponentsAndVariants } from '../types';
import { documentOrNull, supportsPopover } from '../utils/environment/environmentUtils';
import createToastStore, { Toast, ToastAction, ToastDismissReason, ToastKind, ToastOptions, ToastStore } from '../utils/toast/toastStore';

export { default as createToastStore } from '../utils/toast/toastStore';
export type { Toast, ToastAction, ToastDismissReason, ToastKind, ToastOptions, ToastStore };

/** Which corner the stack is pinned to. The inline half is logical, so `start` mirrors with the page. */
export type ToastPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

/** What `toast.promise` is told to say at each of the three moments. A function is handed the result. */
export interface ToastPromiseMessages<TValue> {
  loading: React.ReactNode;
  success: React.ReactNode | ((value: TValue) => React.ReactNode);
  error: React.ReactNode | ((error: unknown) => React.ReactNode);
}

type Content = React.ReactNode;
type Options = ToastOptions<Content>;

/** The store `toast()` writes to, and the one `<Toaster>` reads when it is given none of its own. */
export const defaultToastStore: ToastStore<Content> = createToastStore<Content>();

const kindOf = (kind: ToastKind) => (message: Content, options?: Options) => defaultToastStore.add(message, { ...options, kind });

/**
 * Puts a message on screen, from anywhere — an event handler, a fetch, a module with no React in it. It
 * returns the id, which is what `toast.dismiss` and a second `toast()` naming the same id act on.
 *
 * ```ts
 * toast.success('Saved', { description: 'Your changes are live.' });
 * toast.error('Could not save', { action: { label: 'Retry', onClick: save } });
 * toast.promise(save(), { loading: 'Saving…', success: 'Saved', error: 'Could not save' });
 * ```
 *
 * Nothing is shown until a `<Toaster>` is on the page; a call made before one mounts is queued rather
 * than lost, because the store holds the toasts and the viewport only draws them.
 */
export const toast = Object.assign((message: Content, options?: Options) => defaultToastStore.add(message, options), {
  success: kindOf('success'),
  error: kindOf('error'),
  warning: kindOf('warning'),
  info: kindOf('info'),
  /** Stays until something dismisses it — a spinner that timed out would leave its work unreported. */
  loading: kindOf('loading'),
  /** Changes a toast already on screen. An id that is not there is ignored. */
  update: (id: string, message: Content, options?: Options) => defaultToastStore.update(id, message, options),
  /** Starts the exit for one toast, or for every one of them when given no id. */
  dismiss: (id?: string) => defaultToastStore.dismiss(id, 'imperative'),
  /**
   * One toast for the whole of an async call: a spinner while it runs, then the result in its place.
   * The promise is handed back untouched, so it can still be awaited.
   */
  promise<TValue>(promise: Promise<TValue>, messages: ToastPromiseMessages<TValue>, options?: Options): Promise<TValue> {
    const id = defaultToastStore.add(messages.loading, { ...options, id: options?.id, kind: 'loading' });
    const resolve = <TArg,>(message: Content | ((arg: TArg) => Content), arg: TArg) =>
      typeof message === 'function' ? (message as (value: TArg) => Content)(arg) : message;

    promise.then(
      (value) => defaultToastStore.update(id, resolve(messages.success, value), { kind: 'success' }),
      (error) => defaultToastStore.update(id, resolve(messages.error, error), { kind: 'error' }),
    );

    return promise;
  },
});

const POSITION_VARIANT: Record<ToastPosition, string> = {
  'top-start': 'topStart',
  'top-center': 'topCenter',
  'top-end': 'topEnd',
  'bottom-start': 'bottomStart',
  'bottom-center': 'bottomCenter',
  'bottom-end': 'bottomEnd',
};

/** `'F6'`, or a combination — `'alt+t'`, `'shift+F8'`. Matched against `event.key`, so it is layout-aware. */
function matchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const parts = hotkey.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const wanted = new Set(parts.slice(0, -1));

  return (
    event.key.toLowerCase() === key &&
    event.altKey === wanted.has('alt') &&
    event.ctrlKey === wanted.has('ctrl') &&
    event.shiftKey === wanted.has('shift') &&
    event.metaKey === wanted.has('meta')
  );
}

interface ToastItemProps {
  toast: Toast<Content>;
  store: ToastStore<Content>;
  fromTop: boolean;
  closeLabel: string;
}

/**
 * One toast, held past its dismissal for as long as its own CSS says the exit lasts. `<Presence>` would
 * do the holding but not the letting go: the entry is the store's, so something has to tell the store
 * the node has finished leaving, and this is the component that knows.
 */
function ToastItem(props: ToastItemProps) {
  const { toast: entry, store, fromTop, closeLabel } = props;
  // Destructured on the spot: the object carries a ref callback, so every later read off it in render is
  // a ref access to the compiler's lint rules — the shape Popover already ran into.
  const { mounted, ref, props: stateProps } = usePresence({ present: entry.open });

  useIsomorphicLayoutEffect(() => {
    if (!mounted) store.remove(entry.id);
  }, [mounted, store, entry.id]);

  if (!mounted) return null;

  const action = entry.action;
  const handleAction = () => {
    action?.onClick();

    if (action?.closeOnClick !== false) store.dismiss(entry.id, 'action');
  };

  return (
    <Box
      ref={ref}
      component="toaster.toast"
      variant={{ [entry.kind]: entry.kind !== 'default', fromTop }}
      props={{
        // The one thing a toast says about itself: an error is assertive, and adding a `role="alert"`
        // node is the announcement every screen reader implements. Everything else is announced by the
        // viewport's own polite region, which existed before there was anything in it — a second region
        // here would only take that away, since the nearest one to a change is the one that speaks.
        ...(entry.kind === 'error' ? { role: 'alert' as const } : {}),
        'data-toast-id': entry.id,
        ...stateProps,
      }}
    >
      <Box component="toaster.message">{entry.message}</Box>
      {entry.description !== undefined && <Box component="toaster.description">{entry.description}</Box>}
      {action && (
        <Box tag="button" component="toaster.action" props={{ type: 'button', onClick: handleAction }}>
          {action.label}
        </Box>
      )}
      {entry.dismissible && (
        <Box
          tag="button"
          component="toaster.close"
          props={{ type: 'button', 'aria-label': closeLabel, onClick: () => store.dismiss(entry.id, 'close') }}
        />
      )}
    </Box>
  );
}

// `position` shadows the CSS prop of that name — the `content`/`open`/`flip` precedent `Tooltip` and
// `Overlay` set. It is the word every toast library uses for this, and the viewport's own `position:
// fixed` is the mechanism rather than a default worth overriding.
export interface ToasterProps<TKey extends keyof ComponentsAndVariants = 'toaster'> extends Omit<BoxProps<'div', TKey>, 'position'> {
  /** Which corner the stack is pinned to. Default `'bottom-end'`. */
  position?: ToastPosition;
  /** How many toasts are on screen at once. The rest wait their turn, timers and all. Default `3`. */
  limit?: number;
  /** Milliseconds a toast that names no duration of its own stays. Default `5000`. */
  duration?: number;
  /** The region's accessible name. `role="region"` has none of its own, and this one is never labelled visually. */
  label?: string;
  /** The close button's accessible name. */
  closeLabel?: string;
  /** What the counter at the end of the stack says when the limit is holding toasts back. */
  overflowLabel?(count: number): React.ReactNode;
  /**
   * A key that moves focus to the stack from anywhere on the page, since toasts steal none. Default
   * `'F6'`; `'alt+t'` and the like also work, and `false` turns it off.
   */
  hotkey?: string | false;
  /** A store of your own — for a second, independent stack, or for a test that must not share state. */
  store?: ToastStore<Content>;
}

/**
 * The viewport every toast is drawn in, and the live region they are announced from. Render one, once,
 * near the root of the app; everything after that is `toast()`, from wherever the message comes from.
 *
 * ```tsx
 * <Toaster position="bottom-end" />
 * // anywhere at all, React or not:
 * toast.success('Saved');
 * ```
 *
 * **It is in the top layer and there is no portal.** The viewport carries `popover="manual"` and is shown
 * as soon as it mounts, so it paints over every stacking context and out of every clipped or transformed
 * ancestor — and because it stays where it was declared, it inherits the theme, the custom properties and
 * the text direction around it. `manual` rather than `auto` because a stack of messages owns no dismissal:
 * a press outside must reach the page, not close the toasts.
 *
 * **A press in the gaps goes through to the page.** The viewport is a corner-sized box that would
 * otherwise swallow every click in it, so it takes no pointer events at all and the toasts take them back.
 *
 * **The limit is a queue, not a cap.** A toast past it waits with its timer unstarted, so nothing expires
 * that was never on screen, and the counter at the end of the stack says how many are waiting.
 *
 * @a11y The viewport is a polite live region that exists from the moment it mounts, **before there is
 * anything in it** — an `aria-live` element inserted together with its content is not reliably announced.
 * @a11y An error toast is `role="alert"`, which is assertive; every other kind is announced politely by
 * the region around it. A toast is never focused on arrival, so nothing is taken away from the keyboard.
 * @a11y Timers stop while the pointer is over the stack, while anything in it has focus, and while the
 * tab is in the background — WCAG 2.2.1, and the reason a toast may carry a control at all.
 * @a11y The accent bar says the kind a second time; it is never the only signal, since the message itself
 * is what says what happened.
 * @keyboard F6 — Moves focus to the stack from anywhere on the page. Configurable through `hotkey`.
 * @keyboard Tab — Through the toasts and their controls, in the order they are on screen.
 * @keyboard Escape — Dismisses the toast focus is in, and hands focus back to where it came from once
 * the stack is empty.
 */
function ToasterImpl<TKey extends keyof ComponentsAndVariants = 'toaster'>(props: ToasterProps<TKey>) {
  const {
    position = 'bottom-end',
    limit = 3,
    duration = 5000,
    label = 'Notifications',
    closeLabel = 'Close',
    overflowLabel = (count: number) => `+${count} more`,
    hotkey = 'F6',
    store = defaultToastStore,
    props: tagProps,
    ...restProps
  } = props;

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  // Starts on the platform path so a server render and the first client render agree — the viewport is
  // rendered either way, and what a server emits is the top-layer shape. Reading `supportsPopover()` here
  // instead put the section in place on the client where the server had emitted nothing (the portal
  // renders nothing without a document), which is React #418 on every load. A browser with no Popover API
  // says so in the first layout effect, and remounting an empty viewport costs nothing: the toasts are
  // the store's, and nothing has been focused inside it yet.
  const [topLayer, setTopLayer] = useState(true);
  const portalContainer = usePortalContainer(!topLayer);
  const viewportRef = useRef<HTMLDivElement>(null);
  // Where focus was before it came into the stack, so Escape can hand it back.
  const returnTo = useRef<HTMLElement | null>(null);
  const paused = useRef({ hovered: false, focused: false, hidden: false });

  const syncPause = useCallback(() => {
    const { hovered, focused, hidden } = paused.current;

    if (hovered || focused || hidden) store.pause();
    else store.resume();
  }, [store]);

  useIsomorphicLayoutEffect(() => {
    if (!supportsPopover()) setTopLayer(false);
  }, []);

  useIsomorphicLayoutEffect(() => store.setLimit(limit), [store, limit]);
  useIsomorphicLayoutEffect(() => store.setDefaultDuration(duration), [store, duration]);

  // Into the top layer on the commit that mounted it, with no dependencies — the same shape `Overlay`
  // uses, and idempotent, so running it every commit costs a `matches`. There is no hide to pair with
  // it: a `manual` popover is never shown or hidden by the browser, and unmounting the element hides it.
  useIsomorphicLayoutEffect(() => {
    const element = viewportRef.current;
    // `supportsPopover()` rather than the state: the check above has only *queued* its correction when
    // this runs, so the state still says true — and `:popover-open` is not a selector a browser without
    // the API can even be asked about.
    if (!topLayer || !supportsPopover() || !element || !element.isConnected || element.matches(':popover-open')) return;

    element.showPopover();
  });

  // A tab in the background is not being read, so its timers stop too — the same rule as hover and
  // focus, applied to the one case the pointer and the keyboard cannot say anything about.
  useIsomorphicLayoutEffect(() => {
    const doc = documentOrNull();
    if (!doc) return;

    const controller = new AbortController();
    doc.addEventListener(
      'visibilitychange',
      () => {
        paused.current.hidden = doc.hidden;
        syncPause();
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, [syncPause]);

  useIsomorphicLayoutEffect(() => {
    const doc = documentOrNull();
    if (!hotkey || !doc) return;

    const controller = new AbortController();
    doc.addEventListener(
      'keydown',
      (event) => {
        if (!matchesHotkey(event, hotkey) || !viewportRef.current) return;

        event.preventDefault();
        returnTo.current = doc.activeElement as HTMLElement | null;
        viewportRef.current.focus();
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, [hotkey]);

  const isInside = (node: EventTarget | null) => !!node && !!viewportRef.current?.contains(node as Node);

  // `pointerover`/`pointerout` rather than the enter/leave pair: the viewport takes no pointer events of
  // its own, so what arrives here has bubbled from a toast, and only the bubbling two do.
  const handlePointerOver = () => {
    paused.current.hovered = true;
    syncPause();
  };

  const handlePointerOut = (event: React.PointerEvent) => {
    if (isInside(event.relatedTarget)) return;

    paused.current.hovered = false;
    syncPause();
  };

  const handleFocus = (event: React.FocusEvent) => {
    paused.current.focused = true;
    syncPause();

    // Whatever focus arrived from, hotkey or Tab — it is where Escape puts it back.
    if (!isInside(event.relatedTarget)) returnTo.current = event.relatedTarget as HTMLElement | null;
  };

  const handleBlur = (event: React.FocusEvent) => {
    if (isInside(event.relatedTarget)) return;

    paused.current.focused = false;
    syncPause();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;

    const element = (event.target as Element).closest?.('[data-toast-id]');
    const id = element?.getAttribute('data-toast-id');

    if (id) store.dismiss(id, 'close');

    // Focus cannot stay on a node that is leaving. Anything left to read keeps focus in the stack;
    // an empty one hands it back, which is what makes the hotkey a round trip rather than a one-way door.
    const remaining = store.getSnapshot().toasts.some((entry) => entry.open);

    if (remaining) viewportRef.current?.focus();
    else returnTo.current?.focus();
  };

  // Newest nearest the screen edge, which for a stack pinned to the top means reversing it — so the DOM
  // order is the visual order either way, and Tab walks the toasts in the order they are seen.
  const fromTop = position.startsWith('top');
  const visible = state.toasts.filter((entry) => entry.visible);
  const items = fromTop ? [...visible].reverse() : visible;
  const counter = state.overflow > 0 && <Box component="toaster.overflow">{overflowLabel(state.overflow)}</Box>;

  const viewport = (
    <Box
      // A named `<section>` is a region landmark, which is the second way to the stack: the hotkey for
      // someone with a keyboard, the landmark list for someone with a screen reader.
      tag="section"
      ref={viewportRef}
      component={'toaster' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={[restProps.variant, { [POSITION_VARIANT[position]]: true }] as never}
      props={{
        ...(topLayer ? { popover: 'manual' } : {}),
        // The region, empty and already listening. `additions text` is what makes an arriving toast and
        // a changed one both announce, and `atomic` false is what keeps the rest of the stack quiet.
        'aria-live': 'polite',
        'aria-atomic': 'false',
        'aria-relevant': 'additions text',
        'aria-label': label,
        // Focusable by the hotkey, never by Tab: the toasts and their controls are the tab stops.
        tabIndex: -1,
        ...tagProps,
        onPointerOver: handlePointerOver,
        onPointerOut: handlePointerOut,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
      }}
    >
      {!fromTop && counter}
      {items.map((entry) => (
        <ToastItem key={entry.id} toast={entry} store={store} fromTop={fromTop} closeLabel={closeLabel} />
      ))}
      {fromTop && counter}
    </Box>
  );

  if (topLayer) return viewport;

  return portalContainer ? createPortal(viewport, portalContainer) : null;
}

const Toaster = ToasterImpl;
(Toaster as FunctionComponent).displayName = 'Toaster';

export default Toaster;
