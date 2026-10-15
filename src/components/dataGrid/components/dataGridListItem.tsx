import { memo } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Checkbox from '../../checkbox';
import List from '../../list';
import { Span } from '../../semantics';
import Skeleton from '../../skeleton';
import RowModel from '../models/rowModel';
import { isTreeRow } from '../models/treeRow';
import DataGridListLayout from './dataGridListLayout';
import DataGridListValue from './dataGridListValue';

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
 * One row as a `List.Item`: a kicker, the title with one value opposite it, a subtitle, and a few labelled
 * fields — the slots `ListModel.layout` hands out. The title is the item's `List.Action`: it opens the record
 * view, and while the list is selecting it is the label of the row's checkbox, so a press anywhere on the
 * item ticks it.
 */
function DataGridListItemImpl<TRow>(props: Props<TRow>) {
  const { row, index, position, setSize } = props;
  const { grid } = row;
  const { list } = grid;
  const { title, kicker, subtitle, end, fields } = list.layout.value;
  const { selecting } = list;
  const opens = list.recordViewEnabled && !row.placeholder;
  const tree = isTreeRow<TRow>(row) ? row : undefined;
  const rowDetail = grid.props.def.rowDetail;
  const text = grid.localeText;
  const aria = { 'aria-posinset': position, 'aria-setsize': setSize };

  if (row.placeholder) {
    return (
      <List.Item props={{ ...aria, 'aria-busy': true }}>
        <Skeleton lines={2} flex1 />
      </List.Item>
    );
  }

  const titleText = title ? <DataGridListValue row={row} column={title} /> : text.unnamedRow(row.rowIndex + 1);
  const treeName = title ? String(row.cells.find((c) => c.column === title)?.value ?? '') : '';
  const checkboxId = list.checkboxId(row.key);

  return (
    <List.Item
      ai="start"
      selected={!!grid.props.def.rowSelection && row.selected}
      chevron={opens && !selecting}
      // A tree indents, but only so far: a phone has no room for a fourth level of it.
      ps={tree ? 4 + Math.min(tree.level, 3) * 4 : undefined}
      props={{ ...aria, 'data-list-key': String(row.key) }}
    >
      {selecting && (
        <List.Actions width={6} jc="center" alignSelf="center">
          <Checkbox
            id={checkboxId}
            variant="datagrid"
            checked={row.selected}
            indeterminate={row.indeterminate}
            onChange={row.toggleSelection}
          />
        </List.Actions>
      )}

      <List.Content>
        {kicker && (
          <List.Overline lines={1}>
            <DataGridListValue row={row} column={kicker} />
          </List.Overline>
        )}
        {/* The name on one side and the figure on the other, so the figures line up down the list. */}
        <List.Row ai="start" gap={3}>
          <List.Row jc="start" ai="center" gap={1} flex1>
            {tree?.hasChildren && (
              // Before the title, where a tree's chevron always is — and a real button with `aria-expanded`,
              // since a list has no treegrid row to carry the state. Above the item's action, so it takes its own press.
              <List.Actions ms={-2}>
                <Button
                  type="button"
                  component={`${grid.componentName}.list.toggle` as never}
                  {...DataGridListLayout.ICON_BUTTON}
                  width={8}
                  height={8}
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
              </List.Actions>
            )}
            <List.Title lines={1} flex1 fontWeight={600}>
              {selecting ? (
                <List.Action props={{ htmlFor: checkboxId }}>{titleText}</List.Action>
              ) : opens ? (
                <List.Action props={{ 'aria-haspopup': 'dialog' }} onClick={() => list.openRecord(row, index)}>
                  {titleText}
                </List.Action>
              ) : (
                titleText
              )}
            </List.Title>
          </List.Row>
          {end && (
            // The one value opposite the title, with its column's name under it: "65" alone could be anything.
            <List.End fontSize={16} fontWeight={600} lineHeight={22} {...DataGridListLayout.TRUNCATE}>
              <DataGridListValue row={row} column={end} />
              <List.Meta fontWeight={400} {...DataGridListLayout.LABEL}>
                {end.header ?? String(end.key)}
              </List.Meta>
            </List.End>
          )}
        </List.Row>
        {subtitle.length > 0 && (
          <List.Description lines={1}>
            {subtitle.map((column, i) => (
              <Span key={column.key}>
                {i > 0 && ' · '}
                <DataGridListValue row={row} column={column} />
              </Span>
            ))}
          </List.Description>
        )}

        {fields.length > 0 && (
          // A `<dl>`, so every value keeps its label for a screen reader as well as for the eye.
          <List.Fields mt={2} css={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {fields.map((column) => (
              <List.Field key={column.key} label={column.header ?? String(column.key)}>
                <Box {...DataGridListLayout.TRUNCATE}>
                  <DataGridListValue row={row} column={column} />
                </Box>
              </List.Field>
            ))}
          </List.Fields>
        )}

        {rowDetail && (
          <>
            <List.Actions alignSelf="start" mt={1} ms={-2}>
              <Button
                type="button"
                component={`${grid.componentName}.list.toggle` as never}
                display="inline-flex"
                ai="center"
                gap={1}
                minHeight={8}
                px={2}
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
            </List.Actions>
            {row.expanded && (
              // Above the action too: the detail is content of its own, with its own text to select and links to follow.
              <List.Actions display="block" mt={2}>
                <Box component={`${grid.componentName}.list.detail` as never} p={3} borderRadius={2} fontSize={14}>
                  {rowDetail.content(row.data)}
                </Box>
              </List.Actions>
            )}
          </>
        )}
      </List.Content>
    </List.Item>
  );
}

(DataGridListItemImpl as React.FunctionComponent).displayName = 'DataGridListItem';

/** Memoized on its props, so one row's selection or expansion redraws that item and not the list. */
const DataGridListItem = memo(DataGridListItemImpl) as typeof DataGridListItemImpl;

export default DataGridListItem;
