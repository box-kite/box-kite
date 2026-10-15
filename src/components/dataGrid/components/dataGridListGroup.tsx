import { memo } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import { Li } from '../../semantics';
import GroupRowModel from '../models/groupRowModel';
import DataGridListAggregate from './dataGridListAggregate';

interface Props<TRow> {
  row: GroupRowModel<TRow>;
  /** The row's version (`GridModel.rowVersion`). Not read: it is what tells the memo the row moved. */
  version: string;
}

/** A group as a section header: the value, how many rows it holds, and their totals underneath. */
function DataGridListGroupImpl<TRow>(props: Props<TRow>) {
  const { row } = props;
  const { grid } = row;
  const name = grid.componentName;
  const aggregates = row.cells.flatMap((cell) => (cell.aggregate ? [cell.aggregate] : []));
  const value = row.placeholder ? '' : String(row.groupValue);

  return (
    <Li
      component={`${name}.list.group` as never}
      display="flex"
      d="column"
      gap={0.5}
      px={4}
      py={2}
      ps={4 + Math.min(row.depth, 3) * 4}
      props={{ 'aria-busy': row.placeholder || undefined }}
    >
      <Flex ai="center" gap={2}>
        {grid.list.selecting && row.selectable && (
          <Checkbox
            variant="datagrid"
            checked={row.selected}
            indeterminate={row.indeterminate}
            onChange={row.toggleSelectAll}
            props={{ 'aria-label': grid.localeText.selectGroupRows(value) }}
          />
        )}
        <Button
          type="button"
          component={`${name}.list.group.toggle` as never}
          display="flex"
          ai="center"
          gap={2}
          minHeight={9}
          width="fit"
          fontSize={14}
          fontWeight={600}
          textAlign="start"
          cursor="pointer"
          onClick={() => row.toggleRow()}
          props={{ 'aria-expanded': row.expanded }}
        >
          <ExpandIcon width="16px" height="16px" rotate={row.expanded ? 0 : -90} rtl={{ rotate: row.expanded ? 0 : 90 }} />
          <Box tag="span" flex1 minWidth={0} textOverflow="ellipsis" overflow="hidden" textWrap="nowrap">
            {value}
          </Box>
          <Box
            tag="span"
            component={`${name}.list.group.count` as never}
            px={2}
            borderRadius={999}
            fontSize={12}
            fontWeight={600}
            lineHeight={20}
          >
            {row.count}
          </Box>
        </Button>
      </Flex>
      {aggregates.length > 0 && (
        <Box
          component={`${name}.list.item.muted` as never}
          display="flex"
          flexWrap="wrap"
          columnGap={4}
          ps={7}
          pb={1}
          fontSize={13}
          css={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {aggregates.map((cell) => (
            <Box key={cell.column.key} tag="span" display="inline-flex" gap={1}>
              <Box tag="span">{cell.column.header ?? String(cell.column.key)}</Box>
              <Box tag="span" fontWeight={600}>
                <DataGridListAggregate cell={cell} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Li>
  );
}

(DataGridListGroupImpl as React.FunctionComponent).displayName = 'DataGridListGroup';

const DataGridListGroup = memo(DataGridListGroupImpl) as typeof DataGridListGroupImpl;

export default DataGridListGroup;
