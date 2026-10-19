import { useState } from 'react';
import Box from '../../../box';
import { useDateEnvironment } from '../../../react/date/dateEnvironment';
import { normalize } from '../../../utils/date/dateTime';
import { format, FormatOptions, formatRange, formatRelative } from '../../../utils/date/format';
import { parse } from '../../../utils/date/parse';
import DateField from '../../dateField';
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

/** The `date`/`time`/`datetime` editor: a compact `DateField` bound to the cell's draft. */
function DateEditor<TRow>(props: EditorProps<TRow>) {
  const { cell, label, errorId, onBlur } = props;
  const { type, zone, min, max } = cell.editor;
  const draft = cell.draft instanceof Date || typeof cell.draft === 'string' ? normalize(cell.draft) : null;

  return (
    <DateField
      type={type as 'date' | 'time' | 'datetime'}
      value={draft}
      zone={zone}
      min={typeof min === 'string' ? min : undefined}
      max={typeof max === 'string' ? max : undefined}
      onValueChange={(value) => cell.setDraft(value)}
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

/**
 * The filter row's date filter: a comparison and a day, or two for a span. A field holds what is half typed
 * itself, and a day is only ever whole or absent, so each one commits as it completes rather than after a pause.
 */
function DateFilter<TRow>(props: { column: ColumnModel<TRow>; clearButton: (onClear: () => void) => React.ReactNode }) {
  const { column, clearButton } = props;
  const columnName = String(column.header ?? column.key);
  const text = column.grid.localeText;
  const config = column.filterConfig;
  const state = useDateFilterState(column);
  const field = (current: string | null, label: string, onChange: (next: string | null) => void) => (
    <DateField
      min={typeof config?.min === 'string' ? config.min : undefined}
      max={typeof config?.max === 'string' ? config.max : undefined}
      value={current}
      onValueChange={onChange}
      variant="compact"
      width="fit"
      b={0}
      bgColor="transparent"
      focus={{ outline: 0 }}
      tabIndex={-1}
      props={{ 'aria-label': label }}
    />
  );

  return (
    <Flex
      component={`${column.grid.componentName}.filter.cell.input` as never}
      ai={state.operator === 'between' ? 'start' : 'center'}
      gap={1}
    >
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
      <Flex d="column" gap={1} flex1 position="relative">
        {field(state.value, state.operator === 'between' ? text.filterFrom(columnName) : text.filterColumn(columnName), state.setValue)}
        {state.operator === 'between' && field(state.valueTo, text.filterTo(columnName), state.setValueTo)}
        {state.value && clearButton(state.clear)}
      </Flex>
    </Flex>
  );
}

/** The list layout's date filter: the field a finger types into, and the platform's own picker for the comparison. */
function ListDateFilter<TRow>(props: { column: ColumnModel<TRow> }) {
  const { column } = props;
  const name = column.grid.componentName;
  const text = column.grid.localeText;
  const columnName = String(column.header ?? column.key);
  const state = useDateFilterState(column);

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
      <DateField
        value={state.value}
        onValueChange={state.setValue}
        flex1
        props={{ 'aria-label': state.operator === 'between' ? text.filterFrom(columnName) : text.filterColumn(columnName) }}
      />
      {state.operator === 'between' && (
        <DateField value={state.valueTo} onValueChange={state.setValueTo} flex1 props={{ 'aria-label': text.filterTo(columnName) }} />
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
