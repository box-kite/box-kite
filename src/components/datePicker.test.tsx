import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import Box from '../box';
import { configureDates, DateSettings } from '../utils/date/settings';
import DatePicker, { DateRangePicker } from './datePicker';

let previous: DateSettings;
beforeEach(() => {
  previous = configureDates({ locale: 'en-US', timeZone: 'Europe/Berlin' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  configureDates({ locale: previous.locale, timeZone: previous.timeZone });
});

const day = (date: string) => document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
const segments = () => screen.getAllByRole('spinbutton');

describe('DatePicker', () => {
  ignoreLogs();

  it('opens a calendar from the button, chooses a day and closes', () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    render(<DatePicker label="Check-in" onValueChange={onValueChange} onOpenChange={onOpenChange} />);

    const button = screen.getByRole('button', { name: 'Choose date' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Check-in' })).toBeInTheDocument();

    fireEvent.click(day('2026-10-23'));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23', expect.objectContaining({ reason: 'select', local: '2026-10-23' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'select' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(segments().map((segment) => segment.textContent)).toEqual(['10', '23', '2026']);
    // Back on the button, rather than on the page: the day that had focus unmounted with the panel.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose date, Oct 23, 2026' }));
  });

  it('tells Box.onInteraction about a choice once, as the picker — the calendar inside it stays quiet', async () => {
    const heard: string[] = [];
    const stop = Box.onInteraction(({ component, type, reason }) => heard.push(`${component}.${type}:${reason}`));
    await vi.dynamicImportSettled();
    render(<DatePicker label="Check-in" />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    fireEvent.click(day('2026-10-23'));
    Box.flushInteractions();
    stop();

    expect(heard).toEqual(['datePicker.openChange:trigger', 'datePicker.valueChange:select', 'datePicker.openChange:select']);
  });

  it('keeps the field typed into and the calendar in step', () => {
    render(<DatePicker label="Check-in" defaultValue="2026-10-19" />);

    fireEvent.keyDown(segments()[1], { key: 'ArrowUp' });
    fireEvent.click(screen.getByRole('button', { name: /^Choose date/ }));
    expect(day('2026-10-20').closest('td')).toHaveAttribute('aria-selected', 'true');
  });

  it('moves on segment by segment as a date is typed, and takes a ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    const onValueChange = vi.fn();
    render(<DatePicker ref={ref} label="Check-in" onValueChange={onValueChange} />);

    act(() => segments()[0].focus());
    for (const key of '10232026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23', expect.objectContaining({ reason: 'keyboard' }));
    expect(ref.current).toHaveAttribute('role', 'group');
  });

  it('picks a time from a list of slots', () => {
    const onValueChange = vi.fn();
    render(<DatePicker type="time" label="Pickup" step={15} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(96);
    fireEvent.click(screen.getByRole('option', { name: /^2:45[^0-9]PM/ }));
    expect(onValueChange).toHaveBeenLastCalledWith('14:45:00', expect.objectContaining({ reason: 'select' }));
  });

  describe('a list of times within min and max', () => {
    const times = () => screen.getAllByRole('option').map((option) => option.textContent?.replace(/\s/g, ' '));

    it('offers only the times in range, both ends included', () => {
      render(<DatePicker type="time" label="Delivery" min="18:30" max="19:30" step={15} />);

      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(times()).toEqual(['6:30 PM', '6:45 PM', '7:00 PM', '7:15 PM', '7:30 PM']);
    });

    it('starts at the first slot after a min that is off the grid, rather than snapping it down', () => {
      render(<DatePicker type="time" label="Delivery" min="18:20" step={15} />);

      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(times()[0]).toBe('6:30 PM');
      expect(times().at(-1)).toBe('11:45 PM');
    });

    it('bounds a date-time only on the day of min and the day of max', () => {
      render(<DatePicker type="datetime" zone="utc" label="Publish" min="2026-10-19T18:30:00Z" max="2026-10-21T02:00:00Z" />);

      // No day chosen yet is today, which is the day of min.
      fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
      expect(times()[0]).toBe('6:30 PM');
      expect(times()).toHaveLength(11);

      fireEvent.click(day('2026-10-20'));
      expect(times()).toHaveLength(48);

      fireEvent.click(day('2026-10-21'));
      expect(times()).toEqual(['12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM']);
    });

    it('says so, rather than rendering an empty listbox, when no time is in range', () => {
      render(<DatePicker type="time" label="Delivery" min="18:31" max="18:44" step={15} emptyTimesLabel="Kitchen closed" />);

      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Kitchen closed');
    });

    it('rules the list off from a calendar, and not on a panel of times alone', () => {
      const { unmount } = render(<DatePicker type="time" label="Delivery" />);
      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(screen.getByRole('listbox').className).not.toMatch(/\bbs-1\b/);
      unmount();

      render(<DatePicker type="datetime" label="Publish" />);
      fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
      expect(screen.getByRole('listbox').className).toMatch(/\bbs-1\b/);
    });
  });

  describe('a panel as wide as the field', () => {
    beforeEach(() => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const width = this.matches('[role="group"], [role="group"] *') ? 320 : 100;
        return { top: 0, left: 0, right: width, bottom: 40, width, height: 40, x: 0, y: 0 } as DOMRect;
      });
    });
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    /** The support check is asked once per mount, so a test can answer for the browser. */
    const withAnchorSupport = (supported: boolean) =>
      vi.stubGlobal('CSS', { supports: (value: string) => supported && value.startsWith('anchor-name') });
    /** The Overlay fallback places the wrapper around the dialog; the top layer places the dialog itself. */
    const overlayLayer = () => screen.getByRole('dialog').parentElement!;
    const topLayer = () => screen.getByRole('dialog', { hidden: true });

    it('matches the field on the Overlay fallback for a time, and not for a date', () => {
      withAnchorSupport(true);
      const first = render(<DatePicker type="time" label="Delivery" />);
      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(overlayLayer().className).toMatch(/minWidth-anchor-size\(width\)/);
      first.unmount();

      withAnchorSupport(false);
      const second = render(<DatePicker type="time" label="Delivery" />);
      fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
      expect(overlayLayer().style.minWidth).toBe('320px');
      second.unmount();

      render(<DatePicker label="Check-in" />);
      fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
      expect(overlayLayer().style.minWidth).toBe('');
      expect(overlayLayer().className).not.toMatch(/minWidth/);
    });

    it('matches the field on the top layer, in CSS or measured', () => {
      const uninstall = installPopoverApi();
      try {
        withAnchorSupport(true);
        const { unmount } = render(<DatePicker type="time" label="Delivery" />);
        expect(topLayer().className).toMatch(/minWidth-anchor-size\(width\)/);
        unmount();

        withAnchorSupport(false);
        render(<DatePicker type="time" label="Delivery" />);
        act(() => topLayer().showPopover());
        expect(topLayer().style.minWidth).toBe('320px');
      } finally {
        uninstall();
      }
    });

    it('takes matchWidth either way round', () => {
      const uninstall = installPopoverApi();
      withAnchorSupport(true);
      try {
        const { unmount } = render(<DatePicker type="time" label="Delivery" matchWidth={false} />);
        expect(screen.getByRole('dialog', { hidden: true }).className).not.toMatch(/minWidth/);
        unmount();

        render(<DateRangePicker label="Stay" matchWidth />);
        expect(screen.getByRole('dialog', { hidden: true }).className).toMatch(/minWidth-anchor-size/);
      } finally {
        uninstall();
      }
    });
  });

  describe('pickOnly', () => {
    const valueButton = () => screen.getByRole('button', { name: /^Delivery/ });

    it('is one button named by the label and the value, which opens the list and gets focus back', () => {
      const onValueChange = vi.fn();
      render(<DatePicker type="time" label="Delivery" pickOnly min="18:30" max="19:30" step={15} onValueChange={onValueChange} />);

      expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
      expect(valueButton()).toHaveAccessibleName('Delivery Choose time');
      expect(valueButton()).toHaveAttribute('aria-haspopup', 'dialog');

      fireEvent.click(valueButton());
      fireEvent.click(screen.getByRole('option', { name: /^6:45/ }));
      expect(onValueChange).toHaveBeenLastCalledWith('18:45:00', expect.objectContaining({ reason: 'select' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(valueButton()).toHaveAccessibleName(/^Delivery 6:45[^0-9]PM$/);
      expect(document.activeElement).toBe(valueButton());
    });

    it('posts the value, stops an empty required form, and puts the default back on a reset', () => {
      const { container } = render(
        <form>
          <DatePicker type="time" label="Delivery" pickOnly name="at" required defaultValue="18:30:00" />
        </form>,
      );
      const input = container.querySelector<HTMLInputElement>('input[name="at"]')!;
      expect(input).toBeRequired();
      expect(input.value).toBe('18:30:00');

      fireEvent.click(valueButton());
      fireEvent.click(screen.getByRole('option', { name: /^7:00[^0-9]PM/ }));
      expect(input.value).toBe('19:00:00');

      act(() => container.querySelector('form')!.reset());
      expect(input.value).toBe('18:30:00');
      expect(valueButton()).toHaveAccessibleName(/^Delivery 6:30[^0-9]PM$/);
    });

    it('keeps the clear button beside the value button, not inside it', () => {
      const onValueChange = vi.fn();
      render(<DatePicker type="time" label="Delivery" pickOnly clearable defaultValue="18:30:00" onValueChange={onValueChange} />);

      const clear = screen.getByRole('button', { name: 'Clear' });
      expect(valueButton().contains(clear)).toBe(false);
      fireEvent.click(clear);
      expect(onValueChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: 'clear' }));
      expect(valueButton()).toHaveAccessibleName('Delivery Choose time');
    });

    it('stays focusable but opens nothing when read-only, and is disabled when disabled', () => {
      const { unmount } = render(<DatePicker type="time" label="Delivery" pickOnly readOnly defaultValue="18:30:00" />);
      expect(valueButton()).not.toBeDisabled();
      expect(valueButton()).not.toHaveAttribute('aria-haspopup');
      fireEvent.click(valueButton());
      expect(screen.queryByRole('dialog')).toBeNull();
      unmount();

      render(<DatePicker type="time" label="Delivery" pickOnly disabled />);
      expect(valueButton()).toBeDisabled();
    });

    it('marks a value outside min and max invalid, as the typed field does', () => {
      render(<DatePicker type="time" label="Delivery" pickOnly min="18:30" max="19:30" defaultValue="20:00:00" />);
      expect(valueButton()).toHaveAttribute('aria-invalid', 'true');
    });

    it('names its zone after the time when it is not the reader’s', () => {
      render(<DatePicker type="datetime" zone="utc" label="Delivery" pickOnly defaultValue="2026-10-23T09:30:00Z" />);
      expect(valueButton()).toHaveAccessibleName(/^Delivery Oct 23, 2026, 9:30[^0-9]AM UTC$/);
    });
  });

  it('builds a date-time from a day and a time, on its zone', () => {
    const onValueChange = vi.fn();
    render(<DatePicker type="datetime" zone="utc" label="Publish" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    fireEvent.click(day('2026-10-23'));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23T00:00:00Z', expect.anything());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /^9:30[^0-9]AM/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(
      '2026-10-23T09:30:00Z',
      expect.objectContaining({ utc: '2026-10-23T09:30:00Z', local: '2026-10-23T11:30:00' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers presets and a clear button', () => {
    const onValueChange = vi.fn();
    render(<DatePicker label="Due" clearable presets={[{ label: 'Christmas', value: '2026-12-25' }]} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Christmas' }));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-12-25', expect.objectContaining({ reason: 'preset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: 'clear' }));
  });

  it('is the platform popover where there is one, focusing the chosen day when it opens', () => {
    const uninstall = installPopoverApi();
    try {
      render(<DatePicker label="Check-in" defaultValue="2026-10-21" />);
      const panel = screen.getByRole('dialog', { hidden: true });
      expect(panel).toHaveAttribute('popover', 'auto');
      act(() => panel.showPopover());
      expect(document.activeElement).toBe(day('2026-10-21'));
    } finally {
      uninstall();
    }
  });
});

describe('DateRangePicker', () => {
  ignoreLogs();

  it('types both ends and reports the range once it is whole and in order', () => {
    const onValueChange = vi.fn();
    const { container } = render(<DateRangePicker label="Stay" startName="from" endName="to" onValueChange={onValueChange} />);

    expect(screen.getByRole('group', { name: 'Start date' })).toBeInTheDocument();
    act(() => segments()[0].focus());
    for (const key of '10192026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => segments()[3].focus());
    for (const key of '10232026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-19', end: '2026-10-23' },
      expect.objectContaining({ reason: 'keyboard' }),
    );
    expect(container.querySelector('input[name="from"]')).toHaveValue('2026-10-19');
    expect(container.querySelector('input[name="to"]')).toHaveValue('2026-10-23');
  });

  it('picks a range on two months and closes', () => {
    const onValueChange = vi.fn();
    render(<DateRangePicker label="Stay" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose dates' }));
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    fireEvent.click(day('2026-11-02'));
    fireEvent.click(day('2026-10-28'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-28', end: '2026-11-02' },
      expect.objectContaining({ reason: 'select' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(segments().map((segment) => segment.textContent)).toEqual(['10', '28', '2026', '11', '02', '2026']);
  });

  it('marks an end before its start invalid', () => {
    render(<DateRangePicker label="Stay" defaultValue={{ start: '2026-10-19', end: '2026-10-23' }} />);

    fireEvent.keyDown(segments()[4], { key: 'Home' });
    expect(screen.getByRole('group', { name: 'Stay' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('is one button when pickOnly, posting both ends', () => {
    const onValueChange = vi.fn();
    const { container } = render(<DateRangePicker label="Stay" pickOnly startName="from" endName="to" onValueChange={onValueChange} />);

    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0);
    const button = screen.getByRole('button', { name: 'Stay Choose dates' });
    fireEvent.click(button);
    fireEvent.click(day('2026-10-28'));
    fireEvent.click(day('2026-11-02'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-28', end: '2026-11-02' },
      expect.objectContaining({ reason: 'select' }),
    );
    expect(button).toHaveAccessibleName(/^Stay Oct 28\D+Nov 2, 2026$/);
    expect(container.querySelector('input[name="from"]')).toHaveValue('2026-10-28');
    expect(container.querySelector('input[name="to"]')).toHaveValue('2026-11-02');
  });
});
