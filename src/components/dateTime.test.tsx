import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import { format } from '../utils/date/format';
import { configureDates, defaultLocale, systemZone } from '../utils/date/settings';
import DatePicker from './datePicker';
import DateTime, { DateProvider } from './dateTime';
import TimeZoneSelect from './timeZoneSelect';

afterEach(() => cleanup());

const VALUE = '2026-10-19T11:30:00Z';
const mismatch = /hydration failed|did not match|didn't match|expected server html|hydrated but some attributes/i;

describe('DateTime', () => {
  it('writes a value for the reader inside a real <time datetime>', () => {
    render(<DateTime value={VALUE} zone="America/New_York" locale="en-US" format={{ timeStyle: 'short' }} />);

    const time = screen.getByText(/7:30/);
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', VALUE);
  });

  it('writes a date as the day it is, and a relative time', () => {
    render(
      <>
        <DateTime value="2026-10-19" locale="de-DE" format={{ dateStyle: 'long' }} />
        <DateTime value="2026-10-19T11:27:00Z" relative={{ now: VALUE }} locale="en-US" />
      </>,
    );

    expect(screen.getByText('19. Oktober 2026')).toHaveAttribute('datetime', '2026-10-19');
    expect(screen.getByText('3 minutes ago')).toBeInTheDocument();
  });

  it('renders nothing for a non-value', () => {
    const { container } = render(<DateTime value="soon" />);
    expect(container.querySelector('time')).toBeEmptyDOMElement();
  });

  it('takes the reader from a DateProvider', () => {
    render(
      <DateProvider locale="ro-MD" timeZone="Europe/Chisinau">
        <DateTime value={VALUE} format={{ timeStyle: 'short' }} />
      </DateProvider>,
    );

    expect(screen.getByText('14:30')).toBeInTheDocument();
  });
});

describe('hydration', () => {
  ignoreLogs();

  async function hydrate(element: React.ReactElement) {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = renderToString(element);
    const server = container.textContent;
    await act(async () => {
      hydrateRoot(container, element);
    });
    const found = errors.mock.calls.map((args) => args.map(String).join(' ')).filter((message) => mismatch.test(message));
    errors.mockRestore();

    return { container, server, found };
  }

  it('renders the fallback on the server and while hydrating, then the reader zone and language', async () => {
    const { container, server, found } = await hydrate(<DateTime value={VALUE} format={{ dateStyle: 'medium', timeStyle: 'short' }} />);

    expect(found).toEqual([]);
    expect(server).toBe(format(VALUE, { locale: 'en-US', zone: 'utc', dateStyle: 'medium', timeStyle: 'short' }));
    expect(container.textContent).toBe(
      format(VALUE, { locale: defaultLocale(), zone: systemZone(), dateStyle: 'medium', timeStyle: 'short' }),
    );
    container.remove();
  });

  it('is right on the first paint when the server was told the reader', async () => {
    const { container, server, found } = await hydrate(
      <DateProvider locale="ro-MD" timeZone="Europe/Chisinau">
        <DateTime value={VALUE} format={{ timeStyle: 'short' }} />
      </DateProvider>,
    );

    expect(found).toEqual([]);
    expect(server).toBe('14:30');
    expect(container.textContent).toBe('14:30');
    container.remove();
  });

  it('hydrates a picker without a mismatch', async () => {
    const previous = configureDates({ locale: undefined, timeZone: undefined });
    const { container, found } = await hydrate(<DatePicker type="datetime" label="Publish" defaultValue={VALUE} name="at" />);

    expect(found).toEqual([]);
    expect(container.querySelector('input[name="at"]')).toHaveValue(VALUE);
    configureDates(previous);
    container.remove();
  });
});

describe('TimeZoneSelect', () => {
  ignoreLogs();

  it('finds a zone by place or by offset and hands back its IANA name', () => {
    const onValueChange = vi.fn();
    const { container } = render(
      <TimeZoneSelect
        label="Time zone"
        name="zone"
        defaultValue="UTC"
        zones={['UTC', 'Europe/Chisinau', 'America/New_York', 'Asia/Kolkata']}
        onValueChange={onValueChange}
      />,
    );

    const field = screen.getByRole('combobox', { name: 'Time zone' });
    expect(field).toHaveValue('UTC (UTC)');
    fireEvent.change(field, { target: { value: 'chis' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('option'));
    expect(onValueChange).toHaveBeenLastCalledWith('Europe/Chisinau', expect.objectContaining({ reason: 'select' }));
    expect(container.querySelector('input[name="zone"]')).toHaveValue('Europe/Chisinau');

    fireEvent.change(field, { target: { value: '+5:30' } });
    expect(screen.getByRole('option')).toHaveTextContent('Kolkata');
  });
});
