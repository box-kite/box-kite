import Box from '../../../box';
import Button from '../../button';
import Flex from '../../flex';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The selection, pinned to the bottom of the screen while there is one: how many rows are ticked and the two
 * ways to change that in bulk. At the bottom because that is where a thumb is, and where a phone's own
 * contextual bars put what a selection is for.
 */
export default function DataGridListSelectionBar<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const name = grid.componentName;
  const text = grid.localeText;
  const selected = grid.selectedRows.size;

  if (!grid.props.def.rowSelection || selected === 0) return null;

  return (
    <Flex
      component={`${name}.list.selectionBar` as never}
      position="sticky"
      bottom={0}
      zIndex={2}
      ai="center"
      gap={2}
      px={4}
      py={2}
      fontSize={14}
      fontWeight={500}
    >
      <Box flex1 minWidth={0} textWrap="nowrap" css={{ fontVariantNumeric: 'tabular-nums' }}>
        {text.selectedRows(selected)}
      </Box>
      {!grid.allRowsSelected && (
        <Button
          type="button"
          minHeight={10}
          px={3}
          borderRadius={2}
          fontSize={14}
          fontWeight={500}
          cursor="pointer"
          active={{ bgColor: 'white/15' }}
          theme={{ dark: { active: { bgColor: 'black/10' } } }}
          onClick={grid.toggleSelectAllRows}
        >
          {text.selectAll}
        </Button>
      )}
      <Button
        type="button"
        minHeight={10}
        px={3}
        borderRadius={2}
        fontSize={14}
        fontWeight={500}
        cursor="pointer"
        active={{ bgColor: 'white/15' }}
        theme={{ dark: { active: { bgColor: 'black/10' } } }}
        onClick={grid.clearSelection}
      >
        {text.clearSelection}
      </Button>
    </Flex>
  );
}

(DataGridListSelectionBar as React.FunctionComponent).displayName = 'DataGridListSelectionBar';
