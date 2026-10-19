import Box from '../../src/box';
import Variables from '../../src/core/variables';
import type { BoxStyleProps } from '../../src/types';

/** The designs a reader can pick from the header. `classic` is the library's own look; the rest are `Box.components(…, { design })`. */
export type DesignId = 'classic' | 'ember' | 'azure' | 'mono';

export interface Design {
  id: DesignId;
  name: string;
  /** One line under the name in the picker. */
  description: string;
}

export const DESIGNS: readonly Design[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Indigo on cool grey — the look every component ships with.',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm paper, vermilion and a serif — editorial, quiet, and lit from within.',
  },
  {
    id: 'azure',
    name: 'Azure',
    description: 'Clear-sky blue on frosted glass — airy, precise, and bright in the dark.',
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Ink on white in single pixels — flat, quiet, and exact.',
  },
];

export const DEFAULT_DESIGN: DesignId = 'classic';
/** Where the picker keeps the choice — read again by the pre-paint script in `pages/index.html`. */
export const DESIGN_STORAGE_KEY = 'box-kite-design';
export const THEME_STORAGE_KEY = 'box-kite-theme';

export function designOf(id: string | undefined): Design {
  return DESIGNS.find((design) => design.id === id) ?? DESIGNS[0];
}

/** Ember's two families: a warm stone for the neutrals and a vermilion that holds 4.5:1 under white text at 600. */
const EMBER_BASE = {
  50: 'oklch(98.6% .004 75)',
  100: 'oklch(96.6% .006 72)',
  200: 'oklch(92.7% .009 68)',
  300: 'oklch(87.2% .012 64)',
  400: 'oklch(71.6% .017 60)',
  500: 'oklch(55.6% .019 56)',
  600: 'oklch(45.4% .017 52)',
  700: 'oklch(37.6% .015 50)',
  800: 'oklch(27.6% .01 52)',
  900: 'oklch(21.2% .008 52)',
  950: 'oklch(15.8% .006 52)',
} as const;

const EMBER_ACCENT = {
  50: 'oklch(97.6% .018 70)',
  100: 'oklch(94.8% .04 66)',
  200: 'oklch(90.2% .074 60)',
  300: 'oklch(83.6% .118 54)',
  400: 'oklch(75.6% .162 48)',
  500: 'oklch(68.4% .19 42)',
  600: 'oklch(57.2% .196 36)',
  700: 'oklch(50.4% .178 33)',
  800: 'oklch(43.6% .148 32)',
  900: 'oklch(37.4% .118 33)',
  950: 'oklch(26.4% .08 33)',
} as const;

/**
 * Azure's two families: a slate cooled towards the sky for the neutrals, deep blue-black at the dark end, and an
 * azure kept inside sRGB at every step, so 600 holds 4.7:1 under white text on every screen rather than only on P3.
 */
const AZURE_BASE = {
  50: 'oklch(98.4% .004 240)',
  100: 'oklch(96.4% .007 242)',
  200: 'oklch(92.6% .012 244)',
  300: 'oklch(87% .018 246)',
  400: 'oklch(71.4% .028 248)',
  500: 'oklch(55.8% .034 250)',
  600: 'oklch(45.6% .034 252)',
  700: 'oklch(37.8% .032 254)',
  800: 'oklch(27.8% .032 256)',
  900: 'oklch(21.4% .03 258)',
  950: 'oklch(15.6% .026 260)',
} as const;

const AZURE_ACCENT = {
  50: 'oklch(97.4% .013 236)',
  100: 'oklch(94.6% .028 236)',
  200: 'oklch(89.6% .055 237)',
  300: 'oklch(82.4% .095 239)',
  400: 'oklch(73.2% .145 242)',
  500: 'oklch(64.4% .162 246)',
  600: 'oklch(55.6% .155 250)',
  700: 'oklch(48.8% .145 253)',
  800: 'oklch(41.8% .128 255)',
  900: 'oklch(35.8% .108 257)',
  950: 'oklch(26.2% .075 259)',
} as const;

