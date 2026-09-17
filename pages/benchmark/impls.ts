import { version } from '../../package.json';
import BoxKiteGrid from './boxKiteGrid';
import { GridImpl } from './gridImpl';

/** Box Kite's own `DataGrid`, and the two gestures the scenarios need that a prop cannot express. */
export const boxKite: GridImpl = {
  id: 'box-kite',
  label: 'Box Kite',
  version,
  Grid: BoxKiteGrid,
  scroller: (container) => container.querySelector<HTMLElement>('[role="grid"]'),
  sort: (container) => {
    const header = [...container.querySelectorAll<HTMLElement>('[role="columnheader"]')].find((cell) =>
      cell.textContent?.startsWith('Salary'),
    );

    // The press is on the header's own inner element, which is where the sort handler sits — a press on
    // the cell would bubble away from it rather than into it.
    (header?.firstElementChild as HTMLElement | undefined)?.click();
  },
};

/** Every grid the page can measure, in the order the picker offers them. */
const impls: readonly GridImpl[] = [boxKite];

export default impls;
