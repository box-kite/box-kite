import { BoxStyleValue } from './coreTypes';

/**
 * The colour palette, and the one modifier a colour value takes: `bgColor="blue-500/40"` is that token
 * mixed with `transparent`, so the alpha rides the colour rather than the element the way `opacity` does.
 *
 * The palette is Tailwind CSS 4.3.3's, in OKLCH — twenty-six families of eleven steps. It is packed one
 * string per family rather than written out as 286 `oklch()` values, because the table ships in every
 * bundle: 1.1 KB gzipped cheaper, with the hue rounded to a tenth of a degree (nothing a display resolves).
 */
namespace Palette {
  /** The eleven steps every family has, lightest first — the second half of a token name. */
  export const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

  // `L C H` per step, in `steps` order. The lightness is a percentage, a chroma keeps no leading zero, and
  // `none` is a missing hue — the pure grey a neutral family starts from. All three are CSS as written.
  const families = {
    slate:
      '98.4 .003 247.9,96.8 .007 247.9,92.9 .013 255.5,86.9 .022 252.9,70.4 .04 256.8,55.4 .046 257.4,44.6 .043 257.3,37.2 .044 257.3,27.9 .041 260,20.8 .042 265.8,12.9 .042 264.7',
    gray: '98.5 .002 247.8,96.7 .003 264.5,92.8 .006 264.5,87.2 .01 258.3,70.7 .022 261.3,55.1 .027 264.4,44.6 .03 256.8,37.3 .034 259.7,27.8 .033 256.8,21 .034 264.7,13 .028 261.7',
    zinc: '98.5 0 none,96.7 .001 286.4,92 .004 286.3,87.1 .006 286.3,70.5 .015 286.1,55.2 .016 285.9,44.2 .017 285.8,37 .013 285.8,27.4 .006 286,21 .006 285.9,14.1 .005 285.8',
    neutral:
      '98.5 0 none,97 0 none,92.2 0 none,87 0 none,70.8 0 none,55.6 0 none,43.9 0 none,37.1 0 none,26.9 0 none,20.5 0 none,14.5 0 none',
    stone:
      '98.5 .001 106.4,97 .001 106.4,92.3 .003 48.7,86.9 .005 56.4,70.9 .01 56.3,55.3 .013 58.1,44.4 .011 73.6,37.4 .01 67.6,26.8 .007 34.3,21.6 .006 56,14.7 .004 49.3',
    mauve:
      '98.5 0 none,96 .003 325.6,92.2 .005 325.6,86.5 .012 325.7,71.1 .019 323,54.2 .034 322.5,43.5 .029 321.8,36.4 .029 323.9,26.3 .024 320.1,21.2 .019 322.1,14.5 .008 326',
    mist: '98.7 .002 197.1,96.3 .002 197.1,92.5 .005 214.3,87.2 .007 219.6,72.3 .014 214.4,56 .021 213.5,45 .017 213.2,37.8 .015 216,27.5 .011 216.9,21.8 .008 223.9,14.8 .004 228.8',
    olive:
      '98.8 .003 106.5,96.6 .005 106.5,93 .007 106.5,88 .011 106.6,73.7 .021 106.9,58 .031 107.3,46.6 .025 107.3,39.4 .023 107.4,28.6 .016 107.4,22.8 .013 107.4,15.3 .006 107.1',
    taupe:
      '98.6 .002 67.8,96 .002 17.2,92.2 .005 34.3,86.8 .007 39.5,71.4 .014 41.2,54.7 .021 43.1,43.8 .017 39.3,36.7 .016 35.7,26.8 .011 36.5,21.4 .009 43.1,14.7 .004 49.3',
    red: '97.1 .013 17.4,93.6 .032 17.7,88.5 .062 18.3,80.8 .114 19.6,70.4 .191 22.2,63.7 .237 25.3,57.7 .245 27.3,50.5 .213 27.5,44.4 .177 26.9,39.6 .141 25.7,25.8 .092 26',
    orange:
      '98 .016 73.7,95.4 .038 75.2,90.1 .076 70.7,83.7 .128 66.3,75 .183 55.9,70.5 .213 47.6,64.6 .222 41.1,55.3 .195 38.4,47 .157 37.3,40.8 .123 38.2,26.6 .079 36.3',
    amber:
      '98.7 .022 95.3,96.2 .059 95.6,92.4 .12 95.7,87.9 .169 91.6,82.8 .189 84.4,76.9 .188 70.1,66.6 .179 58.3,55.5 .163 49,47.3 .137 46.2,41.4 .112 45.9,27.9 .077 45.6',
    yellow:
      '98.7 .026 102.2,97.3 .071 103.2,94.5 .129 101.5,90.5 .182 98.1,85.2 .199 91.9,79.5 .184 86,68.1 .162 75.8,55.4 .135 66.4,47.6 .114 61.9,42.1 .095 57.7,28.6 .066 53.8',
    lime: '98.6 .031 120.8,96.7 .067 122.3,93.8 .127 124.3,89.7 .196 126.7,84.1 .238 128.9,76.8 .233 130.9,64.8 .2 131.7,53.2 .157 131.6,45.3 .124 130.9,40.5 .101 131.1,27.4 .072 132.1',
    green:
      '98.2 .018 155.8,96.2 .044 156.7,92.5 .084 156,87.1 .15 154.4,79.2 .209 151.7,72.3 .219 149.6,62.7 .194 149.2,52.7 .154 150.1,44.8 .119 151.3,39.3 .095 152.5,26.6 .065 152.9',
    emerald:
      '97.9 .021 166.1,95 .052 163.1,90.5 .093 164.2,84.5 .143 165,76.5 .177 163.2,69.6 .17 162.5,59.6 .145 163.2,50.8 .118 165.6,43.2 .095 166.9,37.8 .077 168.9,26.2 .051 172.6',
    teal: '98.4 .014 180.7,95.3 .051 180.8,91 .096 180.4,85.5 .138 181.1,77.7 .152 181.9,70.4 .14 182.5,60 .118 184.7,51.1 .096 186.4,43.7 .078 188.2,38.6 .063 188.4,27.7 .046 192.5',
    cyan: '98.4 .019 200.9,95.6 .045 203.4,91.7 .08 205,86.5 .127 207.1,78.9 .154 211.5,71.5 .143 215.2,60.9 .126 221.7,52 .105 223.1,45 .085 224.3,39.8 .07 227.4,30.2 .056 229.7',
    sky: '97.7 .013 236.6,95.1 .026 236.8,90.1 .058 230.9,82.8 .111 230.3,74.6 .16 232.7,68.5 .169 237.3,58.8 .158 242,50 .134 242.7,44.3 .11 240.8,39.1 .09 240.9,29.3 .066 243.2',
    blue: '97 .014 254.6,93.2 .032 255.6,88.2 .059 254.1,80.9 .105 251.8,70.7 .165 254.6,62.3 .214 259.8,54.6 .245 262.9,48.8 .243 264.4,42.4 .199 265.6,37.9 .146 265.5,28.2 .091 267.9',
    indigo:
      '96.2 .018 272.3,93 .034 272.8,87 .065 274,78.5 .115 274.7,67.3 .182 276.9,58.5 .233 277.1,51.1 .262 277,45.7 .24 277,39.8 .195 277.4,35.9 .144 278.7,25.7 .09 281.3',
    violet:
      '96.9 .016 293.8,94.3 .029 294.6,89.4 .057 293.3,81.1 .111 293.6,70.2 .183 293.5,60.6 .25 292.7,54.1 .281 293,49.1 .27 292.6,43.2 .232 292.8,38 .189 293.7,28.3 .141 291.1',
    purple:
      '97.7 .014 308.3,94.6 .033 307.2,90.2 .063 306.7,82.7 .119 306.4,71.4 .203 305.5,62.7 .265 303.9,55.8 .288 302.3,49.6 .265 301.9,43.8 .218 303.7,38.1 .176 305,29.1 .149 302.7',
    fuchsia:
      '97.7 .017 320.1,95.2 .037 318.9,90.3 .076 319.6,83.3 .145 321.4,74 .238 322.2,66.7 .295 322.2,59.1 .293 322.9,51.8 .253 323.9,45.2 .211 324.6,40.1 .17 325.6,29.3 .136 325.7',
    pink: '97.1 .014 343.2,94.8 .028 342.3,89.9 .061 343.2,82.3 .12 346,71.8 .202 349.8,65.6 .241 354.3,59.2 .249 .6,52.5 .223 4,45.9 .187 3.8,40.8 .153 2.4,28.4 .109 3.9',
    rose: '96.9 .015 12.4,94.1 .03 12.6,89.2 .058 10,81 .117 11.6,71.2 .194 13.4,64.5 .246 16.4,58.6 .253 17.6,51.4 .222 16.9,45.5 .188 13.7,41 .159 10.3,27.1 .105 12.1',
  };