/**
 * Mono's neutrals: a cool grey whose dark end is the ink, `#16191e` at 950 and its hover `#2c323b` at 800. The
 * accent is the same ink, so a checked box, a selection and a primary action are all one colour: 600 is the ink,
 * 500 its hover, and 400 the grey a dark page reads it in (5.9:1 on the ink).
 */
const MONO_BASE = {
  50: '#f7f8f9',
  100: '#eff1f3',
  200: '#e2e5e9',
  300: '#cdd1d7',
  400: '#9ba2ad',
  500: '#6b7380',
  600: '#4f5763',
  700: '#3b424d',
  800: '#2c323b',
  900: '#1d2127',
  950: '#16191e',
} as const;

const MONO_ACCENT = {
  50: '#f7f8f9',
  100: '#eff1f3',
  200: '#e2e5e9',
  300: '#cdd1d7',
  400: '#8c939e',
  500: '#2c323b',
  600: '#16191e',
  700: '#101216',
  800: '#0b0d10',
  900: '#08090b',
  950: '#050607',
} as const;

export const EMBER_FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
export const AZURE_FONT_DISPLAY = "'Sora', 'Inter', 'Segoe UI', system-ui, sans-serif";
export const MONO_FONT = "'Roboto', 'Helvetica Neue', Arial, sans-serif";

/**
 * What each design declares on the element it starts at: the two families the components are drawn in and
 * the site's own gradient and surface variables. Classic's are the defaults, written out so a Classic preview
 * inside an Ember page is Classic all the way down.
 */
const DESIGN_VARS: Record<DesignId, Record<string, string>> = {
  classic: {
    ...Box.palette({ accent: 'indigo', base: 'gray' }),
    'gradient-primary': Variables.bgImages['gradient-primary'],
    'gradient-accent': Variables.bgImages['gradient-accent'],
    'gradient-aurora-light': Variables.bgImages['gradient-aurora-light'],
    'gradient-aurora-dark': Variables.bgImages['gradient-aurora-dark'],
  },
  ember: {
    ...Box.palette({ accent: EMBER_ACCENT, base: EMBER_BASE }),
    'gradient-primary': `linear-gradient(135deg, ${EMBER_ACCENT[400]} 0%, ${EMBER_ACCENT[600]} 55%, oklch(52% .2 18) 100%)`,
    'gradient-accent': `linear-gradient(135deg, oklch(82% .15 80) 0%, ${EMBER_ACCENT[500]} 50%, oklch(58% .21 20) 100%)`,
    'gradient-aurora-light': `radial-gradient(1100px circle at 88% -12%, oklch(91% .07 62 / .7), transparent 55%), radial-gradient(800px circle at -8% 28%, oklch(94% .04 85 / .6), transparent 50%), linear-gradient(180deg, ${EMBER_BASE[50]} 0%, ${EMBER_BASE[50]} 100%)`,
    'gradient-aurora-dark': `radial-gradient(1200px circle at 92% -20%, oklch(48% .15 40 / .38), transparent 58%), radial-gradient(900px circle at 10% 110%, oklch(40% .1 55 / .2), transparent 60%), linear-gradient(180deg, ${EMBER_BASE[950]} 0%, ${EMBER_BASE[950]} 100%)`,
    'gradient-sidebar': `linear-gradient(180deg, oklch(98.6% .004 75 / .9) 0%, oklch(97.4% .006 72 / .96) 100%)`,
    'gradient-sidebar-dark': `linear-gradient(180deg, oklch(17.4% .007 52 / .96) 0%, oklch(15.6% .006 52 / .98) 100%)`,
    'code-bg': 'oklch(17.6% .006 52)',
    'code-bg-light': 'oklch(21.4% .008 52)',
  },
  azure: {
    ...Box.palette({ accent: AZURE_ACCENT, base: AZURE_BASE }),
    'gradient-primary': `linear-gradient(135deg, oklch(80% .12 215) 0%, ${AZURE_ACCENT[500]} 50%, oklch(50% .16 266) 100%)`,
    'gradient-accent': `linear-gradient(135deg, oklch(88% .09 195) 0%, ${AZURE_ACCENT[400]} 50%, ${AZURE_ACCENT[600]} 100%)`,
    'gradient-aurora-light': `radial-gradient(1100px circle at 86% -14%, oklch(89% .07 236 / .7), transparent 55%), radial-gradient(800px circle at -6% 26%, oklch(94% .05 200 / .55), transparent 50%), linear-gradient(180deg, ${AZURE_BASE[50]} 0%, ${AZURE_BASE[50]} 100%)`,
    'gradient-aurora-dark': `radial-gradient(1200px circle at 90% -20%, oklch(46% .13 250 / .42), transparent 58%), radial-gradient(900px circle at 8% 108%, oklch(42% .09 215 / .24), transparent 60%), linear-gradient(180deg, ${AZURE_BASE[950]} 0%, ${AZURE_BASE[950]} 100%)`,
    'gradient-sidebar': `linear-gradient(180deg, oklch(98.4% .004 240 / .9) 0%, oklch(97.2% .008 240 / .96) 100%)`,
    'gradient-sidebar-dark': `linear-gradient(180deg, oklch(17.2% .021 259 / .96) 0%, oklch(15.4% .02 260 / .98) 100%)`,
    'code-bg': 'oklch(17% .024 258)',
    'code-bg-light': 'oklch(21% .028 256)',
  },
  // No gradients: each one the site names is a single flat colour. A tile is ink on the paper and a step lighter
  // on the ink, which is `--mono-tile`, declared per theme below.
  mono: {
    ...Box.palette({ accent: MONO_ACCENT, base: MONO_BASE }),
    'gradient-primary': 'linear-gradient(var(--mono-tile, #16191e), var(--mono-tile, #16191e))',
    'gradient-accent': 'linear-gradient(var(--mono-tile, #16191e), var(--mono-tile, #16191e))',
    'gradient-aurora-light': 'linear-gradient(#fff, #fff)',
    'gradient-aurora-dark': `linear-gradient(${MONO_BASE[950]}, ${MONO_BASE[950]})`,
    'gradient-sidebar': 'linear-gradient(#fff, #fff)',
    'gradient-sidebar-dark': `linear-gradient(${MONO_BASE[950]}, ${MONO_BASE[950]})`,
    'code-bg': MONO_BASE[950],
    'code-bg-light': MONO_BASE[900],
  },
};

