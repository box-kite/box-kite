import { useCallback, useState } from 'react';
import Box from '../../../box';
import SearchIcon from '../../../icons/searchIcon';
import Flex from '../../flex';
import Textbox from '../../textbox';
import GridModel from '../models/gridModel';
import useFilterDraft from '../useFilterDraft';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridGlobalFilter<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const [localValue, setLocalValue] = useState(grid.globalFilterValue);
  const { debounce, cancel } = useFilterDraft(grid.globalFilterValue, (value) => value === localValue, setLocalValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setLocalValue(value);
      debounce('value', () => grid.filter.setGlobalFilter(value));
    },
    [grid, debounce],
  );

  const handleClear = useCallback(() => {
    cancel();
    setLocalValue('');
    grid.filter.setGlobalFilter('');
  }, [grid, cancel]);

  const { filtered, total } = grid.filter.filterStats;
  // The footer already says it; only a grid without one needs the count up here.
  const showStats = !grid.props.def.bottomBar && grid.filter.hasActiveFilters && filtered !== total;

  return (
    <Flex component={`${grid.componentName}.topBar.globalFilter` as never}>
      {showStats && (
        <Box component={`${grid.componentName}.topBar.globalFilter.stats` as never}>
          {filtered}/{total}
        </Box>
      )}
      <Flex position="relative" ai="center">
        <Flex position="absolute" insetStart={3} pointerEvents="none" color="gray-400" theme={{ dark: { color: 'gray-500' } }}>
          <SearchIcon fill="currentColor" width="14px" />
        </Flex>
        <Textbox
          placeholder={grid.localeText.searchPlaceholder}
          variant="compact"
          value={localValue}
          onChange={handleChange}
          ps={8}
          pe={localValue ? 8 : 3}
        />
        {localValue && (
          <Box
            position="absolute"
            insetEnd={2}
            cursor="pointer"
            p={1}
            color="gray-400"
            hover={{ color: 'gray-600' }}
            theme={{ dark: { color: 'gray-500', hover: { color: 'gray-300' } } }}
            props={{ onClick: handleClear }}
          >
            <Box fontSize={12} fontWeight={600}>
              ✕
            </Box>
          </Box>
        )}
      </Flex>
    </Flex>
  );
}
