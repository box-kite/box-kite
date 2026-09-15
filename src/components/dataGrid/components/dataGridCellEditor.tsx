import { useCallback, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '../../../react/effects';
import useIdentifier from '../../../react/identity/useIdentifier';
import Checkbox from '../../checkbox';
import Dropdown from '../../dropdown';
import Flex from '../../flex';
import Overlay from '../../overlay';
import Textbox from '../../textbox';
import { CellEditorOption } from '../contracts/dataGridContract';
import { useGridNavigationContext } from '../gridNavigationContext';
import CellModel from '../models/cellModel';

interface Props<TRow> {
  cell: CellModel<TRow>;
  /** The cell's navigation coordinates — where Tab steps from. */
  row: number;
  columnIndex: number;
}

/** What the control inside the editor is, whichever of the four it is. */
const CONTROL_SELECTOR = 'input,select,textarea,button';

/** A `select` editor's options, as a list — worked out from the row when they depend on it. */
function optionsOf<TRow>(cell: CellModel<TRow>): CellEditorOption[] {
  const { options } = cell.editor;

  if (typeof options === 'function') return options(cell.row.data);

  return options ?? [];
}

/**
 * The editor open on one cell. Everything it does is three calls on the model — read `draft`, `setDraft`,
 * then `commitEdit` or `cancelEdit` — so the four built-in controls and one of your own differ only in
 * what they draw. The commit rules live in `EditModel`, and the keys are here because they are the ones
 * the grid's own navigation would otherwise take.
 */
export default function DataGridCellEditor<TRow>(props: Props<TRow>) {
  const { cell, row, columnIndex } = props;
  const { grid } = cell;
  const navigation = useGridNavigationContext();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const errorId = useIdentifier('datagrid-cell-error');
  const { error, pending } = cell;

  // The cell handed the keyboard over, so the editor has to take it: focused from a layout effect, ahead
  // of the paint that would otherwise show a control nobody is in.
  useIsomorphicLayoutEffect(() => {
    const control = wrapperRef.current?.querySelector<HTMLElement>(CONTROL_SELECTOR);

    control?.focus();
    // Selected rather than placed at the end: an edit almost always replaces the value, and a caret
    // somewhere in the old one is a value nobody asked to keep.
    if (control instanceof HTMLInputElement && control.type !== 'checkbox') control.select();
  }, []);

  /** Hand the keyboard back to the cell — where Enter and Escape both leave it. */
  const leave = useCallback(() => {
    wrapperRef.current?.closest<HTMLElement>('[role="gridcell"]')?.focus();
  }, []);

  /**
   * Tab commits and opens the next editable cell, which is what makes a row of them one gesture. Where
   * there is no next one it is left alone, so Tab does what Tab does in a grid and leaves it.
   */
  const stepAside = useCallback(
    (event: React.KeyboardEvent) => {
      if (!navigation) return;

      const next = grid.edits.nextEditable(row - navigation.headerRowCount, columnIndex, event.shiftKey);
      if (!next) return;

      event.preventDefault();
      // Programmatic rather than keyboard: a keyboard move focuses the *cell* from the navigation's own
      // layout effect, which would take the focus straight back off the editor mounting below it.
      navigation.setActiveCell(next.row + navigation.headerRowCount, next.column, { reason: 'programmatic' });
      grid.edits.beginAt(next.row, next.column);
    },
    [columnIndex, grid, navigation, row],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        // An open popup owns Escape: closing it is what the press means, and the edit is still going on.
        if (wrapperRef.current?.querySelector('[aria-expanded="true"]')) return;

        event.preventDefault();
        event.stopPropagation();
        cell.cancelEdit();
        leave();

        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        cell.commitEdit();
        // Still open means the value was refused: the message is on the cell and the caret stays in it.
        if (!cell.editing) leave();

        return;
      }

      if (event.key !== 'Tab') return;

      event.stopPropagation();
      cell.commitEdit();

      if (cell.editing) {
        // Refused, or still being judged — tabbing out of a value nobody has accepted would lose it.
        event.preventDefault();
        return;
      }

      stepAside(event);
    },
    [cell, leave, stepAside],
  );

  // A press somewhere else commits, the way a spreadsheet does. Guarded on this cell still being the one
  // being edited: Tab moves the editor on before the blur it caused arrives.
  const onBlur = useCallback(() => {
    if (!cell.editing || cell.pending) return;

    cell.commitEdit();
  }, [cell]);

  return (
    <Flex
      ref={wrapperRef}
      component={`${grid.componentName}.body.cell.editor` as never}
      variant={{ isPending: pending } as never}
      props={{ onKeyDown }}
      width="fit"
      height="fit"
      ai="center"
    >
      <EditorControl cell={cell} errorId={error ? errorId : undefined} onBlur={onBlur} onCommitted={leave} />

      {/* In the top layer, so a message on the last row is not clipped away by the scroller it is in.
          `role="alert"` rather than a live region of the grid's: the element arrives with the text. */}
      {error && (
        <Overlay
          anchor={wrapperRef}
          side="bottom"
          align="start"
          offset={1}
          matchWidth={false}
          component={`${grid.componentName}.body.cell.error` as never}
          id={errorId}
          props={{ role: 'alert' }}
        >
          {error}
        </Overlay>
      )}
    </Flex>
  );
}

