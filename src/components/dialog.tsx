import { createContext, FunctionComponent, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler, SetControllableState } from '../react/a11y/useControllableState';
import useDismiss from '../react/a11y/useDismiss';
import useFocusReturn from '../react/a11y/useFocusReturn';
import useScrollLock from '../react/dialog/useScrollLock';
import { useIsomorphicLayoutEffect } from '../react/effects';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import { ElementLike, htmlElementOf, isEventInside } from '../utils/dom/domUtils';
import { supportsDialogClosedBy } from '../utils/environment/environmentUtils';
import { H2, P } from './semantics';

/** Why the dialog opened or closed — `onOpenChange` gets this alongside the event that did it. */
export type DialogReason = 'trigger' | 'escape' | 'outside-pointer' | 'imperative';

/** The DOM attributes the trigger has to carry. */
export interface DialogTriggerAttributes {
  'aria-expanded': boolean;
  'aria-haspopup': 'dialog';
  'aria-controls'?: string;
  onClick(event: React.MouseEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper. The `ref` is what
 * focus returns to when the dialog closes, so it is not optional decoration.
 *
 * ```tsx
 * {(trigger) => <Button {...trigger}>Edit</Button>}          // a Box component
 * {(trigger) => <button ref={trigger.ref} {...trigger.props}>}  // a plain element
 * ```
 */
export interface DialogTrigger {
  ref: React.RefCallback<HTMLElement>;
  props: DialogTriggerAttributes;
}

// `open` shadows the pseudo-class nesting key — the `content`/`open` precedent `Tooltip` set. The
// component owns the state, and `:open` on the element itself is what styles it.
type DialogBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'dialog', TKey>, 'open'>;

export interface DialogProps<TKey extends keyof ComponentsAndVariants = 'dialog'> extends DialogBoxProps<TKey> {
  /** The control that opens it, handed the ref and props that wire it up. Leave it out to open the dialog from anywhere else. */
  trigger?: (trigger: DialogTrigger) => React.ReactNode;
  /** The dialog's content — a `Dialog.Title`, usually a `Dialog.Description`, and the controls. */
  children?: React.ReactNode;
  /** Controlled open state. Leave it out and the dialog owns it. */
  open?: boolean;
  /** Whether it starts open, when the dialog owns its own state. */
  defaultOpen?: boolean;
  /**
   * Fires with the new state and why it changed — `'trigger'`, `'escape'`, `'outside-pointer'` or
   * `'imperative'`. A close cannot be refused: the browser has already done it by the time this runs.
   */
  onOpenChange?: ChangeHandler<boolean, DialogReason>;
  /** The dialog's accessible name, when no `Dialog.Title` supplies one. A dialog without a name is unusable. */
  label?: string;
  /** Names the dialog after an element already on the page, instead of `label` or a `Dialog.Title`. */
  labelledBy?: string;
  /** Describes it from an element already on the page, instead of a `Dialog.Description`. */
  describedBy?: string;
  /**
   * Whether the rest of the page is blocked while it is open. Default `true`, which is `showModal()`: the
   * top layer, a `::backdrop`, an inert page, Escape and focus containment, all the browser's.
   */
  modal?: boolean;
  /** Whether a press outside closes it. Default `true` — `false` is what makes a decision unavoidable. */
  dismissible?: boolean;
  /**
   * Whether the page behind it stops scrolling. Default: whatever `modal` is, because a modal dialog that
   * scrolls the page behind it is the commonest complaint about every library that blocks it unasked.
   */
  lockScroll?: boolean;
  /**
   * Where focus lands on open, instead of the first focusable thing inside. An **alert dialog owes this to
   * its least destructive action** — APG's rule, so that a keyboard user cannot confirm a deletion by
   * reflex. An `autofocus` attribute inside does the same job with no ref.
   */
  initialFocus?: ElementLike;
}

/** Everything an alert dialog does not get to choose: it is modal, and a decision cannot be dismissed. */
export type AlertDialogProps<TKey extends keyof ComponentsAndVariants = 'dialog'> = Omit<
  DialogProps<TKey>,
  'modal' | 'dismissible' | 'lockScroll'
>;

interface BaseProps<TKey extends keyof ComponentsAndVariants> extends DialogProps<TKey> {
  role: 'dialog' | 'alertdialog';
}

/** Every Box prop, on an `<h2>` — `tag` takes any of the six headings instead. */
export type DialogTitleProps<TKey extends keyof ComponentsAndVariants = 'dialog.title'> = BoxProps<'h2', TKey>;

/** Every Box prop, on a `<p>`. */
export type DialogDescriptionProps<TKey extends keyof ComponentsAndVariants = 'dialog.description'> = BoxProps<'p', TKey>;

interface DialogContextValue {
  titleId: string;
  descriptionId: string;
  /** Called from a layout effect by `Dialog.Title`/`Dialog.Description`; returns its own cleanup. */
  register(part: 'title' | 'description'): () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(name: string): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) throw new Error(`<${name}> must be rendered inside a <Dialog>.`);

  return context;
}

/**
 * A modal dialog on the platform's own `<dialog>`: `showModal()` supplies the top layer, the
 * `::backdrop`, an inert page behind it, Escape, focus containment and focus return — so none of that is
 * written here.
 *
 * ```tsx
 * <Dialog trigger={(t) => <Button {...t}>Rename</Button>}>
 *   <Dialog.Title>Rename this view</Dialog.Title>
 *   <Textbox label="Name" />
 * </Dialog>
 * ```
 *
 * **The dialog is always rendered**, and closed means `display: none` — the same shape as `<Popover>`, and
 * what lets the browser own show and hide. The exit is therefore a plain CSS transition rather than a
 * `<Presence>`, since nothing unmounts; content that is expensive to render should be gated by the
 * consumer with `{open && <Heavy />}`.
 *
 * **A close cannot be refused.** The `cancel` event is cancelable, but by the time `onOpenChange` runs the
 * browser has closed the dialog, so a controlled `<Dialog open>` hears about a dismissal afterwards and
 * keeping `open` true re-shows it. Say `dismissible={false}` to make a decision unavoidable instead, which
 * is what `<AlertDialog>` does.
 *
 * **Nothing is portalled**, so the theme, the custom properties, the text direction and the tab order
 * around the declaration all reach inside — a top-layer element inherits normally (measured in Chrome
 * 152, with a local `Box.Theme` wrapper around the dialog).
 *
 * A non-modal dialog (`modal={false}`) is `show()`: no top layer, no backdrop, nothing inert, and the UA
 * positions it against its containing block rather than the viewport. It is the right shape for a
 * persistent panel; for one anchored to a trigger, reach for `<Popover>`.
 *
 * @a11y `role="dialog"` (`alertdialog` on `<AlertDialog>`), named by a `Dialog.Title`, `label` or
 * `labelledBy`, and described by a `Dialog.Description` or `describedBy`.
 * @a11y The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`.
 * @a11y Focus is contained while a modal dialog is open and returns to the trigger when it closes, both
 * from the platform. `initialFocus` is what an alert dialog needs to land on its least destructive action.
 * @keyboard Escape — Closes it, from anywhere inside, and returns focus to the trigger.
 * @keyboard Tab — Cycles focus inside a modal dialog and never leaves it; in a non-modal one it moves on.
 * @keyboard Enter, Space — On the trigger, opens the dialog.
 */
function DialogImpl<TKey extends keyof ComponentsAndVariants = 'dialog'>(props: DialogProps<TKey>) {
  return <DialogBase role="dialog" {...props} />;
}

/**
 * A dialog that interrupts to ask something: `role="alertdialog"`, always modal, and **never dismissed by
 * a press outside**, because a decision that can be clicked away is one the user did not make.
 *
 * ```tsx
 * <AlertDialog trigger={(t) => <Button {...t}>Delete</Button>} initialFocus={cancelRef}>
 *   <AlertDialog.Title>Delete this view?</AlertDialog.Title>
 *   <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
 *   <Button ref={cancelRef}>Cancel</Button>
 * </AlertDialog>
 * ```
 *
 * Escape still closes it — a keyboard user must always have a way out (APG), and the platform's own close
 * request is that way. `initialFocus` is what puts focus on the least destructive action.
 *
 * @a11y `role="alertdialog"`, which tells a screen reader the content is an alert rather than a panel, so
 * the name and description are announced together on open.
 * @a11y A press outside is ignored on purpose; Escape is not, so the dialog is never a trap.
 * @keyboard Escape — Closes it and returns focus to the trigger.
 * @keyboard Tab — Cycles focus inside it and never leaves.
 */
function AlertDialogImpl<TKey extends keyof ComponentsAndVariants = 'dialog'>(props: AlertDialogProps<TKey>) {
  return <DialogBase role="alertdialog" {...props} modal dismissible={false} />;
}

function DialogBase<TKey extends keyof ComponentsAndVariants>(props: BaseProps<TKey>) {
  const {
    role,
    trigger,
    children,
    open,
    defaultOpen = false,
    onOpenChange,
    label,
    labelledBy,
    describedBy,
    modal = true,
    dismissible = true,
    lockScroll = modal,
    initialFocus,
    props: contentProps,
    ...restProps
  } = props;

  const generatedId = useIdentifier('dialog');
  // A consumer id wins, and `aria-controls` has to name whichever won.
  const dialogId = restProps.id ?? generatedId;
  const [isOpen, setOpen] = useControllableState<boolean, DialogReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  // What the DOM says, mirrored as state so the two can be compared on a commit. Without it a controlled
  // dialog the browser closed would stay closed: `isOpen` never changed, so nothing would re-render.
  const [domOpen, setDomOpen] = useState(false);
  const [parts, setParts] = useState({ title: 0, description: 0 });

  // The lock is a class, so in element mode its rule has to be rendered like any other Box's.
  const lockStyles = useScrollLock(isOpen && lockScroll);
  useFocusReturn({ enabled: isOpen, returnTo: triggerElement });

  const register = useCallback((part: 'title' | 'description') => {
    setParts((current) => ({ ...current, [part]: current[part] + 1 }));

    return () => setParts((current) => ({ ...current, [part]: current[part] - 1 }));
  }, []);

  // Deliberately free of `parts`: the two components register from an effect, and a context that changed
  // when they did would re-run that effect for ever.
  const context = useMemo<DialogContextValue>(
    () => ({ titleId: `${dialogId}-title`, descriptionId: `${dialogId}-description`, register }),
    [dialogId, register],
  );

  useDialogSync({ dialog, isOpen, domOpen, setDomOpen, setOpen, modal, dismissible, triggerElement });

  // Focus, once the platform has had its go: `showModal()` runs the dialog focusing steps itself, which
  // honour an `autofocus` attribute inside, and this only moves what is left.
  useIsomorphicLayoutEffect(() => {
    const target = htmlElementOf(initialFocus);
    if (!isOpen || !target) return;

    target.focus();
  }, [isOpen, initialFocus]);

  const handleTriggerClick = useEventCallback((event: React.MouseEvent) => {
    setOpen((current) => !current, { reason: 'trigger', event });
  });

  const triggerBag = useMemo<DialogTrigger>(
    () => ({
      ref: setTriggerElement,
      props: {
        'aria-expanded': isOpen,
        'aria-haspopup': 'dialog',
        'aria-controls': isOpen ? dialogId : undefined,
        onClick: handleTriggerClick,
      },
    }),
    [dialogId, handleTriggerClick, isOpen],
  );

  const boxProps = restProps as DialogBoxProps<TKey>;

  return (
    <>
      {lockStyles}
      {trigger?.(triggerBag)}
      <DialogContext.Provider value={context}>
        <Box
          ref={setDialog}
          tag="dialog"
          component={'dialog' as TKey}
          {...boxProps}
          id={dialogId}
          props={{
            role,
            'aria-label': parts.title || labelledBy ? undefined : label,
            'aria-labelledby': labelledBy ?? (parts.title ? context.titleId : undefined),
            'aria-describedby': describedBy ?? (parts.description ? context.descriptionId : undefined),
            ...contentProps,
          }}
        >
          {children}
        </Box>
      </DialogContext.Provider>
    </>
  );
}

interface SyncOptions {
  dialog: HTMLDialogElement | null;
  isOpen: boolean;
  domOpen: boolean;
  setDomOpen: (next: boolean) => void;
  setOpen: SetControllableState<boolean, DialogReason>;
  modal: boolean;
  dismissible: boolean;
  triggerElement: HTMLElement | null;
}

/**
 * The whole conversation with the platform: what the component tells the element, what it does with what
 * the element says back, and the two halves of dismissal the browser only sometimes owns.
 */
function useDialogSync(options: SyncOptions): void {
  const { dialog, isOpen, domOpen, setDomOpen, setOpen, modal, dismissible, triggerElement } = options;

  // Why it is about to close. `close` carries no reason, so the input that caused it is named by a
  // capture listener that has already run by the time the platform dispatches anything. A ref, not
  // state: a press anywhere on the page writes it, and re-rendering a dialog on every click is not free.
  const reason = useRef<DialogReason>('imperative');

  // `closedby` is what makes a press outside the browser's job, and Escape the browser's job for a
  // non-modal dialog too — a modal one has both from `showModal()`. Where it is missing, the two
  // primitives below stand in.
  const platformDismiss = supportsDialogClosedBy();
  const closedBy = dismissible ? 'any' : 'closerequest';

  // The one place the component tells the platform anything: whenever the two disagree, the state wins.
  // Compared against `domOpen` rather than `dialog.open`, because `close` is dispatched inside the
  // browser's own hide operation — React re-renders in the middle of it, and `showModal()` on an element
  // the browser is closing throws `InvalidStateError`.
  useIsomorphicLayoutEffect(() => {
    if (!dialog || isOpen === domOpen) return;

    setDomOpen(isOpen);

    if (!isOpen) dialog.close();
    else if (modal) dialog.showModal();
    else dialog.show();
  }, [dialog, isOpen, domOpen, modal, setDomOpen]);

  // `close` fires however it closed: Escape, a light dismiss, `close()`, or a `<form method="dialog">`
  // submit — which is the one the component would otherwise never hear about.
  useIsomorphicLayoutEffect(() => {
    if (!dialog) return;

    const controller = new AbortController();

    dialog.addEventListener(
      'close',
      (event) => {
        setDomOpen(false);
        setOpen(false, { reason: reason.current, event });
        reason.current = 'imperative';
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, [dialog, setDomOpen, setOpen]);

  useIsomorphicLayoutEffect(() => {
    if (!dialog || !platformDismiss) return;

    dialog.setAttribute('closedby', closedBy);

    return () => dialog.removeAttribute('closedby');
  }, [dialog, platformDismiss, closedBy]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !dialog) return;

    const controller = new AbortController();
    const listen = (type: string, handler: (event: Event) => void) =>
      document.addEventListener(type, handler, { signal: controller.signal, capture: true });

    listen('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Escape') reason.current = 'escape';
    });
    listen('pointerdown', (event) => {
      if (isEventInside(event, [triggerElement])) reason.current = 'trigger';
      // Inside the element but outside its box is the backdrop, which the dialog itself paints.
      else if (!isEventInside(event, [dialog]) || isOutsideBox(dialog, event as PointerEvent)) reason.current = 'outside-pointer';
      else reason.current = 'imperative';
    });

    return () => controller.abort();
  }, [isOpen, dialog, triggerElement]);

