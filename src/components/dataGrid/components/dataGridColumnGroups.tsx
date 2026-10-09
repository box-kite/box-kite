import React from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import GroupingIcon from '../../../icons/groupingIcon';
import Button from '../../button';
import Flex from '../../flex';
import { Span } from '../../semantics';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridColumnGroups<TRow>(props: Props<TRow>) {
  const { grid } = props;

  if (grid.groupColumns.size === 0) return null;

  return (
    <Flex component={`${grid.componentName}.topBar.columnGroups` as never}>
      <Span component={`${grid.componentName}.topBar.columnGroups.icon` as never}>
        <GroupingIcon width="100%" fill="currentColor" />
      </Span>
      {grid.groupedColumns.map((column) => {
        return (
          <React.Fragment key={column.key}>
            <ExpandIcon fill="currentColor" width="14px" height="14px" rotate={-90} />
            <Flex component={`${grid.componentName}.topBar.columnGroups.item` as never}>
              {column.header ?? column.key}

              <Button
                component={`${grid.componentName}.topBar.columnGroups.item.icon` as never}
                onClick={() => grid.toggleGrouping(column.key)}
                // "✕" is a character, not a name: the chip beside it says which grouping this
                // removes and the button has to say so too.
                props={{ 'aria-label': grid.localeText.stopGrouping(String(column.header ?? column.key)) }}
              >
                <Box fontSize={10} color="gray-400" hover={{ color: 'gray-600' }}>
                  ✕
                </Box>
              </Button>
            </Flex>
          </React.Fragment>
        );
      })}
    </Flex>
  );
}

(DataGridColumnGroups as React.FunctionComponent).displayName = 'DataGridColumnGroups';
