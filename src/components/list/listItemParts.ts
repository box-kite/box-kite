import { mergeDeep } from '../../core';
import { BoxComponentStyles } from '../../types';

/** How an item's spacing is set: `md` by default, `sm` for a dense list, `lg` for one with room to breathe. */
export type ListItemSize = 'sm' | 'md' | 'lg';

// What every item is, whichever component draws it: `List.Item`, a `SwipeItem`, a sortable one.
export const ITEM_FRAME: BoxComponentStyles = {
  position: 'relative',
  css: { borderRadius: 'var(--list-item-radius, 0)' },
  // The line above every item but the first: a pseudo-element, so `--list-divider-inset` can start it at the text.
  before: { position: 'absolute', top: 0, insetEnd: 0, css: { insetInlineStart: 'var(--list-divider-inset, 0px)', height: '1px' } },
  // The frame a `separated` list draws round each item, which a border would take from the item's own props.
  after: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    css: { border: 'var(--list-item-frame, none)', borderRadius: 'inherit' },
  },
  // A variable rather than `none`, so a windowed list whose first rendered item is not the first item can say so.
  nth: { first: { before: { css: { display: 'var(--list-first-divider, none)' } } } },
};

/** The row an item lays its parts out in. */
export const ITEM_ROW: BoxComponentStyles = { display: 'flex', ai: 'center', gap: 3, px: 4, py: 3, minHeight: 14 };

export const ITEM_SIZES: Record<ListItemSize, BoxComponentStyles> = {
  sm: { gap: 2, py: 2, minHeight: 11 },
  md: {},
  lg: { gap: 4, py: 4, minHeight: 18 },
};

/** The style objects a default and a prop both write into, merged rather than replaced — a clamp is in `css`, a divider in `before`. */
const NESTED = ['css', 'before', 'after', 'nth'] as const;

/** A part's defaults under the props it was given. */
export function withDefaults<T extends object>(defaults: BoxComponentStyles, props: T): T {
  const merged: Record<string, unknown> = { ...defaults, ...props };
  const base = defaults as Record<string, object | undefined>;
  for (const key of NESTED) {
    const own = (props as Record<string, object | undefined>)[key];
    if (base[key] && own) merged[key] = mergeDeep(base[key], own);
  }

  return merged as T;
}
