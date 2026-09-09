/**
 * `@box-kite/react/a11y` — the behaviour primitives the accessible components are built from. Every
 * APG pattern needs the same four mechanics (return focus, move through a list, dismiss, hold a value the
 * consumer may own), none of them visible in the markup, so they live here once and are published because
 * this library will never cover every pattern. Client hooks: the entry carries a `'use client'` banner.
 */
export { default as useControllableState } from './react/a11y/useControllableState';
export type { ChangeDetails, ChangeHandler, ControllableStateOptions, SetControllableState } from './react/a11y/useControllableState';

export { default as useDismiss } from './react/a11y/useDismiss';
export type { DismissOptions, DismissReason, ElementLike } from './react/a11y/useDismiss';

export { default as useFocusReturn } from './react/a11y/useFocusReturn';
export type { FocusReturnOptions } from './react/a11y/useFocusReturn';

export { default as useIdentifier } from './react/identity/useIdentifier';

export { default as useRovingFocus } from './react/a11y/useRovingFocus';
export type {
  RovingFocus,
  RovingFocusItemProps,
  RovingFocusOptions,
  RovingFocusReason,
  RovingOrientation,
} from './react/a11y/useRovingFocus';
