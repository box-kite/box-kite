import type { CatalogSchema } from '../../core';

/**
 * Where a widget sits, in cells. The unit is the whole point: a layout written in cells is the same
 * layout at any width, and a drag moves by one of them rather than by a pixel somebody measured.
 */
export interface DashboardItem {
  /** What this place belongs to — the `id` of the widget that fills it. */
  id: string;
  /** Column and row, both zero-based. */
  x: number;
  y: number;
  /** How many columns and rows it spans, at least one of each. */
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  /** Never moved and never resized — the rest of the layout flows around it. */
  fixed?: boolean;
}

/**
 * The artifact: one column space, one list of places, and a version in front of both. It is what a model
 * emits, what a host stores and what a drag reports back, which is why it is plain JSON with no
 * component, no callback and no measurement anywhere in it.
 */
export interface DashboardLayout {
  version: number;
  /** The space the items are written in. A narrower container renders a projection of it.  */
  columns: number;
  items: DashboardItem[];
}

/** What a layout that arrived as JSON got wrong, in the shape the spec renderer reports issues in. */
export interface DashboardIssue {
  code: 'not-an-object' | 'version' | 'columns' | 'items' | 'invalid-item' | 'duplicate-id';
  /** Where it happened, printable: `items.2.w`. */
  path: string;
  message: string;
}

/** The pixel a cell steps by on each axis — one cell plus the gap after it. Measured once per drag. */
export interface DashboardStep {
  x: number;
  y: number;
}

namespace DashboardUtils {
  /** The layout format's own version, bumped when its shape changes and never when a dashboard does. */
  export const VERSION = 1;

  /** Both ends of the column space a layout may declare, so a generated `columns: 400` cannot be rendered. */
  export const MIN_COLUMNS = 1;
  export const MAX_COLUMNS = 24;

  function clamp(value: number, low: number, high: number): number {
    return Math.min(Math.max(value, low), high);
  }

  function whole(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  }

  /** Whether two places want the same cell. Touching edges do not overlap — `x + w` is the first column past it. */
  export function overlaps(left: DashboardItem, right: DashboardItem): boolean {
    return left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y;
  }

  function firstCollision(placed: readonly DashboardItem[], item: DashboardItem): DashboardItem | undefined {
    return placed.find((other) => other.id !== item.id && overlaps(other, item));
  }

  /** One item made sensible on its own: whole cells, its own minimum and maximum, and inside the grid. */
  function clampItem(item: DashboardItem, columns: number): DashboardItem {
    const maxW = Math.min(item.maxW ?? columns, columns);
    const w = clamp(whole(item.w, 1), Math.max(1, Math.min(item.minW ?? 1, maxW)), Math.max(1, maxW));
    const h = clamp(whole(item.h, 1), Math.max(1, item.minH ?? 1), Math.max(1, item.maxH ?? Number.MAX_SAFE_INTEGER));

    return { ...item, w, h, x: clamp(whole(item.x, 0), 0, columns - w), y: Math.max(whole(item.y, 0), 0) };
  }

  /** Reading order, and the order the items are stored in: down the rows, then along them. */
  function byReadingOrder(left: DashboardItem, right: DashboardItem): number {
    return left.y - right.y || left.x - right.x || (left.id < right.id ? -1 : 1);
  }

  /**
   * Every item clamped, then floated up and pushed down until nothing overlaps — so a layout has no holes
   * and a widget cannot be parked in mid-air. That is what makes two dashboards of the same items compare
   * equal, and it is why a drop below a neighbour rises to meet it.
   *
   * `priorityId` is the item a drag is holding: it settles first, so everything else moves around it.
   */
  export function resolve(items: readonly DashboardItem[], columns: number, priorityId?: string): DashboardItem[] {
    const space = clamp(whole(columns, 12), MIN_COLUMNS, MAX_COLUMNS);
    const clamped = items.map((item) => clampItem(item, space));
    // A fixed item is placed before anything that could be pushed into it, and the held one before the rest.
    const rank = (item: DashboardItem) => (item.fixed ? 0 : item.id === priorityId ? 1 : 2);
    const order = [...clamped].sort((left, right) => rank(left) - rank(right) || byReadingOrder(left, right));
    const placed: DashboardItem[] = [];

    for (const item of order) {
      if (item.fixed) {
        placed.push(item);
        continue;
      }

      const settled = { ...item };

      while (settled.y > 0 && !firstCollision(placed, { ...settled, y: settled.y - 1 })) settled.y--;

      let hit = firstCollision(placed, settled);
      while (hit) {
        settled.y = hit.y + hit.h;
        hit = firstCollision(placed, settled);
      }

      placed.push(settled);
    }

    return placed.sort(byReadingOrder);
  }

