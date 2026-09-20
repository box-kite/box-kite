import Variants from './variants';

/**
 * What goes *in front of* the element's own selector: an ancestor in a state (`group`), a preceding
 * sibling in one (`peer`), or the theme class. One shape for all three, because the only thing that
 * differs is the combinator — a descendant space, a `~`, or a compound when a theme lands on the root.
 *
 * The state vocabulary is `Variants`' (a pseudo-class name, or a `data-`/`aria-` attribute), so
 * `group={{ 'card/hover': … }}` and `not={{ hover: … }}` mean the same thing by `hover`. A key the
 * grammar rejects produces no rule and no class name, the way a variant key does.
 */
namespace Groups {
  /** The default class each key looks for when its key names no ancestor — Tailwind's two names. */
  const defaultNames = {
    group: 'group',
    peer: 'peer',
  };

  /** The two keys, each mapped to the combinator it puts between the ancestor and this element. */
  export const groupKeys = {
    /**
     * Styles for when an ancestor is in a state: `group={{ hover: … }}` → `.group:hover .className`,
     * `group={{ 'card/hover': … }}` → `.card:hover .className`. The ancestor carries the class itself.
     */
    group: ' ',
    /**
     * The same for a *preceding sibling*: `peer={{ checked: … }}` → `.peer:checked~.className`. What
     * styles a label from the input before it, with no JavaScript and no wrapper.
     */
    peer: '~',
  };

  export type GroupKey = keyof typeof groupKeys;

  /** One key: a state on the default class, or that state on a named ancestor — `hover`, `card/hover`. */
  export type ParentKey = Variants.StateKey | `${string}/${Variants.StateKey}`;

  /** One compiled ancestor: what it adds to the class name, and what it puts in front of the selector. */
  export interface Parent {
    /** Which kind it is. A theme is the only one that can compound onto a root selector (`html.dark`). */
    kind: GroupKey | 'theme';
    /** The class-name segment — built from the compiled parts, so `hoverGroup` and `group` share a class. */
    name: string;
    /** The ancestor's own selector, its state included. */
    selector: string;
    /** What joins it to what follows: a descendant space, or a sibling `~`. */
    combinator: string;
  }

  // An ancestor is addressed by class name, and the name lands in rule text: a CSS identifier, nothing else.
  const groupName = /^[a-zA-Z_][\w-]*$/;

  /** Whether a name may address a group — exported so the engine's legacy keys are held to it too. */
  export function isGroupName(name: string): boolean {
    return groupName.test(name);
  }

  /**
   * One `group`/`peer` key compiled, or null when the grammar accepts neither its state nor its name.
   * The *last* slash separates the two, the way a `cq` key's does: a class name cannot hold one.
   */
  export function parent(kind: GroupKey, key: string): Parent | null {
    const trimmed = key.trim();
    const separator = trimmed.lastIndexOf('/');
    const name = separator === -1 ? defaultNames[kind] : trimmed.slice(0, separator);
    const state = separator === -1 ? trimmed : trimmed.slice(separator + 1);
    const stateSelector = Variants.stateSelector(state);

    if (!stateSelector || !isGroupName(name)) return null;

    return {
      kind,
      // The state first, so the segment reads the way the old `hoverGroup={{ card: … }}` class name did —
      // and so the two spellings of one selector resolve to one class instead of two identical rules.
      name: `${kind === 'peer' ? 'peer-' : ''}${state}-${name}`,
      selector: `.${name}${stateSelector}`,
      combinator: groupKeys[kind],
    };
  }

  /** The theme class, which is an ancestor with no state of its own: `.dark .className`. */
  export function theme(name: string): Parent | null {
    if (!isGroupName(name)) return null;

    return { kind: 'theme', name: `theme-${name}`, selector: `.${name}`, combinator: groupKeys.group };
  }

  /** Where a theme's reach ends: the next element declaring one of its own. */
  const themeBoundary = '[data-theme]';

  /**
   * A theme rule's `@scope` prelude, which is what makes the *nearest* theme the one that counts:
   * `.dark .x` and `.light .x` are the same specificity, so nesting used to be settled by source order
   * alone (bug #189). The limit does the work — proximity only breaks a tie, and an outer theme's rule
   * carrying one more pseudo-class never gets that far.
   */
  export function themeScope(parent: Parent): string {
    return `@scope (${parent.selector}) to (${themeBoundary})`;
  }
}

export default Groups;