  // Escape, where the platform does not supply it: a non-modal dialog on a browser with no `closedby`.
  // Through the primitive rather than a listener of its own, so a dropdown open inside the dialog is
  // still the layer Escape reaches first.
  useDismiss({
    enabled: isOpen && !modal && !platformDismiss,
    inside: [dialog],
    escapeKey: true,
    outsidePointer: false,
    onDismiss: (_, event) => setOpen(false, { reason: 'escape', event }),
  });

  // A press outside, where the platform does not supply it. Not `useDismiss`, because for a modal dialog
  // "outside" is a *geometric* question: the backdrop is painted by the dialog element itself, so a press
  // on it targets the dialog and every containment test in the world calls it inside (measured).
  useIsomorphicLayoutEffect(() => {
    if (!dialog || !isOpen || !dismissible || platformDismiss) return;

    const controller = new AbortController();

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (isEventInside(event, [triggerElement])) return;
        if (isEventInside(event, [dialog]) && !isOutsideBox(dialog, event as PointerEvent)) return;

        setOpen(false, { reason: 'outside-pointer', event });
      },
      { signal: controller.signal, capture: true },
    );

    return () => controller.abort();
  }, [dialog, isOpen, dismissible, platformDismiss, triggerElement, setOpen]);
}

/** Whether a pointer event landed outside an element's own box — the backdrop, for a modal dialog. */
function isOutsideBox(element: Element, event: PointerEvent): boolean {
  const box = element.getBoundingClientRect();

  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}