  /** The same, as a layout. Every function here returns one of these: a change is always the whole artifact. */
  export function normalize(layout: DashboardLayout, priorityId?: string): DashboardLayout {
    const columns = clamp(whole(layout.columns, 12), MIN_COLUMNS, MAX_COLUMNS);

    return { version: VERSION, columns, items: resolve(layout.items, columns, priorityId) };
  }

  export function itemOf(layout: DashboardLayout, id: string): DashboardItem | undefined {
    return layout.items.find((item) => item.id === id);
  }

  /** Where a widget sits in reading order, which is the order a stacked dashboard renders in. */
  export function ranks(layout: DashboardLayout): Map<string, number> {
    return new Map(layout.items.map((item, index) => [item.id, index]));
  }

  /** A widget sent to a cell. The rest of the layout moves around it rather than refusing the move. */
  export function moveTo(layout: DashboardLayout, id: string, x: number, y: number): DashboardLayout {
    const target = itemOf(layout, id);
    if (!target || target.fixed) return layout;

    const moved = layout.items.map((item) => (item.id === id ? { ...item, x, y: Math.max(y, 0) } : item));

    return normalize({ ...layout, items: moved }, id);
  }

  /** A widget given a size. Its own minimum and maximum are applied by `resolve`, so this only asks. */
  export function resizeTo(layout: DashboardLayout, id: string, w: number, h: number): DashboardLayout {
    const target = itemOf(layout, id);
    if (!target || target.fixed) return layout;

    const resized = layout.items.map((item) => (item.id === id ? { ...item, w, h } : item));

    return normalize({ ...layout, items: resized }, id);
  }

  /** A widget added where there is room for it: under everything, which compaction then floats up. */
  export function add(layout: DashboardLayout, item: Omit<DashboardItem, 'x' | 'y'> & Partial<DashboardItem>): DashboardLayout {
    const bottom = layout.items.reduce((lowest, placed) => Math.max(lowest, placed.y + placed.h), 0);

    return normalize({ ...layout, items: [...layout.items, { x: 0, y: bottom, ...item }] });
  }

  export function remove(layout: DashboardLayout, id: string): DashboardLayout {
    return normalize({ ...layout, items: layout.items.filter((item) => item.id !== id) });
  }

  /**
   * The same layout in a narrower space — arithmetic, not a measurement, which is what lets every
   * projection be a class the browser chooses between. Widths scale and round up to a cell, so a widget
   * never projects to nothing; the compaction afterwards is what closes the holes that leaves.
   */
  export function project(layout: DashboardLayout, columns: number): DashboardLayout {
    const space = clamp(whole(columns, 12), MIN_COLUMNS, MAX_COLUMNS);
    if (space === layout.columns) return normalize(layout);

    const ratio = space / layout.columns;
    const scaled = (value: number | undefined) =>
      value === undefined ? undefined : clamp(Math.max(1, Math.round(value * ratio)), 1, space);
    const items = layout.items.map((item) => {
      const w = clamp(Math.max(1, Math.round(item.w * ratio)), 1, space);

      // The bounds are in the layout's own columns too, so they scale with it — a `minW: 2` meant as a
      // sixth of twelve is the whole width of a two-column projection if it is carried across unchanged
      // (measured in a browser: it took two widgets full width and hid the arrangement entirely).
      return { ...item, w, x: clamp(Math.floor(item.x * ratio), 0, space - w), minW: scaled(item.minW), maxW: scaled(item.maxW) };
    });

    return normalize({ version: VERSION, columns: space, items });
  }

  /** Whether a layout says anything new — so a drag that crossed no cell costs no render and no callback. */
  export function same(left: DashboardLayout, right: DashboardLayout): boolean {
    if (left === right) return true;
    if (left.columns !== right.columns || left.items.length !== right.items.length) return false;

    return left.items.every((item, index) => {
      const other = right.items[index];

      return item.id === other.id && item.x === other.x && item.y === other.y && item.w === other.w && item.h === other.h;
    });
  }

  /** How many cells a pointer has travelled, rounded to the nearest one. The step is a cell plus its gap. */
  export function cellsMoved(dx: number, dy: number, step: DashboardStep): { columns: number; rows: number } {
    return { columns: step.x > 0 ? Math.round(dx / step.x) : 0, rows: step.y > 0 ? Math.round(dy / step.y) : 0 };
  }

