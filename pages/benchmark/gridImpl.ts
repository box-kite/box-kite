import { ComponentType } from 'react';
import { BenchRow } from './benchData';
import { ScenarioId } from './benchModel';

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

/**
 * What the picker knows about a library before anything of it is loaded: what to call it, what the
 * measured tier costs, what that tier cannot do — and how to fetch the rest.
 */
export interface BenchImplInfo {
  id: string;
  label: string;
  /** The tier the numbers are from. A benchmark of a paid tier is a benchmark of different software. */
  tier: string;
  /** Where that tier's own feature list says so, so the line above is checkable rather than asserted. */
  href: string;
  /**
   * The scenarios this tier cannot run, and the short reason printed where the number would be. A
   * missing number with a reason beside it is the comparison; a number for a grid that did something
   * else is not.
   */
  unavailable?: Partial<Record<ScenarioId, string>>;
  /** Fetched when the reader picks it: three grid libraries is a megabyte no other page pays for. */
  load: () => Promise<GridImpl>;
}

/** Every grid in the benchmark is laid out the same, so none of them is measured rendering more pixels. */
export const ROW_HEIGHT = 32;
export const VISIBLE_ROWS = 18;
export const COLUMN_WIDTH = 140;
export const HEADER_HEIGHT = 40;
/** The scroller's height in pixels, which is what a grid that sizes itself from a row count comes out at. */
export const GRID_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS + HEADER_HEIGHT;
/** The same height as a Box prop takes it, on the ÷4 spacing scale — a grid that sizes itself needs neither. */
export const GRID_BOX_HEIGHT = GRID_HEIGHT / 4;