/**
 * The dialog's heading, and what names it: rendering one is what puts `aria-labelledby` on the dialog, so
 * a name and a visible title cannot drift apart. An `<h2>` by default — `tag` takes any of the six.
 */
function DialogTitle<TKey extends keyof ComponentsAndVariants = 'dialog.title'>(props: DialogTitleProps<TKey>) {
  const context = useDialogContext('Dialog.Title');

  useIsomorphicLayoutEffect(() => context.register('title'), [context]);

  return <H2 id={context.titleId} component={'dialog.title' as TKey} {...props} />;
}

/** The dialog's supporting text, and what describes it: rendering one puts `aria-describedby` on the dialog. */
function DialogDescription<TKey extends keyof ComponentsAndVariants = 'dialog.description'>(props: DialogDescriptionProps<TKey>) {
  const context = useDialogContext('Dialog.Description');

  useIsomorphicLayoutEffect(() => context.register('description'), [context]);

  return <P id={context.descriptionId} component={'dialog.description' as TKey} {...props} />;
}

(DialogTitle as FunctionComponent).displayName = 'Dialog.Title';
(DialogDescription as FunctionComponent).displayName = 'Dialog.Description';

// Both families get the same two, because both are named and described the same way.
const subcomponents = { Title: DialogTitle, Description: DialogDescription };

const Dialog = Object.assign(DialogImpl, subcomponents);
const AlertDialog = Object.assign(AlertDialogImpl, subcomponents);

(DialogImpl as FunctionComponent).displayName = 'Dialog';
(AlertDialogImpl as FunctionComponent).displayName = 'AlertDialog';

export { AlertDialog };

export default Dialog;
