import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createToastStore, { Toast, ToastStore } from './toastStore';

/**
 * The queue and the clock, with no React anywhere. Everything about *what is on screen* is decided here,
 * so everything about it is testable without rendering a thing.
 */
describe('createToastStore', () => {
  let store: ToastStore<string>;

  const snapshot = () => store.getSnapshot();
  const visible = () => snapshot().toasts.filter((toast) => toast.visible && toast.open);
  const messages = () => visible().map((toast) => toast.message);

  beforeEach(() => {
    vi.useFakeTimers();
    store = createToastStore<string>({ limit: 2, duration: 1000 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('adding', () => {
    it('gives every toast an id and hands it back', () => {
      const first = store.add('Saved');
      const second = store.add('Copied');

      expect(first).not.toBe(second);
      expect(messages()).toEqual(['Saved', 'Copied']);
    });

    it('takes the id it was given, so a caller can update what it added', () => {
      store.add('Saving', { id: 'upload' });

      expect(snapshot().toasts[0].id).toBe('upload');
    });

    it('updates in place when an id already on screen is added again, rather than stacking a second', () => {
      store.add('Saving', { id: 'upload', kind: 'loading' });
      store.add('Saved', { id: 'upload', kind: 'success' });

      expect(snapshot().toasts).toHaveLength(1);
      expect(snapshot().toasts[0]).toMatchObject({ message: 'Saved', kind: 'success' });
    });

    it('leaves a loading toast with no clock at all — a spinner that timed out would report nothing', () => {
      store.add('Uploading', { kind: 'loading' });
      vi.advanceTimersByTime(60_000);

      expect(visible()).toHaveLength(1);
    });

    it('notifies subscribers, and stops when they unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);

      store.add('Saved');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.add('Copied');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('hands back a new snapshot object, since identity is what the subscription compares', () => {
      const before = snapshot();
      store.add('Saved');

      expect(snapshot()).not.toBe(before);
    });
  });

  describe('the limit', () => {
    it('holds the rest back and counts them, rather than dropping them', () => {
      store.add('One');
      store.add('Two');
      store.add('Three');

      expect(messages()).toEqual(['One', 'Two']);
      expect(snapshot().overflow).toBe(1);
    });

    it('never starts a queued toast’s clock — nothing expires that was not on screen', () => {
      store.add('One');
      store.add('Two');
      store.add('Three');

      vi.advanceTimersByTime(1000);

      // The first two timed out; the third only starts its own second on screen.
      expect(messages()).toEqual(['Three']);

      vi.advanceTimersByTime(999);
      expect(messages()).toEqual(['Three']);

      vi.advanceTimersByTime(1);
      expect(messages()).toEqual([]);
    });

    it('lets the next one in the moment a slot frees, without waiting for the exit', () => {
      const first = store.add('One');
      store.add('Two');
      store.add('Three');

      store.dismiss(first);

      // The dismissed one is still in the list — its exit is running — but it holds no slot.
      expect(messages()).toEqual(['Two', 'Three']);
      expect(snapshot().toasts).toHaveLength(3);
    });

    it('re-splits the queue when the limit changes', () => {
      store.add('One');
      store.add('Two');
      store.add('Three');

      store.setLimit(3);
      expect(messages()).toEqual(['One', 'Two', 'Three']);
      expect(snapshot().overflow).toBe(0);

      store.setLimit(1);
      expect(messages()).toEqual(['One']);
      expect(snapshot().overflow).toBe(2);
    });
  });

  describe('the clock', () => {
    it('dismisses a toast when its duration runs out, and says why', () => {
      const onDismiss = vi.fn();
      store.add('Saved', { onDismiss });

      vi.advanceTimersByTime(999);
      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('timeout');
    });

    it('takes a duration of its own over the store’s default', () => {
      store.add('Saved', { duration: 5000 });

      vi.advanceTimersByTime(1000);
      expect(visible()).toHaveLength(1);

      vi.advanceTimersByTime(4000);
      expect(visible()).toHaveLength(0);
    });

    it('stops where it got to on pause and carries on from there — WCAG 2.2.1', () => {
      store.add('Saved');

      vi.advanceTimersByTime(600);
      store.pause();
      vi.advanceTimersByTime(10_000);

      expect(visible()).toHaveLength(1);

      store.resume();
      vi.advanceTimersByTime(399);
      expect(visible()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(visible()).toHaveLength(0);
    });

    it('pauses a toast that arrives while the stack is already paused', () => {
      store.pause();
      store.add('Saved');

      vi.advanceTimersByTime(10_000);
      expect(visible()).toHaveLength(1);

      store.resume();
      vi.advanceTimersByTime(1000);
      expect(visible()).toHaveLength(0);
    });

    it('restarts the clock on an update, because the text being read is new', () => {
      store.add('Saving', { id: 'upload' });

      vi.advanceTimersByTime(900);
      store.update('upload', 'Saved');

      vi.advanceTimersByTime(900);
      expect(visible()).toHaveLength(1);

      vi.advanceTimersByTime(100);
      expect(visible()).toHaveLength(0);
    });
  });

  describe('updating', () => {
    it('ignores an id that is not there, rather than adding it', () => {
      store.update('nobody', 'Saved');

      expect(snapshot().toasts).toHaveLength(0);
    });

    it('gives a new kind that kind’s own default duration, so a resolved promise stops being forever', () => {
      store.add('Uploading', { id: 'upload', kind: 'loading' });
      store.update('upload', 'Uploaded', { kind: 'success' });

      expect(snapshot().toasts[0].duration).toBe(1000);

      vi.advanceTimersByTime(1000);
      expect(visible()).toHaveLength(0);
    });

    it('reopens a toast whose exit had already started', () => {
      const id = store.add('Saving');
      store.dismiss(id);

      expect(snapshot().toasts[0].open).toBe(false);

      store.update(id, 'Saved');
      expect(snapshot().toasts[0].open).toBe(true);
    });
  });

  describe('dismissing', () => {
    it('leaves the entry in place so something has an exit to run', () => {
      const id = store.add('Saved');
      store.dismiss(id, 'close');

      expect(snapshot().toasts).toHaveLength(1);
      expect(snapshot().toasts[0].open).toBe(false);
    });

    it('drops it for good on remove', () => {
      const id = store.add('Saved');
      store.dismiss(id);
      store.remove(id);

      expect(snapshot().toasts).toHaveLength(0);
    });

    it('takes the whole stack when given no id', () => {
      store.add('One');
      store.add('Two');
      store.dismiss();

      expect(snapshot().toasts.every((toast: Toast<string>) => !toast.open)).toBe(true);
    });

    it('calls the handler after the queue has settled, so a handler may add a toast of its own', () => {
      const seen: number[] = [];
      const id = store.add('Undo me', {
        onDismiss: () => {
          seen.push(store.getSnapshot().toasts.filter((toast) => toast.open).length);
          store.add('Undone');
        },
      });

      store.dismiss(id, 'close');

      expect(seen).toEqual([0]);
      expect(messages()).toEqual(['Undone']);
    });

    it('says nothing twice — a second dismissal of the same toast is not a change', () => {
      const onDismiss = vi.fn();
      const id = store.add('Saved', { onDismiss });

      store.dismiss(id, 'close');
      store.dismiss(id, 'imperative');

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('clears the clock, so a dismissed toast cannot time out afterwards', () => {
      const onDismiss = vi.fn();
      const id = store.add('Saved', { onDismiss });

      store.dismiss(id, 'close');
      vi.advanceTimersByTime(5000);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('empties itself with no exit and no handler, which is what a route change wants', () => {
    const onDismiss = vi.fn();
    store.add('Saved', { onDismiss });
    store.reset();

    expect(snapshot().toasts).toHaveLength(0);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('has nothing to say on a server', () => {
    store.add('Saved');

    expect(store.getServerSnapshot().toasts).toHaveLength(0);
  });
});
