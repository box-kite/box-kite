/**
 * Fails the build when a component breaks one of the five conventions in `docs/component-conventions.md`:
 * state held in `useControllableState`, every change reported as `onXChange(value, { reason })`, Box style
 * props on every part, a style-tree node to override, and composition by render prop rather than by
 * cloning. Run: npm run check:conventions
 *
 * Both ledgers below fail **two ways** — on a new break, and on a listed one that stopped breaking — the
 * `knownViolations` rule from the axe sweep. So a component cannot quietly drift out of the contract, and
 * the debt cannot quietly grow: `SANCTIONED` is where the rule genuinely does not apply, `OWED` is where
 * it does and has not been paid yet.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { COMPONENTS, buildComponentsApi } from './componentsApi.mjs';

const ROOT = join(import.meta.dirname, '..');

/**
 * Where a convention does not apply, and why. Every entry is a decision rather than a postponement — the
 * prose is what a reviewer reads when a sixth one is proposed.
 */
const SANCTIONED = {
  // A component rendering a real form control forwards the DOM event rather than inventing a second
  // channel: the event *is* the API, it carries the target, and React's own types already describe it.
  'Button.onClick': 'a native <button>, so the DOM event is the API',
  'Checkbox.onChange': 'a native <input>, so the DOM event is the API',
  'Checkbox.onInput': 'a native <input>, so the DOM event is the API',
  'Switch.onChange': 'a native <input>, so the DOM event is the API',
  'Switch.onInput': 'a native <input>, so the DOM event is the API',
  'RadioButton.onChange': 'a native <input>, so the DOM event is the API',
  'RadioButton.onInput': 'a native <input>, so the DOM event is the API',
  'Textbox.onChange': 'a native <input>, so the DOM event is the API',
  'Textbox.onInput': 'a native <input>, so the DOM event is the API',
  'Textarea.onChange': 'a native <textarea>, so the DOM event is the API',
  'Textarea.onInput': 'a native <textarea>, so the DOM event is the API',
  // The same tier from the state side: `defaultValue` on these two is React's own uncontrolled-input
  // attribute and the DOM holds it. A hook holding it beside the DOM would be a second source of truth.
  'Textbox.state': 'the DOM holds an uncontrolled input, not a hook',
  'Textarea.state': 'the DOM holds an uncontrolled input, not a hook',
  // Not changes. A command names what to do rather than a value that became true, and a report says what
  // the browser did rather than what the component decided; neither has a reason the caller could act on.
  'Menu.Item.onSelect': 'a command, not a change: no new value, and no reason to give',
  'Overlay.onSideChange': 'a report of where the browser put the layer, not a state the caller owns',
  // A component rendering no element of its own has nothing for `Box.components()` to reach.
  'Flex.styles': 'Box with one prop set, so the style tree is Box',
  'Grid.styles': 'Box with one prop set, so the style tree is Box',
  'Presence.styles': 'renders no element at all — a render prop and a timer',
  'AlertDialog.styles': "the `dialog` tree, whose `alert` variant is this component's",
  'Overlay.styles': 'positions a layer and draws no surface: the surface is its child',
  'Icon.styles': "styles an element it did not author, so the class lands on that element rather than a node",
  // The Box half is intersected at the call signature rather than extended, because the other half is a
  // union (`Combobox`) or the props are shared with a polymorphic overload (`Overlay`). The caller writes
  // Box props on all three; it is the interface the reference names that has none.
  'Overlay.box': 'Box props are intersected in at the signature — `OverlayProps & Omit<BoxProps, …>`',
  'Combobox (single-select).box': 'one half of a union intersected with `BaseProps`, which takes them',
  'Combobox (multiple).box': 'one half of a union intersected with `BaseProps`, which takes them',
  'Presence.box': 'renders no element at all, so there is nothing to style',
  // The one place a cloned child is right: an icon somebody else drew is an element this library did not
  // author, so there is no render prop to hand a trigger bag to. See `src/components/icon.tsx`.
  'src/components/icon.tsx': 'styles an element it did not author, so there is no render prop to offer',
};