/** The props a wrapper takes to be drawn in `id` whatever the page around it is — the picker's previews. */
export function designScope(id: DesignId): BoxStyleProps {
  return { vars: DESIGN_VARS[id] };
}

/**
 * The same on `<html>`, keyed on the attribute the pre-paint script writes. Root rules, so they are in the
 * prerendered CSS and nothing has to run before the page is in its reader's design.
 */
export const designTokens: BoxStyleProps = {
  dataAttr: {
    'design=ember': { vars: DESIGN_VARS.ember, scrollbarColor: ['accent-300', 'transparent'] },
    'design=azure': { vars: DESIGN_VARS.azure, scrollbarColor: ['accent-300', 'transparent'] },
    'design=mono': { vars: DESIGN_VARS.mono, scrollbarColor: ['base-300', 'transparent'] },
  },
  theme: {
    dark: {
      dataAttr: {
        'design=ember': { bgColor: 'base-950', scrollbarColor: ['accent-800', 'transparent'] },
        'design=azure': { bgColor: 'base-950', scrollbarColor: ['accent-800', 'transparent'] },
        'design=mono': { bgColor: 'base-950', vars: { 'mono-tile': MONO_BASE[700] }, scrollbarColor: ['base-700', 'transparent'] },
      },
    },
    light: {
      dataAttr: {
        'design=ember': { bgColor: 'base-50' },
        'design=azure': { bgColor: 'base-50' },
        'design=mono': { bgColor: 'white', vars: { 'mono-tile': MONO_BASE[950] } },
      },
    },
  },
};
