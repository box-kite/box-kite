/** What a toast is saying, which is the only thing that changes its colour and its urgency. */
export type ToastKind = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

/** Why a toast went away — the four every dismissal reports, on the shape the rest of the library uses. */
export type ToastDismissReason = 'timeout' | 'close' | 'action' | 'imperative';

export interface ToastAction<TContent> {
  label: TContent;
  onClick(): void;
  /** Whether pressing it also dismisses the toast. Default `true` — an action is an answer to it. */
  closeOnClick?: boolean;
}

export interface ToastOptions<TContent> {
  /** Reuse an id and the toast already carrying it is updated in place, which is what `toast.promise` does. */
  id?: string;
  kind?: ToastKind;
  description?: TContent;
  /** Milliseconds on screen. `Infinity` stays until something dismisses it, which is what `loading` uses. */
  duration?: number;
  action?: ToastAction<TContent>;
  /** Whether the close button is drawn and Escape reaches it. Default `true`. */
  dismissible?: boolean;
  onDismiss?(reason: ToastDismissReason): void;
}

export interface Toast<TContent> {
  id: string;
  kind: ToastKind;
  message: TContent;
  description?: TContent;
  duration: number;
  action?: ToastAction<TContent>;
  dismissible: boolean;
  onDismiss?(reason: ToastDismissReason): void;
  /** False from the moment it is dismissed: the entry is still rendered, because the exit is running. */
  open: boolean;
  /** On screen rather than waiting behind the limit. A queued toast runs no timer — see `syncTimers`. */
  visible: boolean;
}

export interface ToastState<TContent> {
  toasts: readonly Toast<TContent>[];
  /** How many open toasts the limit is holding back, which is what the viewport's counter says. */
  overflow: number;
}

export interface ToastStore<TContent> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ToastState<TContent>;
  /** The empty state, always: nothing has been announced on a server. */
  getServerSnapshot(): ToastState<TContent>;
  add(message: TContent, options?: ToastOptions<TContent>): string;
  /** Changes a toast already on screen. An unknown id is ignored rather than added — see `toast.promise`. */
  update(id: string, message: TContent, options?: ToastOptions<TContent>): void;
  /** Starts the exit. The entry stays until `remove`, which is what gives `<Presence>` something to hold. */
  dismiss(id?: string, reason?: ToastDismissReason): void;
  /** Drops the entry for good — what the viewport calls once the exit has finished. */
  remove(id: string): void;
  setLimit(limit: number): void;
  setDefaultDuration(duration: number): void;
  /** Every timer holds where it got to. WCAG 2.2.1: hovering or focusing the stack must stop the clock. */
  pause(): void;
  resume(): void;
  /** Everything gone with no exit and no handler called — for a test, or a route change. */
  reset(): void;
}

interface Timer {
  handle: ReturnType<typeof setTimeout> | null;
  /** What is left of the duration, so a pause and a resume do not restart the clock. */
  remaining: number;
  startedAt: number;
}

const EMPTY = { toasts: [], overflow: 0 } as const;

let sequence = 0;

/** Ids are never rendered on a server (a toast cannot exist there), so a counter cannot desync a hydration. */
function nextId(): string {
  sequence += 1;

  return `toast-${sequence}`;
}

/**
 * The queue, the timers and the subscription behind `toast()` — with no React in it, because none of that
 * is a rendering question. The component reads a snapshot and draws it; every decision about what is on
 * screen, what is waiting and when something leaves is made here.
 *
 * A toast past the limit is **queued, not dropped, and its timer has not started** — so a message cannot
 * expire while it was never on screen, which is the whole reason the limit is a queue rather than a cap.
 */
