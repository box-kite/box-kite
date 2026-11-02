import { BoxStyleValue } from './coreTypes';
import Palette from './palette';
import Variables from './variables';

/**
 * The grammar behind `bgGradient`: a gradient written as a record — the key names the kind and carries
 * its geometry, `colors` are the stops in order. The stops are palette values, so a gradient is themed,
 * takes the opacity modifier and shares one class with every other element asking for the same one.
 */
namespace Gradients {
  /** Where a linear gradient runs to. A number is an angle in degrees instead, `0` pointing up. */
  const directions = {
    t: 'to top',
    tr: 'to top right',
    r: 'to right',
    br: 'to bottom right',
    b: 'to bottom',
    bl: 'to bottom left',
    l: 'to left',
    tl: 'to top left',
  };
  export type Direction = keyof typeof directions | number;

  /** Where a radial or conic gradient is centred — `at` — since neither runs in a direction. */
  const positions = ['center', 'top', 'right', 'bottom', 'left', 'top left', 'top right', 'bottom left', 'bottom right'] as const;
  export type Position = (typeof positions)[number];

  /**
   * Which space the colours are interpolated in. Worth naming: sRGB drags a two-stop gradient through
   * grey, and `-longer` takes the long way round the hue circle, which is what turns two stops into a
   * spectrum. Left unset, the browser's default (sRGB) applies.
   */
  const interpolations = {
    srgb: 'in srgb',
    hsl: 'in hsl',
    oklab: 'in oklab',
    oklch: 'in oklch',
    'hsl-longer': 'in hsl longer hue',
    'oklch-longer': 'in oklch longer hue',
  };
  export type Interpolation = keyof typeof interpolations;

  /** A stop's colour: everything a colour prop takes, so `blue-500/40` and `var(--chart-1)` both work. */
  export type StopColor = Variables.ColorType | Variables.SystemColorType | Palette.Alpha | Variables.Reference;
  /** One stop: a colour, or that colour and how far along the gradient it sits. */
  export type Stop = StopColor | readonly [StopColor, Variables.PercentString];

  type Linear = { linear: Direction; colors: readonly Stop[]; interpolate?: Interpolation };
  type Radial = { radial: 'circle' | 'ellipse' | true; at?: Position; colors: readonly Stop[]; interpolate?: Interpolation };
  type Conic = { conic: number | true; at?: Position; colors: readonly Stop[]; interpolate?: Interpolation };

  /** The `bgGradient` prop's value: one of the three kinds, its geometry and its stops. */
  export type Gradient = Linear | Radial | Conic;

  const kinds = ['linear', 'radial', 'conic'] as const;
  // The whole shape, so a misspelt key is not a gradient: unlike `vars` these names are the grammar's,
  // and `interpolat: 'oklch'` would otherwise paint an sRGB gradient with nothing to see.
  const shapeKeys = new Set<string>([...kinds, 'at', 'colors', 'interpolate']);

  function isStopColor(value: unknown): value is StopColor {
    if (typeof value !== 'string') return false;

    return (
      value in Palette.colors ||
      value === 'none' ||
      (Variables.systemColorValues as readonly string[]).includes(value) ||
      Palette.isAlpha(value) ||
      Variables.isReference(value)
    );
  }

  function isStop(value: unknown): value is Stop {
    if (Array.isArray(value)) return value.length === 2 && isStopColor(value[0]) && Variables.isPercentString(value[1]);

    return isStopColor(value);
  }

  /** What this record's kind contributes to the prelude, or null when it names no single valid kind. */
  function geometryOf(record: Record<string, unknown>): string | null {
    if (kinds.filter((kind) => kind in record).length !== 1) return null;

    if ('linear' in record) {
      const direction = record.linear;
      // A linear gradient runs in a direction rather than out of a point, so `at` is not one of its keys.
      if ('at' in record) return null;
      if (typeof direction === 'number') return Number.isFinite(direction) ? `${direction}deg` : null;

      return typeof direction === 'string' && direction in directions ? directions[direction as keyof typeof directions] : null;
    }

    if ('radial' in record) {
      const shape = record.radial;

      return shape === true ? '' : shape === 'circle' || shape === 'ellipse' ? shape : null;
    }

    const from = record.conic;

    return from === true ? '' : typeof from === 'number' && Number.isFinite(from) ? `from ${from}deg` : null;
  }

  /**
   * Whether a value is a gradient this grammar can write — the prop's `match`. Judged whole rather than
   * key by key, because a gradient is one value: a bad stop makes the rest of it meaningless.
   */
  export function isGradient(value: BoxStyleValue): value is Gradient {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => !shapeKeys.has(key))) return false;
    if (!Array.isArray(record.colors) || record.colors.length < 2 || !record.colors.every(isStop)) return false;
    if (record.interpolate !== undefined && !(typeof record.interpolate === 'string' && record.interpolate in interpolations)) return false;
    if (record.at !== undefined && !(positions as readonly unknown[]).includes(record.at)) return false;

    return geometryOf(record) !== null;
  }

  function stopOf(stop: Stop, getVariableValue: (name: string) => string, isVariable?: Variables.IsVariable): string {
    const [color, position] = Array.isArray(stop) ? stop : [stop as StopColor, ''];

    return `${Variables.colorValue(color, getVariableValue, isVariable)}${position ? ` ${position}` : ''}`;
  }

  /** The record as a `background-image` value, every stop resolved to the variable behind its token. */
  export function css(value: BoxStyleValue, getVariableValue: (name: string) => string, isVariable?: Variables.IsVariable): string {
    const record = value as Record<string, unknown>;
    const kind = kinds.find((name) => name in record) ?? 'linear';
    const at = typeof record.at === 'string' ? `at ${record.at}` : '';
    const interpolate = record.interpolate ? interpolations[record.interpolate as Interpolation] : '';
    const prelude = [geometryOf(record) ?? '', at, interpolate].filter(Boolean).join(' ');
    const stops = (record.colors as readonly Stop[]).map((stop) => stopOf(stop, getVariableValue, isVariable)).join(',');

    return `${kind}-gradient(${prelude ? `${prelude},` : ''}${stops})`;
  }
}

export default Gradients;
