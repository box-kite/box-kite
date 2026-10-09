import { describe, expect, it, vi } from 'vitest';
import ActiveCellStore from './activeCellStore';

describe('ActiveCellStore', () => {
  it('answers for one cell and tells its listeners when the cell moves', () => {
    const store = new ActiveCellStore(0, 0);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(2, 1);

    expect(store.isActive(2, 1)).toBe(true);
    expect(store.isActive(0, 0)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the cell has not moved, or to a listener that has left', () => {
    const store = new ActiveCellStore(1, 1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1, 1);
    unsubscribe();
    store.set(3, 0);

    expect(listener).not.toHaveBeenCalled();
  });
});
