import { AllCommunityModule, ColDef, FilterModel, ModuleRegistry, colorSchemeDark, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import Box from '../../src/box';
import { SORT_COLUMN, benchColumns } from './benchColumns';
import { BenchRow, FILTER_COUNTRY } from './benchData';
import { BenchGridProps, GRID_BOX_HEIGHT, GridImpl, HEADER_HEIGHT, ROW_HEIGHT } from './gridImpl';

// v33 split the grid into modules and registers none of them itself: without this every grid renders an
// error panel where the rows go.
ModuleRegistry.registerModules([AllCommunityModule]);

const columnDefs: ColDef<BenchRow>[] = benchColumns.map((column) => ({
  field: column.key,
  headerName: column.header,
  width: column.width,
  type: column.numeric ? 'numericColumn' : undefined,
  filter: column.key === 'country' ? 'agTextColumnFilter' : false,
}));

const countryFilter: FilterModel = { country: { filterType: 'text', type: 'equals', filter: FILTER_COUNTRY } };

// The Theming API rather than a stylesheet import: v33 moved the themes into JavaScript, and the grid
// injects its own CSS from this object.
const lightTheme = themeQuartz;
const darkTheme = themeQuartz.withPart(colorSchemeDark);

function AgGrid({ data, filtered }: BenchGridProps) {
  const grid = useRef<AgGridReact<BenchRow>>(null);
  const [theme] = Box.useTheme();

  // AG's filter is set through the grid API rather than by a prop, and from a layout effect so the work
  // lands inside the commit the benchmark is timing rather than after the paint that ends it.
  useLayoutEffect(() => {
    grid.current?.api?.setFilterModel(filtered ? countryFilter : null);
  }, [filtered]);

  const gridTheme = useMemo(() => (theme === 'dark' ? darkTheme : lightTheme), [theme]);

  return (
    <Box height={GRID_BOX_HEIGHT}>
      <AgGridReact<BenchRow>
        ref={grid}
        theme={gridTheme}
        rowData={data}
        columnDefs={columnDefs}
        rowHeight={ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        getRowId={(row) => String(row.data.id)}
      />
    </Box>
  );
}

/** AG Grid Community — everything but the grouping scenario, which is an Enterprise module. */
const impl: GridImpl = {
  id: 'ag-grid',
  label: 'AG Grid Community',
  version: AllCommunityModule.version,
  Grid: AgGrid,
  // Found in the browser rather than guessed: AG's scroller is `ag-grid-viewport`, an ancestor of the
  // element the cells sit in.
  scroller: (container) => container.querySelector<HTMLElement>('.ag-grid-viewport'),
  // The label inside the header cell, which is what AG puts its own sort handler on. AG virtualizes
  // columns, so this only exists for a column that is on screen — which is why the scenario presses a
  // heading near the left edge.
  sort: (container) => container.querySelector<HTMLElement>(`.ag-header-cell[col-id="${SORT_COLUMN}"] .ag-header-cell-label`)?.click(),
};

export default impl;
