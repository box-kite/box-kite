/**
 * The per-component API reference, generated rather than written down: each prop's own JSDoc for the
 * prose and its type node for the signature, the component's `@keyboard`/`@a11y`/`@pattern` tags for the
 * behaviour a page has to state, the axe fixtures for what the sweep actually covers, and
 * `boxComponents.ts` for the style tree. `check-components-api.mjs` keeps `api/components/*.json`
 * honest; this module only builds the model.
 *
 * Syntax only — no program, no type checker: JSDoc is in the AST, and a printed type node is what the
 * source says rather than what an expansion would say. So the pass costs milliseconds and needs no build.
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';

const ROOT = join(import.meta.dirname, '..');

export const API_DIR = 'api/components';

/** The axe sweep's fixtures, and the style tree every `component` key below is a node of. */
const FIXTURES = 'dev/a11y/fixtures.tsx';
const COMPONENT_STYLES = 'src/core/extends/boxComponents.ts';

const PACKAGE_NAME = '@box-kite/react';

/**
 * One entry per component the docs site has a page for. Every name here is a symbol somewhere — the
 * props interface, the function carrying the doc tags, the style-tree key — so a rename fails this pass
 * instead of quietly dropping a section from a page.
 */
const CONFIG = [
  { name: 'Button', route: '/button', file: 'src/components/button.tsx', props: 'Props', doc: 'ButtonImpl', styles: 'button' },
  { name: 'Textbox', route: '/textbox', file: 'src/components/textbox.tsx', props: 'Props', doc: 'TextboxImpl', styles: 'textbox' },
  { name: 'Textarea', route: '/textarea', file: 'src/components/textarea.tsx', props: 'Props', doc: 'TextareaImpl', styles: 'textarea' },
  { name: 'Checkbox', route: '/checkbox', file: 'src/components/checkbox.tsx', props: 'Props', doc: 'CheckboxImpl', styles: 'checkbox' },
  { name: 'Switch', route: '/switch', file: 'src/components/switch.tsx', props: 'Props', doc: 'SwitchImpl', styles: 'switch' },
  {
    name: 'RadioButton',
    route: '/radiobutton',
    file: 'src/components/radioButton.tsx',
    props: 'Props',
    doc: 'RadioButtonImpl',
    styles: 'radioButton',
  },
  {
    name: 'RadioGroup',
    route: '/radiobutton',
    file: 'src/components/radioGroup.tsx',
    props: 'Props',
    doc: 'RadioGroupImpl',
    parts: [{ name: 'RadioGroup.Item', props: 'ItemProps', doc: 'RadioGroupItem' }],
  },
  { name: 'Tooltip', route: '/tooltip', file: 'src/components/tooltip.tsx', props: 'Props', doc: 'Tooltip', styles: 'tooltip' },
  { name: 'Overlay', route: '/overlay', file: 'src/components/overlay.tsx', props: 'OverlayProps', doc: 'OverlayImpl' },
  { name: 'Popover', route: '/popover', file: 'src/components/popover.tsx', props: 'Props', doc: 'PopoverImpl', styles: 'popover' },
  {
    name: 'Dialog',
    route: '/dialog',
    file: 'src/components/dialog.tsx',
    props: 'DialogProps',
    doc: 'DialogImpl',
    styles: 'dialog',
    parts: [
      { name: 'Dialog.Title', props: 'DialogTitleProps', doc: 'DialogTitle' },
      { name: 'Dialog.Description', props: 'DialogDescriptionProps', doc: 'DialogDescription' },
    ],
  },
  // No props of its own on purpose: `AlertDialogProps` is `DialogProps` minus the three an alert dialog
  // does not get to choose, so listing it a second time would be one table drifting from another.
  { name: 'AlertDialog', route: '/dialog', file: 'src/components/dialog.tsx', doc: 'AlertDialogImpl', named: true },
  {
    name: 'Menu',
    route: '/menu',
    file: 'src/components/menu.tsx',
    props: 'MenuProps',
    doc: 'MenuImpl',
    styles: 'menu',
    parts: [
      { name: 'Menu.Item', props: 'MenuItemProps', doc: 'MenuItem' },
      { name: 'Menu.CheckboxItem', props: 'MenuCheckboxItemProps', doc: 'MenuCheckboxItem' },
      { name: 'Menu.RadioGroup', props: 'MenuRadioGroupProps', doc: 'MenuRadioGroup' },
      { name: 'Menu.RadioItem', props: 'MenuRadioItemProps', doc: 'MenuRadioItem' },
      { name: 'Menu.Group', props: 'MenuGroupProps', doc: 'MenuGroup' },
      { name: 'Menu.Separator', props: 'MenuSeparatorProps', doc: 'MenuSeparator' },
      { name: 'Menu.Sub', props: 'MenuSubProps', doc: 'MenuSub' },
    ],
  },
  {
    name: 'Tabs',
    route: '/tabs',
    file: 'src/components/tabs.tsx',
    props: 'TabsProps',
    doc: 'TabsImpl',
    styles: 'tabs',
    parts: [
      { name: 'Tabs.List', props: 'TabsListProps', doc: 'TabsList' },
      { name: 'Tabs.Tab', props: 'TabsTabProps', doc: 'TabsTab' },
      { name: 'Tabs.Panels', props: 'TabsPanelsProps', doc: 'TabsPanels' },
      { name: 'Tabs.Panel', props: 'TabsPanelProps', doc: 'TabsPanel' },
    ],
  },
  {
    name: 'Accordion',
    route: '/accordion',
    file: 'src/components/accordion.tsx',
    props: 'AccordionProps',
    doc: 'AccordionImpl',
    styles: 'accordion',
    parts: [
      { name: 'Accordion.Item', props: 'AccordionItemProps', doc: 'AccordionItem' },
      { name: 'Accordion.Trigger', props: 'AccordionTriggerProps', doc: 'AccordionTrigger' },
      { name: 'Accordion.Panel', props: 'AccordionPanelProps', doc: 'AccordionPanel' },
    ],
  },
  {
    name: 'Collapsible',
    route: '/accordion',
    file: 'src/components/accordion.tsx',
    props: 'CollapsibleProps',
    doc: 'Collapsible',
    styles: 'collapsible',
  },
  {
    name: 'Slider',
    route: '/slider',
    file: 'src/components/slider.tsx',
    props: 'SliderProps',
    doc: 'SliderImpl',
    styles: 'slider',
  },
  {
    name: 'Progress',
    route: '/progress',
    file: 'src/components/progress.tsx',
    props: 'ProgressProps',
    doc: 'Progress',
    styles: 'progress',
  },
  {
    name: 'Dropdown',
    route: '/dropdown',
    file: 'src/components/dropdown.tsx',
    props: 'Props',
    doc: 'DropdownImpl',
    styles: 'dropdown',
    parts: [{ name: 'Dropdown.Display', props: 'DropdownDisplayProps', doc: 'DropdownDisplayProps' }],
  },
  {
    name: 'DataGrid',
    route: '/datagrid',
    file: 'src/components/dataGrid.tsx',
    doc: 'DataGrid',
    props: 'DataGridProps',
    propsFile: 'src/components/dataGrid/contracts/dataGridContract.ts',
    styles: 'datagrid',
  },
  { name: 'Flex', route: '/flex', file: 'src/components/flex.tsx', doc: 'FlexImpl' },
  { name: 'Grid', route: '/grid', file: 'src/components/grid.tsx', doc: 'GridImpl' },
  { name: 'Icon', route: '/icon', file: 'src/components/icon.tsx', props: 'IconProps', doc: 'IconImpl' },
  { name: 'Presence', route: '/animation', file: 'src/components/presence.tsx', props: 'Props', doc: 'Presence' },
  { name: 'Sparkline', route: '/charts', file: 'src/components/chart.tsx', props: 'SparklineProps', doc: 'SparklineImpl', named: true },
  {
    name: 'ProgressRing',
    route: '/charts',
    file: 'src/components/chart.tsx',
    props: 'ProgressRingProps',
    doc: 'ProgressRingImpl',
    named: true,
  },
  { name: 'Gauge', route: '/charts', file: 'src/components/chart.tsx', props: 'GaugeProps', doc: 'GaugeImpl', named: true },
  { name: 'MiniDonut', route: '/charts', file: 'src/components/chart.tsx', props: 'MiniDonutProps', doc: 'MiniDonutImpl', named: true },
  {
    name: 'ChartContainer',
    route: '/charts',
    file: 'src/components/chart.tsx',
    props: 'ChartContainerProps',
    doc: 'ChartContainerImpl',
    named: true,
  },
];