interface ControlProps<TRow> {
  cell: CellModel<TRow>;
  errorId?: string;
  onBlur: () => void;
  /** What a control that commits on its own change calls once it has — a checkbox, a select. */
  onCommitted: () => void;
}

/**
 * The control itself. `checkbox` and `select` commit on the change, because one interaction is the whole
 * value; `text` and `number` wait for Enter, Tab or a press elsewhere, because they are still being typed.
 */
function EditorControl<TRow>(props: ControlProps<TRow>) {
  const { cell, errorId, onBlur, onCommitted } = props;
  const { EditCell } = cell.column.def;
  const { type, placeholder, step, min, max } = cell.editor;
  const columnName = cell.column.header ?? cell.column.key;
  const named = { 'aria-label': `Edit ${columnName}`, 'aria-invalid': errorId ? true : undefined, 'aria-describedby': errorId };

  if (EditCell) return <EditCell cell={cell} />;

  if (type === 'checkbox') {
    return (
      <Checkbox
        checked={!!cell.draft}
        onChange={(event) => {
          cell.setDraft(event.target.checked);
          cell.commitEdit();
          onCommitted();
        }}
        props={{ ...named, onBlur }}
      />
    );
  }

  if (type === 'select') {
    return (
      <Dropdown<string | number | boolean | null>
        value={cell.draft as string | number | boolean | null}
        width="fit"
        variant="compact"
        b={0}
        bgColor="transparent"
        focus={{ outline: 0 }}
        onValueChange={(value) => {
          cell.setDraft(value ?? null);
          cell.commitEdit();
          onCommitted();
        }}
        props={named}
      >
        {optionsOf(cell).map((option) => (
          <Dropdown.Item<string | number | boolean | null> key={String(option.value)} value={option.value}>
            {option.label ?? String(option.value)}
          </Dropdown.Item>
        ))}
      </Dropdown>
    );
  }

  const isNumber = type === 'number';

  return (
    <Textbox
      type={isNumber ? 'number' : 'text'}
      value={cell.draft === null || cell.draft === undefined ? '' : String(cell.draft)}
      placeholder={placeholder}
      step={step}
      width="fit"
      variant="compact"
      b={0}
      bgColor="transparent"
      focus={{ outline: 0 }}
      // A number field hands back a string, and a column of numbers has to stay one — an empty field is
      // `null` rather than `NaN`, which is the value a database calls empty.
      onChange={(event) => {
        const text = event.target.value;

        cell.setDraft(isNumber ? (text === '' ? null : Number(text)) : text);
      }}
      props={{ ...named, min, max, onBlur }}
    />
  );
}

(DataGridCellEditor as React.FunctionComponent).displayName = 'DataGridCellEditor';
