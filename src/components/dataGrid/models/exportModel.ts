import { DataGridExportOptions, ExportRow, ExportTable, Key } from '../contracts/dataGridContract';
import { aggregate } from './aggregationModel';
import ColumnModel from './columnModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';
import RowModel from './rowModel';
import type { TreeNode } from './treeModel';
import { isTreeRow } from './treeRow';

/** Roughly how many characters fit in a pixel width, once Excel's cell padding is taken off. */
const PIXELS_PER_CHARACTER = 7;

/**
 * What an export writes, decided here and rendered by nobody: the columns, the rows the filters and the
 * sort left, and the grouping as levels rather than as indentation. Both formats are handed this same
 * table, which is why a CSV and a workbook of the same grid hold the same figures.
 *
 * It is a model rather than part of the writers so that it can be tested without producing a file, and so
 * the writers stay in the lazy chunk — this is the only export code the grid's own bundle carries.
 */
export default class ExportModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  /**
   * The columns a file gets: the visible data columns, **plus** the ones grouping took off the screen.
   * A grouped column is not hidden — its values moved to the group rows — and a spreadsheet with no
   * Country column in it is not the grid that was exported.
   */
  public columns(keys?: Key[]): ColumnModel<TRow>[] {
    const columns = this.grid.columns.value.leafs.filter((c) => c.isData && (c.isVisible || this.grid.groupColumns.has(c.key)));

    return keys ? keys.map((key) => columns.find((c) => c.key === key)).filter((c): c is ColumnModel<TRow> => !!c) : columns;
  }

  /** A column's heading, which is its own `header` or the key it reads. */
  public header(column: ColumnModel<TRow>): string {
    return column.header ?? String(column.key);
  }

  /** Its width in characters — the unit a spreadsheet sizes columns in, from the pixels the grid uses. */
  public width(column: ColumnModel<TRow>): number {
    const pixels = column.inlineWidth ?? this.grid.DEFAULT_COLUMN_WIDTH_PX;

    return Math.min(80, Math.max(6, Math.round((pixels / PIXELS_PER_CHARACTER) * 10) / 10));
  }

  /** One row's value for one column: the column's own `exportValue` when it has one, else the raw field. */
  private value(column: ColumnModel<TRow>, row: TRow): unknown {
    const { exportValue } = column.def;

    return exportValue ? exportValue(row) : row[column.key as keyof TRow];
  }

  /** A column's aggregate over a set of rows, or null where it has no aggregation. */
  private aggregateOf(column: ColumnModel<TRow>, rows: TRow[]): unknown {
    const fn = column.aggregate;

    return fn
      ? aggregate(
          fn,
          rows.map((row) => this.value(column, row)),
          rows,
        )
      : null;
  }

  /**
   * The table. Group rows carry their own value in the column they group by and a total in every column
   * that aggregates; a collapsed group exports collapsed, so the file opens looking like the screen.
   */
  public table(options: DataGridExportOptions = {}): ExportTable {
    const columns = this.columns(options.columns);
    const withGroups = options.groups ?? true;
    const rows: ExportRow[] = [];

    const walk = (items: (RowModel<TRow> | GroupRowModel<TRow>)[], level: number, hidden: boolean): void => {
      for (const item of items) {
        if (item.kind === 'group') {
          const collapsed = !item.expanded;
          const groupRows = item.allRows.map((r) => r.data);

          if (withGroups) {
            rows.push({
              kind: 'group',
              level,
              hidden,
              collapsed,
              values: columns.map((column) =>
                column.key === item.groupColumn.key ? item.groupValue : this.aggregateOf(column, groupRows),
              ),
            });
          }

          walk(item.rows, withGroups ? level + 1 : level, hidden || (withGroups && collapsed));
        } else {
          // A block the datasource has not answered is not a row of blanks: an export writes what the
          // grid holds, and a placeholder holds nothing.
          if (item.placeholder) continue;

          // A lazy tree's rows come through here rather than through `walkTree`, and their depth is on the
          // row: the outline is what is on screen, which is all a datasource export ever writes.
          const depth = isTreeRow<TRow>(item) ? item.level : level;

          rows.push({
            kind: 'data',
            level: depth,
            hidden,
            collapsed: false,
            values: columns.map((column) => this.value(column, item.data)),
          });
        }
      }
    };

    if (this.grid.tree.isEager) this.walkTree(rows, columns);
    else walk(this.grid.rows.value, 0, false);

    if (options.footer ?? this.grid.aggregation.hasFooter) rows.push(this.footerRow(columns));

    return {
      columns: columns.map((column) => ({
        key: column.key,
        header: this.header(column),
        width: this.width(column),
        format: column.def.exportFormat,
      })),
      rows,
    };
  }

  /**
   * A tree, as Excel's outline: a row's level is its depth and a shut row exports `collapsed`, with
   * everything under it `hidden` — the same two flags a collapsed group writes, so the file opens
   * looking like the screen. The rows are walked rather than the models: a shut row builds none of its
   * children, and an export writes the whole tree.
   */
  private walkTree(rows: ExportRow[], columns: ColumnModel<TRow>[]): void {
    const { tree } = this.grid;

    const walk = (nodes: TreeNode<TRow>[], level: number, hidden: boolean): void => {
      nodes.forEach((node) => {
        const collapsed = node.children.length > 0 && !tree.isExpanded(this.grid.getRowKey(node.data), level);

        rows.push({
          kind: 'data',
          level,
          hidden,
          collapsed,
          values: columns.map((column) => this.value(column, node.data)),
        });

        walk(node.children, level + 1, hidden || collapsed);
      });
    };

    walk(tree.nodes.value, 0, false);
  }

  /**
   * The grand totals, over the rows the filters left. The label goes in the leading column with nothing
   * of its own to say — the same column it occupies on screen when that column is exported at all.
   */
  private footerRow(columns: ColumnModel<TRow>[]): ExportRow {
    const data = this.grid.filteredData;
    const label = this.grid.aggregation.footerLabel;
    const labelColumn = columns.find((c) => !c.aggregate);

    return {
      kind: 'footer',
      level: 0,
      hidden: false,
      collapsed: false,
      values: columns.map((column) => {
        if (column.aggregate) return this.aggregateOf(column, data);

        // A label is only written where it is a word: `footer: { label: <Badge/> }` renders in the grid
        // and means nothing in a file.
        return column === labelColumn && (typeof label === 'string' || typeof label === 'number') ? label : null;
      }),
    };
  }

  /** The file's name, without an extension: what was asked for, else the grid's title, else `export`. */
  public fileName(options: DataGridExportOptions = {}): string {
    const { title } = this.grid.props.def;
    const fallback = typeof title === 'string' && title.trim() ? title.trim() : 'export';

    return options.fileName?.trim() || fallback;
  }
}
