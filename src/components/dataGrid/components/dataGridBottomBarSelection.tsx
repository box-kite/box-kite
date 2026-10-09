import Box from '../../../box';
import Button from '../../button';
import Flex from '../../flex';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/** The selection's half of the bottom bar: the count, how much of it the filters hide, and the two ways out. */
export default function DataGridBottomBarSelection<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const selected = grid.selectedRows.size;
  const viewing = grid.isSelectionView;

  return (
    <Flex component={`${grid.componentName}.bottomBar.selection` as never}>
      <Box component={`${grid.componentName}.bottomBar.info` as never}>
        {grid.localeText.selectedCount(selected, grid.hiddenSelectedCount)}
      </Box>
      {grid.canShowSelection && (selected > 0 || viewing) && (
        // A toggle names what it does when pressed, so the text stays put and `aria-pressed` says the state.
        <Button
          type="button"
          component={`${grid.componentName}.bottomBar.action` as never}
          variant={{ pressed: viewing } as never}
          props={{ 'aria-pressed': viewing }}
          onClick={grid.toggleSelectionView}
        >
          {grid.localeText.showSelected}
        </Button>
      )}
      {selected > 0 && (
        <Button type="button" component={`${grid.componentName}.bottomBar.action` as never} onClick={grid.clearSelection}>
          <Box tag="span" props={{ 'aria-hidden': true }}>
            ✕
          </Box>
          {grid.localeText.clearSelection}
        </Button>
      )}
    </Flex>
  );
}
