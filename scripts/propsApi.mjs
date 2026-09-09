/**
 * The prop reference, generated rather than written down: each prop's own JSDoc for the prose, the
 * registry for what it accepts, and the *engine* for the CSS it writes — the example beside a prop is
 * a rule this pass generated, so a divider cannot change without it changing too. `check-props-api.mjs`
 * is what keeps the `@example` tags and `api/props.json` honest; this module only builds the model.
 */
import { join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';
import { createServer } from 'vite';

const ROOT = join(import.meta.dirname, '..');

export const REGISTRY = 'src/core/boxStyles.ts';

export const API_FILE = 'api/props.json';

/** The class every Box carries: not a prop's own rule, so it is dropped from a measured class list. */
const BASE_CLASS = '_b';

/** A measured declaration list longer than this is cut short — the example is a hint, not the rule. */
const EXAMPLE_LIMIT = 100;

/** The one token every colour prop's example uses, so the `var()` indirection reads the same way. */
const TOKEN = 'sky-500';

/**
 * Where the example's value is a choice rather than a fact — a keyword that says nothing (`position:
 * static`), a percentage that is a filter's own unit. Everything else takes the first value the registry
 * lists, or `4` for a number: illustration is the only thing hand-written here, and a value this table
 * gets wrong fails loudly, because the prop then writes no rule to measure.
 */
const SAMPLES = {
  accentColor: TOKEN,
  animationDelay: 150,
  animationDuration: 1100,
  animationIterationCount: 3,
  animationName: 'spin',
  aspectRatio: 'video',
  backdropBlur: 'sm',
  backdropBrightness: 110,
  backdropContrast: 125,
  backdropGrayscale: 100,
  backdropHueRotate: 90,
  backdropInvert: 100,
  backdropOpacity: 80,
  backdropSaturate: 180,
  backdropSepia: 100,
  bgClip: 'text',
  bgColor: TOKEN,
  bgGradient: { linear: 'r', colors: ['blue-500', 'pink-500'] },
  blur: 3,
  borderColor: TOKEN,
  borderSpacing: 2,
  brightness: 110,
  caretColor: TOKEN,
  color: TOKEN,
  containerName: 'sidebar',
  content: 'New',
  contrast: 125,
  css: { mixBlendMode: 'multiply' },
  cursor: 'pointer',
  dropShadowColor: TOKEN,
  fill: TOKEN,
  fillOpacity: 0.5,
  // The one divider people get wrong, so the example is the value they were reaching for.
  fontSize: 14,
  fontWeight: 700,
  grayscale: 100,
  hueRotate: 90,
  insetRingColor: TOKEN,
  insetShadowColor: TOKEN,
  invert: 100,
  lineHeight: 24,
  maskImage: { linear: 'b', colors: ['black', 'transparent'] },
  opacity: 0.5,
  outlineColor: TOKEN,
  position: 'absolute',
  ringColor: TOKEN,
  rotate: 45,
  saturate: 180,
  scrollbarColor: ['gray-400', 'gray-100'],
  sepia: 100,
  shadowColor: TOKEN,
  stroke: TOKEN,
  strokeOpacity: 0.5,
  textShadowColor: TOKEN,
  tableLayout: 'fixed',
  transition: 'colors',
  transitionDelay: 150,
  transitionDuration: 200,
  vars: { 'color-revenue': 'sky-500' },
  willChange: 'transform',
};

/** Loads the registry and the engine from source, so the reference needs no build to be current. */
async function loadRuntime() {
  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const { cssStyles } = await server.ssrLoadModule('/src/core/boxStyles.ts');
    const { createStyleEngine } = await server.ssrLoadModule('/src/core/engine/styleEngine.ts');

    return { cssStyles, createStyleEngine, close: () => server.close() };
  } catch (error) {
    await server.close();
    throw error;
  }
}

