import { useCallback, useEffect, useRef } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import { ReportInteractions } from '../../../react/a11y/interactions';
import Button from '../../button';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import { H3 } from '../../semantics';
import CellModel from '../models/cellModel';
import GridModel from '../models/gridModel';
import DataGridCellEditor from './dataGridCellEditor';
import DataGridListLayout from './dataGridListLayout';
import DataGridListSheet from './dataGridListSheet';
import DataGridListValue from './dataGridListValue';

/** How far a finger travels sideways before it is a swipe to the next row, in px. */
const SWIPE_DISTANCE = 60;

interface Props<TRow> {
  grid: GridModel<TRow>;
}

function RecordField<TRow>({ cell, index }: { cell: CellModel<TRow>; index: number }) {
  const { grid, column } = cell;
  const name = grid.componentName;
  const label = String(column.header ?? column.key);
  const { editing } = cell;
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // The editor unmounts on Enter or Escape and takes the focus with it, so it comes back to the button.
  useEffect(() => {
    if (wasEditing.current && !editing) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  return (
    // `dt` and `dd` straight inside the group, as a `<dl>` requires — the Edit button rides in the `dd`.
    <Box component={`${name}.list.sheet.line` as never} py={3} bb={1}>
      <Box tag="dt" component="list.muted" fontSize={13} lineHeight={18}>
        {label}
      </Box>
      <Box
        tag="dd"
        display="flex"
        ai="center"
        gap={2}
        m={0}
        fontSize={16}
        lineHeight={24}
        css={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
      >
        {editing ? (
          <Flex component={`${name}.list.sheet.input` as never} {...DataGridListLayout.INPUT} flex1 ai="center" px={1}>
            <DataGridCellEditor cell={cell} row={-1} columnIndex={index} />
          </Flex>
        ) : (
          <Box flex1 minWidth={0}>
            <DataGridListValue row={cell.row} column={column} />
          </Box>
        )}
        {cell.editable && !editing && (
          <Button
            ref={editRef}
            type="button"
            component={`${name}.list.sheet.button` as never}
            {...DataGridListLayout.SHEET_BUTTON}
            height={10}
            onClick={() => cell.beginEdit()}
            props={{ 'aria-label': grid.localeText.editCell(label) }}
          >
            {grid.localeText.edit}
          </Button>
        )}
      </Box>
    </Box>
  );
}

/**
 * One row at a time: every column of it, a label over each value, in a sheet with a pager — the drill-in a
 * list item leads to. The pager follows the list's own order and filters, Left/Right and a sideways swipe
 * step it, and an editable column is edited here, through the same `def.onCellEdit` a table cell goes through.
 */
export default function DataGridListRecord<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { list } = grid;
  const name = grid.componentName;
  const text = grid.localeText;
  const record = list.record;
  const position = list.recordPosition;
  const { title } = list.layout.value;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const recordKey = record?.key;

  // Another row is another page: it starts at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [recordKey]);

  const close = useCallback(() => {
    const key = list.record?.key;
    grid.edits.cancel();
    list.closeRecord();

    // The dialog hands focus back to the item it opened from, but the pager may have moved on since: the
    // item for the row on screen is where the reader is. After the dialog's own return, hence the frame.
    requestAnimationFrame(() => {
      const items = grid.sizingElement?.querySelectorAll<HTMLElement>('[data-list-key]') ?? [];
      const item = Array.from(items).find((el) => el.dataset.listKey === String(key));

      item?.querySelector<HTMLElement>('[data-list-action]')?.focus();
    });
  }, [grid, list]);

  const step = useCallback(
    (direction: 1 | -1) => {
      // A half-typed value belongs to the row it was typed into, so moving on commits it first.
      if (grid.edits.isOpen) grid.edits.commit();
      if (!grid.edits.isOpen) list.stepRecord(direction);
    },
    [grid, list],
  );

  // The swipe follows the reading order: a finger dragging towards the start brings the next row in.
  const onPointerDown = (event: React.PointerEvent) => {
    swipe.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    step(dx < 0 !== grid.isRtl ? 1 : -1);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('input,select,textarea,[role="combobox"]')) return;

    const forward = grid.isRtl ? 'ArrowLeft' : 'ArrowRight';
    const back = grid.isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key !== forward && event.key !== back) return;

    event.preventDefault();
    step(event.key === forward ? 1 : -1);
  };

  const pager = record && position && (
    <Flex ai="center" gap={0.5} flexShrink={0}>
      <Button
        type="button"
        component={`${name}.list.sheet.button` as never}
        {...DataGridListLayout.ICON_BUTTON}
        disabled={!list.hasPreviousRecord}
        onClick={() => step(-1)}
        props={{ 'aria-label': text.previousRow }}
      >
        <ExpandIcon width="18px" height="18px" rotate={90} rtl={{ rotate: -90 }} />
      </Button>
      <Box fontSize={13} color="base-500" textWrap="nowrap" css={{ fontVariantNumeric: 'tabular-nums' }} props={{ 'aria-live': 'polite' }}>
        {text.recordPosition(position.position, position.total)}
      </Box>
      <Button
        type="button"
        component={`${name}.list.sheet.button` as never}
        {...DataGridListLayout.ICON_BUTTON}
        disabled={!list.hasNextRecord}
        onClick={() => step(1)}
        props={{ 'aria-label': text.nextRow }}
      >
        <ExpandIcon width="18px" height="18px" rotate={-90} rtl={{ rotate: 90 }} />
      </Button>
    </Flex>
  );

  const rowDetail = grid.props.def.rowDetail;

  return (
    <DataGridListSheet
      grid={grid}
      open={!!record}
      onClose={close}
      tall
      title={record && title ? <DataGridListValue row={record} column={title} /> : ''}
      actions={pager}
      onKeyDown={onKeyDown}
      bodyRef={bodyRef}
      bodyProps={{ onPointerDown, onPointerUp }}
    >
      {record && (
        <>
          {grid.props.def.rowSelection && (
            <Box py={3}>
              <Checkbox
                variant="datagrid"
                checked={record.selected}
                onChange={record.toggleSelection}
                label={text.selectRow(record.rowIndex + 1)}
                labelProps={{ display: 'flex', ai: 'center', gap: 3, fontSize: 15 }}
              />
            </Box>
          )}
          <Box tag="dl" m={0}>
            {list.recordColumns.map((column) => {
              const index = record.cells.findIndex((c) => c.column === column);

              return index === -1 ? null : <RecordField key={column.key} cell={record.cells[index]} index={index} />;
            })}
          </Box>
          {rowDetail && (
            <Flex d="column" gap={2} py={3}>
              <H3 m={0} fontSize={14} fontWeight={600}>
                {text.details}
              </H3>
              <ReportInteractions>{rowDetail.content(record.data)}</ReportInteractions>
            </Flex>
          )}
        </>
      )}
    </DataGridListSheet>
  );
}

(DataGridListRecord as React.FunctionComponent).displayName = 'DataGridListRecord';