/** The config with what can be derived filled in, so an entry states only what is not obvious. */
export const COMPONENTS = CONFIG.map((entry) => ({
  ...entry,
  file: entry.file,
  propsFile: entry.propsFile ?? entry.file,
  slug: entry.name.replace(/\./g, '-').toLowerCase(),
  import: entry.named
    ? `import { ${entry.name} } from '${PACKAGE_NAME}/components/${basename(entry.file, '.tsx')}';`
    : `import ${entry.name} from '${PACKAGE_NAME}/components/${basename(entry.file, '.tsx')}';`,
}));

const sources = new Map();

/** A parsed source file, with parents, so `getText()` and the JSDoc in the AST both work. */
function sourceOf(relativePath) {
  const cached = sources.get(relativePath);
  if (cached) return cached;

  const text = readFileSync(join(ROOT, relativePath), 'utf8');
  const file = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  sources.set(relativePath, file);

  return file;
}

/** A top-level interface, type alias, function or `const` by name — whatever kind it is declared as. */
function declarationOf(relativePath, name) {
  const file = sourceOf(relativePath);

  for (const statement of file.statements) {
    if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && statement.name.text === name) return statement;
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        // The statement carries the JSDoc, not the declaration inside it.
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return statement;
      }
    }
  }

  throw new Error(`${relativePath} declares no ${name}`);
}

