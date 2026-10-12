import ColumnModel from './columnModel';
import GridModel from './gridModel';

export interface ColumnVisibilityEntry<TRow> {
  id: string;
  label: string;
  /** The header group's text, when the column sits under one. */
  group?: string;
  column: ColumnModel<TRow>;
  visible: boolean;
}

/** A run of entries under one header group, in column order. `group` is absent for ungrouped columns. */
export interface ColumnVisibilitySection<TRow> {
  group?: string;
  entries: ColumnVisibilityEntry<TRow>[];
}

/**
 * Backs the top-bar columns panel: the toggleable (user data) columns, which are currently shown, the
 * search over them, and a diff-based bulk setter.
 */
export default class ColumnVisibilityModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  /** All user data leafs (visible and hidden) — excludes row-number/selection/detail/grouping. */
  public get entries(): ColumnVisibilityEntry<TRow>[] {
    return this.grid.columns.value.leafs
      .filter((c) => c.isData)
      .map((column) => {
        const group = column.group?.header ?? column.group?.key;

        return {
          id: String(column.key),
          label: String(column.header ?? column.key),
          group: group === undefined ? undefined : String(group),
          column,
          visible: column.isVisible,
        };
      });
  }

  public get selectedIds(): string[] {
    return this.entries.filter((e) => e.visible).map((e) => e.id);
  }

  public get total(): number {
    return this.entries.length;
  }

  public get visibleCount(): number {
    return this.total - this.hiddenCount;
  }

  public get hiddenCount(): number {
    return this.entries.reduce((n, e) => (e.visible ? n : n + 1), 0);
  }

  public get hasHidden(): boolean {
    return this.hiddenCount > 0;
  }

  /** The entries whose label or group contains `query`, ignoring case and surrounding space. */
  public search(query: string): ColumnVisibilityEntry<TRow>[] {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return this.entries;

    return this.entries.filter((e) => e.label.toLocaleLowerCase().includes(needle) || !!e.group?.toLocaleLowerCase().includes(needle));
  }

  /** `entries` cut into consecutive runs that share a group, which is what the panel draws a heading over. */
  public sections(entries: ColumnVisibilityEntry<TRow>[]): ColumnVisibilitySection<TRow>[] {
    return entries.reduce<ColumnVisibilitySection<TRow>[]>((sections, entry) => {
      const last = sections.at(-1);
      if (last && last.group === entry.group) {
        last.entries.push(entry);
      } else {
        sections.push({ group: entry.group, entries: [entry] });
      }

      return sections;
    }, []);
  }

  /** Make exactly the columns in `ids` visible, toggling only those whose state must change. */
  public setVisibility = (ids: string[]): void => {
    const next = new Set(ids);
    this.entries.forEach((entry) => {
      const shouldBeVisible = next.has(entry.id);
      if (entry.visible !== shouldBeVisible) {
        entry.column.toggleVisibility();
      }
    });
  };

  /** Show or hide every column in `entries` (all of them by default), leaving the rest as they are. */
  public setAll = (visible: boolean, entries: ColumnVisibilityEntry<TRow>[] = this.entries): void => {
    entries.forEach((entry) => {
      if (entry.visible !== visible) {
        entry.column.toggleVisibility();
      }
    });
  };
}
