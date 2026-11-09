/**
 * The model behind `<FlowContainer>`: React Flow's public CSS variables written in terms of eight roles, and the
 * roles in palette tokens for each theme. No React and no xyflow import — the contract is CSS, so it is data here.
 */
namespace FlowUtils {
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

  const read = (role: Role) => `var(${roleVariable(role)})`;
  const mix = (role: Role, percent: number, over = 'transparent') => `color-mix(in oklab, ${read(role)} ${percent}%, ${over})`;

  /**
   * Every `--xy-*` variable the container declares, keyed without the `--`. Each one is resolved on the container,
   * which is an ancestor of `.react-flow`, so it beats xyflow's `-default` in either `colorMode`; the `-props`
   * twins a component prop sets inline still win, which is right — that is the app speaking.
   */
  export const VARIABLES: Readonly<Record<string, string>> = {
    'xy-background-color': read('surface'),
    'xy-background-pattern-color': read('grid'),
    'xy-attribution-background-color': mix('surface', 50),
    'xy-edge-stroke': read('edge'),
    'xy-edge-stroke-selected': read('selection'),
    'xy-connectionline-stroke': read('selection'),
    'xy-edge-label-background-color': read('surface'),
    'xy-edge-label-color': read('text'),
    'xy-handle-background-color': read('handle'),
    'xy-handle-border-color': read('panel'),
    'xy-node-color': read('text'),
    'xy-node-background-color': read('panel'),
    'xy-node-border': `1px solid ${read('border')}`,
    'xy-node-group-background-color': mix('border', 25),
    'xy-node-boxshadow-hover': `0 1px 4px 1px ${mix('text', 8)}`,
    'xy-node-boxshadow-selected': `0 0 0 1px ${read('selection')}`,
    'xy-selection-background-color': mix('selection', 8),
    'xy-selection-border': `1px dotted ${mix('selection', 80)}`,
    'xy-resize-background-color': read('selection'),
    'xy-controls-button-background-color': read('panel'),
    'xy-controls-button-background-color-hover': mix('text', 6, read('panel')),
    'xy-controls-button-border-color': read('border'),
    'xy-controls-button-color': read('text'),
    'xy-controls-button-color-hover': read('text'),
    'xy-controls-box-shadow': `0 0 2px 1px ${mix('text', 8)}`,
    'xy-minimap-background-color': read('panel'),
    'xy-minimap-mask-background-color': mix('border', 60),
    'xy-minimap-node-background-color': read('border'),
  };

  /**
   * The `--xy-*` variables deliberately left to xyflow: widths, a radius, and two strokes that are transparent in
   * both of its themes. Listed so the mapping test can tell "left alone" from "missed".
   */
  export const UNMAPPED = [
    'xy-edge-stroke-width',
    'xy-connectionline-stroke-width',
    'xy-node-border-radius',
    'xy-minimap-mask-stroke-color',
    'xy-minimap-mask-stroke-width',
    'xy-minimap-node-stroke-color',
    'xy-minimap-node-stroke-width',
  ] as const;

  /** A role override: one token for both themes, or one per theme. */
  export type RoleOverride = string | { readonly light?: string; readonly dark?: string };

  export type Tokens = Partial<Record<Role, RoleOverride>>;

  /** The role variables for one theme, with the caller's overrides over the defaults. Unknown keys are dropped. */
  export function roleVariables(theme: 'light' | 'dark', tokens: Tokens = {}): Record<string, string> {
    const defaults = theme === 'dark' ? DARK : LIGHT;

    return ROLES.reduce<Record<string, string>>((acc, role) => {
      const override = tokens[role];
      const value = typeof override === 'string' ? override : override?.[theme];

      acc[roleVariable(role).slice(2)] = value ?? defaults[role];

      return acc;
    }, {});
  }

  /**
   * `<ReactFlow colorMode>` from Box Kite's theme, so the canvas's own `.dark` class agrees with the page. A canvas in a
   * different theme from the page sits in `<Box.Theme use="local">` instead — never `colorMode="light"` under a dark page.
   */
  export function colorMode(theme: string | undefined): 'light' | 'dark' {
    return theme === 'dark' ? 'dark' : 'light';
  }

  /**
   * The base class draws every outline in `--outlineColor`, so declaring it on the container makes a node's focus and
   * selection outlines the `selection` role with no colour prop — colour props take tokens, not `var()`.
   */
  export const OUTLINE: Readonly<Record<string, string>> = { outlineColor: read('selection') };

  /** The properties a canvas moves every frame need no transition; `static` zeroes both of Box's transition times. */
  export const STATIC_MOTION: Readonly<Record<string, string>> = { transitionTime: '0s', svgTransitionTime: '0s' };
}

export default FlowUtils;
