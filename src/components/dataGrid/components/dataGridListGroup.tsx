import { memo } from 'react';
import ExpandIcon from '../../../icons/expandIcon';
import Checkbox from '../../checkbox';
import List from '../../list';
import { Span } from '../../semantics';
import GroupRowModel from '../models/groupRowModel';
import DataGridListAggregate from './dataGridListAggregate';

interface Props<TRow> {
  row: GroupRowModel<TRow>;
  /** The row's version (`GridModel.rowVersion`). Not read: it is what tells the memo the row moved. */
  version: string;
}

/**
 * A group as a section header: the value, how many rows it holds, and their totals underneath. The toggle is
 * the item's `List.Action`, so the whole header opens and closes the group.
 */
function DataGridListGroupImpl<TRow>(props: Props<TRow>) {
  const { row } = props;
  const { grid } = row;
  const aggregates = row.cells.flatMap((cell) => (cell.aggregate ? [cell.aggregate] : []));
  const value = row.placeholder ? '' : String(row.groupValue);

  return (
    <List.Item
      size="sm"
      // A section header: tinted from the text, so the hover and pressed tints the item already has still read over it.
      bgColor="currentColor/3"
      ps={4 + Math.min(row.depth, 3) * 4}
      props={{ 'aria-busy': row.placeholder || undefined }}
    >
      {grid.list.selecting && row.selectable && (
        <List.Actions>
          <Checkbox
            variant="datagrid"
            checked={row.selected}
            indeterminate={row.indeterminate}
            onChange={row.toggleSelectAll}
            props={{ 'aria-label': grid.localeText.selectGroupRows(value) }}
          />
        </List.Actions>
      )}
      <ExpandIcon width="16px" height="16px" flexShrink={0} rotate={row.expanded ? 0 : -90} rtl={{ rotate: row.expanded ? 0 : 90 }} />
      <List.Content>
        <List.Title lines={1} fontSize={14} fontWeight={600}>
          <List.Action onClick={() => row.toggleRow()} props={{ 'aria-expanded': row.expanded }}>
            {value}
          </List.Action>
        </List.Title>
        {aggregates.length > 0 && (
          <List.Row secondary wrap columnGap={4} fontSize={13} css={{ fontVariantNumeric: 'tabular-nums' }}>
            {aggregates.map((cell) => (
              <Span key={cell.column.key} display="inline-flex" gap={1}>
                <Span>{cell.column.header ?? String(cell.column.key)}</Span>
                <Span fontWeight={600}>
                  <DataGridListAggregate cell={cell} />
                </Span>
              </Span>
            ))}
          </List.Row>
        )}
      </List.Content>
      <List.Meta px={2} borderRadius={999} fontSize={12} fontWeight={600} lineHeight={20} bgColor="currentColor/10" alignSelf="center">
        {row.count}
      </List.Meta>
    </List.Item>
  );
}

(DataGridListGroupImpl as React.FunctionComponent).displayName = 'DataGridListGroup';

const DataGridListGroup = memo(DataGridListGroupImpl) as typeof DataGridListGroupImpl;

export default DataGridListGroup;
