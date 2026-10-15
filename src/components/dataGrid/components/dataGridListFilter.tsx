import { useCallback, useRef, useState } from 'react';
import Box from '../../../box';
import FilterDraftUtils, { type NumberFilterDraft } from '../../../utils/dataGrid/filterDraftUtils';
import Button from '../../button';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import Textbox from '../../textbox';
import { NumberFilterValue } from '../contracts/dataGridContract';
import ColumnModel from '../models/columnModel';
import useFilterDraft from '../useFilterDraft';
import DataGridListLayout from './dataGridListLayout';

/** Past this many options a multiselect is a searchable list rather than a row of chips. */
const CHIP_LIMIT = 8;

interface Props<TRow> {
  column: ColumnModel<TRow>;
}

const OPERATORS: { value: NumberFilterValue['operator']; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'between', label: '↔' },
];

function TextFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const name = column.grid.componentName;
  const text = column.grid.localeText;
  const [value, setValue] = useState(currentFilter?.type === 'text' ? currentFilter.value : '');
  const { debounce } = useFilterDraft(
    currentFilter,
    (filter) => FilterDraftUtils.textMatches(value, filter),
    (filter) => setValue(filter?.type === 'text' ? filter.value : ''),
  );

  return (
    <Textbox
      component={`${name}.list.sheet.input` as never}
      {...DataGridListLayout.INPUT}
      type="search"
      value={value}
      placeholder={column.filterConfig?.placeholder ?? text.filterPlaceholder}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        debounce('value', () => column.setTextFilter(next));
      }}
      props={{ 'aria-label': text.filterColumn(String(column.header ?? column.key)) }}
    />
  );
}

function NumberFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const name = column.grid.componentName;
  const text = column.grid.localeText;
  const columnName = String(column.header ?? column.key);
  const config = column.filterConfig;
  const [draft, setDraft] = useState(() => FilterDraftUtils.numberDraft(currentFilter));
  const latest = useRef(draft);
  const replace = useCallback((next: NumberFilterDraft) => {
    latest.current = next;
    setDraft(next);
  }, []);
  const { debounce, cancel } = useFilterDraft(
    currentFilter,
    (filter) => FilterDraftUtils.numberMatches(draft, filter),
    (filter) => replace(FilterDraftUtils.numberDraft(filter)),
  );

  // What a commit sends is the draft as typing settles, not as it was at the keystroke that scheduled it.
  const update = (change: Partial<NumberFilterDraft>, settle: boolean) => {
    replace({ ...latest.current, ...change });
    const commit = () => column.setNumberFilter(latest.current.operator, latest.current.value, latest.current.valueTo);

    if (settle) debounce('value', commit);
    else {
      cancel();
      commit();
    }
  };

  const input = (value: string, label: string, placeholder: string, key: 'value' | 'valueTo') => (
    <Textbox
      component={`${name}.list.sheet.input` as never}
      {...DataGridListLayout.INPUT}
      type="number"
      value={value}
      step={config?.step}
      placeholder={placeholder}
      onChange={(event) => update({ [key]: event.target.value }, true)}
      props={{ 'aria-label': label, inputMode: 'decimal', min: config?.min, max: config?.max }}
    />
  );

  return (
    <Flex gap={2} ai="center">
      {/* A native select: on a phone it opens the platform's own picker, which is the best one there is. */}
      <Box
        tag="select"
        component={`${name}.list.sheet.input` as never}
        {...DataGridListLayout.INPUT}
        width={18}
        flexShrink={0}
        props={{
          value: draft.operator,
          'aria-label': text.filterComparison(columnName),
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            update({ operator: event.target.value as NumberFilterValue['operator'] }, false),
        }}
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Box>
      {input(
        draft.value,
        draft.operator === 'between' ? text.filterFrom(columnName) : text.filterColumn(columnName),
        draft.operator === 'between' ? text.filterFromPlaceholder : (config?.placeholder ?? text.filterValuePlaceholder),
        'value',
      )}
      {draft.operator === 'between' && input(draft.valueTo, text.filterTo(columnName), text.filterToPlaceholder, 'valueTo')}
    </Flex>
  );
}

function MultiselectFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const name = column.grid.componentName;
  const text = column.grid.localeText;
  const selected = currentFilter?.type === 'multiselect' ? currentFilter.values : [];
  const options = column.filterOptions;
  const [query, setQuery] = useState('');

  const toggle = (value: string | number | boolean | null) => {
    column.setMultiselectFilter(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  // A few options are chips a thumb can tap; a long list is the same choice with a search over it.
  if (options.length <= CHIP_LIMIT) {
    return (
      <Flex flexWrap="wrap" gap={2}>
        {options.map((option) => (
          <Button
            key={String(option.value)}
            type="button"
            component={`${name}.list.sheet.chip` as never}
            display="inline-flex"
            ai="center"
            minHeight={10}
            px={3.5}
            borderRadius={999}
            fontSize={14}
            cursor="pointer"
            onClick={() => toggle(option.value)}
            props={{ 'aria-pressed': selected.includes(option.value) }}
          >
            {option.label}
          </Button>
        ))}
      </Flex>
    );
  }

  const needle = query.trim().toLocaleLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLocaleLowerCase().includes(needle)) : options;

  return (
    <Flex d="column" gap={2}>
      <Textbox
        component={`${name}.list.sheet.input` as never}
        {...DataGridListLayout.INPUT}
        type="search"
        value={query}
        placeholder={text.filterSelectSearchPlaceholder}
        onChange={(event) => setQuery(event.target.value)}
        props={{ 'aria-label': text.filterColumn(String(column.header ?? column.key)) }}
      />
      <Flex d="column" maxHeight={64} overflowY="auto">
        {shown.map((option) => (
          <Checkbox
            key={String(option.value)}
            checked={selected.includes(option.value)}
            onChange={() => toggle(option.value)}
            label={option.label}
            labelProps={
              { component: `${name}.list.sheet.line`, display: 'flex', ai: 'center', gap: 3, minHeight: 12, fontSize: 16, bb: 1 } as never
            }
          />
        ))}
      </Flex>
    </Flex>
  );
}

/** One column's filter, drawn for a finger: a full-width field, a native picker, chips or a checklist. */
export default function DataGridListFilter<TRow>(props: Props<TRow>) {
  const { column } = props;

  switch (column.filterConfig?.type) {
    case undefined:
      return null;
    case 'number':
      return <NumberFilter column={column} />;
    case 'multiselect':
      return <MultiselectFilter column={column} />;
    default:
      return <TextFilter column={column} />;
  }
}

(DataGridListFilter as React.FunctionComponent).displayName = 'DataGridListFilter';
