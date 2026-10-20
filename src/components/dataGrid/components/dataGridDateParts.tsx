import { useState } from 'react';
import Box from '../../../box';
import { QuietInteractions } from '../../../react/a11y/interactions';
import { useDateEnvironment } from '../../../react/date/dateEnvironment';
import { normalize, toDate, toUtc } from '../../../utils/date/dateTime';
import { format, FormatOptions, formatRange, formatRelative } from '../../../utils/date/format';
import { parse } from '../../../utils/date/parse';
import DateField from '../../dateField';
import DatePicker, { DateChangeHandler } from '../../datePicker';
import Dropdown from '../../dropdown';
import Flex from '../../flex';
import { CellEditorConfig, ColumnDateFormat, DateFilterValue } from '../contracts/dataGridContract';
import CellModel from '../models/cellModel';
import ColumnModel from '../models/columnModel';
import DataGridListLayout from './dataGridListLayout';

const PRESETS: Record<'date' | 'time' | 'datetime', FormatOptions> = {
  date: { dateStyle: 'medium' },
  time: { timeStyle: 'short' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
};

type DateInput = string | number | Date | null;

function inputOf(value: unknown): DateInput {
  return value instanceof Date || typeof value === 'string' || typeof value === 'number' ? value : null;
}

/** A cell's date in the reader's language and zone — the hook `<DateTime>` reads, so a server render hydrates. */
function DateValue(props: { value: unknown; format: ColumnDateFormat }) {
  const { value, format: dateFormat } = props;
  const { locale, zone } = useDateEnvironment();
  if (dateFormat === 'relative') return <>{formatRelative(inputOf(value), { locale, zone })}</>;

  const options = typeof dateFormat === 'string' ? PRESETS[dateFormat] : dateFormat;

  return <>{format(inputOf(value), { ...options, locale, zone: options.zone ?? zone })}</>;
}

interface EditorProps<TRow> {
  cell: CellModel<TRow>;
  label: string;
  errorId?: string;
  onBlur: () => void;
}

/** An edited date-time in the shape the cell held it: a `Date` stays a `Date` and a `…Z` string stays UTC, so edits never mix shapes. */
function shapedAs(held: unknown, next: string | null): unknown {
  if (next === null) return null;
  if (held instanceof Date) return toDate(next);

  return typeof held === 'string' && /z$/i.test(held) ? toUtc(next) : next;
}

/** The `date`/`time`/`datetime` editor: a compact `DateField` bound to the cell's draft. */
function DateEditor<TRow>(props: EditorProps<TRow>) {
  const { cell, label, errorId, onBlur } = props;
  const { type, zone, min, max } = cell.editor;
  const draft = cell.draft instanceof Date || typeof cell.draft === 'string' ? normalize(cell.draft) : null;

  return (
    <QuietInteractions>
      <DateField
        type={type as 'date' | 'time' | 'datetime'}
        value={draft}
        zone={zone}
        min={typeof min === 'string' ? min : undefined}
        max={typeof max === 'string' ? max : undefined}
        onValueChange={(value) => cell.setDraft(type === 'datetime' ? shapedAs(cell.value, value) : value)}
        width="fit"
        variant="compact"
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        invalid={errorId ? true : undefined}
        describedBy={errorId}
        // The editor may have opened before these parts arrived, when the cell's own focus call found nothing.
        autoFocus
        props={{
          'aria-label': label,
          // Moving between segments is focus moving inside the field: only leaving it commits.
          onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur();
          },
        }}
      />
    </QuietInteractions>
  );
}

/** What the filter's fields hold while the other end is still being typed. */
function useDateFilterState<TRow>(column: ColumnModel<TRow>) {
  const held = column.currentFilter?.type === 'date' ? column.currentFilter : undefined;
  const [operator, setOperator] = useState<DateFilterValue['operator']>(held?.operator ?? 'on');
  const [valueTo, setValueTo] = useState<string | null>(held?.valueTo ?? null);
  const value = held?.value ?? null;

  return {
    operator,
    value,
    valueTo,
    setOperator: (next: DateFilterValue['operator']) => {
      setOperator(next);
      column.setDateFilter(next, value, valueTo);
    },
    setValue: (next: string | null) => column.setDateFilter(operator, next, valueTo),
    setValueTo: (next: string | null) => {
      setValueTo(next);
      column.setDateFilter(operator, value, next);
    },
    clear: () => {
      setValueTo(null);
      column.clearFilter();
    },
  };
}

const OPERATORS: { value: DateFilterValue['operator']; label: string }[] = [
  { value: 'on', label: '=' },
  { value: 'before', label: '<' },
  { value: 'after', label: '>' },
  { value: 'between', label: '↔' },
];

