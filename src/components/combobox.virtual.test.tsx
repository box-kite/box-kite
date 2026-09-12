import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import VirtualUtils from '../utils/virtual/virtualUtils';
import Combobox from './combobox';

interface Person {
  id: number;
  name: string;
}

const people: Person[] = Array.from({ length: 10_000 }, (_, index) => ({ id: index + 1, name: `Person ${index + 1}` }));
const few: Person[] = people.slice(0, 3);
const def = { label: 'name', key: 'id' } as const;

/** What a window measures where nothing computes layout: the model's own fallbacks, seven visible + overscan. */
const SPAN = Math.ceil(VirtualUtils.DEFAULT_VIEW_HEIGHT / VirtualUtils.DEFAULT_ITEM_HEIGHT) + VirtualUtils.DEFAULT_OVERSCAN * 2;

/**
 * The windowed listbox: how much of a long list reaches the DOM, and the two things that have to stay
 * true of a row a screen reader is pointed at while nine thousand of its neighbours are not rendered.
 */
describe('Combobox virtualization', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const field = () => screen.getByRole('combobox') as HTMLInputElement;
  const options = () => screen.queryAllByRole('option');
  const activeOption = () => document.getElementById(field().getAttribute('aria-activedescendant') ?? '');

  it('renders a window of a long list rather than all of it', () => {
    render(<Combobox data={people} def={def} label="Assignee" />);
    fireEvent.click(field());

    expect(options()).toHaveLength(SPAN);
    expect(options()[0].textContent).toBe('Person 1');
  });

  it('leaves a short list alone, wrapper and all', () => {
    const { container } = render(<Combobox data={few} def={def} label="Assignee" />);
    fireEvent.click(field());

    expect(options()).toHaveLength(3);
    expect(options()[0].getAttribute('aria-setsize')).toBeNull();
    expect(container.ownerDocument.querySelector('[class*="combobox-window"]')).toBeNull();
  });

  it("takes the caller's word for it either way", () => {
    const { rerender } = render(<Combobox data={people} def={def} label="Assignee" virtualize={false} />);
    fireEvent.click(field());
    expect(options()).toHaveLength(10_000);

    rerender(<Combobox data={few} def={def} label="Assignee" virtualize open />);
    expect(options()).toHaveLength(3);
    expect(options()[0].getAttribute('aria-setsize')).toBe('3');
  });

  it('windows earlier when the threshold says so', () => {
    render(<Combobox data={people.slice(0, 50)} def={def} label="Assignee" virtualize={{ threshold: 20 }} />);
    fireEvent.click(field());

    expect(options()).toHaveLength(SPAN);
  });

  // A rendered slice is the whole count as far as a screen reader can see, and these two are what put
  // the other nine thousand back.
  it('reports the size of the whole list and each row’s place in it', () => {
    render(<Combobox data={people} def={def} label="Assignee" />);
    fireEvent.click(field());

    expect(options()[0].getAttribute('aria-setsize')).toBe('10000');
    expect(options()[0].getAttribute('aria-posinset')).toBe('1');
    expect(options()[SPAN - 1].getAttribute('aria-posinset')).toBe(String(SPAN));
  });

  it('filters against the whole list, not the window', () => {
    render(<Combobox data={people} def={def} label="Assignee" />);
    fireEvent.change(field(), { target: { value: 'Person 9999' } });

    expect(options()).toHaveLength(1);
    expect(options()[0].textContent).toBe('Person 9999');
  });

  describe('the row the keyboard is on', () => {
    // The trap: `aria-activedescendant` naming a row that was not rendered names nothing at all.
    it('is rendered even when it is nine thousand rows below the scroll', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      fireEvent.keyDown(field(), { key: 'ArrowUp' });

      expect(activeOption()).not.toBeNull();
      expect(activeOption()!.textContent).toBe('Person 10000');
      expect(activeOption()!.getAttribute('aria-posinset')).toBe('10000');
      expect(options()).toHaveLength(SPAN);
    });

    it('stays rendered as the arrows walk it out of the first window', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      fireEvent.keyDown(field(), { key: 'ArrowDown' });

      for (let step = 0; step < SPAN + 5; step += 1) fireEvent.keyDown(field(), { key: 'ArrowDown' });

      expect(activeOption()).not.toBeNull();
      expect(activeOption()!.getAttribute('aria-posinset')).toBe(String(SPAN + 6));
      expect(options()).toHaveLength(SPAN);
    });

    it('wraps to the last row and renders that one too', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      fireEvent.keyDown(field(), { key: 'ArrowDown' });
      fireEvent.keyDown(field(), { key: 'ArrowUp' });

      expect(activeOption()!.textContent).toBe('Person 10000');
    });

    it('selects the row the slice says it is, not the one at that offset in the window', () => {
      let chosen: Person | null = null;
      render(<Combobox data={people} def={def} label="Assignee" onValueChange={(person) => (chosen = person)} />);
      fireEvent.keyDown(field(), { key: 'ArrowUp' });
      fireEvent.click(activeOption()!);

      expect(chosen).toEqual({ id: 10_000, name: 'Person 10000' });
    });
  });

  // The highlight must not pin the window, or a wheel scroll away from the active row freezes the list.
  it('moves the window with the scroll, highlight or no highlight', () => {
    render(<Combobox data={people} def={def} label="Assignee" />);
    fireEvent.click(field());

    const listbox = screen.getByRole('listbox');
    listbox.scrollTop = 100 * VirtualUtils.DEFAULT_ITEM_HEIGHT;
    fireEvent.scroll(listbox);

    expect(options()[0].getAttribute('aria-posinset')).toBe(String(100 - VirtualUtils.DEFAULT_OVERSCAN + 1));
    expect(options()).toHaveLength(SPAN);

    // And a highlight that moves *after* the scroll still drags the window back to itself.
    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    expect(activeOption()).not.toBeNull();
    expect(activeOption()!.getAttribute('aria-posinset')).toBe('2');
  });
});
