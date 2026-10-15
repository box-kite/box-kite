import { useState } from 'react';
import Box from '../../../box';
import CloseIcon from '../../../icons/closeIcon';
import SearchIcon from '../../../icons/searchIcon';
import Button from '../../button';
import Flex from '../../flex';
import Textbox from '../../textbox';
import VisuallyHidden from '../../visuallyHidden';
import GridModel from '../models/gridModel';
import useFilterDraft from '../useFilterDraft';
import DataGridColumnsPanel from './dataGridColumnsPanel';
import DataGridExport from './dataGridExport';
import DataGridListFilterSheet from './dataGridListFilterSheet';
import DataGridListLayout from './dataGridListLayout';
import DataGridListSortSheet from './dataGridListSortSheet';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

function Search<TRow>({ grid }: Props<TRow>) {
  const name = grid.componentName;
  const [value, setValue] = useState(grid.globalFilterValue);
  const { debounce, cancel } = useFilterDraft(grid.globalFilterValue, (committed) => committed === value, setValue);

  return (
    <Flex position="relative" ai="center">
      <Flex position="absolute" insetStart={3.5} pointerEvents="none" color="gray-500" props={{ 'aria-hidden': true }}>
        <SearchIcon fill="currentColor" width="16px" />
      </Flex>
      <Textbox
        component={`${name}.list.toolbar.search` as never}
        width="fit"
        height={11}
        ps={10}
        pe={10}
        b={0}
        borderRadius={3}
        fontSize={16}
        type="search"
        value={value}
        placeholder={grid.localeText.searchPlaceholder}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          debounce('value', () => grid.filter.setGlobalFilter(next));
        }}
        // A placeholder is not a name, and it vanishes as soon as anything is typed.
        props={{ 'aria-label': grid.localeText.searchPlaceholder, enterKeyHint: 'search' }}
      />
      {value && (
        <Button
          type="button"
          component={`${name}.list.sheet.button` as never}
          display="inline-flex"
          ai="center"
          jc="center"
          width={7}
          height={7}
          borderRadius={999}
          cursor="pointer"
          position="absolute"
          insetEnd={2}
          onClick={() => {
            cancel();
            setValue('');
            grid.filter.setGlobalFilter('');
          }}
          props={{ 'aria-label': grid.localeText.clearSearch }}
        >
          <CloseIcon width="16px" />
        </Button>
      )}
    </Flex>
  );
}

/**
 * The list's toolbar: the title and how many rows there are, the search, and a row of pills — Sort, Filters,
 * Select — followed by one chip per filter in force, each removable on its own.
 */
export default function DataGridListToolbar<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { list } = grid;
  const { def } = grid.props;
  const name = grid.componentName;
  const text = grid.localeText;
  const { filtered, total } = grid.filterStats;
  const chips = list.activeFilters;
  const hasSort = list.sortableColumns.length > 0;

  return (
    <Flex component={`${name}.list.toolbar` as never} d="column" gap={3} px={4} pt={4} pb={3}>
      <Flex ai="center" gap={3} flexWrap="wrap">
        <Flex d="column" flex1 minWidth={0}>
          {def.title && (
            <Box id={grid.titleId} fontSize={17} fontWeight={600} lineHeight={24}>
              {def.title}
            </Box>
          )}
          <Box component={`${name}.list.toolbar.count` as never} fontSize={13} css={{ fontVariantNumeric: 'tabular-nums' }}>
            {text.rowCount(filtered, total)}
          </Box>
        </Flex>
        {def.topBar && (
          <Flex ai="center" gap={2} flexWrap="wrap">
            <DataGridColumnsPanel grid={grid} />
            <DataGridExport grid={grid} />
          </Flex>
        )}
      </Flex>

      {def.globalFilter && <Search grid={grid} />}

      <Flex gap={2} overflowX="auto" scrollbarWidth="none" mx={-4} px={4}>
        {hasSort && <DataGridListSortSheet grid={grid} />}
        <DataGridListFilterSheet grid={grid} />
        {def.rowSelection && (
          <Button
            type="button"
            component={`${name}.list.toolbar.button` as never}
            {...DataGridListLayout.PILL}
            variant={{ active: list.selecting } as never}
            onClick={() => list.setSelecting(!list.selecting)}
            props={{ 'aria-pressed': list.selecting }}
          >
            {text.selectRows}
          </Button>
        )}
      </Flex>

      {chips.length > 0 && (
        <Flex gap={2} overflowX="auto" scrollbarWidth="none" mx={-4} px={4}>
          {chips.map((chip) => (
            <Box
              key={chip.column.key}
              tag="span"
              component={`${name}.list.toolbar.chip` as never}
              display="inline-flex"
              ai="center"
              gap={1}
              flexShrink={0}
              height={8}
              ps={3}
              pe={1}
              borderRadius={999}
              fontSize={13}
              textWrap="nowrap"
            >
              <Box tag="span" fontWeight={500}>
                {chip.label}:
              </Box>
              <Box tag="span">{chip.value}</Box>
              <Button
                type="button"
                component={`${name}.list.sheet.button` as never}
                display="inline-flex"
                ai="center"
                jc="center"
                width={7}
                height={7}
                borderRadius={999}
                cursor="pointer"
                onClick={() => chip.column.clearFilter()}
                props={{ 'aria-label': text.clearFilter(chip.label) }}
              >
                <CloseIcon width="14px" />
              </Button>
            </Box>
          ))}
        </Flex>
      )}

      {def.topBarContent && <Box>{def.topBarContent}</Box>}

      {/* A search or a filter changes the list and nothing else says so: WCAG 4.1.3's "5 results" case. */}
      <VisuallyHidden props={{ role: 'status' }}>{grid.hasActiveFilters ? text.rowCount(filtered, total) : ''}</VisuallyHidden>
    </Flex>
  );
}

(DataGridListToolbar as React.FunctionComponent).displayName = 'DataGridListToolbar';