/** Every prop's JSDoc, and where it sits — the fix pass rewrites exactly this span. */
function readComments() {
  const config = ts.readConfigFile(join(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT);
  const program = ts.createProgram([join(ROOT, 'src/types.ts')], { ...parsed.options, noEmit: true, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const types = program.getSourceFiles().find((file) => file.fileName.endsWith('src/types.ts'));
  const registry = program.getSourceFiles().find((file) => file.fileName.endsWith(REGISTRY));

  if (!types || !registry) throw new Error(`${REGISTRY} is not in the program`);

  // The props as an editor sees them: the JSDoc travels from the registry through the mapped type, so
  // what is read here is what hover shows.
  const boxStyles = checker.getExportsOfModule(checker.getSymbolAtLocation(types)).find((symbol) => symbol.name === 'BoxStyles');
  const symbols = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(boxStyles));
  const entries = registryEntries(registry);
  const comments = new Map();

  for (const symbol of symbols) {
    const tags = symbol.getJsDocTags(checker);

    comments.set(symbol.name, {
      description: ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim(),
      examples: tags.filter((tag) => tag.name === 'example').map((tag) => ts.displayPartsToString(tag.text).trim()),
      span: commentSpan(registry, entries, symbol.name),
    });
  }

  return { comments, text: registry.text };
}

/** The entries of the `cssStyles` object literal, by prop name. */
function registryEntries(registry) {
  const declaration = registry.statements
    .flatMap((statement) => (ts.isVariableStatement(statement) ? statement.declarationList.declarations : []))
    .find((node) => node.name.getText(registry) === 'cssStyles');
  const literal = unwrap(declaration?.initializer);

  if (!literal || !ts.isObjectLiteralExpression(literal)) throw new Error('cssStyles is not an object literal');

  return new Map(literal.properties.map((property) => [property.name?.getText(registry), property]));
}

/** The `/** … *\/` block in front of one registry entry, as a range in the file text. */
function commentSpan(registry, entries, name) {
  const entry = entries.get(name);
  if (!entry) return undefined;

  const ranges = ts.getLeadingCommentRanges(registry.text, entry.pos) ?? [];
  const doc = ranges.filter((range) => registry.text.slice(range.pos, range.pos + 3) === '/**').at(-1);
  const indent = ts.getLineAndCharacterOfPosition(registry, entry.getStart(registry)).character;

  return doc && { pos: doc.pos, end: doc.end, indent: ' '.repeat(indent) };
}

/** `satisfies` and `as` wrap the object literal without changing it. */
function unwrap(node) {
  while (node && (ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node))) node = node.expression;

  return node;
}

/** The value an example uses: hand-picked, else a number, else the first value the registry lists. */
function sampleValue(name, definitions) {
  if (name in SAMPLES) return SAMPLES[name];

  const tuple = definitions.find((definition) => definition.tuple && Array.isArray(definition.values));
  if (tuple) return [tuple.values[0], tuple.values[0]];
  if (definitions.some((definition) => definition.values === 0)) return 4;

  const listed = definitions.find((definition) => Array.isArray(definition.values) && definition.values.length);
  if (listed) return listed.values[0];

  throw new Error(`No sample value for "${name}" — add one to SAMPLES in scripts/propsApi.mjs`);
}

/**
 * The body of the rule one class selector carries. Isolating by *selector* rather than by what the base
 * stylesheet does not contain, because a colour prop also declares its token in `:root` — a rule of the
 * engine's own, in the middle of the base.
 */
function ruleFor(css, className) {
  const target = `.${className}`;

  for (let index = 0; index < css.length;) {
    const open = css.indexOf('{', index);
    if (open < 0) return undefined;

    let depth = 0;
    let end = open;

    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }

    // The selector escapes what a class name may not carry bare (`.width-1\/2`), and a prefix is not a
    // match: `.p-4` and `.p-40` are two classes.
    const selector = css.slice(index, open).replace(/\\/g, '').trim();
    const at = selector.indexOf(target);

    if (!selector.startsWith('@') && at >= 0 && !/[\w-]/.test(selector[at + target.length] ?? '')) return css.slice(open + 1, end);

    index = end + 1;
  }

  return undefined;
}