  /**
   * The two families a design repoints: `accent` is what the components are drawn in and `base` their
   * neutral. Each starts as a copy of `indigo` and `gray`, the colours the built-in components always used.
   */
  const aliases = { accent: families.indigo, base: families.gray };

  /**
   * The colours that are not a family: four CSS keywords kept from v1, the ends of the greyscale, and `vi`
   * — a stray brand violet that has been a token since v1 and is somebody's colour by now.
   */
  const keywords = {
    currentColor: 'currentColor',
    transparent: 'transparent',
    green: 'green',
    red: 'red',
    blue: 'blue',
    gray: 'gray',
    black: '#000',
    white: '#fff',
    vi: '#7949FF',
  };

  export type Family = keyof typeof families | Alias;
  /** The families `Box.palette()` points at another one. */
  export type Alias = keyof typeof aliases;
  export type Step = (typeof steps)[number];
  /** One palette token: the family and the step, `blue-500` or `slate-950`. */
  export type Token = `${Family}-${Step}`;
  /** Every name `colors` holds — a token or one of the keywords. */
  export type ColorName = keyof typeof keywords | Token;

  // Expanded once, at load: 286 small strings is nothing (the precompute that cost 1.5 GB was four million
  // arrays, bug #98), and the packed table exists to be smaller in the bundle, not lazier at runtime.
  function expand(): Record<string, string> {
    const expanded: Record<string, string> = { ...keywords };

    for (const [family, packed] of Object.entries({ ...families, ...aliases })) {
      packed.split(',').forEach((step, index) => {
        const [l, c, h] = step.split(' ');
        expanded[`${family}-${steps[index]}`] = `oklch(${l}% ${c} ${h})`;
      });
    }

    return expanded;
  }

