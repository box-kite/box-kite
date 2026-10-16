import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import List from './list';
import SortableList, { SortableChangeDetails } from './sortableList';

const NAMES = ['Ada', 'Grace', 'Alan', 'Edsger'];

interface TasksProps {
  onOrderChange?: (order: string[], details: SortableChangeDetails) => void;
  onOrderCommit?: (order: string[], details: SortableChangeDetails) => void;
  /** Leaves the order alone, the way an app refusing a move would. */
  frozen?: boolean;
  disabled?: string;
}

function Tasks({ onOrderChange, onOrderCommit, frozen = false, disabled }: TasksProps) {
  const [order, setOrder] = useState(NAMES);

  return (
    <SortableList
      onOrderChange={(next, details) => {
        onOrderChange?.(next, details);
        if (!frozen) setOrder(next);
      }}
      onOrderCommit={onOrderCommit}
    >
      {order.map((name) => (
        <SortableList.Item key={name} value={name} disabled={name === disabled}>
          <List.Content>
            <List.Title>{name}</List.Title>
          </List.Content>
          <SortableList.Handle />
        </SortableList.Item>
      ))}
    </SortableList>
  );
}

const handleOf = (name: string) => screen.getByRole('button', { name: `Move ${name}` });
const orderOnScreen = () => screen.getAllByRole('listitem').map((item) => item.textContent);
const status = () => screen.getByRole('status').textContent;

/** No test environment lays a list out, so every item is 50px tall with 10px between them. */
function layOut() {
  const list = screen.getByRole('list');
  vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 240, height: 240 } as DOMRect);
  for (const item of screen.getAllByRole('listitem')) {
    vi.spyOn(item, 'getBoundingClientRect').mockImplementation(() => {
      const index = Array.from(list.children).indexOf(item);

      return { top: index * 60, bottom: index * 60 + 50, height: 50 } as DOMRect;
    });
  }
}

