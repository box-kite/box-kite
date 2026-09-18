/**
 * The catalog's prose half, generated from the two references F3 already extracts: `api/props.json` for
 * what a style prop means and `api/components/*.json` for a component's own props. The runtime builds the
 * rest — what a prop *accepts* comes off the live engine, so `Box.extend()` needs no regeneration.
 *
 * Syntax only, like `componentsApi.mjs`: the type strings those references already carry are mapped to
 * JSON Schema here, with the source scanned once for the aliases they name (`AnchorSide` is four string
 * literals, and a catalog that printed the alias would constrain nothing).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';
import { API_DIR, COMPONENTS } from './componentsApi.mjs';

const ROOT = join(import.meta.dirname, '..');

export const MANIFEST_FILE = 'src/utils/catalog/catalogManifest.ts';

const PROPS_API = 'api/props.json';

/** Where the semantic elements are declared, one `semantic('tag')` call each. */
const SEMANTICS = 'src/components/semantics.tsx';

/** The interfaces that mean "this component forwards Box's style props", wherever they sit in a chain. */
const STYLED = ['BoxProps', 'BoxStyleProps'];

/** A prop whose name is this and whose type is a node is the ordinary children slot, not a named one. */
const CHILDREN = 'children';

/**
 * The elements that take no children at all. A component says which one it renders by the tag it hands
 * Box, so the set is read off its source rather than listed by hand: `<Box tag="input">` is `Textbox`,
 * and the same line is what makes `Checkbox` a leaf while `Flex` is not.
 */
const VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'textarea', 'track', 'wbr'];

/** Whether this component renders one of them, and so cannot carry the default slot. */
function isLeaf(source) {
  return VOID_TAGS.some((tag) => (source ?? '').includes(`tag="${tag}"`));
}

/** A name a spec can write: the component, or one of its dotted parts. */
const IDENTIFIER = /^[A-Z]\w*(\.[A-Z]\w*)*$/;

/** The first sentence: what the catalog carries, where the reference carries the whole paragraph. */
function firstSentence(text) {
  const match = (text ?? '').match(/^.*?[.!?](\s|$)/);

  return (match ? match[0] : (text ?? '')).trim();
}

/**
 * Every `type X = …` and `interface X …` under `src/`, so a prop naming one can be resolved to values.
 * Interfaces are keyed by file as well as by name, because twenty components declare a `Props` and the
 * chain that answers "does this one forward style props" has to be that component's own.
 */
function declarations() {
  const aliases = new Map();
  const byName = new Map();
  const ambiguous = new Set();
  const heritage = new Map();
  const sources = new Map();

  const walk = (directory) => {
    for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) read(path);
    }
  };

  const read = (path) => {
    const file = path.split(/[\\/]/).join('/');
    const text = readFileSync(join(ROOT, path), 'utf8');
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    sources.set(file, text);

    const visit = (node) => {
      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const text = node.type.getText(source).replace(/\s+/g, ' ').trim();

        aliases.set(`${file}|${name}`, text);
        // Two files declare `TextareaProps` and twenty declare `Props`, so a lookup by name alone is a
        // coin toss: a name is global only while it is unique, and file-scoped always.
        if (byName.has(name)) ambiguous.add(name);
        byName.set(name, text);
      }

      // The whole clause as text, not the expression: `extends Omit<BoxProps<'button'>, 'disabled'>` has
      // `Omit` for its expression, and a chain walked by expression alone loses the base at the first wrapper.
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const extended = (node.heritageClauses ?? []).flatMap((clause) => clause.types.map((type) => type.getText(source))).join(' ');

        heritage.set(`${file}|${name}`, extended);
        // Interfaces go in the by-name table too: `IconProps extends BoxClassNameProps` is a chain that
        // crosses files, and stopping at the first name declared somewhere else would end every chain.
        if (byName.has(name)) ambiguous.add(name);
        byName.set(name, extended);
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  };

  walk('src');

  for (const name of ambiguous) byName.delete(name);

  return { aliases, byName, heritage, sources };
}

/** One type name's declaration: the file's own first, then the global one where the name is unique. */
function lookup(file, name, { aliases, byName, heritage }) {
  return heritage.get(`${file}|${name}`) ?? aliases.get(`${file}|${name}`) ?? byName.get(name);
}

/**
 * Whether a props interface reaches `BoxProps` through what it extends, however many links long and
 * through however many wrappers. Followed by the names its heritage *mentions* rather than by the
 * expression it extends: half of them arrive through an `Omit<>` or a local alias, and a chain that
 * followed the expression alone reported four components of fifty as styled.
 */
