import { forwardRef, Ref, RefAttributes, useMemo } from 'react';
import { BoxProps } from '../box';
import { ChangeHandler } from '../react/a11y/useControllableState';
import { BoxStyleProps, ComponentsAndVariants } from '../types';
import Dropdown, { DropdownValueReason } from './dropdown';

interface SelectDef<TRow> {
  /** Key of TRow to use as the option value */
  valueKey: keyof TRow & (string | number);
  /** Key of TRow to display as option text (defaults to valueKey) */
  displayKey?: keyof TRow;
  /** Custom render function for each option */
  display?: (row: TRow) => React.ReactNode;
  /** Custom render function for the selected value display */
  selectedDisplay?: (selectedRows: TRow[], isOpen: boolean) => React.ReactNode;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Text for "Select all" option in multiple mode */
  selectAllText?: string;
  /** Text shown when search yields no results */
  emptyText?: string;
}

interface Props<TRow, TVal extends TRow[keyof TRow], TKey extends keyof ComponentsAndVariants = 'dropdown'> extends Omit<
  BoxProps<'button', TKey>,
  'ref' | 'tag'
> {
  data: TRow[];
  def: SelectDef<TRow>;
  name?: string;
  defaultValue?: TVal | TVal[];
  value?: TVal | TVal[];
  multiple?: boolean;
  isSearchable?: boolean;
  searchPlaceholder?: string;
  hideIcon?: boolean;
  showCheckbox?: boolean;
  /** The select's name, rendered above it — see `label` on `Dropdown`. A combobox needs one. */
  label?: React.ReactNode;
  labelProps?: BoxProps<'div'>;
  itemsProps?: BoxStyleProps;
  iconProps?: BoxStyleProps;
  /** Fires with the selection in whatever shape `value` takes, and why it changed — see `Dropdown`. */
  onValueChange?: ChangeHandler<TVal | TVal[] | undefined, DropdownValueReason>;
  /**
   * The older callback, whose first argument is the option *acted on*. Both fire.
   * @deprecated `onValueChange` is what every component reports a value change under, and it carries the
   * reason. This spelling still works.
   */
  onChange?: (value: TVal | undefined, values: TVal[]) => void;
}

function SelectImpl<TRow, TVal extends TRow[keyof TRow]>(props: Props<TRow, TVal>, ref: Ref<HTMLInputElement>) {
  const { data, def, ...dropdownProps } = props;
  const { valueKey, displayKey, display, selectedDisplay, placeholder, selectAllText, emptyText } = def;

  const dataMap = useMemo(() => {
    const map = new Map<TVal, TRow>();
    for (const row of data) {
      map.set(row[valueKey] as TVal, row);
    }
    return map;
  }, [data, valueKey]);

  return (
    <Dropdown<TVal> ref={ref} {...dropdownProps}>
      {placeholder && <Dropdown.Unselect>{placeholder}</Dropdown.Unselect>}
      {selectAllText && <Dropdown.SelectAll>{selectAllText}</Dropdown.SelectAll>}
      {emptyText && <Dropdown.EmptyItem>{emptyText}</Dropdown.EmptyItem>}
      {selectedDisplay && (
        <Dropdown.Display>
          {(values: TVal[], isOpen: boolean) => {
            const rows = values.map((v) => dataMap.get(v)).filter(Boolean) as TRow[];
            return selectedDisplay(rows, isOpen);
          }}
        </Dropdown.Display>
      )}
      {data.map((row) => {
        const val = row[valueKey] as TVal;
        return (
          <Dropdown.Item key={val as React.Key} value={val}>
            {display ? display(row) : String(row[displayKey ?? valueKey])}
          </Dropdown.Item>
        );
      })}
    </Dropdown>
  );
}

interface SelectType {
  <TRow, TVal extends TRow[keyof TRow] = TRow[keyof TRow]>(props: Props<TRow, TVal> & RefAttributes<HTMLInputElement>): React.ReactNode;
}

const Select = forwardRef(SelectImpl) as unknown as SelectType;
(Select as React.FunctionComponent).displayName = 'Select';

export default Select;
