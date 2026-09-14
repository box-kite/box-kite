import { useCallback } from 'react';
import Button from '../../button';
import Flex from '../../flex';
import { Path, Svg } from '../../svg';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The `def.export` buttons: one per format asked for. Two buttons rather than a menu, so a grid that can
 * export does not also bundle the menu component to say so.
 */
export default function DataGridExport<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const config = grid.exportConfig;

  // Each press awaits the writer's chunk; a rejected import must not become an unhandled rejection.
  const csv = useCallback(() => void grid.exportCsv(config).catch(() => undefined), [grid, config]);
  const xlsx = useCallback(() => void grid.exportXlsx(config).catch(() => undefined), [grid, config]);

  if (!config) return null;

  return (
    <Flex component={`${grid.componentName}.topBar.export` as never} ai="center" gap={2}>
      {config.csv !== false && (
        <ExportButton componentName={grid.componentName} onClick={csv} label="Export CSV">
          CSV
        </ExportButton>
      )}
      {config.xlsx !== false && (
        <ExportButton componentName={grid.componentName} onClick={xlsx} label="Export Excel">
          Excel
        </ExportButton>
      )}
    </Flex>
  );
}

(DataGridExport as React.FunctionComponent).displayName = 'DataGridExport';

function ExportButton(props: { componentName: string; onClick: () => void; label: string; children: React.ReactNode }) {
  const { componentName, onClick, label, children } = props;

  return (
    <Button component={`${componentName}.topBar.export.button` as never} onClick={onClick} props={{ 'aria-label': label }}>
      <Svg viewBox="0 0 20 20" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6}>
        <Path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3.5 13.5v2a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2" strokeLinecap="round" />
      </Svg>
      {children}
    </Button>
  );
}