describe('SortableList', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('is a list of items, each with a handle named after it', () => {
    render(<Tasks />);

    expect(screen.getByRole('list')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(handleOf('Grace').getAttribute('aria-pressed')).toBe('false');
    expect(handleOf('Grace').getAttribute('aria-describedby')).toBe(screen.getByText(/Press Enter or Space/).id);
  });

  describe('the keyboard', () => {
    it('picks an item up, moves it a step at a time and drops it', () => {
      const onOrderChange = vi.fn();
      const onOrderCommit = vi.fn();
      render(<Tasks onOrderChange={onOrderChange} onOrderCommit={onOrderCommit} />);

      act(() => handleOf('Ada').focus());
      fireEvent.keyDown(handleOf('Ada'), { key: 'Enter' });
      expect(handleOf('Ada').getAttribute('aria-pressed')).toBe('true');
      expect(status()).toBe('Ada picked up at position 1 of 4. Use the arrow keys to move it, Enter to drop it.');

      fireEvent.keyDown(handleOf('Ada'), { key: 'ArrowDown' });
      expect(onOrderChange).toHaveBeenLastCalledWith(
        ['Grace', 'Ada', 'Alan', 'Edsger'],
        expect.objectContaining({ reason: 'keyboard', value: 'Ada', from: 0, to: 1 }),
      );
      expect(status()).toBe('Ada, position 2 of 4.');
      expect(document.activeElement).toBe(handleOf('Ada'));

      fireEvent.keyDown(handleOf('Ada'), { key: 'End' });
      expect(orderOnScreen()).toEqual(['Grace', 'Alan', 'Edsger', 'Ada']);

      fireEvent.keyDown(handleOf('Ada'), { key: 'Enter' });
      expect(onOrderCommit).toHaveBeenCalledWith(['Grace', 'Alan', 'Edsger', 'Ada'], expect.objectContaining({ from: 0, to: 3 }));
      expect(handleOf('Ada').getAttribute('aria-pressed')).toBe('false');
      expect(status()).toBe('Ada dropped at position 4 of 4.');
    });

    it('puts the item back on Escape, with no commit', () => {
      const onOrderCommit = vi.fn();
      render(<Tasks onOrderCommit={onOrderCommit} />);

      act(() => handleOf('Grace').focus());
      fireEvent.keyDown(handleOf('Grace'), { key: ' ' });
      fireEvent.keyDown(handleOf('Grace'), { key: 'ArrowUp' });
      expect(orderOnScreen()).toEqual(['Grace', 'Ada', 'Alan', 'Edsger']);

      fireEvent.keyDown(handleOf('Grace'), { key: 'Escape' });

      expect(orderOnScreen()).toEqual(NAMES);
      expect(onOrderCommit).not.toHaveBeenCalled();
      expect(status()).toBe('Grace put back at position 2 of 4.');
    });

    it('leaves the arrows to the page until an item is held', () => {
      const onOrderChange = vi.fn();
      render(<Tasks onOrderChange={onOrderChange} />);

      fireEvent.keyDown(handleOf('Ada'), { key: 'ArrowDown' });

      expect(onOrderChange).not.toHaveBeenCalled();
    });

    it('cancels the grab when focus leaves the item', () => {
      vi.useFakeTimers();
      render(
        <>
          <Tasks />
          <button type="button">Elsewhere</button>
        </>,
      );

      act(() => handleOf('Ada').focus());
      fireEvent.keyDown(handleOf('Ada'), { key: 'Enter' });
      fireEvent.keyDown(handleOf('Ada'), { key: 'ArrowDown' });
      act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus());
      act(() => vi.runAllTimers());

      expect(orderOnScreen()).toEqual(NAMES);
      vi.useRealTimers();
    });
  });

  describe('the pointer', () => {
    it('lifts the item, steps its neighbours aside and moves it once, on the drop', () => {
      const onOrderChange = vi.fn();
      const onOrderCommit = vi.fn();
      render(<Tasks onOrderChange={onOrderChange} onOrderCommit={onOrderCommit} />);
      layOut();
      const [ada, grace, alan] = screen.getAllByRole('listitem');

      fireEvent.pointerDown(handleOf('Ada'), { button: 0, pointerId: 1, clientX: 10, clientY: 25 });
      fireEvent.pointerMove(handleOf('Ada'), { pointerId: 1, clientX: 10, clientY: 150 });

      expect(ada.style.translate).toBe('0 125px');
      expect(grace.style.translate).toBe('0 -60px');
      expect(alan.style.translate).toBe('0 -60px');
      expect(onOrderChange).not.toHaveBeenCalled();

      fireEvent.pointerUp(handleOf('Ada'), { pointerId: 1, clientX: 10, clientY: 150 });

      expect(onOrderChange).toHaveBeenCalledWith(
        ['Grace', 'Alan', 'Ada', 'Edsger'],
        expect.objectContaining({ reason: 'pointer', from: 0, to: 2 }),
      );
      expect(onOrderCommit).toHaveBeenCalledTimes(1);
      expect(orderOnScreen()).toEqual(['Grace', 'Alan', 'Ada', 'Edsger']);
      expect(screen.getAllByRole('listitem').every((item) => !item.style.translate)).toBe(true);
      expect(status()).toBe('Ada dropped at position 3 of 4.');
    });

    it('treats a press that does not travel as a press, which picks the item up', () => {
      render(<Tasks />);
      layOut();

      fireEvent.pointerDown(handleOf('Alan'), { button: 0, pointerId: 1, clientX: 10, clientY: 140 });
      fireEvent.pointerMove(handleOf('Alan'), { pointerId: 1, clientX: 11, clientY: 141 });
      fireEvent.pointerUp(handleOf('Alan'), { pointerId: 1, clientX: 11, clientY: 141 });

      expect(handleOf('Alan').getAttribute('aria-pressed')).toBe('true');
      expect(screen.getAllByRole('listitem').every((item) => !item.style.translate)).toBe(true);
    });

    it('drops a held item where the next press lands', () => {
      const onOrderCommit = vi.fn();
      render(<Tasks onOrderCommit={onOrderCommit} />);

      fireEvent.pointerDown(handleOf('Edsger'), { button: 0, pointerId: 1 });
      fireEvent.pointerUp(handleOf('Edsger'), { pointerId: 1 });
      fireEvent.click(screen.getByText('Grace'));

      expect(orderOnScreen()).toEqual(['Ada', 'Edsger', 'Grace', 'Alan']);
      expect(onOrderCommit).toHaveBeenCalledWith(['Ada', 'Edsger', 'Grace', 'Alan'], expect.objectContaining({ value: 'Edsger', to: 1 }));
      expect(handleOf('Edsger').getAttribute('aria-pressed')).toBe('false');
    });

    it('puts everything back when the browser takes the pointer away', () => {
      const onOrderChange = vi.fn();
      render(<Tasks onOrderChange={onOrderChange} />);
      layOut();

      fireEvent.pointerDown(handleOf('Ada'), { button: 0, pointerId: 1, clientX: 10, clientY: 25 });
      fireEvent.pointerMove(handleOf('Ada'), { pointerId: 1, clientX: 10, clientY: 125 });
      fireEvent.pointerCancel(handleOf('Ada'), { pointerId: 1 });

      expect(onOrderChange).not.toHaveBeenCalled();
      expect(orderOnScreen()).toEqual(NAMES);
      expect(screen.getAllByRole('listitem').every((item) => !item.style.translate)).toBe(true);
    });
  });

  it('draws whatever order the app renders, so a refused move is not made', () => {
    const onOrderChange = vi.fn();
    render(<Tasks frozen onOrderChange={onOrderChange} />);

    act(() => handleOf('Ada').focus());
    fireEvent.keyDown(handleOf('Ada'), { key: 'Enter' });
    fireEvent.keyDown(handleOf('Ada'), { key: 'ArrowDown' });

    expect(onOrderChange).toHaveBeenCalledTimes(1);
    expect(orderOnScreen()).toEqual(NAMES);
  });

  it('disables the handle of an item that stays where it is', () => {
    render(<Tasks disabled="Alan" />);

    expect((handleOf('Alan') as HTMLButtonElement).disabled).toBe(true);
  });
});
