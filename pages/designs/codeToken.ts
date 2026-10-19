import type { BoxComponentStyles } from '../../src/types';

/** One token's colour, per theme. Inline, because every Box class carries the base `display: block`. */
export function token(dark: string, light: string, { theme, ...rest }: BoxComponentStyles = {}) {
  return {
    styles: {
      display: 'inline',
      ...rest,
      theme: {
        dark: { ...theme?.dark, css: { ...theme?.dark?.css, color: dark } },
        light: { ...theme?.light, css: { ...theme?.light?.css, color: light } },
      },
    } satisfies BoxComponentStyles,
  };
}
