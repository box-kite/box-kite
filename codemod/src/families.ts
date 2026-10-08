/**
 * The Radix primitives this codemod knows, and the Box Kite component each one becomes. A family is
 * recognised three ways: its own package (`@radix-ui/react-dialog`), the `radix-ui` umbrella
 * (`import { Dialog } from 'radix-ui'`), and a shadcn wrapper module (`@/components/ui/dialog`), whose
 * exports are the parts under the family's prefix (`DialogContent` is `Content`).
 */
export type FamilyName =
  | 'accordion'
  | 'alert-dialog'
  | 'checkbox'
  | 'collapsible'
  | 'dialog'
  | 'dropdown-menu'
  | 'popover'
  | 'progress'
  | 'radio-group'
  | 'select'
  | 'slider'
  | 'switch'
  | 'tabs'
  | 'toast'
  | 'tooltip';

/** A Box Kite import: the module under `@box-kite/react/components/`, and whether the name is the default export. */
export interface Target {
  module: string;
  name: string;
  named?: boolean;
}

export interface Family {
  name: FamilyName;
  /** The export name in `radix-ui`, and the prefix every part carries in a shadcn module. */
  prefix: string;
  parts: readonly string[];
  target: Target;
}

const family = (name: FamilyName, prefix: string, parts: string[], target: Target): Family => ({ name, prefix, parts, target });

export const FAMILIES: readonly Family[] = [
  family('accordion', 'Accordion', ['Root', 'Item', 'Header', 'Trigger', 'Content'], { module: 'accordion', name: 'Accordion' }),
  family('alert-dialog', 'AlertDialog', ['Root', 'Trigger', 'Portal', 'Overlay', 'Content', 'Title', 'Description', 'Action', 'Cancel'], {
    module: 'dialog',
    name: 'AlertDialog',
    named: true,
  }),
  family('checkbox', 'Checkbox', ['Root', 'Indicator'], { module: 'checkbox', name: 'Checkbox' }),
  family('collapsible', 'Collapsible', ['Root', 'Trigger', 'Content'], { module: 'accordion', name: 'Collapsible', named: true }),
  family('dialog', 'Dialog', ['Root', 'Trigger', 'Portal', 'Overlay', 'Content', 'Title', 'Description', 'Close'], {
    module: 'dialog',
    name: 'Dialog',
  }),
  family(
    'dropdown-menu',
    'DropdownMenu',
    [
      'Root',
      'Trigger',
      'Portal',
      'Content',
      'Group',
      'Label',
      'Item',
      'CheckboxItem',
      'RadioGroup',
      'RadioItem',
      'ItemIndicator',
      'Separator',
      'Arrow',
      'Sub',
      'SubTrigger',
      'SubContent',
    ],
    { module: 'menu', name: 'Menu' },
  ),
  family('popover', 'Popover', ['Root', 'Trigger', 'Anchor', 'Portal', 'Content', 'Close', 'Arrow'], {
    module: 'popover',
    name: 'Popover',
  }),
  family('progress', 'Progress', ['Root', 'Indicator'], { module: 'progress', name: 'Progress' }),
  family('radio-group', 'RadioGroup', ['Root', 'Item', 'Indicator'], { module: 'radioGroup', name: 'RadioGroup' }),
  family(
    'select',
    'Select',
    [
      'Root',
      'Trigger',
      'Value',
      'Icon',
      'Portal',
      'Content',
      'Viewport',
      'Item',
      'ItemText',
      'ItemIndicator',
      'ScrollUpButton',
      'ScrollDownButton',
      'Group',
      'Label',
      'Separator',
      'Arrow',
    ],
    { module: 'dropdown', name: 'Dropdown' },
  ),
  family('slider', 'Slider', ['Root', 'Track', 'Range', 'Thumb'], { module: 'slider', name: 'Slider' }),
  family('switch', 'Switch', ['Root', 'Thumb'], { module: 'switch', name: 'Switch' }),
  family('tabs', 'Tabs', ['Root', 'List', 'Trigger', 'Content'], { module: 'tabs', name: 'Tabs' }),
  family('toast', 'Toast', ['Provider', 'Root', 'Title', 'Description', 'Action', 'Close', 'Viewport'], {
    module: 'toaster',
    name: 'Toaster',
  }),
  family('tooltip', 'Tooltip', ['Provider', 'Root', 'Trigger', 'Portal', 'Content', 'Arrow'], { module: 'tooltip', name: 'Tooltip' }),
];

const byName = new Map(FAMILIES.map((f) => [f.name, f]));
const byPrefix = new Map(FAMILIES.map((f) => [f.prefix, f]));

export function familyNamed(name: FamilyName): Family {
  return byName.get(name)!;
}

/** `Dialog` is the root and `DialogContent` the content: the convention Radix's own aliases and shadcn share. */
export function partOfExport(family: Family, exported: string): string | undefined {
  if (exported === family.prefix) return 'Root';
  if (family.parts.includes(exported)) return exported;
  if (!exported.startsWith(family.prefix)) return undefined;

  const part = exported.slice(family.prefix.length);

  return family.parts.includes(part) ? part : undefined;
}

/** The family a module specifier is, and how it was reached. */
export type Origin = 'radix' | 'shadcn';

export interface ModuleMatch {
  family: Family;
  origin: Origin;
  /** `radix-ui` exports one namespace per family, so its bindings name the family rather than a part. */
  umbrella?: boolean;
}

const kebab = (prefix: string) => prefix.replace(/[A-Z]/g, (c, i) => (i ? '-' : '') + c.toLowerCase());

/** `@radix-ui/react-dialog`, `radix-ui`, or a shadcn `…/ui/dialog` — the last two segments are what identify one. */
export function matchModule(specifier: string): ModuleMatch | 'umbrella' | 'sonner' | undefined {
  if (specifier === 'radix-ui') return 'umbrella';
  if (specifier === 'sonner') return 'sonner';

  const radix = /^@radix-ui\/react-([a-z-]+)$/.exec(specifier);
  if (radix) {
    const found = byName.get(radix[1] as FamilyName);

    return found ? { family: found, origin: 'radix' } : undefined;
  }

  const ui = /(?:^|\/)ui\/([a-z-]+)$/.exec(specifier);
  if (ui) {
    if (ui[1] === 'sonner') return 'sonner';
    const found = byName.get(ui[1] as FamilyName);

    return found ? { family: found, origin: 'shadcn' } : undefined;
  }

  return undefined;
}

/** A `radix-ui` named import is the family's namespace: `import { Dialog as DialogPrimitive } from 'radix-ui'`. */
export function umbrellaFamily(exported: string): Family | undefined {
  return byPrefix.get(exported);
}

export const familyFile = (family: Family) => kebab(family.prefix);
