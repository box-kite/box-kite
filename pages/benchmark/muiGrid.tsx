import { ThemeProvider, createTheme } from '@mui/material/styles';
import { DataGrid, GridColDef, GridFilterModel } from '@mui/x-data-grid';
import { version } from '@mui/x-data-grid/package.json';
import { useMemo } from 'react';
import Box from '../../src/box';
import { SORT_COLUMN, benchColumns } from './benchColumns';
import { BenchRow, FILTER_COUNTRY } from './benchData';
import { BenchGridProps, GRID_BOX_HEIGHT, GridImpl, HEADER_HEIGHT, ROW_HEIGHT } from './gridImpl';

const columns: GridColDef<BenchRow>[] = benchColumns.map((column) => ({
  field: column.key,
  headerName: column.header,
  width: column.width,
  type: column.numeric ? 'number' : 'string',
  filterable: column.key === 'country',
}));

const countryFilter: GridFilterModel = { items: [{ field: 'country', operator: 'equals', value: FILTER_COUNTRY }] };
const noFilter: GridFilterModel = { items: [] };

const lightTheme = createTheme({ palette: { mode: 'light' } });
const darkTheme = createTheme({ palette: { mode: 'dark' } });

/** The pager the free tier always renders, which the grid's own height does not include. */
const FOOTER_HEIGHT = 13;

function MuiGrid({ data, filtered }: BenchGridProps) {
  const [theme] = Box.useTheme();
  const muiTheme = useMemo(() => (theme === 'dark' ? darkTheme : lightTheme), [theme]);

  return (
    <ThemeProvider theme={muiTheme}>
      <Box height={GRID_BOX_HEIGHT + FOOTER_HEIGHT}>
        <DataGrid
          rows={data}
          columns={columns}
          rowHeight={ROW_HEIGHT}
          columnHeaderHeight={HEADER_HEIGHT}
          filterModel={filtered ? countryFilter : noFilter}
          disableRowSelectionOnClick
        />
      </Box>
    </ThemeProvider>
  );
}

/**
 * MUI X Data Grid, the free tier — which paginates whatever it is given, a hundred rows to a page, so
 * the fling has no hundred thousand rows to fling and the grouping scenario is a Premium feature.
 */
const impl: GridImpl = {
  id: 'mui-x',
  label: 'MUI X Data Grid',
  version,
  Grid: MuiGrid,
  scroller: (container) => container.querySelector<HTMLElement>('.MuiDataGrid-virtualScroller'),
  rowSelector: '.MuiDataGrid-row',
  sort: (container) => {
    const header = container.querySelector<HTMLElement>(`.MuiDataGrid-columnHeader[data-field="${SORT_COLUMN}"]`);
    header?.querySelector<HTMLElement>('.MuiDataGrid-columnHeaderTitleContainer')?.click();
  },
};

export default impl;