export default function createToastStore<TContent>(options?: { limit?: number; duration?: number }): ToastStore<TContent> {
  let toasts: Toast<TContent>[] = [];
  let state: ToastState<TContent> = EMPTY;
  let limit = options?.limit ?? 3;
  let defaultDuration = options?.duration ?? 5000;
  let paused = false;

  const listeners = new Set<() => void>();
  const timers = new Map<string, Timer>();

  const clearTimer = (id: string) => {
    const timer = timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);

    timers.delete(id);
  };

  /** The snapshot is rebuilt only when something changed, since `useSyncExternalStore` compares identity. */
  const publish = () => {
    let visibleCount = 0;

    toasts = toasts.map((toast) => {
      const visible = toast.open ? visibleCount++ < limit : true;

      return toast.visible === visible ? toast : { ...toast, visible };
    });

    state = { toasts, overflow: Math.max(0, visibleCount - limit) };
    syncTimers();
    listeners.forEach((listener) => listener());
  };

  /** A timer exists exactly while its toast is open, on screen, finite and the stack is not paused. */
  function syncTimers() {
    const wanted = new Set<string>();

    for (const toast of toasts) {
      if (!toast.open || !toast.visible || !Number.isFinite(toast.duration)) continue;

      wanted.add(toast.id);
      const timer = timers.get(toast.id) ?? { handle: null, remaining: toast.duration, startedAt: 0 };
      timers.set(toast.id, timer);

      if (paused || timer.handle) continue;

      timer.startedAt = Date.now();
      timer.handle = setTimeout(() => {
        timers.delete(toast.id);
        dismiss(toast.id, 'timeout');
      }, timer.remaining);
    }

    for (const id of [...timers.keys()]) {
      if (!wanted.has(id)) clearTimer(id);
    }
  }

  // A spinner that dismissed itself would leave the thing it was waiting for unreported.
  const durationFor = (kind: ToastKind, named?: number) => named ?? (kind === 'loading' ? Number.POSITIVE_INFINITY : defaultDuration);

  function dismiss(id?: string, reason: ToastDismissReason = 'imperative') {
    const dismissed: Toast<TContent>[] = [];

    toasts = toasts.map((toast) => {
      if (!toast.open || (id !== undefined && toast.id !== id)) return toast;

      dismissed.push(toast);
      clearTimer(toast.id);

      return { ...toast, open: false };
    });

    if (!dismissed.length) return;

    publish();
    // After the state is settled and published: a handler that adds a toast of its own is the normal
    // case (an "Undo" that reports what it undid), and it must not run against a half-updated queue.
    dismissed.forEach((toast) => toast.onDismiss?.(reason));
  }

  function update(id: string, message: TContent, updateOptions?: ToastOptions<TContent>) {
    let changed = false;

    toasts = toasts.map((toast) => {
      if (toast.id !== id) return toast;

      changed = true;
      // The clock restarts, because the text the reader is being given is new.
      clearTimer(id);
      const kind = updateOptions?.kind ?? toast.kind;

      return {
        ...toast,
        ...updateOptions,
        id,
        message,
        kind,
        // A named duration wins; a new *kind* is a new message, so it takes that kind's default.
        duration: updateOptions?.duration ?? (updateOptions?.kind ? durationFor(kind) : toast.duration),
        // Reopened rather than left closed: an update to a toast whose exit had started is a new message.
        open: true,
      };
    });

    if (changed) publish();
  }

  function add(message: TContent, addOptions?: ToastOptions<TContent>): string {
    const id = addOptions?.id ?? nextId();

    // An id already on screen is an update, which is what makes `toast.promise` one toast rather than two.
    if (addOptions?.id && toasts.some((toast) => toast.id === id)) {
      update(id, message, addOptions);

      return id;
    }

    const kind = addOptions?.kind ?? 'default';
    toasts = [
      ...toasts,
      {
        id,
        kind,
        message,
        description: addOptions?.description,
        duration: durationFor(kind, addOptions?.duration),
        action: addOptions?.action,
        dismissible: addOptions?.dismissible ?? true,
        onDismiss: addOptions?.onDismiss,
        open: true,
        visible: false,
      },
    ];

    publish();

    return id;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getServerSnapshot: () => EMPTY,
    add,
    update,
    dismiss,
    remove(id) {
      const next = toasts.filter((toast) => toast.id !== id);
      if (next.length === toasts.length) return;

      clearTimer(id);
      toasts = next;
      publish();
    },
    setLimit(next) {
      if (next === limit) return;

      limit = next;
      publish();
    },
    setDefaultDuration(next) {
      defaultDuration = next;
    },
    pause() {
      if (paused) return;

      paused = true;

      for (const timer of timers.values()) {
        if (!timer.handle) continue;

        clearTimeout(timer.handle);
        timer.handle = null;
        timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt));
      }
    },
    resume() {
      if (!paused) return;

      paused = false;
      syncTimers();
    },
    reset() {
      for (const id of [...timers.keys()]) clearTimer(id);

      toasts = [];
      state = EMPTY;
      listeners.forEach((listener) => listener());
    },
  };
}
