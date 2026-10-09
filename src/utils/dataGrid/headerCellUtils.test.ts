import { afterEach, describe, expect, it } from 'vitest';
import HeaderCellUtils, { type HeaderHoverBounds } from './headerCellUtils';

/** The travelling header hover's state machine: appear in place, travel between cells, fade where it was. */
describe('HeaderCellUtils', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const first: HeaderHoverBounds = { left: 0, right: 300, top: 0, bottom: 0 };
  const second: HeaderHoverBounds = { left: 100, right: 200, top: 0, bottom: 0 };

  it('appears where it is the first time, rather than travelling from nowhere', () => {
    const state = HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first);

    expect(state).toEqual({ bounds: first, visible: true, entering: true, backward: false, paused: false });
  });

  it('travels to the next cell, leading with the edge it moves towards', () => {
    const shown = HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first);
    const forward = HeaderCellUtils.hover(shown, second);

    expect(forward).toEqual({ bounds: second, visible: true, entering: false, backward: false, paused: false });
    expect(HeaderCellUtils.hover(forward, first).backward).toBe(true);
  });

  it('returns the same state for the same cell, so a pointer move re-renders nothing', () => {
    const shown = HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first);

    expect(HeaderCellUtils.hover(shown, { ...first })).toBe(shown);
  });

  it('keeps its direction between a column group and a leaf under it, which share a centre', () => {
    const group: HeaderHoverBounds = { left: 100, right: 100, top: 0, bottom: 48 };
    const leaf: HeaderHoverBounds = { left: 100, right: 100, top: 48, bottom: 0 };
    const backward = { ...HeaderCellUtils.hover(HeaderCellUtils.INITIAL, group), backward: true };

    expect(HeaderCellUtils.hover(backward, leaf).backward).toBe(true);
  });

  it('fades out where it was, and comes back in place', () => {
    const shown = HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first);
    const hidden = HeaderCellUtils.hover(shown, undefined);

    expect(hidden).toEqual({ bounds: first, visible: false, entering: false, backward: false, paused: false });
    expect(HeaderCellUtils.hover(hidden, undefined)).toBe(hidden);
    expect(HeaderCellUtils.hover(hidden, second)).toMatchObject({ bounds: second, entering: true });
  });

  it('hides over the resizer between two cells and still travels to the next one', () => {
    const shown = HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first);
    const crossing = HeaderCellUtils.pause(shown);

    expect(crossing).toMatchObject({ bounds: first, visible: false, paused: true });
    expect(HeaderCellUtils.hover(crossing, second)).toEqual({
      bounds: second,
      visible: true,
      entering: false,
      backward: false,
      paused: false,
    });
    expect(HeaderCellUtils.hover(crossing, first)).toMatchObject({ bounds: first, visible: true, paused: false });
  });

  it('forgets the crossing once the pointer leaves, and enters in place again', () => {
    const left = HeaderCellUtils.hover(HeaderCellUtils.pause(HeaderCellUtils.hover(HeaderCellUtils.INITIAL, first)), undefined);

    expect(left).toMatchObject({ visible: false, paused: false });
    expect(HeaderCellUtils.hover(left, second)).toMatchObject({ entering: true });
    expect(HeaderCellUtils.pause(left)).toBe(left);
  });

  it('sorts on a press anywhere in the cell but on a control inside it', () => {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'columnheader');
    cell.innerHTML =
      '<div><span>Name</span></div><button>⋮</button><div role="menu"><div role="menuitem">Pin</div></div>' +
      '<div class="resizer"><div role="separator"></div></div>';
    document.body.appendChild(cell);
    const [label, button, menu, resizer] = cell.children;

    expect(HeaderCellUtils.isSortPress(cell, cell)).toBe(true);
    expect(HeaderCellUtils.isSortPress(cell, label.firstChild)).toBe(true);
    expect(HeaderCellUtils.isSortPress(cell, button)).toBe(false);
    expect(HeaderCellUtils.isSortPress(cell, menu.firstChild)).toBe(false);
    expect(HeaderCellUtils.isSortPress(cell, resizer.firstChild)).toBe(false);
    expect(HeaderCellUtils.isSortPress(cell, document.body)).toBe(false);
  });

  it("measures a cell less its resizer's line, on whichever side the line stands", () => {
    const rect = (element: Element, left: number, right: number) =>
      (element.getBoundingClientRect = () => ({ left, right, top: 0, bottom: 48, width: right - left, height: 48 }) as DOMRect);
    const header = document.createElement('div');
    header.innerHTML =
      '<div role="columnheader" aria-sort="none"><div role="separator"></div></div>' +
      '<div role="columnheader" aria-sort="none"><div role="separator"></div></div>';
    document.body.appendChild(header);
    const [atEnd, atStart] = header.children;
    rect(header, 0, 400);
    rect(atEnd, 0, 200);
    rect(atEnd.firstElementChild!, 199, 200);
    rect(atStart, 200, 400);
    rect(atStart.firstElementChild!, 200, 201);

    expect(HeaderCellUtils.bounds(header, atEnd)).toEqual({ left: 0, right: 201, top: 0, bottom: 0 });
    expect(HeaderCellUtils.bounds(header, atStart)).toEqual({ left: 201, right: 0, top: 0, bottom: 0 });
  });

  it('only hovers a sortable cell of its own header', () => {
    const header = document.createElement('div');
    header.innerHTML = '<div role="columnheader" aria-sort="none"><span>Name</span></div><div role="columnheader">#</div>';
    document.body.appendChild(header);
    const [sortable, plain] = header.children;

    expect(HeaderCellUtils.cellAt(header, sortable.firstChild)).toBe(sortable);
    expect(HeaderCellUtils.cellAt(header, plain)).toBeUndefined();
    expect(HeaderCellUtils.cellAt(document.createElement('div'), sortable)).toBeUndefined();

    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    sortable.appendChild(resizer);
    expect(HeaderCellUtils.cellAt(header, resizer)).toBeUndefined();
  });
});
