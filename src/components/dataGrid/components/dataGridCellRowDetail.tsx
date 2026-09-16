import { useCallback } from 'react';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import CellModel from '../models/cellModel';

interface Props<TRow> {
  cell: CellModel<TRow>;
}

export default function DataGridCellRowDetail<TRow>(props: Props<TRow>) {
  const { cell } = props;
  const expanded = cell.isExpanded;

  const toggleHandler = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      cell.toggleDetail();
    },
    [cell],
  );

  return (
    <Button
      component={`${cell.grid.componentName}.body.cell.rowDetail` as never}
      variant={{ isExpanded: expanded } as never}
      type="button"
      onClick={toggleHandler}
      cursor="pointer"
      display="flex"
      ai="center"
      jc="center"
      width="fit"
      height="fit"
      // A chevron with nothing beside it: the name and the state both have to be spelled out.
      props={{
        tabIndex: -1,
        'aria-label': `${expanded ? 'Collapse' : 'Expand'} details for row ${cell.row.rowIndex + 1}`,
        'aria-expanded': expanded,
      }}
    >
      <ExpandIcon fill="currentColor" width="14px" height="14px" rotate={expanded ? 0 : -90} />
    </Button>
  );
}

(DataGridCellRowDetail as React.FunctionComponent).displayName = 'DataGridCellRowDetail';
