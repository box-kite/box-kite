import { memo, useCallback } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import { Li } from '../../semantics';
import RowModel from '../models/rowModel';
import { isTreeRow } from '../models/treeRow';
import DataGridListLayout from './dataGridListLayout';
import DataGridListValue from './dataGridListValue';

/** What inside an item owns its own presses, so a press there neither opens the record nor ticks the row. */
const WIDGET_SELECTOR = 'a[href],button,input,select,textarea,label';

interface Props<TRow> {
  row: RowModel<TRow>;
  /** Where the row sits in the grid's rows — what the record view opens at. */
  index: number;
  /** `aria-posinset`/`aria-setsize`: where the item is in the whole list, not in the part drawn. */
  position?: number;
  setSize?: number;
  /** The row's version (`GridModel.rowVersion`). Not read: it is what tells the memo the row moved. */
  version: string;
}

/**
 * One row as a list item: a kicker, the title with one value opposite it, a subtitle, and a few labelled
 * fields — the slots `ListModel.layout` hands out. A press opens the record view, or ticks the row while the
 * list is selecting; the title is the button that does it, so the keyboard has one stop per item.
 */
function DataGridListItemImpl<TRow>(props: Props<TRow>) {
  const { row, index, position, setSize } = props;
  const { grid } = row;
  const { list } = grid;
  const name = grid.componentName;
  const muted = `${name}.list.item.muted`;
  const { title, kicker, subtitle, end, fields } = list.layout.value;
  const { selecting } = list;
  const opens = list.recordViewEnabled && !row.placeholder;
  const tree = isTreeRow<TRow>(row) ? row : undefined;
  const rowDetail = grid.props.def.rowDetail;
  const text = grid.localeText;

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (row.placeholder) return;

      const widget = (event.target as HTMLElement).closest(WIDGET_SELECTOR);
      if (widget && !widget.hasAttribute('data-list-title')) return;

      if (list.selecting) row.toggleSelection();
      else if (list.recordViewEnabled) list.openRecord(row, index);
    },
    [index, list, row],
  );

  const aria = { 'aria-posinset': position, 'aria-setsize': setSize };

  if (row.placeholder) {
    return (
      <Li component={`${name}.list.item` as never} display="flex" d="column" gap={2} px={4} py={4} props={{ ...aria, 'aria-busy': true }}>
        <Box height={4} width="1/2" borderRadius={1} bgColor="gray-100" theme={{ dark: { bgColor: 'gray-800' } }} />
        <Box height={3} width="3/4" borderRadius={1} bgColor="gray-100" theme={{ dark: { bgColor: 'gray-800' } }} />
      </Li>
    );
  }

  const titleText = title ? <DataGridListValue row={row} column={title} /> : text.unnamedRow(row.rowIndex + 1);
  const treeName = title ? String(row.cells.find((c) => c.column === title)?.value ?? '') : '';
  const interactive = selecting || opens;

  return (
    <Li
      component={`${name}.list.item` as never}
      variant={{ interactive, selected: !!grid.props.def.rowSelection && row.selected } as never}
      display="flex"
      gap={3}
      px={4}
      py={3.5}
      userSelect={interactive ? 'none' : undefined}
      // A tree indents, but only so far: a phone has no room for a fourth level of it.
      ps={tree ? 4 + Math.min(tree.level, 3) * 4 : undefined}
      props={{ ...aria, onClick, 'data-list-key': String(row.key) }}
    >
      {selecting && (
        <Flex ai="center" jc="center" width={6} flexShrink={0}>
          <Checkbox
            variant="datagrid"
            checked={row.selected}
            indeterminate={row.indeterminate}
            onChange={row.toggleSelection}
            props={{ 'aria-label': text.selectRow(row.rowIndex + 1) }}
          />
        </Flex>
      )}

      <Flex d="column" gap={0.5} flex1 minWidth={0}>
        {/* The name on one side and the figure on the other, so the figures line up down the list. */}
        <Flex ai="start" gap={3} minWidth={0}>
          <Flex d="column" gap={0.5} flex1 minWidth={0}>
            {kicker && (
              <Box component={muted as never} fontSize={12} fontWeight={500} letterSpacing={0.2} {...DataGridListLayout.TRUNCATE}>
                <DataGridListValue row={row} column={kicker} />
              </Box>
            )}
            <Flex ai="center" gap={1} minWidth={0}>
              {tree?.hasChildren && (
                // Before the title, where a tree's chevron always is — and a real button with `aria-expanded`,
                // since a list has no treegrid row to carry the state.
                <Button
                  type="button"
                  component={`${name}.list.item.toggle` as never}
                  {...DataGridListLayout.ICON_BUTTON}
                  width={8}
                  height={8}
                  ms={-2}
                  onClick={tree.toggleTree}
                  props={{
                    'aria-expanded': tree.treeExpanded,
                    'aria-label': (tree.treeExpanded ? text.collapseTreeRow : text.expandTreeRow)(
                      treeName || text.unnamedRow(row.rowIndex + 1),
                    ),
                  }}
                >
                  <ExpandIcon
                    width="16px"
                    height="16px"
                    rotate={tree.treeExpanded ? 0 : -90}
                    rtl={{ rotate: tree.treeExpanded ? 0 : 90 }}
                  />
                </Button>
              )}
              {opens && !selecting ? (
                <Button
                  type="button"
                  component={`${name}.list.item.title` as never}
                  flex1
                  minWidth={0}
                  fontSize={16}
                  fontWeight={600}
                  lineHeight={22}
                  textAlign="start"
                  {...DataGridListLayout.TRUNCATE}
                  props={{ 'aria-haspopup': 'dialog', 'data-list-title': '' }}
                >
                  {titleText}
                </Button>
              ) : (
                <Box flex1 minWidth={0} fontSize={16} fontWeight={600} lineHeight={22} {...DataGridListLayout.TRUNCATE}>
                  {titleText}
                </Box>
              )}
            </Flex>
            {subtitle.length > 0 && (
              <Box component={muted as never} fontSize={14} lineHeight={20} {...DataGridListLayout.TRUNCATE}>
                {subtitle.map((column, i) => (
                  <Box key={column.key} tag="span" display="inline">
                    {i > 0 && ' · '}
                    <DataGridListValue row={row} column={column} />
                  </Box>
                ))}
              </Box>
            )}
          </Flex>
          {end && (
            // The one value opposite the title, with its column's name under it: "65" alone could be anything.
            <Flex
              d="column"
              ai="end"
              flexShrink={0}
              maxWidth="1/2"
              fontSize={16}
              fontWeight={600}
              lineHeight={22}
              textAlign="end"
              css={{ fontVariantNumeric: 'tabular-nums' }}
              {...DataGridListLayout.TRUNCATE}
            >
              <DataGridListValue row={row} column={end} />
              <Box tag="span" component={muted as never} fontWeight={400} {...DataGridListLayout.LABEL}>
                {end.header ?? String(end.key)}
              </Box>
            </Flex>
          )}
        </Flex>

        {fields.length > 0 && (
          // A `<dl>`, so every value keeps its label for a screen reader as well as for the eye — and a label
          // over its value rather than beside it, so a phone fits two of them a line.
          <Box tag="dl" display="grid" gridTemplateColumns={2} columnGap={4} rowGap={2} m={0} mt={2}>
            {fields.map((column) => (
              <Box key={column.key} minWidth={0}>
                <Box tag="dt" component={muted as never} {...DataGridListLayout.LABEL}>
                  {column.header ?? String(column.key)}
                </Box>
                <Box
                  tag="dd"
                  m={0}
                  fontSize={14}
                  lineHeight={20}
                  css={{ fontVariantNumeric: 'tabular-nums' }}
                  {...DataGridListLayout.TRUNCATE}
                >
                  <DataGridListValue row={row} column={column} />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {rowDetail && (
          <>
            <Button
              type="button"
              component={`${name}.list.item.toggle` as never}
              display="inline-flex"
              ai="center"
              gap={1}
              alignSelf="start"
              minHeight={8}
              mt={1}
              px={2}
              ms={-2}
              borderRadius={2}
              fontSize={13}
              fontWeight={500}
              cursor="pointer"
              onClick={row.toggleDetail}
              props={{ 'aria-expanded': row.expanded }}
            >
              <ExpandIcon width="14px" height="14px" rotate={row.expanded ? 0 : -90} rtl={{ rotate: row.expanded ? 0 : 90 }} />
              {text.details}
            </Button>
            {row.expanded && (
              <Box component={`${name}.list.item.detail` as never} mt={2} p={3} borderRadius={2} fontSize={14}>
                {rowDetail.content(row.data)}
              </Box>
            )}
          </>
        )}
      </Flex>

      {opens && !selecting && (
        <Flex component={muted as never} alignSelf="center" flexShrink={0} props={{ 'aria-hidden': true }}>
          <ExpandIcon width="16px" height="16px" rotate={-90} rtl={{ rotate: 90 }} />
        </Flex>
      )}
    </Li>
  );
}

(DataGridListItemImpl as React.FunctionComponent).displayName = 'DataGridListItem';

/** Memoized on its props, so one row's selection or expansion redraws that item and not the list. */
const DataGridListItem = memo(DataGridListItemImpl) as typeof DataGridListItemImpl;

export default DataGridListItem;
