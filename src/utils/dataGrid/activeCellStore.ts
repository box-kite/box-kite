/**
 * Which cell holds the grid's tab stop, as a store each cell subscribes to by its own coordinates. Handed
 * down as a value, a move changed it for every cell on screen; subscribed to, it re-renders the two cells
 * whose answer changed.
 */
export default class ActiveCellStore {
  private readonly listeners = new Set<() => void>();

  constructor(
    private row: number,
    private column: number,
  ) {}

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public isActive(row: number, column: number): boolean {
    return row === this.row && column === this.column;
  }

  public set(row: number, column: number): void {
    if (row === this.row && column === this.column) return;

    this.row = row;
    this.column = column;
    this.listeners.forEach((listener) => listener());
  }
}