  /**
   * What an item is allowed to be called at all. A layout id lands in a `aria-controls`-style lookup and in
   * a React key, so it is a string with something in it and nothing else is asked of it.
   */
  function isId(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  function isCount(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function readItem(value: unknown, path: string, issues: DashboardIssue[]): DashboardItem | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push({ code: 'invalid-item', path, message: 'A layout item has to be an object.' });

      return undefined;
    }

    const source = value as Record<string, unknown>;

    if (!isId(source.id)) {
      issues.push({ code: 'invalid-item', path: `${path}.id`, message: 'A layout item needs an id naming the widget it places.' });

      return undefined;
    }

    if (!isCount(source.x) || !isCount(source.y) || !isCount(source.w) || !isCount(source.h)) {
      issues.push({ code: 'invalid-item', path, message: `Item "${source.id}" needs numeric x, y, w and h.` });

      return undefined;
    }

    const bounds = (['minW', 'minH', 'maxW', 'maxH'] as const).reduce<Partial<DashboardItem>>((acc, key) => {
      if (isCount(source[key])) acc[key] = Math.round(source[key] as number);

      return acc;
    }, {});

    return {
      id: source.id,
      x: Math.round(source.x as number),
      y: Math.round(source.y as number),
      w: Math.round(source.w as number),
      h: Math.round(source.h as number),
      ...bounds,
      ...(source.fixed === true ? { fixed: true } : {}),
    };
  }

  /**
   * A layout read from somewhere it could be anything: a model's answer, a `localStorage` string, a
   * column of a database written by a version that has since moved on. Everything unusable is dropped and
   * reported rather than thrown — a dashboard missing one widget is a dashboard, and an exception is not.
   */
  export function parse(value: unknown, fallbackColumns = 12): { layout: DashboardLayout; issues: DashboardIssue[] } {
    const issues: DashboardIssue[] = [];
    const empty = { version: VERSION, columns: fallbackColumns, items: [] };

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      issues.push({ code: 'not-an-object', path: '', message: 'A layout has to be an object.' });

      return { layout: normalize(empty), issues };
    }

    const source = value as Record<string, unknown>;

    // A version from the future is read anyway, on its say-so about the fields this one knows: refusing it
    // would empty a dashboard that a newer tab had merely added a field to.
    if (source.version !== VERSION) {
      issues.push({
        code: 'version',
        path: 'version',
        message: `Layout version ${String(source.version)} was read as version ${VERSION}.`,
      });
    }

    const columns = isCount(source.columns) ? clamp(Math.round(source.columns as number), MIN_COLUMNS, MAX_COLUMNS) : fallbackColumns;
    if (!isCount(source.columns)) {
      issues.push({ code: 'columns', path: 'columns', message: `No column count, so the layout was read in ${fallbackColumns}.` });
    }

    if (!Array.isArray(source.items)) {
      issues.push({ code: 'items', path: 'items', message: 'A layout needs an items array.' });

      return { layout: normalize({ ...empty, columns }), issues };
    }

    const seen = new Set<string>();
    const items = source.items.reduce<DashboardItem[]>((acc, entry, index) => {
      const item = readItem(entry, `items.${index}`, issues);
      if (!item) return acc;

      if (seen.has(item.id)) {
        issues.push({
          code: 'duplicate-id',
          path: `items.${index}.id`,
          message: `Two items are called "${item.id}"; the second was dropped.`,
        });

        return acc;
      }

      seen.add(item.id);
      acc.push(item);

      return acc;
    }, []);

    return { layout: normalize({ version: VERSION, columns, items }), issues };
  }

  /**
   * The layout as JSON Schema — what a model generates a dashboard under, and the half of the contract a
   * prompt cannot carry. Deliberately inside the subset `catalog()` emits and `<SpecRenderer>` validates,
   * so a host can hand it to the same machinery: the schema says the shape and `parse` says the sense.
   */
  export const SCHEMA: CatalogSchema = {
    type: 'object',
    description: 'A dashboard layout: a column space and one place per widget, in cells.',
    required: ['version', 'columns', 'items'],
    additionalProperties: false,
    properties: {
      version: { type: 'integer', description: `The layout format's version. ${VERSION} today.` },
      columns: { type: 'integer', description: `The column space the items are written in, ${MIN_COLUMNS} to ${MAX_COLUMNS}.` },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'x', 'y', 'w', 'h'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', description: 'The id of the widget this place belongs to.' },
            x: { type: 'integer', description: 'Column, zero-based.' },
            y: { type: 'integer', description: 'Row, zero-based.' },
            w: { type: 'integer', description: 'Columns spanned, at least 1.' },
            h: { type: 'integer', description: 'Rows spanned, at least 1.' },
            minW: { type: 'integer', description: 'The narrowest it may be resized to.' },
            minH: { type: 'integer', description: 'The shortest it may be resized to.' },
            maxW: { type: 'integer', description: 'The widest it may be resized to.' },
            maxH: { type: 'integer', description: 'The tallest it may be resized to.' },
            fixed: { type: 'boolean', description: 'Neither moved nor resized; everything else flows around it.' },
          },
        },
      },
    },
  };
}

export default DashboardUtils;
