import { BoxStyleValue } from './coreTypes';
import Springs from './springs';

/**
 * The values the animation and transition props take that are more than a CSS keyword: the four presets,
 * the easing escape hatch, and the property groups `transition` accepts.
 */
namespace Animations {
  /** What `--transitionTime` is worth, in the milliseconds a sampled spring counts its settling in. */
  const transitionTimeMs = 250;

  /** A preset's duration as a multiple of `--transitionTime` (0.25s), so reduced motion zeroes it too. */
  function scaled(units: number): string {
    return `calc(${units} * var(--transitionTime))`;
  }

  export const presetNames = ['spin', 'pulse', 'bounce', 'ping'] as const;

  export type PresetName = (typeof presetNames)[number];

  /**
   * The `animation` shorthand each preset writes. Durations ride `--transitionTime` rather than naming
   * seconds, so a preset stops under `prefers-reduced-motion` for the reason every Box transition does.
   */
  export const presets: Record<PresetName, string> = {
    spin: `spin ${scaled(4)} linear infinite`,
    pulse: `pulse ${scaled(8)} cubic-bezier(0.4, 0, 0.6, 1) infinite`,
    bounce: `bounce ${scaled(4)} infinite`,
    ping: `ping ${scaled(4)} cubic-bezier(0, 0, 0.2, 1) infinite`,
  };

  /**
   * An easing curve CSS computes rather than one of the keywords — `cubic-bezier()`, `steps()`, and the
   * `linear()` a sampled spring compiles to. A template type rather than `string`, so the keywords keep
   * their autocomplete beside it.
   */
  export type TimingFunction = `cubic-bezier(${string})` | `steps(${string})` | `linear(${string})`;

  export const timingFunction = '' as TimingFunction;

  export const springNames = Springs.presetNames;

  export type SpringName = Springs.PresetName;

  /** The curve half of a spring preset, sampled once and shared by every rule that names it. */
  export function springEasing(name: SpringName): string {
    return Springs.preset(name).easing;
  }

  /**
   * The other half: a sampled spring has a fixed settling time, and naming it on the duration prop is what
   * makes the physics look right. Counted in `--transitionTime` units, so reduced motion stops a spring too.
   */
  export function springDuration(name: SpringName): string {
    return scaled(Math.round((Springs.preset(name).duration / transitionTimeMs) * 100) / 100);
  }

  /**
   * An easing declaration, and under a `linear()` curve the `ease-out` it degrades to: the ~13% of browsers
   * without `linear()` drop the second line and keep the first. `cubic-bezier()` and `steps()` need no such thing.
   */
  export function easingDeclarations(styleName: string, value: string): string {
    const declaration = `${styleName}:${value}`;

    return value.startsWith('linear(') ? `${styleName}:ease-out;${declaration}` : declaration;
  }

  const timingFunctionPattern = /^(cubic-bezier|steps|linear)\([^()]*\)$/;

  /** The definition's `match`: one balanced easing function, so a typo emits nothing at all. */
  export function isTimingFunction(value: BoxStyleValue): boolean {
    return typeof value === 'string' && timingFunctionPattern.test(value);
  }

  /**
   * What `transition` transitions, by group rather than by CSS property name — the same groups Tailwind
   * ships, because "which properties are the colours" is not a question worth asking twice. `all` is
   * still the default every Box gets from the base class.
   */
  export const propertyGroups = {
    colors: 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow, text-shadow',
    transform: 'transform, translate, rotate, scale',
    size: 'width, height',
    filter: 'filter, backdrop-filter',
  } as const;

  export type PropertyGroup = keyof typeof propertyGroups;

  export const propertyGroupNames = Object.keys(propertyGroups) as PropertyGroup[];

  const propertyName = /^(?:--[\w-]+|-?[a-z][a-z-]*)$/;

  /**
   * `Box.configure({ transition })` as the base rule's `transition-property`, or null when it is not one: a group, a
   * property name, or a comma list of both. The one configured string that lands in rule text, so it is judged (bug #222).
   */
  export function baseTransitionProperty(value: string): string | null {
    const parts = value.split(',').map((part) => part.trim());
    const properties = parts.map((part) =>
      Object.hasOwn(propertyGroups, part) ? propertyGroups[part as PropertyGroup] : propertyName.test(part) ? part : null,
    );

    return properties.includes(null) ? null : properties.join(', ');
  }
}

export default Animations;
