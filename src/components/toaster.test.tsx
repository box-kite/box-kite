import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import createToastStore, { ToastStore } from '../utils/toast/toastStore';
import Toaster, { defaultToastStore, toast } from './toaster';

/**
 * What the component owns: the region, the roles, the queue on screen and the four things that stop the
 * clock. The store's own behaviour is in `toastStore.test.ts`, and the keyboard map in
 * `toaster.a11y.test.tsx`.
 *
 * The test environment implements no Popover API, so the default here is the **fallback** path — a
 * portal. `installPopoverApi` puts the platform contract back for the tests that are about the glue.
 */
describe('Toaster', () => {
  ignoreLogs();

  let store: ToastStore<React.ReactNode>;

  beforeEach(() => {
    store = createToastStore<React.ReactNode>({ limit: 3, duration: 5000 });
  });

  afterEach(() => {
    cleanup();
    defaultToastStore.reset();
  });

  const region = () => screen.getByRole('region', { name: 'Notifications' });
  const add = (message: React.ReactNode, options?: Parameters<ToastStore<React.ReactNode>['add']>[1]) =>
    act(() => {
      store.add(message, options);
    });

  function renderToaster(props: Partial<React.ComponentProps<typeof Toaster>> = {}) {
    return render(<Toaster store={store} {...props} />);
  }

  describe('the live region', () => {
    it('is on the page before there is anything in it, which is what makes an arrival announce at all', () => {
      renderToaster();

      expect(region()).toBeInTheDocument();
      expect(region()).toBeEmptyDOMElement();
    });

    it('is polite, non-atomic and listening for additions', () => {
      renderToaster();

      expect(region()).toHaveAttribute('aria-live', 'polite');
      expect(region()).toHaveAttribute('aria-atomic', 'false');
      expect(region()).toHaveAttribute('aria-relevant', 'additions text');
    });

    it('takes a name of its own', () => {
      renderToaster({ label: 'Messages' });

      expect(screen.getByRole('region', { name: 'Messages' })).toBeInTheDocument();
    });

    it('is focusable by script and not by Tab — nothing here steals the keyboard', () => {
      renderToaster();

      expect(region()).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('what a toast is', () => {
    it('draws the message, and the description under it', () => {
      renderToaster();
      add('Saved', { description: 'Your changes are live.' });

      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Your changes are live.')).toBeInTheDocument();
    });

    it('gives an error the assertive role, and nothing else one', () => {
      renderToaster();
      add('Could not save', { kind: 'error' });
      add('Saved', { kind: 'success' });

      expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });

    it('takes any node as the message, so a caller is not limited to a string', () => {
      renderToaster();
      add(<strong>Saved</strong>);

      expect(screen.getByText('Saved').tagName).toBe('STRONG');
    });

    it('carries a close button by default, and drops it when the toast is not dismissible', () => {
      renderToaster();
      add('Saved');
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();

      add('Working', { dismissible: false });
      expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
    });

    it('closes on the close button, and says why', async () => {
      const onDismiss = vi.fn();
      renderToaster();
      add('Saved', { onDismiss });

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(onDismiss).toHaveBeenCalledWith('close');
      await waitFor(() => expect(screen.queryByText('Saved')).toBeNull());
    });

    it('runs an action and dismisses the toast it answered', async () => {
      const onClick = vi.fn();
      renderToaster();
      add('Deleted', { action: { label: 'Undo', onClick } });

      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(onClick).toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByText('Deleted')).toBeNull());
    });

    it('keeps the toast when the action says so', () => {
      renderToaster();
      add('Deleted', { action: { label: 'Undo', onClick: vi.fn(), closeOnClick: false } });

      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });
  });

  describe('the queue on screen', () => {
    it('draws the limit and counts the rest', () => {
      renderToaster({ limit: 2 });
      add('One');
      add('Two');
      add('Three');

      expect(screen.getByText('One')).toBeInTheDocument();
      expect(screen.getByText('Two')).toBeInTheDocument();
      expect(screen.queryByText('Three')).toBeNull();
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('takes a counter of its own', () => {
      renderToaster({ limit: 1, overflowLabel: (count) => `${count} waiting` });
      add('One');
      add('Two');

      expect(screen.getByText('1 waiting')).toBeInTheDocument();
    });

    it('says nothing when the limit is holding nothing back', () => {
      renderToaster({ limit: 3 });
      add('One');

      expect(screen.queryByText(/more/)).toBeNull();
    });

    it('draws newest last at the bottom and newest first at the top, so the newest is always nearest the edge', () => {
      const { unmount } = renderToaster({ position: 'bottom-end' });
      add('One');
      add('Two');

      const bottom = [...region().querySelectorAll('[data-toast-id]')].map((el) => el.textContent);
      expect(bottom).toEqual(['One', 'Two']);

      unmount();
      store.reset();
      renderToaster({ position: 'top-end' });
      add('One');
      add('Two');

      const top = [...region().querySelectorAll('[data-toast-id]')].map((el) => el.textContent);
      expect(top).toEqual(['Two', 'One']);
    });
  });

  describe('the clock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    // Two rounds, always: the first runs the toast's own clock and lets React commit the dismissal, and
    // only then does <Presence> know there is an exit to time. One advance cannot cover both.
    const tick = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('takes a toast away when its time is up', () => {
      renderToaster({ duration: 1000 });
      add('Saved');

      expect(screen.getByText('Saved')).toBeInTheDocument();

      tick(1000);
      tick(1000);
      expect(screen.queryByText('Saved')).toBeNull();
    });

    it('stops while the pointer is over the stack — WCAG 2.2.1', () => {
      renderToaster({ duration: 1000 });
      add('Saved');

      fireEvent.pointerOver(screen.getByText('Saved'));
      tick(10_000);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('starts again when the pointer leaves for somewhere outside', () => {
      renderToaster({ duration: 1000 });
      add('Saved');

      fireEvent.pointerOver(screen.getByText('Saved'));
      fireEvent.pointerOut(region(), { relatedTarget: document.body });

      tick(2000);
      tick(1000);
      expect(screen.queryByText('Saved')).toBeNull();
    });

    it('stays stopped while the pointer moves between the toasts', () => {
      renderToaster({ duration: 1000 });
      add('One');
      add('Two');

      const [first, second] = [...region().querySelectorAll('[data-toast-id]')];
      fireEvent.pointerOver(first);
      fireEvent.pointerOut(first, { relatedTarget: second });

      tick(10_000);
      expect(screen.getByText('One')).toBeInTheDocument();
    });

    it('stops while something in the stack has focus', () => {
      renderToaster({ duration: 1000 });
      add('Saved');

      fireEvent.focus(screen.getByRole('button', { name: 'Close' }), { relatedTarget: document.body });
      tick(10_000);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('stops while the tab is in the background', () => {
      renderToaster({ duration: 1000 });
      add('Saved');

      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      fireEvent(document, new Event('visibilitychange'));

      tick(10_000);
      expect(screen.getByText('Saved')).toBeInTheDocument();

      hidden.mockReturnValue(false);
      fireEvent(document, new Event('visibilitychange'));
      tick(2000);
      tick(1000);
      expect(screen.queryByText('Saved')).toBeNull();
    });
  });

  describe('the imperative API', () => {
    it('writes to the default store, which a Toaster with no store of its own reads', () => {
      render(<Toaster />);

      act(() => {
        toast('Saved');
      });

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('queues a message sent before the viewport was mounted, rather than losing it', () => {
      act(() => {
        toast('Early');
      });

      render(<Toaster />);
      expect(screen.getByText('Early')).toBeInTheDocument();
    });

    it('gives each helper its kind, and an error the assertive role', () => {
      render(<Toaster />);

      act(() => {
        toast.error('Could not save');
        toast.success('Saved');
      });

      expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    });

    it('turns one promise into one toast', async () => {
      render(<Toaster />);
      let settle: (value: string) => void = () => {};
      const promise = new Promise<string>((resolve) => {
        settle = resolve;
      });

      act(() => {
        toast.promise(promise, { loading: 'Saving…', success: (value) => `Saved ${value}`, error: 'Failed' });
      });
      expect(screen.getByText('Saving…')).toBeInTheDocument();

      await act(async () => {
        settle('now');
        await promise;
      });

      expect(screen.queryByText('Saving…')).toBeNull();
      expect(screen.getByText('Saved now')).toBeInTheDocument();
      expect(screen.getAllByText(/Sav/)).toHaveLength(1);
    });

    it('reports a rejected promise as an error, and hands the rejection on', async () => {
      render(<Toaster />);
      const promise = Promise.reject(new Error('nope'));

      await act(async () => {
        toast.promise(promise, { loading: 'Saving…', success: 'Saved', error: (error) => `Failed: ${(error as Error).message}` });
        await promise.catch(() => {});
      });

      expect(screen.getByRole('alert')).toHaveTextContent('Failed: nope');
    });

    it('dismisses one, or all of them', async () => {
      render(<Toaster />);
      let id = '';

      act(() => {
        id = toast('One');
        toast('Two');
      });

      act(() => {
        toast.dismiss(id);
      });
      await waitFor(() => expect(screen.queryByText('One')).toBeNull());
      expect(screen.getByText('Two')).toBeInTheDocument();

      act(() => {
        toast.dismiss();
      });
      await waitFor(() => expect(screen.queryByText('Two')).toBeNull());
    });
  });

  describe('with the platform API', () => {
    let uninstall: () => void;

    beforeEach(() => {
      uninstall = installPopoverApi();
    });

    afterEach(() => {
      uninstall();
    });

    it('puts the viewport in the top layer and leaves it where it was declared', () => {
      const { container } = render(
        <div data-app>
          <Toaster store={store} />
        </div>,
      );

      expect(region()).toHaveAttribute('popover', 'manual');
      expect(container.querySelector('[data-app]')).toContainElement(region());
    });

    it('shows it as soon as it mounts — a stack with nothing in it is still a live region', () => {
      renderToaster();

      expect(region().matches(':popover-open')).toBe(true);
    });
  });

  it('portals the viewport where the browser has no top layer to reach', () => {
    const { container } = render(
      <div data-app>
        <Toaster store={store} />
      </div>,
    );

    expect(region()).not.toHaveAttribute('popover');
    expect(container.querySelector('[data-app]')).toBeEmptyDOMElement();
    expect(document.getElementById('box-kite-portal')).toContainElement(region());
  });
});