/** The bounds each end of a span may be picked in: the column's own, narrowed by the other end. */
function boundsOf<TRow>(column: ColumnModel<TRow>, state: ReturnType<typeof useDateFilterState<TRow>>) {
  const config = column.filterConfig;
  const min = typeof config?.min === 'string' ? config.min : undefined;
  const max = typeof config?.max === 'string' ? config.max : undefined;
  const between = state.operator === 'between';

  return { from: { min, max: (between && state.valueTo) || max }, to: { min: state.value ?? min, max } };
}

/**
 * The filter row's date filter: a comparison and a day, or two for a span, each a `DatePicker` — typed or picked.
 * A day is only ever whole or absent, so each one commits as it completes rather than after a pause.
 */
function DateFilter<TRow>(props: { column: ColumnModel<TRow> }) {
  const { column } = props;
  const columnName = String(column.header ?? column.key);
  const text = column.grid.localeText;
  const state = useDateFilterState(column);
  const bounds = boundsOf(column, state);
  const picker = (
    current: string | null,
    label: string,
    onChange: DateChangeHandler,
    range: { min?: string; max?: string },
    clearable = false,
  ) => (
    <QuietInteractions>
      <DatePicker
        value={current}
        onValueChange={onChange}
        min={range.min}
        max={range.max}
        clearable={clearable}
        clearLabel={text.clearFilter(columnName)}
        variant="compact"
        width="fit"
        minWidth={0}
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        tabIndex={-1}
        props={{ 'aria-label': label }}
      />
    </QuietInteractions>
  );

  return (
    <Flex
      component={`${column.grid.componentName}.filter.cell.input` as never}
      ai={state.operator === 'between' ? 'start' : 'center'}
      gap={1}
    >
      <QuietInteractions>
        <Dropdown<DateFilterValue['operator']>
          value={state.operator}
          variant="compact"
          onChange={(next) => next && state.setOperator(next)}
          minWidth={6}
          hideIcon
          b={0}
          bgColor="transparent"
          focus={{ outline: 0 }}
          props={{ tabIndex: -1, 'aria-label': text.filterComparison(columnName) }}
        >
          {OPERATORS.map((op) => (
            <Dropdown.Item key={op.value} value={op.value}>
              {op.label}
            </Dropdown.Item>
          ))}
        </Dropdown>
      </QuietInteractions>
      <Flex d="column" gap={1} flex1 minWidth={0}>
        {picker(
          state.value,
          state.operator === 'between' ? text.filterFrom(columnName) : text.filterColumn(columnName),
          (next, details) => (details.reason === 'clear' ? state.clear() : state.setValue(next)),
          bounds.from,
          true,
        )}
        {state.operator === 'between' && picker(state.valueTo, text.filterTo(columnName), state.setValueTo, bounds.to)}
      </Flex>
    </Flex>
  );
}

/** The list layout's date filter: a `DatePicker` per end, and the platform's own picker for the comparison. */
function ListDateFilter<TRow>(props: { column: ColumnModel<TRow> }) {
  const { column } = props;
  const name = column.grid.componentName;
  const text = column.grid.localeText;
  const columnName = String(column.header ?? column.key);
  const state = useDateFilterState(column);
  const bounds = boundsOf(column, state);

  return (
    <Flex gap={2} ai="center" flexWrap="wrap">
      <Box
        tag="select"
        component={`${name}.list.sheet.input` as never}
        {...DataGridListLayout.INPUT}
        width={18}
        flexShrink={0}
        props={{
          value: state.operator,
          'aria-label': text.filterComparison(columnName),
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => state.setOperator(event.target.value as DateFilterValue['operator']),
        }}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Box>
      <QuietInteractions>
        <DatePicker
          value={state.value}
          onValueChange={state.setValue}
          min={bounds.from.min}
          max={bounds.from.max}
          flex1
          props={{ 'aria-label': state.operator === 'between' ? text.filterFrom(columnName) : text.filterColumn(columnName) }}
        />
      </QuietInteractions>
      {state.operator === 'between' && (
        <QuietInteractions>
          <DatePicker
            value={state.valueTo}
            onValueChange={state.setValueTo}
            min={bounds.to.min}
            max={bounds.to.max}
            flex1
            props={{ 'aria-label': text.filterTo(columnName) }}
          />
        </QuietInteractions>
      )}
    </Flex>
  );
}

/** A pasted field read the way a date editor reads a paste: ISO, or the reader's own order. */
function parsePasted<TRow>(editor: CellEditorConfig<TRow>, text: string): string | null {
  const kind = editor.type === 'datetime' ? (editor.zone === 'none' ? 'datetime' : 'instant') : (editor.type as 'date' | 'time');

  return parse(text, { kind, zone: editor.zone === 'none' ? undefined : editor.zone });
}

/** A date filter's value as the list's chip writes it. */
function describeDay(value: string, valueTo?: string): string {
  return valueTo === undefined ? format(value) : formatRange(value, valueTo);
}

const DataGridDateParts = { DateValue, DateEditor, DateFilter, ListDateFilter, parsePasted, describeDay };

export default DataGridDateParts;
