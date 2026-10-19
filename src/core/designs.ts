import Variants from './variants';

/**
 * A design chosen in CSS rather than in React: `Box.components(styles, { design: 'aurora' })` applies to
 * every Box under `data-design="aurora"`, so a stored choice can be written onto `<html>` before the first
 * paint and a prerendered page never hydrates against a different design than the one it painted.
 */
namespace Designs {
  /** The attribute that names the design an element and its subtree are drawn in. */
  export const attribute = 'data-design';

  // A design name lands in rule text, inside double quotes, so it is validated the way a group name is.
  const designName = /^[a-zA-Z][\w-]*$/;

  export function isName(name: string): boolean {
    return designName.test(name);
  }

  /**
   * The condition a design's rules carry on the element's own compound selector: under the design and not
   * under another one nested inside it. Exactly one class of specificity, whatever the nesting — the
   * exclusion is a `:where()` — so every rule of the design outranks the same rule without it.
   */
  export function variant(name: string): Variants.Variant | null {
    if (!isName(name)) return null;

    const root = `[${attribute}="${name}"]`;
    const other = `${root} [${attribute}]:not(${root})`;

    return { name: `design-${name}`, selector: `:is(${root},${root} *):not(:where(${other},${other} *))` };
  }
}

export default Designs;
