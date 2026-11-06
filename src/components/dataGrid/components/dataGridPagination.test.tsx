import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Box from '../../../box';
import DataGrid from '../../dataGrid';

const rows = Array.from({ length: 30 }, (_, id) => ({ id, name: `Row ${id}` }));
const wideTextboxes = Box.createComponents({ textbox: { styles: { width: 'fit' } } });

describe('DataGrid pagination', () => {
  afterEach(cleanup);

  // Bug #336: an app's full-width textboxes stretched the page number and wrapped the bar.
  it('keeps the page number its own width when the app restyles every textbox', () => {
    render(
      <Box.Components value={wideTextboxes}>
        <DataGrid
          data={rows}
          def={{ rowKey: 'id', bottomBar: true, pagination: { totalCount: 30, pageSize: 10 }, columns: [{ key: 'name' }] }}
        />
      </Box.Components>,
    );

    expect(getComputedStyle(screen.getByRole('spinbutton', { name: 'Page number' })).width).toBe('auto');
  });
});
