# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

- **[Dates, times and time zones, with no dependency](#dates-times-and-time-zones-with-no-dependency)** — an ISO string per kind, conversions that say what they mean, every locale and zone from `Intl`.
- **[A date field that types in the reader's own order](#a-date-field-that-types-in-the-readers-own-order)** — date, time or both, UTC or local, with the UTC reading beside the value.
- **[A calendar, a date picker and a range picker](#a-calendar-a-date-picker-and-a-range-picker)** — APG's grid keys, the top layer, presets, and a time zone select.
- **[A date in a DataGrid](#a-date-in-a-datagrid)** — date editors, a date filter and a column that writes dates in the reader's words.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Dates, times and time zones, with no dependency

`@box-kite/react/date` is a date layer with no React, no engine and no dependency, about 7.6 KB gzipped. Every value is an ISO string, and its shape is its kind: `2026-10-19` is a date (no time and no zone, so the same day everywhere), `14:30:00` a time, `2026-10-19T14:30:00` a wall clock with no zone, and anything with an offset (`…+03:00` or `…Z`) one moment. A `Date` is never the value. It is always a moment in the runtime's zone, which is how a birthday saved in one country comes back as the day before in another.

```ts
import { toUtc, toLocal, toPlainDate, format, parse, add } from '@box-kite/react/date';

toUtc('2026-10-19T14:30', { from: 'Europe/Chisinau' }); // '2026-10-19T11:30:00Z'
toLocal('2026-10-19T11:30:00Z'); // the reader's wall clock, with its offset
toPlainDate('2026-10-19T23:30:00Z', { zone: 'Asia/Tokyo' }); // '2026-10-20'
format('2026-10-19', { locale: 'ro-MD', dateStyle: 'long' }); // '19 octombrie 2026'
parse('03/04/2026', { locale: 'en-GB' }); // '2026-04-03'
add('2026-03-28T12:00:00+01:00', { days: 1 }, { zone: 'Europe/Berlin' }); // noon again, '…+02:00'
```

Every conversion names its target, `format` takes `Intl` options rather than format tokens, and `parse` reads ISO, a `Date`, an HTTP date or text in the locale's own order. Zones and locales come from `Intl`, so there is no zone database to ship and Romanian costs what English does. A wall-clock time that a daylight-saving change skips or repeats is resolved the way Temporal resolves it, with `disambiguation: 'compatible' | 'earlier' | 'later' | 'reject'`.

`'local'` means the reader. In a browser that is the browser's zone; on a server it is `configureDates({ timeZone })` or a `<DateProvider timeZone>`, and `systemZone()` is always the server's own. The browser can write its zone into a cookie with `zoneCookie()`, and the server can read it back with `readZoneCookie()`. `<DateTime value>` writes a value for whoever is reading, inside a real `<time datetime>`, and none of the date components can cause a hydration error. See [Dates and times](https://www.box-kite.dev/dates/).

## A date field that types in the reader's own order

`<DateField>` edits a date, a time or both, one segment at a time, in the order and with the separators the reader's locale uses: `19.10.2026` in Moldova, `10/19/2026` in the US. Nothing typed is ever parsed. `03/04/2026` is two different days depending on who typed it, so each part is a spin button: digits move on by themselves, the arrows step and wrap like a clock, and a paste is read in the reader's order. The value is the ISO string, and `onValueChange` hands over its readings beside it.

```tsx
<DateField label="Due" name="due" />
<DateField type="time" label="Opens at" />
<DateField type="datetime" zone="utc" label="Runs at" onValueChange={(value, { utc, local }) => save(utc)} />
```

`zone` decides whose wall clock a date-time is typed on: `'local'` (the default), `'utc'`, any IANA zone, or `'none'` for a wall clock that belongs to nobody. A zone that is not the reader's own is named after the time. `name` posts the canonical string, and `required` stops the form with the browser's own message. It adds 9 KB gzipped on top of Box, the date layer included. See [DateField](https://www.box-kite.dev/date-field/).

## A calendar, a date picker and a range picker

`<Calendar>` is a month on APG's grid keys: the arrows move a day or a week, Page Up and Page Down a month (a year with Shift), and pressing the title zooms out to the months and the years. The week starts where the reader's week starts, every name comes from the locale, and `mode="range"` picks a start and an end. `<DatePicker>` is a `DateField` with a calendar, a list of times, or both behind a button inside it. The panel is in the platform's top layer with no portal, focus lands on the chosen day when it opens, and `presets` puts shortcuts beside the calendar. `<DateRangePicker>` is two fields over a range calendar on two months, and `<TimeZoneSelect>` finds a zone by place, region or offset.

```tsx
<DatePicker label="Check-in" name="checkIn" min={today()} clearable />
<DatePicker type="datetime" zone="utc" label="Publish at" step={15} />
<DateRangePicker label="Stay" startName="from" endName="to" />
<TimeZoneSelect label="Time zone" value={zone} onValueChange={setZone} />
```

`Calendar` adds 8.4 KB gzipped on top of Box, `DatePicker` 21 KB (with the field, the calendar and the layer), and `TimeZoneSelect` 11.5 KB with its combobox. See [Calendar](https://www.box-kite.dev/calendar/) and [DatePicker](https://www.box-kite.dev/date-picker/).

## A date in a DataGrid

A column holding dates can now be edited with a `DateField`. `editor: 'date' | 'time' | 'datetime'` names one, and an ISO string or a `Date` in the column picks one without being told. `dateFormat: 'date' | 'time' | 'datetime' | 'relative'`, or `Intl` options, writes the values in the reader's language and zone. `filterable: { type: 'date' }` filters by a day, before or after one, or between two, on the reader's calendar. A pasted date is read the way the field reads a paste.

```tsx
columns: [
  { key: 'due', header: 'Due', editable: true, dateFormat: 'date', filterable: { type: 'date' } },
  { key: 'placedAt', header: 'Placed', dateFormat: 'datetime' },
],
```

These parts are a chunk of 7 KB gzipped, fetched the first time a grid shows a date, so a grid without one carries 1 KB more than before. See [Dates and times](https://www.box-kite.dev/dates/).

## Breaking changes

None.

## Fixes

- **A DataGrid cell holding a `Date` threw.** React cannot render an object, so the grid failed on the first `Date` it was given. A `Date` is now written as a date-time in the reader's words.
