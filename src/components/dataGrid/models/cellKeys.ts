import { Key } from '../contracts/dataGridContract';

/**
 * The four columns the grid adds for itself, by the key each is found under. Their own module rather
 * than `gridModel`'s, because a model that needs one of them would otherwise import the grid at load
 * time — and `SourceGroupRowModel` extends `GroupRowModel` across exactly that cycle, which leaves the
 * base class undefined depending on which file the bundler reached first.
 */
export const ROW_NUMBER_CELL_KEY: Key = 'row-number-cell';
export const ROW_SELECTION_CELL_KEY: Key = 'row-selection-cell';
export const GROUPING_CELL_KEY: Key = 'grouping-cell';
export const ROW_DETAIL_CELL_KEY: Key = 'row-detail-cell';