/** A JSDoc comment as written: TypeScript hands it over as text or as a node array with the links in it. */
function commentSource(comment) {
  if (!comment) return '';
  if (typeof comment === 'string') return comment;

  return comment
    .map((part) =>
      ts.isJSDocLink(part) || ts.isJSDocLinkCode(part) || ts.isJSDocLinkPlain(part) ? (part.name?.getText() ?? '') : part.text,
    )
    .join('');
}

/** JSDoc prose as one line — a wrapped comment is one sentence, not one line per line. */
function commentText(comment) {
  return commentSource(comment).replace(/\s+/g, ' ').trim();
}

/**
 * The **first paragraph** of a declaration's doc comment. A component's comment goes on to explain
 * itself to whoever maintains it — an example, the reason it is an input — and a reference wants the
 * sentence, so the paragraph break is the cut.
 */
function descriptionOf(node) {
  const blocks = ts.getJSDocCommentsAndTags(node).filter((block) => ts.isJSDoc(block));

  return commentText(commentSource(blocks.at(-1)?.comment).split(/\n\s*\n/)[0]);
}

/** Every `@name` tag on a declaration, in the order written, as plain text. */
function tagsOf(node, name) {
  return ts
    .getJSDocTags(node)
    .filter((tag) => tag.tagName.text === name)
    .map((tag) => commentText(tag.comment));
}

/**
 * `@keyboard Space — Toggles it.` The em dash is the separator because the prose either side of it is
 * full of hyphens; a row written without one is a failure rather than a row with no action. A leading
 * `(…)` is a *mode* — `(With isSearchable)`, `(On a column resizer)` — because a component with two
 * keyboard maps has to say which one a row belongs to, and one table with both in it says nothing.
 */
function keyboardRows(node, name) {
  return tagsOf(node, 'keyboard').map((text) => {
    const mode = text.match(/^\(([^)]+)\)\s*/);
    const [keys, ...rest] = text.slice(mode?.[0].length ?? 0).split('—');

    if (!rest.length) throw new Error(`${name}: @keyboard "${text}" has no "—" between the keys and what they do`);

    return { mode: mode?.[1] ?? null, keys: keys.trim(), action: rest.join('—').trim() };
  });
}

/**
 * `const { anchorSide = 'top', matchWidth = true } = props` — the defaults a reader would otherwise have
 * to guess. `@default` on the prop wins, for a default the destructuring does not spell out.
 */