/**
 * Where a convention applies and the component has not been brought to it yet — B10 stage 2. An entry here
 * is a promise with a name on it, and emptying this object is what closes the step.
 */
const OWED = {
  'Dropdown.onChange': 'B10 stage 2: `(value, values)` predates the contract; `onValueChange` replaces it',
  'Dropdown.state': 'B10 stage 2: a hand-rolled `useState` + `useMemo` rather than the hook',
  'DataGrid.onSelectionChange': 'B10 stage 2: an event object whose `action` is a reason under another name',
  'DataGrid.onGlobalFilterChange': 'B10 stage 2: no details argument',
  'DataGrid.onColumnFiltersChange': 'B10 stage 2: no details argument',
  'DataGrid.onExpandedRowKeysChange': 'B10 stage 2: no details argument',
  'DataGrid.onPageChange': 'B10 stage 2: two positional arguments',
  'DataGrid.onPageSizeChange': 'B10 stage 2: no details argument',
  'DataGrid.onSortChange': 'B10 stage 2: two positional arguments',
  'DataGrid.onServerStateChange': 'B10 stage 2: a snapshot with no reason for it',
  'DataGrid.box': 'B10 stage 2: `DataGridProps` is the whole prop type and takes no Box props at all',
  'RadioGroup.styles': 'B10 stage 2: renders a wrapper and a label with no node to override',
  'Sparkline.styles': 'B10 stage 2: no node of its own',
  'ProgressRing.styles': 'B10 stage 2: no node of its own',
  'Gauge.styles': 'B10 stage 2: no node of its own',
  'MiniDonut.styles': 'B10 stage 2: no node of its own',
  'ChartContainer.styles': 'B10 stage 2: no node of its own',
};

/**
 * Every callback prop, not just the `…Change` ones: `onChange` on a `Checkbox` is a DOM passthrough and
 * `onSelect` on a `Menu.Item` is a command, and both are decisions the ledger should have to state rather
 * than a pattern that quietly lets them through.
 */
const CHANGE_PROP = /^on[A-Z]/;

/** A prop no type but Box style props has, so asking the checker for it answers rule 3 exactly. */
const BOX_MARKER = 'bgColor';

const sources = new Map();

function sourceText(relativePath) {
  if (!sources.has(relativePath)) sources.set(relativePath, readFileSync(join(ROOT, relativePath), 'utf8'));

  return sources.get(relativePath);
}

/**
 * Rule 3 asks whether a caller can put Box style props on a part, and that is a question about the
 * resolved type rather than about what the interface was written to extend: the idiom here is an `Omit` of
 * an alias of another part's props, several hops from the word `BoxProps`. So this pass builds a real
 * program and asks the checker — a few seconds, and the only one of the five that needs types at all.
 */
function boxPropsChecker() {
  const configPath = join(ROOT, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, ROOT);
  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();

  return (relativePath, name) => {
    const file = program.getSourceFile(join(ROOT, relativePath));

    for (const statement of file?.statements ?? []) {
      const declared = ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement);

      if (!declared || statement.name.text !== name) continue;

      // The declared type rather than an instantiation: a generic props interface has type parameters,
      // and its own members are what a caller writes props against.
      const type = checker.getDeclaredTypeOfSymbol(checker.getSymbolAtLocation(statement.name));

      return Boolean(checker.getPropertyOfType(type, BOX_MARKER));
    }

    return null;
  };
}

const api = buildComponentsApi();
const takesBoxProps = boxPropsChecker();

/** One convention broken in one place, keyed the way both ledgers above key it. */
const breaks = new Map();

function report(key, rule, detail) {
  breaks.set(key, { rule, detail });
}

