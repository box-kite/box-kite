/**
 * A canvas's roles, on their own so that `boxComponents.ts` can declare them without dragging the `--xy-*` mapping
 * into the bundle every Box already pays for. `FlowUtils` re-exports them, so the public names are unchanged.
 */

/** What a canvas is painted from. Every `--xy-*` variable the container declares reads one of these. */
export const ROLES = ['surface', 'panel', 'text', 'border', 'grid', 'edge', 'selection', 'handle'] as const;

export type Role = (typeof ROLES)[number];

/** A role's paint in one theme: a palette token, an alias like `accent-500`, or one with an alpha. */
export type RoleTokens = Readonly<Record<Role, string>>;

/** The roles on a light page. `accent`/`base` rather than named families, so `Box.palette()` reaches the canvas. */
export const LIGHT: RoleTokens = {
  surface: 'white',
  panel: 'white',
  text: 'base-900',
  border: 'base-300',
  grid: 'base-300',
  edge: 'base-400',
  selection: 'accent-500',
  handle: 'base-700',
};

/** The same roles on a dark page. */
export const DARK: RoleTokens = {
  surface: 'base-950',
  panel: 'base-900',
  text: 'base-100',
  border: 'base-700',
  grid: 'base-700',
  edge: 'base-500',
  selection: 'accent-400',
  handle: 'base-300',
};

/** A role's own custom property — what an override or a custom node reads. */
export function roleVariable(role: Role): string {
  return `--flow-${role}`;
}

/** Role tokens as `vars` entries: `{ 'flow-surface': 'white', … }`. */
export function roleEntries(tokens: Partial<Record<Role, string>>): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const role of ROLES) {
    if (tokens[role] !== undefined) entries[roleVariable(role).slice(2)] = tokens[role];
  }

  return entries;
}
