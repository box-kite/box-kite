import { forwardRef, Ref, RefAttributes, useCallback, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import useDismiss from '../react/a11y/useDismiss';
import useRovingFocus from '../react/a11y/useRovingFocus';
import { useIsomorphicLayoutEffect } from '../react/effects';
import useIdentifier from '../react/identity/useIdentifier';
import { BoxStyleProps, ComponentsAndVariants } from '../types';
import ComboboxUtils, { ComboboxFilter, ComboboxRow, ComboboxRowDef } from '../utils/combobox/comboboxUtils';
import ComboboxChips from './combobox/comboboxChips';
import ComboboxListbox from './combobox/comboboxListbox';
import Flex from './flex';
import Presence from './presence';
import { Path, Svg } from './svg';

/** Why the listbox opened or closed. `select` is the transition worth telling apart from a dismissal. */
export type ComboboxOpenReason = 'trigger' | 'input' | 'select' | 'escape' | 'outside-pointer' | 'tab' | 'imperative';

/** Why the selection changed. `remove` is a chip's own button; `deselect` is toggling a row back off. */
export type ComboboxValueReason = 'select' | 'deselect' | 'create' | 'remove';

/** Why the typed text changed. Only `input` came from a keystroke; the rest are the component tidying up. */
export type ComboboxQueryReason = 'input' | 'select' | 'clear' | 'close';

/** How a row is read and how it is drawn. Only `label` is required — it is the text and the name. */
export interface ComboboxDef<TRow> extends ComboboxRowDef<TRow> {
  /** Custom row rendering. The label is still what is searched, what the field shows and what is read out. */
  display?: (row: TRow) => React.ReactNode;
}

interface BaseProps<TRow, TKey extends keyof ComponentsAndVariants = 'combobox'> extends Omit<
  BoxProps<'div', TKey>,
  'ref' | 'tag' | 'children' | 'defaultValue' | 'onChange' | 'disabled' | 'placeholder' | 'open'
> {
  /** Every row the combobox can offer. Filtered by the query unless `filter` is `false`. */
  data: TRow[];
  /**
   * How to read a row: its `label` (the text, which is searched and read out), its `key` (what makes two
   * rows the same row), and optionally `disabled` and `display`. A key of the row, or a function.
   */
  def: ComboboxDef<TRow>;
  /**
   * The combobox's name, rendered above it in a real `<label>`. A combobox is not named by what it
   * contains, so without this (or an `aria-label` of your own in `props`) it has no accessible name.
   */
  label?: React.ReactNode;
  /** Styles for the `<label>` itself — it sits above the control rather than wrapping it. */
  labelProps?: BoxProps<'label'>;
  /** The field's placeholder. Not a name — it is gone on the first keystroke. See `label`. */
  placeholder?: string;
  /** What the selection submits under: one hidden input per selected row, carrying its key. */
  name?: string;
  /** Not editable and not openable, but still read out. The real attribute, on the field itself. */
  disabled?: boolean;
  /** Attributes for the `<input>` that *is* the combobox — an `aria-label`, an `inputMode`, an `id`. */
  props?: Record<string, unknown>;
  /** Styles for the popup (`combobox.items`). */
  itemsProps?: BoxStyleProps;
  /** Drop the chevron. It is decoration either way: `aria-hidden` and never focusable. */
  hideIcon?: boolean;
  /**
   * Which rows a query leaves, and in what order — it takes the whole list so it can rank as well as
   * reject, and is handed the label reader so composing it with the built-in one costs nothing.
   * `false` means the data is already filtered, which is what a server that searched needs.
   */
  filter?: ComboboxFilter<TRow> | false;
  /** Rows are on their way. The popup says so rather than claiming there are none. */
  loading?: boolean;
  /** What the popup shows while `loading` and there is nothing to show yet. */
  loadingText?: React.ReactNode;
  /** What the popup shows when the query matched nothing. */
  emptyText?: React.ReactNode;
  /**
   * Turns the query into the row it would create, or `null` to refuse it. Its presence is what offers a
   * create row at all, and one is never offered for a query a row already answers by name.
   */
  createRow?: (query: string) => TRow | null;
  /** What the create row reads. Given the query, since the row it would make is not the one shown. */
  createLabel?: (query: string) => React.ReactNode;
  /** A chip's remove button's accessible name, given the row's label. */
  removeLabel?: (label: string) => string;
  /** The typed text. Controlled — pair it with `onQueryChange`, which is also the hook an async search uses. */
  query?: string;
  /** The text the field starts with when the combobox owns its own query. */
  defaultQuery?: string;
  /** Fires with the text and why it changed. Only `input` came from a keystroke. */
  onQueryChange?: ChangeHandler<string, ComboboxQueryReason>;
  /** Whether the listbox is showing. Controlled — pair it with `onOpenChange`. */
  open?: boolean;
  /** Whether it starts open, when the combobox owns that itself. */
  defaultOpen?: boolean;
  /** Fires with the new state and why: a press, a keystroke, a choice, Escape, or a press outside. */
  onOpenChange?: ChangeHandler<boolean, ComboboxOpenReason>;
}

/**
 * One row at a time, which is the default: the value is a row or `null`, and the field shows the selected
 * row's label whenever nothing is being typed.
 */
interface SingleProps<TRow> {
  /** Leave it off, or `false`. See the multiple half for the other shape. */
  multiple?: false;
  /** The selected row, or `null`. Controlled — pair it with `onValueChange`. */
  value?: TRow | null;
  /** What is selected to begin with, when the combobox owns its own value. */
  defaultValue?: TRow | null;
  /** Fires with the row itself — the object out of `data`, not a key dug out of it — and why. */
  onValueChange?: ChangeHandler<TRow | null, ComboboxValueReason>;
}

/**
 * Several rows, shown as chips in front of the field, and the value is an array. Choosing a row that is
 * already chosen takes it off again, which is the keyboard's way to a chip its own button cannot reach.
 */
interface MultipleProps<TRow> {
  /** `true` is what turns the value into an array — the one shape a combobox cannot read off its value. */
  multiple: true;
  /** The selected rows. Controlled — pair it with `onValueChange`. */
  value?: TRow[];
  /** What is selected to begin with, when the combobox owns its own value. */
  defaultValue?: TRow[];
  /** Fires with the whole selection, as rows, and why it changed. */
  onValueChange?: ChangeHandler<TRow[], ComboboxValueReason>;
}

type Props<TRow, TKey extends keyof ComponentsAndVariants = 'combobox'> = BaseProps<TRow, TKey> & (SingleProps<TRow> | MultipleProps<TRow>);

/**
 * The two halves of the union flattened back into one shape. `SingleProps & MultipleProps` is not it —
 * intersecting `multiple: false` with `multiple: true` is `never`, which takes the whole object with it.
 */
interface ResolvedProps<TRow> extends BaseProps<TRow> {
  multiple?: boolean;
  value?: TRow | TRow[] | null;
  defaultValue?: TRow | TRow[] | null;
  onValueChange?: (value: TRow | TRow[] | null, details: ChangeDetails<ComboboxValueReason>) => void;
}

/**
 * The keys an editable combobox hands straight to its field, each of which also gives up the highlight —
 * APG's "moves visual focus to the textbox". A space is in here because it types: only Enter chooses in
 * this pattern, and without it the roving hook would read a space as a selection.
 */
const TEXT_EDITING_KEYS = new Set([' ', 'Home', 'End', 'ArrowLeft', 'ArrowRight']);

/**
 * The APG editable combobox over a list of your own rows: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *
 * ```tsx
 * <Combobox data={people} def={{ label: 'name', key: 'id' }} label="Assignee" onValueChange={(person) => assign(person)} />
 * ```
 *
 * **A row in is a row out.** `data` is a list of whatever you already have, and the value is one of those
 * rows rather than a string dug out of it — `onValueChange` hands back the object, typed. `def` says how
 * to read a row: its `label` (the text, searched and read out), its `key` (what makes two rows the same
 * row, so a refetched list still matches the selection) and optionally `disabled` and `display`.
 *
 * `multiple` puts the selection in front of the field as chips and turns the value into an array — the
 * one shape decision that cannot be read off the value itself, since a combobox usually starts empty.
 *
 * @a11y The `<input>` carries `role="combobox"`, `aria-autocomplete="list"` and `aria-expanded`; the popup
 * is `role="listbox"` with `role="option"` rows, named by `aria-activedescendant` rather than by focus, so
 * one Tab enters and one leaves however many options there are.
 * @a11y Nothing names a combobox for you: pass `label`, or an `aria-label` in `props`.
 * @a11y A chip's remove button is deliberately not a tab stop — twenty selections would otherwise cost
 * twenty presses to Tab past. Backspace on an empty field removes the last, and the listbox toggles a row
 * back off, so removal is reachable from the keyboard without them.
 * @a11y The popup is a sibling of the field in the browser's top layer, so it needs no portal and keeps
 * the theme, the custom properties and the direction around it.
 * @keyboard A printable character — Types, which opens the listbox and filters it. Filtering never moves
 * the highlight: that is list autocomplete, not inline, and a highlight nobody asked for gets committed.
 * @keyboard Down / Up — Opens, or moves the highlight through what the filter left, wrapping and skipping
 * disabled rows.
 * @keyboard Alt + Down — Opens without moving the highlight. Alt + Up — chooses and closes.
 * @keyboard Home / End, Left / Right — Move the caret, and hand the highlight back to the field.
 * @keyboard Enter — Chooses the highlighted row. With nothing highlighted it does nothing, so a typed
 * query is never committed by accident.
 * @keyboard Escape — Closes the listbox, keeping what was typed. Pressed again on a closed one, clears it.
 * @keyboard Tab — Commits the highlighted row, then moves on. Nothing is highlighted until an arrow key
 * put it there, so this only ever commits a deliberate choice.
 * @keyboard Backspace (multiple, empty field) — Removes the last chip.
 */
function ComboboxImpl<TRow>(props: Props<TRow>, ref: Ref<HTMLInputElement>): React.ReactNode {
  const {
    data,
    def,
    label,
    labelProps,
    placeholder,
    name,
    disabled,
    props: tagProps,
    itemsProps,
    hideIcon,
    filter = ComboboxUtils.filterRows,
    loading,
    loadingText = 'Loading...',
    emptyText = 'No results',
    createRow,
    createLabel = (query: string) => `Create "${query}"`,
    removeLabel = (text: string) => `Remove ${text}`,
    query: queryProp,
    defaultQuery,
    onQueryChange,
    open: openProp,
    defaultOpen,
    onOpenChange,
    multiple = false,
    value,
    defaultValue,
    onValueChange,
    ...restProps
  } = props as ResolvedProps<TRow>;

  const identifier = useIdentifier('combobox');
  const fieldId = restProps.id ?? `${identifier}-field`;
  const listboxId = `${identifier}-listbox`;
  const labelId = `${identifier}-label`;
  const hasLabel = label !== undefined && label !== null && label !== false;
  const optionId = useCallback((index: number) => `${identifier}-option-${index}`, [identifier]);

  const shellRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const setFieldRef = useCallback(
    (element: HTMLInputElement | null) => {
      fieldRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = element;
    },
    [ref],
  );

  // The selection is one shape inside and two outside: `multiple` decides what a caller is handed back,
  // and everything in between works on a list, which is the only way one code path covers both.
  const handleSelectionChange = useEventCallback((next: TRow[], details: ChangeDetails<ComboboxValueReason>) => {
    onValueChange?.(multiple ? next : (next[0] ?? null), details);
  });

  const controlledSelection = useMemo(() => (value === undefined ? undefined : ComboboxUtils.toArray(value)), [value]);
  const [selection, setSelection] = useControllableState<TRow[], ComboboxValueReason>({
    value: controlledSelection,
    defaultValue: () => ComboboxUtils.toArray(defaultValue),
    onChange: handleSelectionChange,
  });

  const [open, setOpen] = useControllableState<boolean, ComboboxOpenReason>({
    value: openProp,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  const [query, setQuery] = useControllableState<string, ComboboxQueryReason>({
    value: queryProp,
    defaultValue: defaultQuery ?? '',
    onChange: onQueryChange,
  });

  /** Whether the field holds the user's text or the selection's. A displayed value filters nothing. */
  const [typed, setTyped] = useState(false);

  const keyFor = useCallback((row: TRow) => ComboboxUtils.keyOf(def, row), [def]);

  /**
   * What the field shows. Derived rather than synced: an effect copying the selection into the query is
   * exactly the "Maximum update depth" shape this library's conventions refuse, and it would be one
   * render behind a `value` changed from outside.
   */
  const selectionText = multiple ? '' : selection[0] === undefined ? '' : ComboboxUtils.labelOf(def, selection[0]);
  const fieldText = typed || query !== '' ? query : selectionText;

  const rows = useMemo(
    () => ComboboxUtils.rowsFor({ data, def, query: fieldText, filter, typed, createRow }),
    [data, def, fieldText, filter, typed, createRow],
  );

  const isRowDisabled = useCallback((index: number) => (rows[index] ? ComboboxUtils.isRowDisabled(def, rows[index]) : false), [rows, def]);

  /** Close, and let the field fall back to showing the value — unless Escape said to keep the query. */
  const close = useEventCallback((reason: ComboboxOpenReason, event?: Event | React.SyntheticEvent) => {
    setOpen(false, { reason, event });

    if (reason === 'escape') return;

    setTyped(false);
    setQuery('', { reason: 'close', event });
  });

  const selectRow = useEventCallback((index: number, event: React.SyntheticEvent) => {
    const row = rows[index];
    if (!row || isRowDisabled(index)) return;

    const chosen = row.kind === 'create' ? createRow?.(row.query) : row.row;
    if (chosen === undefined || chosen === null) return;

    const alreadyOn = ComboboxUtils.isSelected(selection, chosen, keyFor);
    const reason: ComboboxValueReason = row.kind === 'create' ? 'create' : alreadyOn && multiple ? 'deselect' : 'select';

    setSelection(ComboboxUtils.toggle(selection, chosen, multiple, keyFor), { reason, event });
    setTyped(false);
    setQuery('', { reason: 'select', event });

    // A multi-select stays open, which is what lets several rows be ticked in one visit — the same
    // rule `Menu.CheckboxItem` follows. Single-select has nothing left to ask.
    if (!multiple) setOpen(false, { reason: 'select', event });
  });

  const roving = useRovingFocus({
    count: rows.length,
    focusItems: false,
    defaultActiveIndex: -1,
    isDisabled: isRowDisabled,
    // No typeahead: the field owns every printable key, and a second hidden buffer racing the one the
    // user can see is worse than none at all.
    onSelect: selectRow,
  });

  const { activeIndex, setActiveIndex, activeItem } = roving;

  useDismiss({
    enabled: open,
    // The shell counts as inside: a press on the open combobox's own field has to reach it rather than
    // read as a press outside, which would dismiss and reopen in one gesture.
    inside: [shellRef, popupRef],
    onDismiss: (reason, event) => close(reason === 'escape' ? 'escape' : 'outside-pointer', event),
  });

  useIsomorphicLayoutEffect(() => {
    if (!open || activeIndex === -1) return;

    // A highlight nobody can see is not a highlight. `nearest`, so a list already showing it does not jump.
    activeItem()?.scrollIntoView?.({ block: 'nearest' });
  }, [open, activeIndex, activeItem]);

  /**
   * Open with the highlight on the selected row — APG, whichever key opened it — falling back to the end
   * the key implied. `none` is Alt+Down, which opens without moving the highlight at all.
   */
  const openAt = (where: 'first' | 'last' | 'none', event: React.SyntheticEvent, reason: ComboboxOpenReason) => {
    setOpen(true, { reason, event });

    const index = where === 'none' ? -1 : ComboboxUtils.activeIndexFor(rows, selection, def, where);

    setActiveIndex(index, { reason: 'programmatic', event });
  };

  const handleInput = useEventCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTyped(true);
    setQuery(event.target.value, { reason: 'input', event });
    if (!open) setOpen(true, { reason: 'input', event });
    // Filtering must not carry the highlight with it: APG keeps visual focus in the field while the user
    // types, and an index into a list that has just changed points at the wrong row.
    setActiveIndex(-1, { reason: 'programmatic', event });
  });

  const removeRow = useEventCallback((row: TRow, event: React.SyntheticEvent) => {
    setSelection(
      selection.filter((selected) => keyFor(selected) !== keyFor(row)),
      { reason: 'remove', event },
    );
  });

  const handleClosedKeyDown = (event: React.KeyboardEvent) => {
    const { key } = event;

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      openAt(key === 'ArrowUp' ? 'last' : event.altKey ? 'none' : 'first', event, 'trigger');
      return;
    }

    // APG: Escape dismisses the listbox — and with no listbox to dismiss, it clears the field.
    if (key === 'Escape' && fieldText !== '') {
      setTyped(true);
      setQuery('', { reason: 'clear', event });
    }
  };

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    (tagProps?.onKeyDown as ((event: React.KeyboardEvent) => void) | undefined)?.(event);
    if (event.defaultPrevented || disabled) return;

    // A chip comes off the end of the selection when there is nothing left to delete in the field.
    if (event.key === 'Backspace' && multiple && fieldText === '' && selection.length > 0) {
      removeRow(selection[selection.length - 1], event);
      return;
    }

    if (!open) {
      handleClosedKeyDown(event);
      return;
    }

    // Escape is not handled here on purpose: `useDismiss` owns it, and owns it for the whole page at
    // once — a combobox open inside a dialog must close the combobox and leave the dialog alone.

    if (event.key === 'Tab') {
      // APG: Tab commits the highlighted row and then leaves. No `preventDefault` — moving on is the
      // point of the key. Nothing is highlighted until an arrow put it there, so a typed query is safe.
      if (activeIndex !== -1) selectRow(activeIndex, event);
      close('tab', event);
      return;
    }

    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      if (activeIndex !== -1) selectRow(activeIndex, event);
      else close('trigger', event);
      return;
    }

    if (TEXT_EDITING_KEYS.has(event.key)) {
      // The caret has moved, so no row is where the user is any more — APG's "visual focus to the textbox".
      setActiveIndex(-1, { reason: 'programmatic', event });
      return;
    }

    roving.onKeyDown(event);
  });

  /** A press on the field opens the listbox and never closes it: the caret has to be placeable. */
  const handleFieldClick = useEventCallback((event: React.MouseEvent) => {
    if (!disabled && !open) openAt('first', event, 'trigger');
  });

  /** A press on the shell's own padding lands here, and the keys have to arrive at the field either way. */
  const handleShellPointerDown = useEventCallback((event: React.PointerEvent) => {
    if (disabled || event.target === fieldRef.current) return;

    event.preventDefault();
    fieldRef.current?.focus();
    if (!open) openAt('first', event, 'trigger');
  });

  const hasPopup = rows.length > 0 || loading === true || emptyText !== null;
  const activeOptionId = open && activeIndex !== -1 && rows.length > 0 ? optionId(activeIndex) : undefined;

  const field = (
    <Box
      tag="input"
      component="combobox.field"
      ref={setFieldRef}
      id={fieldId}
      disabled={disabled}
      props={{
        ...tagProps,
        role: 'combobox',
        'aria-autocomplete': 'list',
        'aria-expanded': open,
        'aria-controls': open && hasPopup ? listboxId : undefined,
        'aria-activedescendant': activeOptionId,
        'aria-labelledby': hasLabel ? labelId : (tagProps?.['aria-labelledby'] as string | undefined),
        // The browser's own autofill list would cover the listbox this input controls.
        autoComplete: 'off',
        spellCheck: false,
        type: 'text',
        value: fieldText,
        placeholder,
        onChange: handleInput,
        onKeyDown: handleKeyDown,
        onClick: handleFieldClick,
      }}
    />
  );

  const icon = !hideIcon && (
    <Flex component="combobox.icon" rotate={open ? 180 : 0} props={{ 'aria-hidden': true }}>
      <Svg viewBox="0 0 10 6" width="0.6rem" props={{ fill: 'none' }}>
        <Path d="m1 1 4 4 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Flex>
  );

  // One hidden input per selected row, carrying its *key* — what a `<select>` would submit, rather than
  // a serialized object no form handler would know what to do with.
  const hiddenValues =
    name === undefined
      ? null
      : selection.map((row) => <Box key={keyFor(row)} tag="input" props={{ type: 'hidden', name, value: String(keyFor(row)) }} />);

  // `<Presence>` owns the mount rather than `open` doing it, so the popup's exit has somewhere to run —
  // and a closed combobox renders none of its rows. It stays outside the listbox because that component
  // anchors against the shell, which a closed one should not be paying for on every keystroke.
  const popup = hasPopup && (
    <Presence present={open}>
      {(presence) => (
        <ComboboxListbox<TRow>
          presence={presence}
          rows={rows}
          def={def}
          display={def.display}
          selection={selection}
          multiple={multiple}
          activeIndex={activeIndex}
          optionId={optionId}
          rowRef={(index) => roving.itemProps(index).ref}
          onSelect={selectRow}
          anchorRef={shellRef}
          popupRef={popupRef}
          listboxId={listboxId}
          labelledBy={hasLabel ? labelId : fieldId}
          loading={loading}
          loadingText={loadingText}
          emptyText={emptyText}
          createLabel={createLabel}
          variant={restProps.variant}
          itemsProps={itemsProps}
        />
      )}
    </Presence>
  );

  const shell = (
    <Flex
      ref={shellRef}
      component="combobox"
      ai="center"
      gap={1}
      flexWrap="wrap"
      {...restProps}
      props={{ onPointerDown: handleShellPointerDown }}
    >
      {hiddenValues}
      {multiple && (
        <ComboboxChips<TRow>
          selection={selection}
          def={def}
          display={def.display}
          removeLabel={removeLabel}
          onRemove={removeRow}
          disabled={disabled}
          variant={restProps.variant}
        />
      )}
      {field}
      {icon}
    </Flex>
  );

  // The popup is a *sibling* of the shell, never a child of it: a listbox full of options inside the
  // control is unreachable markup, and beside it is what Tab reaches next anyway. The `<label>` is a
  // sibling too rather than a wrapper — a label wrapping the popup would turn every press on an option
  // into a press on the label, which the browser forwards to the field.
  return hasLabel ? (
    <Flex d="column" gap={1} width="fit-content">
      <Box tag="label" component="combobox.label" id={labelId} {...labelProps} props={{ htmlFor: fieldId }}>
        {label}
      </Box>
      {shell}
      {popup}
    </Flex>
  ) : (
    <>
      {shell}
      {popup}
    </>
  );
}

interface ComboboxType {
  <TRow, TKey extends keyof ComponentsAndVariants = 'combobox'>(
    props: Props<TRow, TKey> & RefAttributes<HTMLInputElement>,
  ): React.ReactNode;
}

const Combobox = forwardRef(ComboboxImpl) as unknown as ComboboxType;
(Combobox as React.FunctionComponent).displayName = 'Combobox';

export default Combobox;
// The filter the component uses when a caller names none, so a caller who names one can start from it.
export { default as ComboboxUtils } from '../utils/combobox/comboboxUtils';
export type { ComboboxFilter, ComboboxRow, ComboboxRowDef };
