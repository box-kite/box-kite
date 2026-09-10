import { afterEach, beforeEach, vi } from 'vitest';

/**
 * What the browser answers when asked which side a floating layer ended up on: the *used*
 * `position-area`, which is `block-start …` once a `position-try` fallback has flipped it. Nothing lays
 * out in a test environment, so a flip has to be said out loud — and only that one property is answered
 * for, since `<Presence>` times its exit off `transition-duration` on the same object.
 */
export function withUsedPositionArea(area: string) {
  const real = window.getComputedStyle.bind(window);

  vi.spyOn(window, 'getComputedStyle').mockImplementation((...args: Parameters<typeof real>) => {
    const style = real(...args);
    const inner = style.getPropertyValue.bind(style);

    style.getPropertyValue = (name: string) => (name === 'position-area' ? area : inner(name));

    return style;
  });
}

/**
 * Enough of the Popover API for the glue around it to be testable: happy-dom reflects the `popover`
 * attribute and implements none of the methods, so `<Popover>` takes its fallback path in every test
 * unless this is installed. It stands in for the *platform contract* — the two methods, `:popover-open`,
 * and a `beforetoggle` that is cancelable opening and not closing (all measured in Chrome 152) — and for
 * nothing the platform actually does: there is no top layer here, no light dismiss and no focus return,
 * so those stay browser-verified. Returns its own teardown.
 */
export function installPopoverApi(): () => void {
  const open = new WeakSet<Element>();
  const prototype = HTMLElement.prototype as unknown as Record<string, unknown>;
  const elementPrototype = Element.prototype as unknown as Record<string, unknown>;
  const realMatches = Element.prototype.matches;

  const toggle = (element: HTMLElement, next: boolean) => {
    if (open.has(element) === next) return;

    const before = new Event('beforetoggle', { cancelable: next }) as Event & { oldState: string; newState: string };
    before.oldState = next ? 'closed' : 'open';
    before.newState = next ? 'open' : 'closed';

    if (!element.dispatchEvent(before)) return;

    if (next) open.add(element);
    else open.delete(element);

    // The `open` *attribute*, because no test environment resolves `:popover-open` in a stylesheet — and
    // the engine's `open` key is `:is([open],:popover-open,:open)`, so this reaches the same rules and
    // the panel stops being `display: none` when it is shown.
    element.toggleAttribute('open', next);

    const after = new Event('toggle') as Event & { oldState: string; newState: string };
    after.oldState = before.oldState;
    after.newState = before.newState;
    element.dispatchEvent(after);
  };

  prototype.showPopover = function showPopover(this: HTMLElement) {
    toggle(this, true);
  };
  prototype.hidePopover = function hidePopover(this: HTMLElement) {
    toggle(this, false);
  };
  elementPrototype.matches = function matches(this: Element, selector: string) {
    if (selector === ':popover-open') return open.has(this);

    return realMatches.call(this, selector);
  };

  return () => {
    delete prototype.showPopover;
    delete prototype.hidePopover;
    elementPrototype.matches = realMatches;
  };
}

// Mock console.log to prevent noise in test output
export function ignoreLogs() {
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;

  beforeEach(() => {
    console.log = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
  });
}

/**
 * The half of `<dialog>` no test environment implements. happy-dom has `show`, `showModal`, `close` and
 * the `close` event, and the UA's `dialog:not([open])` rule — but nothing a *user* does: no close request
 * on Escape, and no light dismiss. This installs both, plus the `closedBy` property whose presence is how
 * the component decides whether they are the browser's job (all measured in Chrome 152).
 *
 * Without it a test takes the path of a browser with no `closedby`, which is where the component's own
 * dismissal runs — so both paths are reachable, the way `installPopoverApi` makes them for `<Popover>`.
 */
export function installDialogPlatform(): () => void {
  const prototype = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
  const dialogs = () => [...document.querySelectorAll('dialog[open]')] as HTMLDialogElement[];

  // A close request: `cancel` first, cancelable, then the close itself — and only the last dialog
  // opened, since the top layer is a stack.
  const requestClose = (dialog: HTMLDialogElement) => {
    if (!dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) return;

    dialog.close();
  };

  const onKeyDown = (event: Event) => {
    if ((event as KeyboardEvent).key !== 'Escape') return;

    const open = dialogs().filter((dialog) => dialog.getAttribute('closedby') !== 'none');
    const last = open[open.length - 1];

    if (last) requestClose(last);
  };

  const onPointerDown = (event: Event) => {
    for (const dialog of dialogs()) {
      const target = event.target;
      const inside = target instanceof Node && dialog.contains(target);

      if (dialog.getAttribute('closedby') === 'any' && !inside) requestClose(dialog);
    }
  };

  // Bubble phase, not capture: the platform dismisses at the *default action* stage, after every
  // listener has run — which is what lets the component name the reason before the dialog closes.
  prototype.closedBy = 'auto';
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('pointerdown', onPointerDown);

  return () => {
    delete prototype.closedBy;
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onPointerDown);
  };
}
