import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import List from './list';
import VirtualList from './virtualList';

const ITEMS = Array.from({ length: 10_000 }, (_, index) => ({ id: `m${index}`, subject: `Message ${index + 1}` }));

function Messages({
  items = ITEMS,
  onRangeChange,
}: {
  items?: typeof ITEMS;
  onRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
}) {
  return (
    <VirtualList items={items} itemKey={(item) => item.id} onRangeChange={onRangeChange} overscan={2}>
      {(item) => (
        <List.Item>
          <List.Content>
            <List.Title>
              <List.Action>{item.subject}</List.Action>
            </List.Title>
          </List.Content>
        </List.Item>
      )}
    </VirtualList>
  );
}

const subjects = () => screen.getAllByRole('listitem').map((item) => item.textContent);

/** Where the list's own top edge sits in the viewport — the page scrolled `by` px into it. */
function scrollPage(by: number) {
  vi.spyOn(screen.getByRole('list'), 'getBoundingClientRect').mockReturnValue({ top: -by, bottom: 0, height: 0 } as DOMRect);
  fireEvent.scroll(window);
}

/** The next animation frame, which is when a scroll is read. */
async function frame() {
  await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

describe('VirtualList', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the items on screen and makes the rest space', () => {
    render(<Messages />);

    // jsdom's window is 768px tall and an item counts as 57px: fourteen on screen, two more below.
    expect(subjects()).toHaveLength(16);
    expect(subjects()[0]).toBe('Message 1');

    const list = screen.getByRole('list');
    expect(list.style.paddingBlockStart).toBe('0px');
    expect(list.style.paddingBlockEnd).toBe(`${(10_000 - 16) * 57}px`);
  });

  it('says where each item is in the whole list', () => {
    render(<Messages />);

    const [first, second] = screen.getAllByRole('listitem');
    expect(first.getAttribute('aria-setsize')).toBe('10000');
    expect(first.getAttribute('aria-posinset')).toBe('1');
    expect(second.getAttribute('aria-posinset')).toBe('2');
  });

  it('moves the window as the page scrolls', async () => {
    const onRangeChange = vi.fn();
    render(<Messages onRangeChange={onRangeChange} />);

    scrollPage(57 * 5000);
    await frame();

    expect(subjects()[0]).toBe('Message 4999');
    expect(screen.getAllByRole('listitem')[0].getAttribute('aria-posinset')).toBe('4999');
    expect(screen.getByRole('list').style.paddingBlockStart).toBe(`${4998 * 57}px`);
    expect(onRangeChange).toHaveBeenLastCalledWith({ startIndex: 4998, endIndex: 5016 });
  });

  it('keeps a measured height by key, and moves what is below it', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const height = this.tagName === 'LI' ? (this.textContent === 'Message 1' ? 120 : 57) : 0;

      return { top: 0, bottom: height, height } as DOMRect;
    });
    render(<Messages />);

    expect(screen.getByRole('list').style.paddingBlockEnd).toBe(`${(10_000 - 15) * 57}px`);
  });

  it('keeps the item focus is in while the list scrolls away from it', async () => {
    render(<Messages />);

    act(() => screen.getByRole('button', { name: 'Message 3' }).focus());
    scrollPage(57 * 30);
    await frame();

    expect(subjects()[0]).toBe('Message 3');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Message 3' }));
  });

  it('pulls the window back inside a list that got shorter', async () => {
    const { rerender } = render(<Messages />);
    scrollPage(57 * 5000);
    await frame();

    rerender(<Messages items={ITEMS.slice(0, 3)} />);

    expect(subjects()).toEqual(['Message 1', 'Message 2', 'Message 3']);
  });

  it('reads a scroller of its own when it is given one', async () => {
    function Boxed() {
      const scroller = useRef<HTMLDivElement>(null);

      return (
        <div ref={scroller} data-testid="scroller">
          <VirtualList items={ITEMS} itemKey={(item) => item.id} scrollerRef={scroller} overscan={0}>
            {(item) => <List.Item>{item.subject}</List.Item>}
          </VirtualList>
        </div>
      );
    }
    render(<Boxed />);
    const scroller = screen.getByTestId('scroller');
    vi.spyOn(scroller, 'clientHeight', 'get').mockReturnValue(114);
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(screen.getByRole('list'), 'getBoundingClientRect').mockReturnValue({ top: -570 } as DOMRect);

    fireEvent.scroll(scroller);
    await frame();

    expect(subjects()).toEqual(['Message 11', 'Message 12']);
  });

  it('renders its first items on a server', () => {
    const html = renderToString(<Messages />);

    expect(html.match(/<li/g)).toHaveLength(20);
    expect(html).toContain('Message 20');
    expect(html).not.toContain('Message 21<');
  });
});