  /** Every colour this library knows, as the value its `--token` variable is declared with. */
  export const colors = expand() as Record<ColorName, string>;

  /** A colour with an opacity modifier — `blue-500/40`, `black/50`: Tailwind's spelling of the same thing. */
  export type Alpha = `${ColorName}/${number}`;
  /** The colour props' `values`, as a template type: the modifier reaches their union and their autocomplete. */
  export const alpha = '' as Alpha;

  // The two halves of one. `${number}` accepts far more than a percentage does, so the range is checked
  // here rather than left to the type — and a value the grammar rejects gets no rule and no class name.
  const alphaValue = /^(.+)\/(\d{1,3}(?:\.\d+)?)$/;

  /** The colour and the percentage of a `token/alpha` value, or null when it is not one. */
  export function alphaOf(value: BoxStyleValue): { color: string; percent: string } | null {
    if (typeof value !== 'string') return null;

    const parts = alphaValue.exec(value);

    return parts && Number(parts[2]) <= 100 ? { color: parts[1], percent: parts[2] } : null;
  }

  /** Whether a value is a colour this library knows carrying one — the colour props' `match`. */
  export function isAlpha(value: BoxStyleValue): value is Alpha {
    const parts = alphaOf(value);

    return parts !== null && parts.color in colors;
  }

  /**
   * That value as CSS: the token mixed with `transparent`, in `oklab` — mixing towards transparency in a
   * polar space carries the hue with it. The mix is what keeps the alpha composed with the *variable*, so
   * the colour still follows the palette, the theme and every `extend()` that touched it.
   */
  export function mix(value: BoxStyleValue, getVariableValue: (name: string) => string): string {
    const parts = alphaOf(value);

    return parts ? `color-mix(in oklab, ${getVariableValue(parts.color)} ${parts.percent}%, transparent)` : '';
  }

  /** Eleven colours of your own for an alias, by step: any CSS colour, or a token. A step left out keeps its default. */
  export type Ramp = Partial<Record<Step, string>>;
  /** What `Box.palette()` takes: an alias and the family it now draws from, or a ramp of its own. */
  export type Pointing = Partial<Record<Alias, Exclude<Family, Alias> | Ramp>>;

  /**
   * `Box.palette({ accent: 'orange', base: 'stone' })` — the `vars` record that repoints the two aliases for
   * an element and everything inside it: `{ 'accent-50': 'orange-50', … }`, so `bgColor="accent-500"` is
   * orange there. A record rather than a prop, so it nests in `theme`, a breakpoint or `dataAttr` like any `vars`.
   */
  export function point(pointing: Pointing): Record<string, string> {
    const record: Record<string, string> = {};

    for (const [alias, target] of Object.entries(pointing)) {
      if (!(alias in aliases) || !target || (typeof target === 'string' && (target in aliases || !(target in families)))) continue;

      for (const step of steps) {
        const value = typeof target === 'string' ? `${target}-${step}` : target[step];
        if (value) record[`${alias}-${step}`] = value;
      }
    }

    return record;
  }
}

export default Palette;
