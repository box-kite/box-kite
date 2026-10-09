import { useCallback, useRef, useState } from 'react';
import Box from '../../../box';
import FilterDraftUtils, { type NumberFilterDraft } from '../../../utils/dataGrid/filterDraftUtils';
import Button from '../../button';
import Dropdown from '../../dropdown';
import Flex from '../../flex';
import Textbox from '../../textbox';
import { NumberFilterValue } from '../contracts/dataGridContract';
import ColumnModel from '../models/columnModel';
import useFilterDraft from '../useFilterDraft';

interface Props<TRow> {
  column: ColumnModel<TRow>;
}

/**
 * The ✕ that empties a column filter.
 *
 * A real `<button>` with a name, not a `<div onClick>`: it is the only way to clear the filter
 * without selecting the text and deleting it, so a keyboard has to be able to reach it.
 */
function ClearFilterButton(props: { label: string; onClear: () => void }) {
  const { label, onClear } = props;

  return (
    <Button
      clean
      type="button"
      position="absolute"
      insetEnd={2}
      top="1/2"
      translateY="-1/2"
      cursor="pointer"
      display="flex"
      ai="center"
      onClick={onClear}
      props={{ tabIndex: -1, 'aria-label': label }}
    >
      <Box fontSize={10} color="gray-400" hover={{ color: 'gray-600' }}>
        ✕
      </Box>
    </Button>
  );
}

/**
 * Text filter with fuzzy search support.
 * Local input + debounce stay here; config/parsing/commit live on ColumnModel.
 */
function TextFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const { componentName } = column.grid;
  const columnName = String(column.header ?? column.key);
  const text = column.grid.localeText;
  const [localValue, setLocalValue] = useState(currentFilter?.type === 'text' ? currentFilter.value : '');
  const { debounce, cancel } = useFilterDraft(
    currentFilter,
    (filter) => FilterDraftUtils.textMatches(localValue, filter),
    (filter) => setLocalValue(filter?.type === 'text' ? filter.value : ''),
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);
      debounce('value', () => column.setTextFilter(value));
    },
    [column, debounce],
  );

  const handleClear = useCallback(() => {
    cancel();
    setLocalValue('');
    column.clearFilter();
  }, [column, cancel]);

  return (
    <Flex component={`${componentName}.filter.cell.input` as never}>
      <Textbox
        width="fit"
        variant="compact"
        placeholder={column.filterConfig?.placeholder ?? text.filterPlaceholder}
        value={localValue}
        onChange={handleChange}
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        // A placeholder is not a label, and "Filter..." is the same on every column anyway.
        props={{ tabIndex: -1, 'aria-label': text.filterColumn(columnName) }}
      />
      {localValue && <ClearFilterButton label={text.clearFilter(columnName)} onClear={handleClear} />}
    </Flex>
  );
}

/**
 * Number filter with comparison operators.
 */
function NumberFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const { componentName } = column.grid;
  const columnName = String(column.header ?? column.key);
  const text = column.grid.localeText;
  const [draft, setDraft] = useState(() => FilterDraftUtils.numberDraft(currentFilter));
  // What a commit sends: the draft as it is when typing settles, not as it was at the keystroke that
  // scheduled it — otherwise "from" landing while "to" is still pending would commit a stale "to".
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
  const { operator, value: localValue, valueTo } = draft;

  const config = column.filterConfig;

  const commit = useCallback(() => {
    const { operator, value, valueTo } = latest.current;
    column.setNumberFilter(operator, value, valueTo);
  }, [column]);

  const update = useCallback(
    (change: Partial<NumberFilterDraft>, settle: boolean) => {
      replace({ ...latest.current, ...change });
      if (settle) debounce('value', commit);
      else {
        cancel();
        commit();
      }
    },
    [replace, commit, debounce, cancel],
  );

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ value: e.target.value }, true), [update]);
  const handleValueToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ valueTo: e.target.value }, true), [update]);
  // A pick from a list is the whole gesture, so it commits at once.
  const handleOperatorChange = useCallback((op: NumberFilterValue['operator']) => update({ operator: op }, false), [update]);

  const handleClear = useCallback(() => {
    cancel();
    replace(FilterDraftUtils.numberDraft(undefined));
    column.clearFilter();
  }, [column, cancel, replace]);

  return (
    <Flex component={`${componentName}.filter.cell.input` as never} ai={operator === 'between' ? 'start' : 'center'} gap={1}>
      <Dropdown<NumberFilterValue['operator']>
        value={operator}
        variant="compact"
        onChange={(val) => val && handleOperatorChange(val)}
        minWidth={6}
        hideIcon
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        // The trigger's content is a mathematical symbol, and a combobox is not named by its
        // content anyway — without this the control announces as nothing at all.
        props={{ tabIndex: -1, 'aria-label': text.filterComparison(columnName) }}
      >
        <Dropdown.Item value="eq">=</Dropdown.Item>
        <Dropdown.Item value="ne">≠</Dropdown.Item>
        <Dropdown.Item value="gt">&gt;</Dropdown.Item>
        <Dropdown.Item value="gte">≥</Dropdown.Item>
        <Dropdown.Item value="lt">&lt;</Dropdown.Item>
        <Dropdown.Item value="lte">≤</Dropdown.Item>
        <Dropdown.Item value="between">↔</Dropdown.Item>
      </Dropdown>
      {operator === 'between' ? (
        <Flex d="column" gap={1} flex1>
          <Flex ai="center" position="relative" flex1>
            <Textbox
              type="number"
              variant="compact"
              placeholder={config?.placeholder ?? text.filterFromPlaceholder}
              value={localValue}
              onChange={handleValueChange}
              width="fit"
              step={config?.step}
              b={0}
              bgColor="transparent"
              focus={{ outline: 0 }}
              props={{ tabIndex: -1, 'aria-label': text.filterFrom(columnName) }}
            />
            {(localValue !== '' || valueTo !== '') && <ClearFilterButton label={text.clearFilter(columnName)} onClear={handleClear} />}
          </Flex>
          <Flex ai="center" flex1>
            <Textbox
              type="number"
              variant="compact"
              placeholder={text.filterToPlaceholder}
              value={valueTo}
              onChange={handleValueToChange}
              width="fit"
              step={config?.step}
              b={0}
              bgColor="transparent"
              focus={{ outline: 0 }}
              props={{ tabIndex: -1, 'aria-label': text.filterTo(columnName) }}
            />
          </Flex>
        </Flex>
      ) : (
        <Flex ai="center" position="relative" flex1>
          <Textbox
            type="number"
            variant="compact"
            placeholder={config?.placeholder ?? text.filterValuePlaceholder}
            value={localValue}
            onChange={handleValueChange}
            width="fit"
            step={config?.step}
            b={0}
            bgColor="transparent"
            focus={{ outline: 0 }}
            props={{ tabIndex: -1, 'aria-label': text.filterColumn(columnName) }}
          />
          {localValue !== '' && <ClearFilterButton label={text.clearFilter(columnName)} onClear={handleClear} />}
        </Flex>
      )}
    </Flex>
  );
}

/**
 * Multi-select filter with checkbox list.
 */
function MultiselectFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const { componentName } = column.grid;
  const columnName = String(column.header ?? column.key);
  const text = column.grid.localeText;
  const selectedValues = currentFilter?.type === 'multiselect' ? currentFilter.values : [];
  const options = column.filterOptions;

  const handleChange = useCallback(
    (_value: string | number | boolean | null | undefined, values: (string | number | boolean | null)[]) => {
      column.setMultiselectFilter(values);
    },
    [column],
  );

  return (
    <Flex component={`${componentName}.filter.cell.input` as never}>
      <Dropdown<string | number | boolean | null>
        multiple
        showCheckbox
        isSearchable
        searchPlaceholder={text.filterSelectSearchPlaceholder}
        value={selectedValues}
        width="fit"
        minWidth={0}
        bgColor="transparent"
        onChange={handleChange}
        variant="compact"
        b={0}
        focus={{ outline: 0 }}
        props={{ tabIndex: -1, 'aria-label': text.filterColumn(columnName) }}
      >
        <Dropdown.Display>
          {(vals: (string | number | boolean | null)[]) => {
            if (vals.length === 0)
              return (
                <Box tag="span" color="gray-400">
                  {column.filterConfig?.placeholder ?? text.filterSelectPlaceholder}
                </Box>
              );
            if (vals.length === 1) {
              const opt = options.find((o) => o.value === vals[0]);
              return opt?.label ?? String(vals[0]);
            }
            return `${vals.length} selected`;
          }}
        </Dropdown.Display>
        <Dropdown.Unselect>{text.filterSelectClear}</Dropdown.Unselect>
        <Dropdown.SelectAll>{text.filterSelectAll}</Dropdown.SelectAll>
        {options.map((option) => (
          <Dropdown.Item<string | number | boolean | null> key={String(option.value)} value={option.value} ai="center" gap={2}>
            {option.label}
          </Dropdown.Item>
        ))}
      </Dropdown>
    </Flex>
  );
}

/**
 * Renders the appropriate filter input for the column's resolved filter type.
 */
export default function DataGridColumnFilter<TRow>(props: Props<TRow>) {
  const { column } = props;
  const config = column.filterConfig;

  if (!config) return null;

  switch (config.type) {
    case 'number':
      return <NumberFilter column={column} />;
    case 'multiselect':
      return <MultiselectFilter column={column} />;
    case 'text':
    default:
      return <TextFilter column={column} />;
  }
}

(DataGridColumnFilter as React.FunctionComponent).displayName = 'DataGridColumnFilter';