function defaultsOf(relativePath, symbol) {
  const declaration = declarationOf(relativePath, symbol);
  const defaults = new Map();

  const visit = (node) => {
    if (ts.isObjectBindingPattern(node)) {
      for (const element of node.elements) {
        if (element.initializer && ts.isIdentifier(element.name)) defaults.set(element.name.text, element.initializer.getText());
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(declaration);

  return defaults;
}

/** The members an interface declares itself — so everything inherited from `BoxProps` stays on /box. */
function ownProps(relativePath, typeName, defaults) {
  const declaration = declarationOf(relativePath, typeName);
  const members = ts.isInterfaceDeclaration(declaration) ? declaration.members : [];

  return members
    .filter((member) => ts.isPropertySignature(member) || ts.isMethodSignature(member))
    .map((member) => {
      const name = member.name.getText();
      const tag = tagsOf(member, 'default');

      return {
        name,
        type: (ts.isPropertySignature(member) ? (member.type?.getText() ?? 'unknown') : member.getText().slice(name.length))
          .replace(/\s+/g, ' ')
          .trim(),
        required: !member.questionToken,
        default: tag[0] ?? defaults.get(name) ?? null,
        description: descriptionOf(member),
      };
    });
}

const styleNodes = new Map();

/** `boxComponents` as a flat list of dotted paths — the node names a `Box.components()` override needs. */
function styleTreeOf(key) {
  if (!styleNodes.size) {
    const declaration = declarationOf(COMPONENT_STYLES, 'boxComponents');
    const literal = declaration.declarationList.declarations[0].initializer;
    const root = ts.isSatisfiesExpression(literal) || ts.isAsExpression(literal) ? literal.expression : literal;

    const walk = (object, path, depth) => {
      for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) continue;

        const name = property.name.getText().replace(/^'|'$/g, '');
        const nodePath = path ? `${path}.${name}` : name;
        const entries = Object.fromEntries(
          property.initializer.properties.filter(ts.isPropertyAssignment).map((entry) => [entry.name.getText(), entry.initializer]),
        );

        const node = {
          path: nodePath,
          depth,
          extends: entries.extends && ts.isStringLiteral(entries.extends) ? entries.extends.text : null,
          variants: entries.variants && ts.isObjectLiteralExpression(entries.variants) ? keysOf(entries.variants) : [],
        };

        styleNodes.set(nodePath, node);

        if (entries.children && ts.isObjectLiteralExpression(entries.children)) walk(entries.children, nodePath, depth + 1);
      }
    };

    walk(root, '', 0);
  }

  if (!key) return [];

  const nodes = [...styleNodes.values()].filter((node) => node.path === key || node.path.startsWith(`${key}.`));

  if (!nodes.length) throw new Error(`${COMPONENT_STYLES} has no component named ${key}`);

  // Depths are relative to the component's own node, which is the one a page shows as the root.
  return nodes.map(({ path, depth, extends: base, variants }) => ({ path, depth: depth - nodes[0].depth, extends: base, variants }));
}

function keysOf(object) {
  return object.properties.filter(ts.isPropertyAssignment).map((property) => property.name.getText().replace(/^'|'$/g, ''));
}

let fixtureList;

/** The axe sweep's own list: which fixtures cover a component, and what each of them still violates. */
function axeFor(name) {
  if (!fixtureList) {
    const declaration = declarationOf(FIXTURES, 'fixtures');
    const literal = declaration.declarationList.declarations[0].initializer;

    fixtureList = literal.elements.filter(ts.isObjectLiteralExpression).map((element) => {
      const entries = Object.fromEntries(element.properties.filter(ts.isPropertyAssignment).map((entry) => [entry.name.getText(), entry]));
      const fixtureName = ts.isStringLiteral(entries.name.initializer) ? entries.name.initializer.text : '';
      const violations = entries.knownViolations?.initializer;

      return {
        name: fixtureName,
        knownViolations: violations && ts.isObjectLiteralExpression(violations) ? keysOf(violations) : [],
      };
    });
  }

  const covering = fixtureList.filter((fixture) => fixture.name === name || fixture.name.startsWith(`${name} (`));

  return {
    fixtures: covering.map((fixture) => fixture.name),
    knownViolations: [...new Set(covering.flatMap((fixture) => fixture.knownViolations))].sort(),
  };
}

/** One component's reference, exactly as its JSON file holds it. */
function buildComponent(entry) {
  const doc = declarationOf(entry.file, entry.doc);
  const defaults = defaultsOf(entry.file, entry.doc);

  return {
    name: entry.name,
    route: entry.route,
    import: entry.import,
    description: descriptionOf(doc),
    pattern: tagsOf(doc, 'pattern')[0] ?? null,
    props: entry.props ? ownProps(entry.propsFile, entry.props, defaults) : [],
    parts: (entry.parts ?? []).map((part) => ({
      name: part.name,
      description: descriptionOf(declarationOf(entry.file, part.doc)),
      props: ownProps(entry.file, part.props, defaultsOf(entry.file, part.doc)),
    })),
    keyboard: keyboardRows(doc, entry.name),
    a11y: tagsOf(doc, 'a11y'),
    axe: axeFor(entry.name),
    styleTree: styleTreeOf(entry.styles),
  };
}

/** Every documented component, keyed by the slug its JSON file is named after. */
export function buildComponentsApi() {
  return new Map(COMPONENTS.map((entry) => [entry.slug, buildComponent(entry)]));
}

/** Through prettier, so a generated file is what `prettier --check` over the repo would write. */
export async function formatComponent(component) {
  const file = join(ROOT, API_DIR, 'x.json');
  const options = await prettier.resolveConfig(file);

  return prettier.format(JSON.stringify(component), { ...options, filepath: file });
}
