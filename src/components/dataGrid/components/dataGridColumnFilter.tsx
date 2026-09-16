import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '../../../box';
import Button from '../../button';
import Dropdown from '../../dropdown';
import Flex from '../../flex';
import Textbox from '../../textbox';
import { NumberFilterValue } from '../contracts/dataGridContract';
import ColumnModel from '../models/columnModel';

interface Props<TRow> {
  column: ColumnModel<TRow>;
}

/**
 * The ✕ that empties a column filter.
 *
 * A real `<button>` with a name, not a `<div onClick>`: it is the only way to clear the filter
 * without selecting the text and deleting it, so a keyboard has to be able to reach it.
 */
function ClearFilterButton(props: { columnName: React.ReactNode; onClear: () => void }) {
  const { columnName, onClear } = props;

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
      props={{ tabIndex: -1, 'aria-label': `Clear the ${columnName} filter` }}
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
  const columnName = column.header ?? column.key;
  const initialValue = currentFilter?.type === 'text' ? currentFilter.value : '';
  const [localValue, setLocalValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(() => {
        column.setTextFilter(value);
        timeoutRef.current = null;
      }, 300);
    },
    [column],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    column.clearFilter();
  }, [column]);

  return (
    <Flex component={`${componentName}.filter.cell.input` as never}>
      <Textbox
        width="fit"
        variant="compact"
        placeholder={column.filterConfig?.placeholder ?? 'Filter...'}
        value={localValue}
        onChange={handleChange}
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        // A placeholder is not a label, and "Filter..." is the same on every column anyway.
        props={{ tabIndex: -1, 'aria-label': `Filter ${columnName}` }}
      />
      {localValue && <ClearFilterButton columnName={columnName} onClear={handleClear} />}
    </Flex>
  );
}

/**
 * Number filter with comparison operators.
 */
function NumberFilter<TRow>({ column }: Props<TRow>) {
  const { currentFilter } = column;
  const { componentName } = column.grid;
  const columnName = column.header ?? column.key;
  const initialValue = currentFilter?.type === 'number' ? currentFilter.value : '';
  const initialOperator = currentFilter?.type === 'number' ? currentFilter.operator : 'eq';
  const initialValueTo = currentFilter?.type === 'number' ? currentFilter.valueTo : '';

  const [localValue, setLocalValue] = useState<string | number>(initialValue);
  const [operator, setOperator] = useState<NumberFilterValue['operator']>(initialOperator);
  const [valueTo, setValueTo] = useState<string | number>(initialValueTo ?? '');
  const valueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueToTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (valueTimeoutRef.current) clearTimeout(valueTimeoutRef.current);
      if (valueToTimeoutRef.current) clearTimeout(valueToTimeoutRef.current);
    };
  }, []);

  const config = column.filterConfig;

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);

      if (valueTimeoutRef.current) clearTimeout(valueTimeoutRef.current);

      valueTimeoutRef.current = setTimeout(() => {
        column.setNumberFilter(operator, value, valueTo);
        valueTimeoutRef.current = null;
      }, 300);
    },
    [column, operator, valueTo],
  );

  const handleOperatorChange = useCallback(
    (op: NumberFilterValue['operator']) => {
      setOperator(op);
      column.setNumberFilter(op, localValue, valueTo);
    },
    [column, localValue, valueTo],
  );

  const handleValueToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValueTo(value);

      if (valueToTimeoutRef.current) clearTimeout(valueToTimeoutRef.current);

      valueToTimeoutRef.current = setTimeout(() => {
        column.setNumberFilter(operator, localValue, value);
        valueToTimeoutRef.current = null;
      }, 300);
    },
    [column, operator, localValue],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    setValueTo('');
    setOperator('eq');
    column.clearFilter();
  }, [column]);

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
        props={{ tabIndex: -1, 'aria-label': `Comparison for ${columnName}` }}
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
              placeholder={config?.placeholder ?? 'From'}
              value={localValue}
              onChange={handleValueChange}
              width="fit"
              step={config?.step}
              b={0}
              bgColor="transparent"
              focus={{ outline: 0 }}
              props={{ tabIndex: -1, 'aria-label': `Filter ${columnName} from` }}
            />
            {(localValue !== '' || valueTo !== '') && <ClearFilterButton columnName={columnName} onClear={handleClear} />}
          </Flex>
          <Flex ai="center" flex1>
            <Textbox
              type="number"
              variant="compact"
              placeholder="To"
              value={valueTo}
              onChange={handleValueToChange}
              width="fit"
              step={config?.step}
              b={0}
              bgColor="transparent"
              focus={{ outline: 0 }}
              props={{ tabIndex: -1, 'aria-label': `Filter ${columnName} to` }}
            />
          </Flex>
        </Flex>
      ) : (
        <Flex ai="center" position="relative" flex1>
          <Textbox
            type="number"
            variant="compact"
            placeholder={config?.placeholder ?? 'Value'}
            value={localValue}
            onChange={handleValueChange}
            width="fit"
            step={config?.step}
            b={0}
            bgColor="transparent"
            focus={{ outline: 0 }}
            props={{ tabIndex: -1, 'aria-label': `Filter ${columnName}` }}
          />
          {localValue !== '' && <ClearFilterButton columnName={columnName} onClear={handleClear} />}
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
  const columnName = column.header ?? column.key;
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
        searchPlaceholder="Search..."
        value={selectedValues}
        width="fit"
        minWidth={0}
        bgColor="transparent"
        onChange={handleChange}
        variant="compact"
        b={0}
        focus={{ outline: 0 }}
        props={{ tabIndex: -1, 'aria-label': `Filter ${columnName}` }}
      >
        <Dropdown.Display>
          {(vals: (string | number | boolean | null)[]) => {
            if (vals.length === 0)
              return (
                <Box tag="span" color="gray-400">
                  {column.filterConfig?.placeholder ?? 'Select...'}
                </Box>
              );
            if (vals.length === 1) {
              const opt = options.find((o) => o.value === vals[0]);
              return opt?.label ?? String(vals[0]);
            }
            return `${vals.length} selected`;
          }}
        </Dropdown.Display>
        <Dropdown.Unselect>Clear</Dropdown.Unselect>
        <Dropdown.SelectAll>Select All</Dropdown.SelectAll>
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
