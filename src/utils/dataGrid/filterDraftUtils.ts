import type { FilterValue, NumberFilterValue } from '../../components/dataGrid/contracts/dataGridContract';

/** What a number filter's inputs hold while they are being typed into: text, since `1.` is on its way to a number. */
export interface NumberFilterDraft {
  operator: NumberFilterValue['operator'];
  value: string;
  valueTo: string;
}

/**
 * Whether a filter input's draft already says what the grid holds. When it does not, the grid's value
 * came from somewhere else — "Clear filters", a controlled prop — and the input has to take it.
 */
namespace FilterDraftUtils {
  /** A text filter stores what was typed, and a blank one is no filter at all. */
  export function textMatches(draft: string, filter: FilterValue | undefined): boolean {
    const held = filter?.type === 'text' ? filter.value : '';

    return held === (draft.trim() ? draft : '');
  }

  export function numberDraft(filter: FilterValue | undefined): NumberFilterDraft {
    if (filter?.type !== 'number') return { operator: 'eq', value: '', valueTo: '' };

    return { operator: filter.operator, value: String(filter.value), valueTo: filter.valueTo === undefined ? '' : String(filter.valueTo) };
  }

  /** Read the way the model parses, so `1.` matches a stored `1` and a half-typed number is never rewritten. */
  export function numberMatches(draft: NumberFilterDraft, filter: FilterValue | undefined): boolean {
    const value = parseFloat(draft.value);
    if (filter?.type !== 'number') return isNaN(value);
    if (filter.value !== value) return false;
    if (filter.operator !== draft.operator) return false;
    if (filter.operator !== 'between') return true;

    const valueTo = parseFloat(draft.valueTo);
    return filter.valueTo === undefined ? isNaN(valueTo) : filter.valueTo === valueTo;
  }
}

export default FilterDraftUtils;
