import { ComponentType } from 'react';
import { BenchRow } from './benchData';

/**
 * The state every grid under test is driven through. The scenarios are the same five state changes for
 * each library, so what differs between two numbers is the grid rather than what it was asked to do.
 */
export interface BenchGridProps {
  data: BenchRow[];
  /** Filter the country column down to a single value — about a twentieth of the rows. */
  filtered: boolean;
  /** Group by department with the two aggregates, the first level open. */
  grouped: boolean;
}

/** One library, and the three things the benchmark needs from it beyond rendering. */
export interface GridImpl {
  id: string;
  label: string;
  /** The version measured, printed beside the numbers — a benchmark with no version is a rumour. */
  version: string;
  Grid: ComponentType<BenchGridProps>;
  /** The element that scrolls, inside the container the grid was mounted in. */
  scroller: (container: HTMLElement) => HTMLElement | null;
  /** Sort by the salary column the way a reader would: this library's own header press. */
  sort: (container: HTMLElement) => void;
}

/** Every grid in the benchmark is laid out the same, so none of them is measured rendering more pixels. */
export const ROW_HEIGHT = 32;
export const VISIBLE_ROWS = 18;
export const COLUMN_WIDTH = 140;