for (const entry of COMPONENTS) {
  const component = api.get(entry.slug);
  const parts = [{ name: component.name, props: component.props, config: entry, file: entry.propsFile }];

  for (const part of component.parts) {
    parts.push({ ...part, config: (entry.parts ?? []).find((candidate) => candidate.name === part.name), file: entry.file });
  }

  for (const part of parts) {
    for (const prop of part.props) {
      if (!CHANGE_PROP.test(prop.name)) continue;

      // Rule 2. The reason is the point, so a handler naming none — `ChangeHandler<boolean>` — breaks the
      // rule as much as a bare function type does: the consumer is left guessing what caused the change.
      const handler = prop.type.match(/^ChangeHandler<(.+)>$/s);

      if (!handler) report(`${part.name}.${prop.name}`, 'changes', `not a ChangeHandler: ${prop.type}`);
      else if (!handler[1].includes(',')) report(`${part.name}.${prop.name}`, 'changes', `no reason named: ${prop.type}`);
    }

    // Rule 3. Every part takes Box style props — the differentiator, so it is not optional on a subpart.
    const propsName = part.config?.props;

    if (propsName && takesBoxProps(part.file, propsName) === false) {
      report(`${part.name}.box`, 'box props', `${propsName} resolves to a type with no ${BOX_MARKER}`);
    }
  }

  // Rule 1. A `value`/`defaultValue` (or `open`/`defaultOpen`) pair is state the caller may own, and
  // `useControllableState` is the one thing that makes controlled and uncontrolled behave the same.
  const names = new Set(parts.flatMap((part) => part.props).map((prop) => prop.name));
  const pairs = [...names].filter((name) => /^default[A-Z]/.test(name) && names.has(name[7].toLowerCase() + name.slice(8)));

  if (pairs.length && !sourceText(entry.file).includes('useControllableState')) {
    report(`${component.name}.state`, 'state', `holds ${pairs.join(', ')} without useControllableState`);
  }

  // Rule 4. Something for `Box.components()` to reach. The reference pass has already proved the key
  // resolves, so the only thing left to catch is a component that names none.
  if (!entry.styles) report(`${component.name}.styles`, 'style tree', 'names no node in boxComponents.ts');
}

// Rule 5. Composition is a render prop: a component hands the caller a bag to spread and never reaches
// into an element it was given. Cloning has to guess where an attribute belongs — a Box takes them in a
// `props` bag, a plain element on top — and guesses wrong in silence.
for (const file of new Set(COMPONENTS.map((entry) => entry.file))) {
  if (sourceText(file).includes('cloneElement')) report(file, 'composition', 'clones a child instead of offering a render prop');
}

const sanctioned = [];
const owed = [];
const unexpected = [];

for (const [key, { rule, detail }] of breaks) {
  if (key in SANCTIONED) sanctioned.push(key);
  else if (key in OWED) owed.push(key);
  else unexpected.push(`  ${key} — ${rule}: ${detail}`);
}

// The other side of both ledgers: an entry that no longer fires is a line claiming a break that is not
// there, and the next reader believes it. A paid debt leaves `OWED` in the commit that pays it.
const settled = [
  ...Object.keys(SANCTIONED)
    .filter((key) => !breaks.has(key))
    .map((key) => `  ${key} — sanctioned, but nothing breaks the rule there any more`),
  ...Object.keys(OWED)
    .filter((key) => !breaks.has(key))
    .map((key) => `  ${key} — owed, but already paid: delete the entry`),
];

const problems = [
  unexpected.length && `${unexpected.length} break(s) the contract does not allow:\n${unexpected.join('\n')}`,
  settled.length && `${settled.length} ledger entry(ies) no longer true:\n${settled.join('\n')}`,
].filter(Boolean);

if (problems.length) {
  console.error(`\n✖ docs/component-conventions.md is the contract:\n\n${problems.join('\n\n')}\n`);
  process.exit(1);
}

console.log(`✔ ${COMPONENTS.length} components conform: ${sanctioned.length} sanctioned exception(s), ${owed.length} owed (B10 stage 2)`);
