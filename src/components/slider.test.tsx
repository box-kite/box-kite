import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Slider from './slider';

/** The track is the scale, and no test environment computes one — so every pointer test says how wide it is. */
function measureTrack(width = 200, height = 100) {
  const track = document.querySelector('[class] > [class]')!;
  const rect = { left: 100, right: 100 + width, top: 50, bottom: 50 + height, width, height, x: 100, y: 50 } as DOMRect;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect);

  return { rect, track };
}

/** A press at a fraction of the track, in the physical coordinates a rectangle is measured in. */
function pressAt(fraction: number, options: { vertical?: boolean } = {}) {
  const root = screen.getByTestId('slider');
  const point = options.vertical ? { clientX: 0, clientY: 150 - fraction * 100 } : { clientX: 100 + fraction * 200, clientY: 0 };

  fireEvent.pointerDown(root, { button: 0, pointerId: 1, ...point });

  return { root, point };
}

const thumbs = () => screen.getAllByRole('slider');

describe('Slider', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('the value and its shape', () => {
    it('renders one thumb for a number', () => {
      render(<Slider label="Volume" defaultValue={40} props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()).toHaveLength(1);
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '40');
    });

    it('renders one thumb per entry for an array', () => {
      render(<Slider label="Price" defaultValue={[20, 80]} props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()).toHaveLength(2);
      expect(thumbs().map((thumb) => thumb.getAttribute('aria-valuenow'))).toEqual(['20', '80']);
    });

    it('starts at the minimum when it is given no value at all', () => {
      render(<Slider label="Volume" min={10} props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '10');
    });

    it('reports a number back for a number, and an array for an array', () => {
      const single = vi.fn();
      const { unmount } = render(<Slider label="Volume" defaultValue={40} onValueChange={single} props={{ 'data-testid': 'slider' }} />);

      measureTrack();
      pressAt(0.5);
      expect(single).toHaveBeenCalledWith(50, expect.objectContaining({ reason: 'pointer' }));
      unmount();

      const range = vi.fn();
      render(<Slider label="Price" defaultValue={[20, 80]} onValueChange={range} props={{ 'data-testid': 'slider' }} />);
      measureTrack();
      pressAt(0.3);
      expect(range).toHaveBeenCalledWith([30, 80], expect.objectContaining({ reason: 'pointer' }));
    });

    it('follows a controlled value and never moves on its own', () => {
      const onValueChange = vi.fn();
      const { rerender } = render(<Slider label="Volume" value={40} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);

      measureTrack();
      pressAt(0.9);
      expect(onValueChange).toHaveBeenCalledWith(90, expect.anything());
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '40');

      rerender(<Slider label="Volume" value={90} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '90');
    });
  });

  describe('the pointer', () => {
    it('moves the thumb the press was nearest to', () => {
      render(<Slider label="Price" defaultValue={[20, 80]} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.3);
      expect(thumbs().map((thumb) => thumb.getAttribute('aria-valuenow'))).toEqual(['30', '80']);
    });

    it('keeps following the pointer until it is let go, and then commits once', () => {
      const onValueChange = vi.fn();
      const onValueCommit = vi.fn();
      render(
        <Slider
          label="Volume"
          defaultValue={0}
          onValueChange={onValueChange}
          onValueCommit={onValueCommit}
          props={{ 'data-testid': 'slider' }}
        />,
      );
      const { root } = { root: screen.getByTestId('slider') };
      measureTrack();

      pressAt(0.1);
      fireEvent.pointerMove(root, { pointerId: 1, clientX: 100 + 0.4 * 200, clientY: 0 });
      fireEvent.pointerMove(root, { pointerId: 1, clientX: 100 + 0.6 * 200, clientY: 0 });
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '60');
      expect(onValueCommit).not.toHaveBeenCalled();

      fireEvent.pointerUp(root, { pointerId: 1 });
      expect(onValueCommit).toHaveBeenCalledTimes(1);
      expect(onValueCommit).toHaveBeenCalledWith(60, expect.objectContaining({ reason: 'pointer' }));
      expect(onValueChange).toHaveBeenCalledTimes(3);
    });

    it('ignores a move that never started with a press', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={10} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      fireEvent.pointerMove(screen.getByTestId('slider'), { pointerId: 1, clientX: 250, clientY: 0 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('costs no callback when the pointer lands on the value already held', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={50} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.5);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('snaps a press onto the step grid', () => {
      render(<Slider label="Volume" defaultValue={0} step={25} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.6);
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '50');
    });

    it('counts a vertical track upwards from its bottom edge', () => {
      render(<Slider label="Volume" orientation="vertical" defaultValue={0} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.25, { vertical: true });
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '25');
    });

    it('does nothing at all while disabled', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={10} disabled onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.8);
      expect(onValueChange).not.toHaveBeenCalled();
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '10');
    });

    it('leaves a press that is not the primary button alone', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={10} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      fireEvent.pointerDown(screen.getByTestId('slider'), { button: 2, pointerId: 1, clientX: 250, clientY: 0 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('takes hold of the pointer, so a drag that leaves the widget still reports to it', () => {
      render(<Slider label="Volume" defaultValue={10} props={{ 'data-testid': 'slider' }} />);
      const root = screen.getByTestId('slider');
      const setPointerCapture = vi.fn();
      Object.assign(root, { setPointerCapture, releasePointerCapture: vi.fn() });
      measureTrack();

      pressAt(0.5);
      expect(setPointerCapture).toHaveBeenCalledWith(1);
    });

    it('puts focus on the thumb it took hold of, and cancels the press that would take it back', () => {
      render(<Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      // Cancelling the press is the whole of it: the browser moves focus as the press's *default
      // action*, after every handler, so an uncancelled one took it straight back off the thumb
      // (measured in Chrome 152, where the drag then worked and the keyboard did not).
      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(event, { button: 0, pointerId: 1, clientX: 100 + 0.7 * 200, clientY: 0 });
      fireEvent(screen.getByTestId('slider'), event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(thumbs()[1]);
    });
  });

  describe('the markup', () => {
    it('names one thumb by the slider and a range by its group', () => {
      const { unmount } = render(<Slider label="Volume" defaultValue={40} props={{ 'data-testid': 'slider' }} />);
      expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
      unmount();

      render(<Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} props={{ 'data-testid': 'slider' }} />);
      expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Lowest' })).toBeInTheDocument();
      expect(screen.getByRole('slider', { name: 'Highest' })).toBeInTheDocument();
    });

    it('writes the range and the orientation onto every thumb', () => {
      render(<Slider label="Volume" min={10} max={20} orientation="vertical" defaultValue={12} props={{ 'data-testid': 'slider' }} />);

      const thumb = thumbs()[0];
      expect(thumb).toHaveAttribute('aria-valuemin', '10');
      expect(thumb).toHaveAttribute('aria-valuemax', '20');
      expect(thumb).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('writes aria-valuetext only when there is a format to write it from', () => {
      const { unmount } = render(<Slider label="Volume" defaultValue={40} props={{ 'data-testid': 'slider' }} />);
      expect(thumbs()[0]).not.toHaveAttribute('aria-valuetext');
      unmount();

      render(<Slider label="Volume" defaultValue={40} format={(value) => `${value} per cent`} props={{ 'data-testid': 'slider' }} />);
      expect(thumbs()[0]).toHaveAttribute('aria-valuetext', '40 per cent');
    });

    it('is aria-disabled rather than the attribute, and out of the tab order', () => {
      render(<Slider label="Volume" defaultValue={40} disabled props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()[0]).toHaveAttribute('aria-disabled', 'true');
      expect(thumbs()[0]).toHaveAttribute('tabindex', '-1');
      expect(thumbs()[0]).not.toHaveAttribute('disabled');
    });

    it('places the thumb and the fill in an inline style rather than a class', () => {
      const { container } = render(<Slider label="Price" defaultValue={[20, 80]} props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()[0].getAttribute('style')).toBe('inset-inline-start: 20%;');
      expect(thumbs()[1].getAttribute('style')).toBe('inset-inline-start: 80%;');
      const fill = container.querySelector('[style*="inline-size"]')!;
      expect(fill.getAttribute('style')).toBe('inset-inline-start: 20%; inline-size: 60%;');
    });

    it('fills from the start of the track when there is one thumb', () => {
      const { container } = render(<Slider label="Volume" defaultValue={40} props={{ 'data-testid': 'slider' }} />);

      expect(container.querySelector('[style*="inline-size"]')!.getAttribute('style')).toBe('inset-inline-start: 0%; inline-size: 40%;');
    });

    it('places a vertical slider on the block axis, counting from the bottom', () => {
      const { container } = render(<Slider label="Volume" orientation="vertical" defaultValue={40} props={{ 'data-testid': 'slider' }} />);

      expect(thumbs()[0].getAttribute('style')).toBe('inset-block-end: 40%;');
      expect(container.querySelector('[style*="block-size"]')!.getAttribute('style')).toBe('inset-block-end: 0%; block-size: 40%;');
    });

    it('submits one hidden input per thumb, and none without a name', () => {
      const { container, unmount } = render(<Slider label="Price" defaultValue={[20, 80]} props={{ 'data-testid': 'slider' }} />);
      expect(container.querySelectorAll('input')).toHaveLength(0);
      unmount();

      const range = render(<Slider label="Price" name="price" defaultValue={[20, 80]} props={{ 'data-testid': 'slider' }} />);
      const inputs = [...range.container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
      expect(inputs.map((input) => [input.name, input.value])).toEqual([
        ['price', '20'],
        ['price', '80'],
      ]);
    });
  });

  describe('the keyboard', () => {
    function press(key: string, index = 0) {
      fireEvent.keyDown(thumbs()[index], { key });
    }

    it('steps towards each end with both arrow pairs', () => {
      render(<Slider label="Volume" defaultValue={50} props={{ 'data-testid': 'slider' }} />);

      press('ArrowRight');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '51');
      press('ArrowUp');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '52');
      press('ArrowLeft');
      press('ArrowDown');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '50');
    });

    it('steps by the step it was given', () => {
      render(<Slider label="Volume" defaultValue={50} step={5} props={{ 'data-testid': 'slider' }} />);

      press('ArrowRight');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '55');
    });

    it('pages by ten steps unless told otherwise', () => {
      const { unmount } = render(<Slider label="Volume" defaultValue={50} step={2} props={{ 'data-testid': 'slider' }} />);
      press('PageUp');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '70');
      unmount();

      render(<Slider label="Volume" defaultValue={50} largeStep={3} props={{ 'data-testid': 'slider' }} />);
      press('PageDown');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '47');
    });

    it('puts Home and End on the ends themselves, on the grid or off it', () => {
      render(<Slider label="Volume" min={3} max={98} step={5} defaultValue={53} props={{ 'data-testid': 'slider' }} />);

      press('End');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '98');
      press('Home');
      expect(thumbs()[0]).toHaveAttribute('aria-valuenow', '3');
    });

    it('moves the thumb the key arrived on, and holds it at its neighbour', () => {
      render(<Slider label="Price" defaultValue={[20, 21]} thumbLabels={['Lowest', 'Highest']} props={{ 'data-testid': 'slider' }} />);

      press('ArrowRight', 0);
      expect(thumbs().map((thumb) => thumb.getAttribute('aria-valuenow'))).toEqual(['21', '21']);
      press('ArrowRight', 0);
      expect(thumbs().map((thumb) => thumb.getAttribute('aria-valuenow'))).toEqual(['21', '21']);
    });

    it('commits once at the end of a burst rather than once per repeat', () => {
      const onValueCommit = vi.fn();
      render(<Slider label="Volume" defaultValue={50} onValueCommit={onValueCommit} props={{ 'data-testid': 'slider' }} />);

      press('ArrowRight');
      press('ArrowRight');
      expect(onValueCommit).not.toHaveBeenCalled();

      fireEvent.keyUp(thumbs()[0], { key: 'ArrowRight' });
      expect(onValueCommit).toHaveBeenCalledTimes(1);
      expect(onValueCommit).toHaveBeenCalledWith(52, expect.objectContaining({ reason: 'keyboard' }));
    });

    it('commits nothing for a key that moved nothing', () => {
      const onValueCommit = vi.fn();
      render(<Slider label="Volume" defaultValue={50} onValueCommit={onValueCommit} props={{ 'data-testid': 'slider' }} />);

      fireEvent.keyUp(thumbs()[0], { key: 'Tab' });
      expect(onValueCommit).not.toHaveBeenCalled();
    });

    it('leaves every other key to the page', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={50} onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);

      press('Enter');
      press(' ');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does nothing at all while disabled', () => {
      const onValueChange = vi.fn();
      render(<Slider label="Volume" defaultValue={50} disabled onValueChange={onValueChange} props={{ 'data-testid': 'slider' }} />);

      press('ArrowRight');
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('the style tree', () => {
    it('takes Box props on the root, the way every part of every component here does', () => {
      const { container } = render(<Slider label="Volume" defaultValue={40} mt={4} props={{ 'data-testid': 'slider' }} />);

      expect(container.firstElementChild!.className).toContain('mt-4');
    });

    it('carries the vertical variant onto the track, the fill and the thumb', () => {
      const { container } = render(<Slider label="Volume" orientation="vertical" defaultValue={40} props={{ 'data-testid': 'slider' }} />);

      // Every part has to know: a track that turned its axis while the thumb kept the old one is B5's
      // bug #139, and every one of these is a class the browser would have laid out differently.
      const [root, track, fill, thumb] = [...container.querySelectorAll('[class]')].map((element) => element.className);
      expect(root).toContain('d-column');
      expect(track).toContain('height-fit');
      expect(fill).toContain('insetX-0');
      expect(thumb).toContain('mb--2');
    });
  });

  /**
   * A press sends the thumb somewhere and it travels there; a drag holds it under the pointer and it
   * must not. Both parts have to agree, which is bug #144: the fill transitioned while the thumb did
   * not, so it trailed the thumb by up to 59px and kept moving for ~190ms after the drag had stopped.
   */
  describe('what moves and what does not', () => {
    const moving = () => {
      const [, , fill, thumb] = [...screen.getByTestId('slider').parentElement!.querySelectorAll('[class]')];
      // The tracking variant shortens the transition rather than removing it: off is exact and steps.
      const short = (element: Element) => element.className.includes('transitionDuration-80');
      return { fill: !short(fill), thumb: !short(thumb) };
    };

    it('travels at full length for a press on the track, with the fill and the thumb agreeing', () => {
      render(<Slider label="Volume" defaultValue={10} props={{ 'data-testid': 'slider' }} />);
      measureTrack();

      pressAt(0.85);
      expect(moving()).toEqual({ fill: true, thumb: true });
    });

    it('shortens the travel on the first move, and restores it when the pointer is let go', () => {
      render(<Slider label="Volume" defaultValue={10} props={{ 'data-testid': 'slider' }} />);
      const root = screen.getByTestId('slider');
      measureTrack();

      pressAt(0.1);
      fireEvent.pointerMove(root, { pointerId: 1, clientX: 100 + 0.4 * 200, clientY: 0 });
      expect(moving()).toEqual({ fill: false, thumb: false });

      fireEvent.pointerUp(root, { pointerId: 1 });
      expect(moving()).toEqual({ fill: true, thumb: true });
    });

    it('travels at full length for one key press and shortens it for a held one', () => {
      render(<Slider label="Volume" defaultValue={50} props={{ 'data-testid': 'slider' }} />);
      const thumb = thumbs()[0];

      fireEvent.keyDown(thumb, { key: 'ArrowRight' });
      expect(moving()).toEqual({ fill: true, thumb: true });

      // A held arrow repeats every few milliseconds, and a quarter-second animation each would leave
      // the thumb a long way behind the value it is reporting.
      fireEvent.keyDown(thumb, { key: 'ArrowRight', repeat: true });
      expect(moving()).toEqual({ fill: false, thumb: false });

      fireEvent.keyUp(thumb, { key: 'ArrowRight' });
      expect(moving()).toEqual({ fill: true, thumb: true });
    });
  });
});
