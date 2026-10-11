/**
 * How the playground workbench is laid out — the page width, which panes show and where the divider sits —
 * kept per reader. Framework-free, so the clamping and the storage format are tested without rendering anything.
 */

export interface PlaygroundLayout {
  /** The workbench takes the whole content column rather than the docs' reading width — the default, since it is a tool. */
  wide: boolean;
  /** The editor row's share of the workbench height, in percent, while a pane below it is showing. */
  split: number;
  /** Whether the rendered snippet is on screen. Hidden, it still renders: the CSS pane reads what it wrote. */
  preview: boolean;
  /** Whether the rules the engine wrote are on screen. */
  css: boolean;
}

export const DEFAULT_LAYOUT: PlaygroundLayout = { wide: true, split: 55, preview: true, css: true };

/** Neither row may be squeezed below a fifth: a few lines of code, or a strip of preview, is still worth having. */
export const SPLIT_MIN = 20;
export const SPLIT_MAX = 80;
/** One arrow key's worth, in percent. */
export const SPLIT_STEP = 5;

const STORAGE_KEY = 'playground:layout';

export function clampSplit(split: number): number {
  return Number.isFinite(split) ? Math.round(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, split))) : DEFAULT_LAYOUT.split;
}

/** The split a pointer at `y` asks for, down a workbench starting at `top` and `height` tall. */
export function splitAt(y: number, top: number, height: number): number {
  return height > 0 ? clampSplit(((y - top) / height) * 100) : DEFAULT_LAYOUT.split;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Storage may be absent or throw (a private window, blocked site data), and then the defaults are the layout. */
export function readLayout(storage: Pick<Storage, 'getItem'> | null): PlaygroundLayout {
  try {
    const stored = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null') as Partial<PlaygroundLayout> | null;

    return {
      wide: flag(stored?.wide, DEFAULT_LAYOUT.wide),
      split: typeof stored?.split === 'number' ? clampSplit(stored.split) : DEFAULT_LAYOUT.split,
      preview: flag(stored?.preview, DEFAULT_LAYOUT.preview),
      css: flag(stored?.css, DEFAULT_LAYOUT.css),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function writeLayout(storage: Pick<Storage, 'setItem'> | null, layout: PlaygroundLayout): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Not kept, which costs the reader the layout on the next visit and nothing else.
  }
}
