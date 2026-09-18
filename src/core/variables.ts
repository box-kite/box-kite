import Palette from './palette';

namespace Variables {
  /**
   * Every colour, as the value its variable is declared with — the palette plus the keywords, with `none`
   * beside them in `colorValues`. The table itself lives in `palette.ts`, which also owns the one modifier
   * a colour value takes (`blue-500/40`); this is where a colour becomes a *variable*.
   */
  export const colors = Palette.colors;

  export type ColorType = Palette.ColorName | 'none';
  export const colorValues = Object.keys(Variables.colors) as Variables.ColorType[];
  colorValues.push('none');

  export const bgImages = {
    'gradient-primary': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    'gradient-aurora-light':
      'radial-gradient(900px circle at 18% 18%, rgba(99, 102, 241, 0.12), transparent 46%), radial-gradient(780px circle at 82% 12%, rgba(14, 165, 233, 0.1), transparent 45%), radial-gradient(960px circle at 48% 78%, rgba(236, 72, 153, 0.08), transparent 55%), linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.88) 100%)',
    'gradient-aurora-dark':
      'radial-gradient(900px circle at 18% 18%, rgba(129, 140, 248, 0.16), transparent 46%), radial-gradient(820px circle at 82% 10%, rgba(45, 212, 191, 0.12), transparent 48%), radial-gradient(980px circle at 50% 80%, rgba(59, 130, 246, 0.12), transparent 55%), linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.9) 100%)',
    'gradient-accent': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
    // checkbox/radio images
    'bg-img-checked': `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 20 20'><path fill='none' stroke='#FFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 10l3 3l6-6'/></svg>`)}")`,
    'bg-img-indeterminate': `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 20 20'><line stroke='${colors['violet-400']}' x1='4' y1='10' x2='16' y2='10' stroke-width='1' /></svg>`)}")`,
    'bg-img-radio': `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='0 0 20 20'><circle fill='#FFF' cx='10' cy='10' r='5'/></svg>`)}")`,
  };

  export type BgImageType = keyof typeof bgImages | 'none';
  export const bgImageValues = Object.keys(Variables.bgImages) as Variables.BgImageType[];
  bgImageValues.push('none');

  export const shadows = {
    small: 'rgba(0, 0, 0, 0.16) 0px 1px 4px',
    medium: 'rgba(0, 0, 0, 0.24) 0px 3px 8px',
    large: 'rgba(17, 17, 26, 0.1) 0px 4px 16px, rgba(17, 17, 26, 0.05) 0px 8px 32px',
  };

  export type ShadowType = keyof typeof shadows | 'none';
  export const shadowValues = Object.keys(Variables.shadows) as Variables.ShadowType[];
  shadowValues.push('none');

  export const percentages = [
    '1/1',
    '1/2',
    '1/3',
    '2/3',
    '1/4',
    '2/4',
    '3/4',
    '1/5',
    '2/5',
    '3/5',
    '4/5',
    '1/6',
    '2/6',
    '3/6',
    '4/6',
    '5/6',
    '1/12',
    '2/12',
    '3/12',
    '4/12',
    '5/12',
    '6/12',
    '7/12',
    '8/12',
    '9/12',
    '10/12',
    '11/12',
  ] as const;

  export const negativePercentages = [
    '-1/1',
    '-1/2',
    '-1/3',
    '-2/3',
    '-1/4',
    '-2/4',
    '-3/4',
    '-1/5',
    '-2/5',
    '-3/5',
    '-4/5',
    '-1/6',
    '-2/6',
    '-3/6',
    '-4/6',
    '-5/6',
    '-1/12',
    '-2/12',
    '-3/12',
    '-4/12',
    '-5/12',
    '-6/12',
    '-7/12',
    '-8/12',
    '-9/12',
    '-10/12',
    '-11/12',
  ] as const;

  export type PercentString = `${number}%`;
  export const percentString = '' as PercentString;

  /**
   * Whether a value really is the percentage its definition claims to take. `percentString` is a plain
   * string, and a scalar `values` is matched by `typeof` alone — which made all thirty props declaring it
   * an unvalidated catch-all: `width="banana"` reached CSS verbatim (bug #31).
   */
  export function isPercentString(value: unknown): value is PercentString {
    return typeof value === 'string' && /^-?(\d+|\d*\.\d+)%$/.test(value);
  }

  /** The two ratios worth a name — CSS has neither, and Tailwind's `aspect-video` is the same 16/9. */
  export const aspectRatios: Readonly<Record<string, string>> = { square: '1 / 1', video: '16 / 9' };

  export type Ratio = `${number}/${number}`;
  export const ratio = '' as Ratio;

  /** Whether a value really is a ratio: `4/3` and `1.85/1`, not `4:3` and not a fraction with a unit. */
  export function isRatio(value: unknown): value is Ratio {
    return typeof value === 'string' && /^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(value);
  }

  /**
   * The CSS system colours: the one palette a forced-colors mode does not throw away. Keywords rather
   * than tokens — they resolve to whatever the user's high-contrast theme says — so they are written out
   * unformatted, which is what lets `forcedColors={{ … }}` restore a state that colour alone was signalling.
   */
  export const systemColors = [
    'Highlight',
    'HighlightText',
    'Canvas',
    'CanvasText',
    'ButtonFace',
    'ButtonText',
    'GrayText',
    'LinkText',
  ] as const;
  export type SystemColorType = (typeof systemColors)[number];
  export const systemColorValues: readonly SystemColorType[] = systemColors;

  /**
   * A value CSS resolves for itself rather than one of this library's tokens: `url(#sky)` for a gradient,
   * pattern or clip path, `var(--chart-1)` for somebody else's variable. SVG paint is the reason it exists
   * — written as an attribute the paint would leave the prop system, losing theme, breakpoint and `hover`.
   */
  export type Reference = `url(#${string})` | `var(--${string})`;
  export const reference = '' as Reference;

  /**
   * Whether a value is one of those two forms, as the definition's `match`: `typeof` alone cannot tell
   * `url(#sky)` from a typo. Deliberately strict — one balanced reference, no whitespace (a class
   * attribute splits on it), no nesting, so `fill` cannot smuggle in a whole shorthand.
   */
  export function isReference(value: unknown): value is Reference {
    return typeof value === 'string' && /^(url\(#[^\s()]+\)|var\(--[^\s()]+\))$/.test(value);
  }

  /**
   * A value for a custom property: a colour token (resolved to the variable behind it), a `url()`/`var()`
   * reference, or any CSS value written out. `string` is intersected with an empty object so the token
   * union it follows still reaches autocomplete.
   */
  export type CustomPropertyValue = ColorType | Palette.Alpha | Reference | number | (string & NonNullable<unknown>);

  /** The `vars` prop's value: custom-property names, with or without their leading `--`, to values. */
  export type CustomProperties = Readonly<Record<string, CustomPropertyValue>>;

  // A custom-property name: a CSS identifier, with the `--` optional because both spellings are in
  // this library's API already (`Box.extend({ variables })` takes bare names, `var(--x)` does not).
  const customPropertyName = /^(--)?[A-Za-z_][\w-]*$/;

  /**
   * Whether a value can be written into a rule as it stands — the only thing between a prop value and the
   * text of a rule: a `;` or a brace would end the declaration early and let the rest be read as CSS. Shared
   * with `css`, the other prop whose values reach a rule unformatted.
   */
  export function isUsableValue(entry: unknown): entry is string | number {
    return typeof entry === 'number'
      ? Number.isFinite(entry)
      : typeof entry === 'string' && entry.trim().length > 0 && !/[;{}]/.test(entry);
  }

  /** Whether one entry of a `vars` record can be written: a name that is a CSS identifier, and a usable value. */
  function isUsableEntry([name, entry]: [string, unknown]): boolean {
    return customPropertyName.test(name) && isUsableValue(entry);
  }

  /**
   * Whether a value is a usable set of declarations: an object with at least one entry worth writing.
   * Judged entry by entry because a record *is* many independent declarations — one unusable name (a
   * series called `user.name`) costs that variable rather than the other five.
   */
  export function isCustomProperties(value: unknown): value is CustomProperties {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    return Object.entries(value).some(isUsableEntry);
  }

  /**
   * A value that names a colour, resolved: a token becomes the variable behind it and a token with an
   * opacity modifier the mix that applies it, so a chart's colour — or a gradient stop — follows the
   * palette either way. Anything else is written out as it stands: a system colour and a `var()`
   * reference are already CSS, and neither is ours to resolve.
   */
  export function colorValue(entry: string, getVariableValue: (name: string) => string): string {
    if (entry in colors) return getVariableValue(entry);

    return Palette.isAlpha(entry) ? Palette.mix(entry, getVariableValue) : entry;
  }

  /**
   * Those declarations as the body of a rule: `--color-x:var(--sky-500);--gap:4px`. A colour token becomes
   * the variable behind it, so the value follows the palette; anything else is written out as it stands,
   * in the order it was written — order carries no meaning to CSS anyway.
   */
  export function customProperties(value: CustomProperties, getVariableValue: (name: string) => string): string {
    return Object.entries(value)
      .filter(isUsableEntry)
      .map(([name, entry]) => {
        const resolved = typeof entry === 'string' ? colorValue(entry, getVariableValue) : entry;

        return `--${name.replace(/^--/, '')}:${resolved}`;
      })
      .join(';');
  }

  const rootVariables = {
    inherit: 'inherit',
    none: 'none',
  };

  const internalVariables = { ...rootVariables, ...colors, ...bgImages, ...shadows };

  /** The mutable variable state of a single style engine. */
  export interface VariablesRegistry {
    /** Record `name` as used (so it reaches `:root`) and return the `var(--name)` reference. */
    getVariableValue(name: string): string;
    /** Every variable used so far, as `:root` declarations. */
    generateVariables(): string;
    /** Variables used since the last call — returns and clears them. */
    getPendingVariables(): Record<string, string>;
    hasPendingVariables(): boolean;
    /** Whether `name` was declared through `Box.extend({ variables })`. */
    isUserVariable(name: string): boolean;
    /** All of them, for a catalog that has to say which tokens a colour prop accepts beside the palette. */
    userVariableNames(): string[];
    /**
     * Forget which variables have been used, so the next `:root` block is built from scratch. Variables from
     * `Box.extend({ variables })` are registration rather than per-render state, and survive.
     */
    reset(): void;
    /** Add user variables. Merged into the ones already declared, so sequential `extend()` calls accumulate. */
    setUserVariables(variables: Record<string, string>): void;
  }

  /**
   * Per-engine variable state, kept out of module scope so two engines (iframes, shadow roots, parallel
   * SSR requests) never share a `:root` block or a pending queue.
   */
  export function createRegistry(): VariablesRegistry {
    const _usedVariables: Record<string, string> = {};
    const _pendingVariables: Record<string, string> = {};
    let _userVariables: Record<string, string> = {};

    return {
      getVariableValue(name: string) {
        // Only track as pending if it's a new variable
        if (!(name in _usedVariables)) {
          if (name in _userVariables) {
            _pendingVariables[name] = _userVariables[name];
            _usedVariables[name] = _userVariables[name];
          } else if (name in internalVariables) {
            _pendingVariables[name] = internalVariables[name as keyof typeof internalVariables];
            _usedVariables[name] = internalVariables[name as keyof typeof internalVariables];
          } else {
            _pendingVariables[name] = name;
            _usedVariables[name] = name;
          }
        }

        return `var(--${name})`;
      },

      generateVariables() {
        return Object.entries(_usedVariables)
          .map(([key, val]) => `--${key}: ${val};`)
          .join('');
      },

      getPendingVariables() {
        const pending = { ..._pendingVariables };
        // Clear pending after returning
        Object.keys(_pendingVariables).forEach((key) => delete _pendingVariables[key]);
        return pending;
      },

      hasPendingVariables() {
        return Object.keys(_pendingVariables).length > 0;
      },

      isUserVariable(name: string) {
        return name in _userVariables;
      },

      userVariableNames() {
        return Object.keys(_userVariables);
      },

      reset() {
        Object.keys(_usedVariables).forEach((key) => delete _usedVariables[key]);
        Object.keys(_pendingVariables).forEach((key) => delete _pendingVariables[key]);
      },

      setUserVariables(variables: Record<string, string>) {
        // Merge, never replace: `Box.extend()` may be called from several modules and each call
        // used to drop the previous call's variables. A name already resolved keeps the value it
        // resolved to, so variables must be declared before the first render that uses them.
        _userVariables = { ..._userVariables, ...variables };
      },
    };
  }
}

export default Variables;
