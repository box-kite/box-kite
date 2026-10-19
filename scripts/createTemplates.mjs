// The files `npm create @box-kite` writes into a new Vite app, and the one place they are assembled.
//
// Ember, Azure and Mono are generated from the site's own designs (`pages/designs/`), so the design an app
// starts from is the one the docs site shows: everything above the `// The site's own.` line, with the
// site's palette and fonts swapped for the app's. Every JavaScript template is the TypeScript one with its
// types erased. All of them are committed, so the docs page, the command and a reviewer read the same files,
// and `npm run check:create` fails when one has drifted from its source.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';

export const ROOT = join(import.meta.dirname, '..');
const templates = join(ROOT, 'create', 'templates');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8').replace(/\r\n/g, '\n');

/** What each generated design says about itself, the fonts it installs and the page it paints. */
const GENERATED = {
  ember: {
    title: 'Ember: warm paper and ink, one vermilion, and a serif for the headings.',
    fonts: ['@fontsource-variable/fraunces', '@fontsource-variable/inter'],
    consts: [
      `const FONT_DISPLAY = "'Fraunces Variable', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";`,
      `const FONT_BODY = "'Inter Variable', system-ui, sans-serif";`,
    ],
    siteFont: 'EMBER_FONT_DISPLAY',
    font: 'FONT_DISPLAY',
    page: { light: "bgColor: 'base-50', color: 'base-900'", dark: "bgColor: 'base-950', color: 'base-100'", selection: 'accent-400/28' },
  },
  azure: {
    title: 'Azure: clear-sky blue on cool slate, frosted glass for what floats, and pills for what you press.',
    fonts: ['@fontsource-variable/sora', '@fontsource-variable/inter'],
    consts: [
      `const FONT_DISPLAY = "'Sora Variable', 'Inter Variable', 'Segoe UI', system-ui, sans-serif";`,
      `const FONT_BODY = "'Inter Variable', system-ui, sans-serif";`,
    ],
    siteFont: 'AZURE_FONT_DISPLAY',
    font: 'FONT_DISPLAY',
    page: { light: "bgColor: 'base-50', color: 'base-900'", dark: "bgColor: 'base-950', color: 'base-100'", selection: 'accent-400/28' },
  },
  mono: {
    title: 'Mono: ink #16191e on white in single pixels, with 1px edges, focus as the second pixel and no gradients.',
    fonts: ['@fontsource-variable/roboto'],
    consts: [`const FONT_BODY = "'Roboto Variable', 'Helvetica Neue', Arial, sans-serif";`],
    siteFont: 'MONO_FONT',
    font: 'FONT_BODY',
    page: {
      light: "bgColor: 'white', color: 'base-950'",
      dark: "bgColor: 'base-950', color: 'base-100', selection: { bgColor: 'base-50/22' }",
      selection: 'base-950/14',
    },
  },
};

/** Every design the command offers, in the order it lists them. Classic is the hand-written `src/design.tsx`. */
export const DESIGN_IDS = ['classic', ...Object.keys(GENERATED)];

/** The fonts a design installs, so the command can add them to `package.json`. */
export const designFonts = (id) => GENERATED[id]?.fonts ?? [];

const SITE_MARKER = "    // The site's own.";

/** One `const NAME = { … } as const;` ramp out of `designs.ts`, renamed for the app. */
function ramp(designs, name, as) {
  const start = designs.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error(`pages/designs/designs.ts has no ${name}.`);
  const end = designs.indexOf('} as const;', start) + '} as const;'.length;
  return designs.slice(start, end).replace(`const ${name}`, `const ${as}`);
}

/** A site design, as one file an app owns: its palette, its page, its component styles and a <Design> wrapper. */
function generatedDesign(id) {
  const spec = GENERATED[id];
  const designs = read('pages', 'designs', 'designs.ts');
  const src = read('pages', 'designs', `${id}.ts`);
  const docEnd = src.indexOf('*/', src.indexOf('/**')) + 2;
  const marker = src.indexOf(SITE_MARKER);
  if (marker < 0) throw new Error(`pages/designs/${id}.ts has no "${SITE_MARKER.trim()}" line.`);

  const styles = `${src.slice(docEnd, marker).trimEnd()}\n  },\n);`
    .replace(`export const ${id} = Box.components(`, 'Box.components(')
    .split(spec.siteFont)
    .join(spec.font);
  const upper = id.toUpperCase();

  return `/**
 * ${spec.title}
 *
 * The whole design is in this file: the two palette families every component is drawn in (accent and
 * base), the page's colours and fonts, and the component styles, in light and dark. It is yours to edit.
 */
${spec.fonts.map((font) => `import '${font}';`).join('\n')}
import Box, { type BoxComponentStyles, type BoxStyleProps } from '@box-kite/react';
import type { ReactNode } from 'react';

${spec.consts.join('\n')}

/** The neutrals: page, text, borders. Repoint either family with a palette name ('stone') or a ramp like this. */
${ramp(designs, `${upper}_BASE`, 'BASE')}

/** The accent: buttons, focus, selection. */
${ramp(designs, `${upper}_ACCENT`, 'ACCENT')}
${styles}

${pageAndWrapper(spec.page)}
`;
}