function isStyled(file, name, declared) {
  // No props interface of its own is how `Flex` and `Grid` are written: the props are Box's, verbatim.
  if (!name) return true;

  const seen = new Set();
  const queue = [name];

  while (queue.length) {
    const current = queue.shift();

    if (seen.has(current)) continue;
    if (STYLED.includes(current)) return true;

    seen.add(current);

    for (const identifier of lookup(file, current, declared)?.match(/\b[A-Z]\w*/g) ?? []) queue.push(identifier);
  }

  // The chain misses a props type declared as an intersection rather than extended — `Overlay`'s own props
  // are one interface and `BoxProps` is intersected with it one line below. A file naming `BoxProps` at all
  // forwards them; the ones that do not (`Presence`, a render prop) never mention it.
  return (declared.sources.get(file) ?? '').includes('BoxProps');
}

/** A union's members, split on the `|` that are not inside brackets — `Record<string, 'a' | 'b'>` is one. */
function members(text) {
  const parts = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if ('<([{'.includes(char)) depth++;
    else if ('>)]}'.includes(char)) depth--;
    else if (char === '|' && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(text.slice(start));

  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * One type, as JSON Schema — or `null` where a JSON spec cannot carry it. A partial answer is not on:
 * dropping the unmappable half of `boolean | ComboboxVirtualize` would leave the catalog stating a
 * constraint the prop does not have, so an unmappable member drops the whole prop.
 */
function schemaFor(text, file, declared, depth = 0) {
  const type = text.replace(/^readonly\s+/, '').trim();

  if (depth > 4) return null;
  // A function is an event: a spec is data, so the host binds it rather than the generator writing one.
  if (/=>/.test(type)) return { event: true };
  if (/^(React\.)?ReactNode$/.test(type)) return { slot: true };

  const union = members(type);

  if (union.length > 1) {
    const mapped = union
      .filter((member) => member !== 'undefined' && member !== 'null')
      .map((member) => schemaFor(member, file, declared, depth + 1));

    if (mapped.some((schema) => schema === null || schema.event || schema.slot)) return null;

    // Literals of one type are one enum rather than a union of one-member ones: `1 | 2 | 3` is a list of
    // numbers, and an `anyOf` saying so three times is the same constraint spelled out illegibly.
    const types = new Set(mapped.map((schema) => schema.type));

    if (types.size === 1 && mapped.every((schema) => schema.enum)) {
      return { type: mapped[0].type, enum: [...new Set(mapped.flatMap((schema) => schema.enum))] };
    }

    return { anyOf: mapped };
  }

  if (type === 'string' || type === 'number' || type === 'boolean') return { type };
  if (/^'[^']*'$/.test(type)) return { type: 'string', enum: [type.slice(1, -1)] };
  if (/^-?\d+(\.\d+)?$/.test(type)) return { type: 'number', enum: [Number(type)] };
  if (/^Record<string, ?(unknown|string|number|boolean|any)>$/.test(type)) return { type: 'object' };

  const array = type.match(/^(.*)\[\]$/) ?? type.match(/^(?:Readonly)?Array<(.*)>$/);

  if (array) {
    const items = schemaFor(array[1], file, declared, depth + 1);

    return items && !items.event && !items.slot ? { type: 'array', items } : null;
  }

  // A named type is worth following only where it resolves to values: `AnchorSide` is four string
  // literals and belongs in the catalog; `GridDefinition<TRow>` is a shape no generator should emit.
  // Type arguments are dropped before the lookup: what a generic resolves to is the same kind of thing
  // whatever it is applied to, and `ChangeHandler<TValue, SliderReason>` is a function either way.
  const alias = lookup(file, type, declared) ?? lookup(file, type.replace(/<.*>$/, ''), declared);

  return alias ? schemaFor(alias, file, declared, depth + 1) : null;
}

/** One component's entry: what it is, where children go, and every prop a JSON spec can set. */
function manifestComponent({ file, props: interfaceName }, api, declared) {
  const props = {};
  const required = [];
  const slots = [];
  const events = [];

  for (const prop of api.props) {
    const schema = schemaFor(prop.type, file, declared);

    if (!schema) continue;
    if (schema.event) {
      events.push(prop.name);
      continue;
    }
    if (schema.slot) {
      slots.push(prop.name === CHILDREN ? 'default' : prop.name);
      continue;
    }

    const description = firstSentence(prop.description);

    props[prop.name] = description ? { ...schema, description } : schema;
    if (prop.required) required.push(prop.name);
  }

  const styled = isStyled(file, interfaceName, declared);

  // A Box renders its children, and `Flex`, `Button` and `Icon` declare none of their own — they take
  // Box's props whole, so nothing in their props interface says where children go, and the catalog said
  // a layout component could hold nothing (bug #180). Three exceptions, each of them a component that
  // has already said where content goes: a leaf element takes no children at all, a render-prop
  // `children` is a function no JSON can carry (it lands in `events`), and a component declaring a named
  // slot has named the one it means.
  if (styled && !slots.length && !events.includes(CHILDREN) && !isLeaf(declared.sources.get(file))) slots.push('default');

  return {
    description: firstSentence(api.description),
    import: api.import,
    slots,
    events,
    props,
    required,
    styled,
  };
}

/**
 * `Box` and the semantic elements, which have no API page of their own because they have no API of their
 * own: their props are Box's, whole. A catalog without them is a catalog that can lay a dashboard out and
 * not write a heading in it, so they are read off `semantics.tsx` — `export const H1 = semantic('h1')` is
 * the whole declaration, and the deprecated `Menu` alias is not one of them because it is not a call.
 */
function elements(sources) {
  const source = sources.get(SEMANTICS) ?? '';
  const entry = (name, tag, importLine, description) => [
    name,
    {
      description,
      import: importLine,
      slots: VOID_TAGS.includes(tag) ? [] : ['default'],
      events: [],
      props: {},
      required: [],
      styled: true,
    },
  ];

  return Object.fromEntries([
    entry(
      'Box',
      null,
      "import Box from '@box-kite/react';",
      'Any element at all, with every style prop on it: `tag` chooses the element where no component names one.',
    ),
    ...[...source.matchAll(/export const (\w+) = semantic\('([\w-]+)'\)/g)].map(([, name, tag]) =>
      entry(
        name,
        tag,
        `import { ${name} } from '@box-kite/react/components/semantics';`,
        `A \`<${tag}>\` element, with every style prop on it.`,
      ),
    ),
  ]);
}

/** The manifest: one entry per documented component, plus a sentence for every style prop. */
export function buildCatalogManifest() {
  const declared = declarations();
  const reference = JSON.parse(readFileSync(join(ROOT, PROPS_API), 'utf8'));
  const props = reference.props.reduce((all, prop) => {
    all[prop.name] = firstSentence(prop.description);

    return all;
  }, {});

  const components = elements(declared.sources);

  for (const entry of COMPONENTS) {
    const api = JSON.parse(readFileSync(join(ROOT, API_DIR, `${entry.slug}.json`), 'utf8'));

    // `propsFile` where the config names one: `DataGridProps` lives in the grid's contract module, and a
    // lookup against the component's own file would resolve neither its chain nor the types its props name.
    components[api.name] = manifestComponent(
      { file: entry.propsFile ?? entry.file, props: entry.props },
      { ...api, props: api.props ?? [] },
      declared,
    );

    // A part is a component in its own right — `Tabs.Tab` is what a spec names — and it has its own props
    // interface, so whether it forwards style props is its own answer rather than its parent's. A "part"
    // whose name is not one a spec could write ("Combobox (single-select)") is a section of a page, not a
    // component: it documents one of two prop shapes the same component takes.
    for (const part of (api.parts ?? []).filter((candidate) => IDENTIFIER.test(candidate.name))) {
      const config = (entry.parts ?? []).find((declaredPart) => declaredPart.name === part.name);

      components[part.name] = manifestComponent({ file: entry.file, props: config?.props }, { ...part, import: api.import }, declared);
    }
  }

  return { props, components };
}

/** The generated module, as text. A `.ts` rather than a JSON file so the entry bundles it and types it. */
export async function formatManifest(manifest) {
  // A type-only import, so this module carries no runtime edge at all: an ordinary one would reach into
  // `src/core/**` from outside and inline a second engine beside the 15 KB of prose.
  const body = `import type { CatalogManifest } from '../../core';

/**
 * Generated by \`npm run docs:catalog\` — never edited by hand. What a prop *means*, extracted from the
 * same JSDoc the reference and the AI context come from; what it *accepts* is read off the live engine,
 * so this file says nothing that could go stale against a \`Box.extend()\`.
 */
const catalogManifest: CatalogManifest = ${JSON.stringify(manifest)};

export default catalogManifest;
`;
  const options = await prettier.resolveConfig(join(ROOT, MANIFEST_FILE));

  return prettier.format(body, { ...options, filepath: MANIFEST_FILE });
}
