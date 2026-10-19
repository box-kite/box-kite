import Box from '../../src/box';
import Variables from '../../src/core/variables';
import type { BoxStyleProps } from '../../src/types';

/** The designs a reader can pick from the header. `classic` is the library's own look; the rest are `Box.components(…, { design })`. */
export type DesignId = 'classic' | 'ember';

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

export const EMBER_FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

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
  },
  theme: {
    dark: { dataAttr: { 'design=ember': { bgColor: 'base-950', scrollbarColor: ['accent-800', 'transparent'] } } },
    light: { dataAttr: { 'design=ember': { bgColor: 'base-50' } } },
  },
};
