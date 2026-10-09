import { memo, useEffect, useRef, useState } from 'react';
import Box from '../../../box';
import HeaderCellUtils from '../../../utils/dataGrid/headerCellUtils';
import Grid from '../../grid';
import GridModel from '../models/gridModel';
import DataGridFilterRow from './dataGridFilterRow';
import DataGridHeaderCell from './dataGridHeaderCell';

interface Props<TRow> {
  grid: GridModel<TRow>;
  /** `GridModel.headerVersion`. Not read: it is what tells the memo below the header has something new to draw. */
  version: string;
}

function DataGridHeaderImpl<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const headerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(HeaderCellUtils.INITIAL);
  const sliding = grid.headerHover === 'sliding';

  const track = (event: React.PointerEvent) => {
    const header = headerRef.current;
    if (!sliding || !header || event.pointerType === 'touch') return;
    if (HeaderCellUtils.isOnResizer(event.target)) return setHover((state) => HeaderCellUtils.pause(state));

    const cell = HeaderCellUtils.cellAt(header, event.target);
    const next = cell && HeaderCellUtils.bounds(header, cell);
    setHover((state) => HeaderCellUtils.hover(state, next));
  };

  const leave = () => setHover((state) => HeaderCellUtils.hover(state, undefined));

  // A scroll moves the cells out from under a pill placed in px — a pinned one even moves inside the header.
  const tracking = hover.visible || hover.paused;
  useEffect(() => {
    if (!tracking) return;

    document.addEventListener('scroll', leave, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', leave, { capture: true });
  }, [tracking]);

  const { bounds } = hover;

  return (
    <Grid
      ref={headerRef}
      component={`${grid.componentName}.header` as never}
      props={{ role: 'rowgroup', onPointerMove: sliding ? track : undefined, onPointerLeave: sliding ? leave : undefined }}
      style={{ gridTemplateColumns: grid.gridTemplateColumns.value }}
    >
      {grid.headerRows.value.map((row, rowIndex) => {
        return (
          // `display: contents` is what lets a row exist for the accessibility tree without
          // existing for the layout: the cells stay direct children of the header's CSS grid, so
          // a column still spans the rows above and below it.
          <Box key={rowIndex} display="contents" props={{ role: 'row', 'aria-rowindex': rowIndex + 1 }}>
            {row.map((cell, columnIndex) => (
              <DataGridHeaderCell key={cell.uniqueKey} column={cell} row={rowIndex} columnIndex={columnIndex} />
            ))}
          </Box>
        );
      })}

      <DataGridFilterRow grid={grid} />

      {sliding && bounds && (
        <Box
          tag="span"
          component={`${grid.componentName}.header.hover` as never}
          // Key order is precedence: `entering` replaces the travelling transition `backward` would set.
          variant={{ visible: hover.visible, backward: hover.backward, entering: hover.entering } as never}
          // Measured px are per instance, so an inline style — the reason the tabs' sliding indicator is one.
          style={{ left: `${bounds.left}px`, right: `${bounds.right}px`, top: `${bounds.top}px`, bottom: `${bounds.bottom}px` }}
          props={{ 'aria-hidden': true }}
        />
      )}
    </Grid>
  );
}

(DataGridHeaderImpl as React.FunctionComponent).displayName = 'DataGridHeader';

/** Memoized, so a press that only moves the tab stop does not redraw the header and the filters under it. */
const DataGridHeader = memo(DataGridHeaderImpl) as typeof DataGridHeaderImpl;

export default DataGridHeader;