/** What the engine writes for one prop and one value: the class it made, and that class's rule. */
function measure(createStyleEngine, name, value) {
  const engine = createStyleEngine({ classNames: 'readable', sink: 'string' });
  const className = engine
    .classNames({ [name]: value })
    .split(' ')
    .filter((name) => name && name !== BASE_CLASS)
    .join(' ');

  engine.flushSync();

  const declarations = className && ruleFor(engine.getStyles(), className);

  if (!declarations) throw new Error(`"${name}" wrote no rule for ${JSON.stringify(value)} — is the sample value one it accepts?`);

  return { className, declarations: declarations.split(';').map((declaration) => declaration.replace(':', ': ')) };
}

/** The sampled value as JavaScript, for inside a JSX brace: an object, an array or a quoted string. */
function writeLiteral(value) {
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) return `[${value.map(writeLiteral).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, entry]) => `${/^[a-z]\w*$/i.test(key) ? key : `'${key}'`}: ${writeLiteral(entry)}`);

    return `{ ${entries.join(', ')} }`;
  }

  return String(value);
}

/**
 * The attribute a reader writes: a string in quotes, `true` on its own, everything else in braces.
 * Exported because the tarball's `docs/props.md` writes the same example, and one of the two drifting
 * would mean the published docs and the published `.d.ts` disagree about how to write a prop.
 */
export function writeAttribute(name, value) {
  if (typeof value === 'string') return `${name}="${value}"`;
  if (value === true) return name;

  return `${name}={${writeLiteral(value)}}`;
}

/** One `@example` line: what a reader writes, and the declarations it becomes. */
function exampleText(name, value, declarations) {
  const css = declarations.join('; ');

  return `${writeAttribute(name, value)} → ${css.length > EXAMPLE_LIMIT ? `${css.slice(0, EXAMPLE_LIMIT).trimEnd()}…` : css}`;
}

/**
 * The whole reference: one entry per prop, with the values it accepts from the registry and the CSS it
 * writes from the engine. A closed value list is carried in full; an open family is a count, because
 * the 286 colour tokens are the palette's reference and not every colour prop's.
 */
export async function buildPropsApi() {
  const { cssStyles, createStyleEngine, close } = await loadRuntime();

  try {
    const { comments, text } = readComments();
    const props = [];

    for (const [name, entry] of Object.entries(cssStyles)) {
      const definitions = (Array.isArray(entry) ? entry : [entry]).flat();
      const comment = comments.get(name);

      if (!comment) throw new Error(`"${name}" is in the registry but not on BoxStyles`);

      const value = sampleValue(name, definitions);
      const { className, declarations } = measure(createStyleEngine, name, value);
      const values = [...new Set(definitions.flatMap((definition) => (Array.isArray(definition.values) ? definition.values : [])))];
      const open = definitions.some((definition) => !Array.isArray(definition.values) && definition.values !== 0);

      props.push({
        name,
        description: comment.description,
        properties: [...new Set(declarations.map((declaration) => declaration.split(':')[0]))],
        example: { value, css: declarations.join('; ') },
        text: exampleText(name, value, declarations),
        numeric: definitions.some((definition) => definition.values === 0),
        open,
        ...(values.length <= 40 ? { values } : { valueCount: values.length }),
      });
    }

    return { propCount: props.length, props, comments, text };
  } finally {
    await close();
  }
}

/**
 * What `api/props.json` holds, as text: the model without the bookkeeping the check pass needs, printed
 * by prettier — a generated file the repo's own formatter would rewrite is a check that fails on nothing.
 */
export async function formatApi({ propCount, props }) {
  const document = { propCount, props: props.map(({ text, ...prop }) => prop) };
  const options = await prettier.resolveConfig(join(ROOT, API_FILE));

  return prettier.format(JSON.stringify(document), { ...options, filepath: API_FILE });
}
