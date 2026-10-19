import Box from '../../../box';
import Flex from '../../flex';
import CellModel from '../models/cellModel';
import DataGridDateValue, { dateFormatOf } from './dataGridDateValue';

interface Props<TRow> {
  cell: CellModel<TRow>;
}

export default function DataGridCellText<TRow>(props: Props<TRow>) {
  const { cell } = props;
  const { value } = cell;
  const dateFormat = dateFormatOf(cell.column, value);

  return (
    <Flex
      component={`${cell.grid.componentName}.body.cell.text` as never}
      height="fit"
      width="fit"
      overflow="auto"
      ai="center"
      jc={cell.column.align}
    >
      <Box px={3} textOverflow="ellipsis" overflow="hidden" textWrap="nowrap">
        {dateFormat ? <DataGridDateValue value={value} format={dateFormat} /> : (value as string)}
      </Box>
    </Flex>
  );
}

(DataGridCellText as React.FunctionComponent).displayName = 'DataGridCellText';
