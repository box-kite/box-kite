import { BoxStyleValue } from './coreTypes';

/**
 * The grammar behind `transformOrigin`: one, two or three positions, each a keyword, a length with its
 * unit, a percentage or a fraction (written out as the percentage). Measured in Chrome, Firefox and
 * WebKit — none of them takes background-position's four-value `right 10px bottom 5px`, so neither does this.
 */
namespace Transforms {
  type Unit = 'px' | 'rem' | 'em' | 'ch' | 'ex' | 'lh' | 'vw' | 'vh' | 'vmin' | 'vmax' | 'cqw' | 'cqh' | 'cm' | 'mm' | 'in' | 'pt' | 'pc';

  /** A length as CSS writes it, unit included: in SVG user space `48px` is 48 user units. */
  export type Length = `${number}${Unit}` | '0';

  type Position = `${number}%` | `${number}/${number}` | Length;
  type X = 'left' | 'center' | 'right';
  type Y = 'top' | 'center' | 'bottom';

  /** One `transform-origin` value: the horizontal half first unless both halves are keywords, then an optional depth. */
  export type Origin = X | Y | Position | `${X | Position} ${Y | Position}` | `${Y} ${X}` | `${X | Position} ${Y | Position} ${Length}`;

  const xSide = new Set(['left', 'right']);
  const ySide = new Set(['top', 'bottom']);
  const length = /^(-?(\d+|\d*\.\d+)(px|rem|em|ch|ex|lh|vw|vh|vmin|vmax|cqw|cqh|cm|mm|in|pt|pc)|0)$/;
  const percent = /^-?(\d+|\d*\.\d+)%$/;
  const fraction = /^-?\d+\/[1-9]\d*$/;

  const isPosition = (part: string) => length.test(part) || percent.test(part) || fraction.test(part);
  const isKeyword = (part: string) => part === 'center' || xSide.has(part) || ySide.has(part);

  // Two keywords may come in either order as long as they name different axes; anything with a length
  // in it reads horizontal first, which is why `top 10px` is refused by every browser.
  function isPair(first: string, second: string) {
    if (isKeyword(first) && isKeyword(second)) {
      return !(xSide.has(first) && xSide.has(second)) && !(ySide.has(first) && ySide.has(second));
    }

    return (
      (first === 'center' || xSide.has(first) || isPosition(first)) && (second === 'center' || ySide.has(second) || isPosition(second))
    );
  }

  /** Whether a value is a `transform-origin` — the prop's `match`, and the browsers' own rule. */
  export function isOrigin(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const parts = value.trim().split(/\s+/);
    const [first, second, depth] = parts as [string, string?, string?];

    if (parts.length === 1) return isKeyword(first) || isPosition(first);
    if (parts.length === 2) return isPair(first, second!);

    return parts.length === 3 && isPair(first, second!) && length.test(depth!);
  }

  /** The value as CSS reads it: a fraction is spelled out as its percentage, everything else stands. */
  export function origin(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map((part) => {
        if (!fraction.test(part)) return part;

        const [a, b] = part.split('/');
        return `${(+a! / +b!) * 100}%`;
      })
      .join(' ');
  }
}

export default Transforms;
