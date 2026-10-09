/** Where the travelling header hover sits: each edge's distance from the same edge of the header, in px. */
export interface HeaderHoverBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The travelling hover's whole state. Physical edges, because a measured pixel has no reading order. */
export interface HeaderHoverState {
  bounds?: HeaderHoverBounds;
  visible: boolean;
  /** Shown this update from nothing, so it appears where it is rather than travelling from where it last was. */
  entering: boolean;
  /** Which way it last travelled: the leading edge is the fast one, which is what makes it stretch and settle. */
  backward: boolean;
  /** Hidden by the resizer between two cells rather than by leaving: the next cell is travelled to, not entered. */
  paused: boolean;
}

/**
 * What a header cell does with the pointer: which press sorts, and the model behind `def.headerHover:
 * 'sliding'` — one pill that flows from the cell it was on to the one under the pointer.
 */
namespace HeaderCellUtils {
  /** A sortable header cell: the only kind a press does anything on, and so the only kind that hovers. */
  export const CELL_SELECTOR = '[role="columnheader"][aria-sort]';

  /** The resizer's whole handle, which is wider than the line inside it. */
  const RESIZER_SELECTOR = '.resizer';

  /** The controls a header cell holds — the column menu's trigger and its menu, the resizer, a checkbox. */
  const CONTROL_SELECTOR = `button, input, a, [role="menu"], [role="separator"], ${RESIZER_SELECTOR}`;

  /**
   * Whether a press sorts: anywhere in the cell but a control inside it. Judged on where the press *began*,
   * since a resize drag released over the cell fires its click on the cell itself.
   */
  export function isSortPress(cell: Element, pressedOn: EventTarget | null): boolean {
    if (!(pressedOn instanceof Element) || !cell.contains(pressedOn)) return false;

    const control = pressedOn.closest(CONTROL_SELECTOR);
    return !control || !cell.contains(control);
  }

  export const INITIAL: HeaderHoverState = { visible: false, entering: false, backward: false, paused: false };

  /** Whether the pointer is over a resizer, where a press resizes, so no cell hovers. */
  export function isOnResizer(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(RESIZER_SELECTOR) !== null;
  }

  /** The hoverable cell an event landed in, if it belongs to this header. Over the resizer there is none. */
  export function cellAt(header: Element, target: EventTarget | null): HTMLElement | undefined {
    if (!(target instanceof Element) || isOnResizer(target)) return undefined;

    const cell = target.closest<HTMLElement>(CELL_SELECTOR);
    return cell && header.contains(cell) ? cell : undefined;
  }

  /**
   * The cell's box against the header's own, which is the hover's containing block — less the resizer's line
   * where it stands inside the cell, so the pill keeps the same distance from it as the neighbour's does.
   */
  export function bounds(header: Element, cell: Element): HeaderHoverBounds {
    const outer = header.getBoundingClientRect();
    const inner = cell.getBoundingClientRect();
    let { left, right } = inner;

    const separator = cell.querySelector('[role="separator"]');
    const line = separator?.closest(CELL_SELECTOR) === cell ? separator.getBoundingClientRect() : undefined;
    if (line && line.width > 0) {
      if (line.left + line.right > left + right) right = Math.min(right, line.left);
      else left = Math.max(left, line.right);
    }

    return {
      left: left - outer.left,
      right: outer.right - right,
      top: inner.top - outer.top,
      bottom: outer.bottom - inner.bottom,
    };
  }

  export function sameBounds(a: HeaderHoverBounds | undefined, b: HeaderHoverBounds | undefined): boolean {
    if (!a || !b) return a === b;

    return a.left === b.left && a.right === b.right && a.top === b.top && a.bottom === b.bottom;
  }

  /** The next state for a pointer over `next` — a cell's bounds, or `undefined` for anywhere that does not hover. */
  export function hover(state: HeaderHoverState, next: HeaderHoverBounds | undefined): HeaderHoverState {
    if (!next) return state.visible || state.paused ? { ...state, visible: false, entering: false, paused: false } : state;
    if ((!state.visible && !state.paused) || !state.bounds) return { ...state, bounds: next, visible: true, entering: true };
    if (sameBounds(state.bounds, next)) return state.visible ? state : { ...state, visible: true, paused: false };

    // A column group above its leaves shares a centre with them, and keeps the direction it had.
    const shift = next.left - next.right - (state.bounds.left - state.bounds.right);
    const backward = shift === 0 ? state.backward : shift < 0;

    return { bounds: next, visible: true, entering: false, backward, paused: false };
  }

  /**
   * Over the resizer: hidden, but still on its way between two cells. The handle sits on the boundary every
   * move from cell to cell crosses, so treating it as a leave would turn each move into an entrance.
   */
  export function pause(state: HeaderHoverState): HeaderHoverState {
    return state.visible ? { ...state, visible: false, entering: false, paused: true } : state;
  }
}

export default HeaderCellUtils;