/** The page itself and the component that applies it, shared by every design. */
function pageAndWrapper(page) {
  return `/** The page itself: set on <html>, so every component, popover and dialog inherits it. */
const page: BoxStyleProps = {
  vars: Box.palette({ accent: ACCENT, base: BASE }),
  css: { fontFamily: FONT_BODY },
  selection: { bgColor: '${page.selection}' },
  theme: {
    light: { colorScheme: 'light', ${page.light} },
    dark: { colorScheme: 'dark', ${page.dark} },
  },
};

/** Light or dark follows the system until the reader picks one, and the pick is kept under \`storageKey\`. */
export default function Design({ children }: { children: ReactNode }) {
  return (
    <Box.Theme use="global" storageKey="theme" globalStyles={page}>
      {children}
    </Box.Theme>
  );
}`;
}

async function format(source, filepath) {
  const options = await prettier.resolveConfig(filepath);
  return prettier.format(source, { ...options, filepath });
}

// TypeScript's printer drops blank lines, so each one rides through the transpile as a comment.
const BLANK = '/*__blank__*/';
const BLANK_LINE = /^[ \t]*\/\*__blank__\*\/[ \t]*$/gm;

/** A TypeScript template as its JavaScript twin: the types erased, the comments and the layout kept. */
async function toJavaScript(source, filepath) {
  const { outputText } = ts.transpileModule(source.replace(/\n\n/g, `\n${BLANK}\n`), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve, verbatimModuleSyntax: true },
  });
  const javascript = outputText.replace(BLANK_LINE, '').replaceAll('.tsx', '.jsx');
  if (javascript.includes(BLANK)) throw new Error(`${filepath}: a blank-line marker landed inside a statement.`);
  return format(javascript, filepath);
}

/** The hand-written TypeScript templates, by their path under `create/templates/ts/`. */
const HAND_WRITTEN = ['src/main.tsx', 'src/App.tsx', 'src/index.css', 'src/design.tsx'];

/**
 * Every generated template as `{ absolute path: source }`, formatted the way it is committed: the three site
 * designs in TypeScript, and the JavaScript twin of every TypeScript file.
 */
export async function generatedFiles() {
  const typescript = Object.fromEntries(HAND_WRITTEN.map((path) => [path, read('create', 'templates', 'ts', path)]));
  for (const id of Object.keys(GENERATED)) {
    const path = `designs/${id}.tsx`;
    typescript[path] = await format(generatedDesign(id), join(templates, 'ts', path));
  }

  const files = {};
  for (const [path, source] of Object.entries(typescript)) {
    if (!HAND_WRITTEN.includes(path)) files[join(templates, 'ts', path)] = source;
    const jsPath = join(templates, 'js', path.replace(/\.tsx$/, '.jsx'));
    files[jsPath] = path.endsWith('.tsx') ? await toJavaScript(source, jsPath) : source;
  }
  return files;
}

/** One language's committed templates: the app's own `src/` files, and the design file per design. */
function language(dir, extension) {
  const at = (...parts) => read('create', 'templates', dir, ...parts);
  const files = Object.fromEntries(['main', 'App'].map((name) => [`src/${name}.${extension}`, at('src', `${name}.${extension}`)]));
  files['src/index.css'] = at('src', 'index.css');
  const designs = Object.fromEntries(
    DESIGN_IDS.map((id) => [id, id === 'classic' ? at('src', `design.${extension}`) : at('designs', `${id}.${extension}`)]),
  );
  return { files, designs };
}

/** Everything the command writes, per language and per design, read from the committed templates. */
export function templateFiles() {
  return {
    ts: language('ts', 'tsx'),
    js: language('js', 'jsx'),
    fonts: Object.fromEntries(DESIGN_IDS.map((id) => [id, designFonts(id)])),
  };
}
