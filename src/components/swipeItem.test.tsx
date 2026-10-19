import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import List from './list';
import SwipeItem, { SwipeSide } from './swipeItem';

/** No test environment lays anything out, so the item is 400px wide and each tray as wide as its buttons say. */
function layOut() {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.tagName === 'LI') return 400;
    const buttons = this.querySelectorAll('[data-swipe-action]').length;

    return this.parentElement?.parentElement?.tagName === 'LI' && buttons ? buttons * 80 : 0;
  });
}

const rowOf = () => document.querySelector('li')!.firstElementChild as HTMLElement;
// jsdom leaves a `translate` it was never given undefined rather than empty.
const translateOf = (element: HTMLElement) => element.style.translate || '';
const traysOf = () => Array.from(document.querySelector('li')!.children).slice(1) as HTMLElement[];

/** A press that travels `dx` along the line, in steps, and lets go. */
function swipe(dx: number, { from = 300, release = true } = {}) {
  const row = rowOf();
  fireEvent.pointerDown(row, { button: 0, pointerId: 1, clientX: from, clientY: 20 });
  for (let step = 1; step <= 4; step++) fireEvent.pointerMove(row, { pointerId: 1, clientX: from + (dx * step) / 4, clientY: 21 });
  if (release) fireEvent.pointerUp(row, { pointerId: 1, clientX: from + dx, clientY: 21 });
}

function Item(props: { onOpenChange?: (open: SwipeSide | null) => void; onDelete?: () => void; onOpen?: () => void; fullSwipe?: boolean }) {
  return (
    <List>
      <SwipeItem
        fullSwipe={props.fullSwipe}
        onOpenChange={props.onOpenChange}
        startActions={<SwipeItem.Action variant="accent">Pin</SwipeItem.Action>}
        endActions={
          <>
            <SwipeItem.Action variant="danger" onClick={props.onDelete}>
              Delete
            </SwipeItem.Action>
            <SwipeItem.Action>Archive</SwipeItem.Action>
          </>
        }
      >
        <List.Content>
          <List.Title>
            <List.Action onClick={props.onOpen}>Ada Lovelace</List.Action>
          </List.Title>
        </List.Content>
      </SwipeItem>
    </List>
  );
}

describe('SwipeItem', () => {
  beforeEach(layOut);

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders closed: the row in place and both trays clipped to nothing', () => {
    render(<Item />);

    expect(translateOf(rowOf())).toBe('');
    expect(traysOf().map((tray) => tray.style.width)).toEqual(['0px', '0px']);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Ada Lovelace', 'Pin', 'Delete', 'Archive']);
  });

  it('opens the end tray when swiped more than halfway towards the start', () => {
    const onOpenChange = vi.fn();
    render(<Item onOpenChange={onOpenChange} />);

    swipe(-100);

    expect(onOpenChange).toHaveBeenCalledWith('end', expect.objectContaining({ reason: 'swipe' }));
    expect(translateOf(rowOf())).toBe('-160px');
    expect(traysOf()[1].style.width).toBe('160px');
  });

  it('follows the press while it moves, and stays closed short of halfway', () => {
    // A slow drag on a clock of its own: on the real one a loaded runner spreads the moves past a frame and reads a flick.
    let now = 0;
    vi.spyOn(Event.prototype, 'timeStamp', 'get').mockImplementation(() => (now += 200));
    render(<Item />);

    swipe(-60, { release: false });
    expect(translateOf(rowOf())).toBe('-60px');

    fireEvent.pointerUp(rowOf(), { pointerId: 1 });
    expect(translateOf(rowOf())).toBe('');
  });

  it('opens the start tray the other way', () => {
    render(<Item />);

    swipe(60);

    expect(translateOf(rowOf())).toBe('80px');
  });

  it('leaves a press that went up or down to the page', () => {
    render(<Item />);
    const row = rowOf();

    fireEvent.pointerDown(row, { button: 0, pointerId: 1, clientX: 300, clientY: 20 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 290, clientY: 60 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200, clientY: 70 });
    fireEvent.pointerUp(row, { pointerId: 1 });

    expect(translateOf(row)).toBe('');
  });

  it('does not let the press that ends a swipe press the item', () => {
    const onOpen = vi.fn();
    render(<Item onOpen={onOpen} />);

    swipe(-100);
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('closes on a press on the open item instead of pressing it', () => {
    const onOpen = vi.fn();
    render(<Item onOpen={onOpen} />);

    swipe(-100);
    fireEvent.pointerDown(rowOf(), { button: 0, pointerId: 2, clientX: 100, clientY: 20 });
    fireEvent.pointerUp(rowOf(), { pointerId: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));

    expect(onOpen).not.toHaveBeenCalled();
    expect(translateOf(rowOf())).toBe('');
  });

  it('closes on a press anywhere else', () => {
    render(
      <>
        <Item />
        <button type="button">Elsewhere</button>
      </>,
    );

    swipe(-100);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(translateOf(rowOf())).toBe('');
  });

  it('runs an action and closes the tray', () => {
    const onDelete = vi.fn();
    render(<Item onDelete={onDelete} />);

    swipe(-100);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(translateOf(rowOf())).toBe('');
  });

  it('performs the outermost action once a full swipe is carried most of the way across', () => {
    vi.useFakeTimers();
    const onDelete = vi.fn();
    render(<Item fullSwipe onDelete={onDelete} />);

    swipe(-300);
    expect(translateOf(rowOf())).toBe('-400px');

    act(() => vi.runAllTimers());

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(translateOf(rowOf())).toBe('');
  });

  it('opens the tray focus reaches, and Escape closes it and returns to the item', () => {
    const onOpenChange = vi.fn();
    render(<Item onOpenChange={onOpenChange} />);

    act(() => screen.getByRole('button', { name: 'Delete' }).focus());
    expect(onOpenChange).toHaveBeenLastCalledWith('end', expect.objectContaining({ reason: 'focus' }));
    expect(translateOf(rowOf())).toBe('-160px');

    fireEvent.keyDown(screen.getByRole('button', { name: 'Delete' }), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: 'escape' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ada Lovelace' }));
  });

  it('can be opened from outside', () => {
    render(
      <List>
        <SwipeItem open="start" startActions={<SwipeItem.Action>Pin</SwipeItem.Action>}>
          Ada
        </SwipeItem>
      </List>,
    );

    expect(translateOf(rowOf())).toBe('80px');
  });

  it('takes a List.Item’s look: its size, its chevron, its selection', () => {
    render(
      <List>
        <SwipeItem size="sm" chevron selected endActions={<SwipeItem.Action>Delete</SwipeItem.Action>}>
          Ada
        </SwipeItem>
      </List>,
    );

    expect(rowOf().querySelector('[aria-hidden="true"] svg')).not.toBeNull();
    expect(document.querySelector('li')!.className).toContain('bgColor-indigo-500/10');
    expect(rowOf().className).toContain('minHeight-11');
  });
});
