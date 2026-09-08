import { TocEntry } from '../pageContext';

/**
 * The shape of `api/components/*.json`, which `scripts/componentsApi.mjs` writes from the components
 * themselves. Every page imports its own file, so a route downloads one component's reference rather
 * than all twenty.
 */
export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default: string | null;
  description: string;
}

export interface KeyboardRow {
  /** Which keyboard map the row belongs to — a component can have two (`Dropdown` has). */
  mode: string | null;
  keys: string;
  action: string;
}

export interface StyleNode {
  path: string;
  depth: number;
  extends: string | null;
  variants: string[];
}

export interface ComponentApi {
  name: string;
  route: string;
  import: string;
  description: string;
  pattern: string | null;
  props: ComponentProp[];
  parts: { name: string; description: string; props: ComponentProp[] }[];
  keyboard: KeyboardRow[];
  a11y: string[];
  axe: { fixtures: string[]; knownViolations: string[] };
  styleTree: StyleNode[];
}

/** `Dropdown.Display` → `dropdown-display`: the component half of every section id on a page. */
export function componentSlug(name: string): string {
  return name.replace(/\./g, '-').toLowerCase();
}

export function sectionId(api: ComponentApi, section: string): string {
  return `${componentSlug(api.name)}-${section}`;
}

/**
 * The sections a reference actually renders, as sidebar links — so a page's table of contents is built
 * from the same data as the sections themselves and cannot list one that is not there.
 */
export function apiSections(api: ComponentApi): TocEntry[] {
  return [
    { id: sectionId(api, 'props'), label: `${api.name} props` },
    ...(api.keyboard.length ? [{ id: sectionId(api, 'keyboard'), label: `${api.name} keyboard` }] : []),
    { id: sectionId(api, 'a11y'), label: `${api.name} accessibility` },
    ...(api.styleTree.length ? [{ id: sectionId(api, 'styles'), label: `${api.name} style tree` }] : []),
  ];
}

/** The keyboard rows grouped into the maps they belong to, the unnamed one first. */
export function keyboardModes(api: ComponentApi): { mode: string | null; rows: KeyboardRow[] }[] {
  const modes = [...new Set(api.keyboard.map((row) => row.mode))];

  return modes.map((mode) => ({ mode, rows: api.keyboard.filter((row) => row.mode === mode) }));
}
