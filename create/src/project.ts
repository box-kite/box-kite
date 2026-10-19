import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Design, isTypeScript, type Template } from './options';

/** The files of one language: the app's own `src/` files, and the design file per design. */
export interface TemplateSet {
  files: Record<string, string>;
  designs: Record<Design, string>;
}

export interface Templates {
  ts: TemplateSet;
  js: TemplateSet;
  fonts: Record<Design, string[]>;
}

export interface ApplyOptions {
  template: Template;
  design: Design;
  /** The range written for `@box-kite/react`, e.g. `^2.2.7`. */
  boxKiteRange: string;
  /** The range written for each font package. */
  fontRange: string;
}

/** What the template ships that the sample page replaces: its counter, its stylesheet and the logos it imports. */
const REPLACED = ['src/App.css', 'src/assets/react.svg', 'src/assets/vite.svg', 'src/assets/hero.png'];

/**
 * Turns a project create-vite has just written into a Box Kite one: the dependencies in `package.json`,
 * the design as `src/design.tsx`, a `main` that wraps the app in it, and a sample page. Writes files only;
 * the install is the caller's.
 */
export function applyBoxKite(directory: string, templates: Templates, options: ApplyOptions): string[] {
  const set = isTypeScript(options.template) ? templates.ts : templates.js;
  const extension = isTypeScript(options.template) ? 'tsx' : 'jsx';
  const written: string[] = [];

  const manifestPath = join(directory, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { dependencies?: Record<string, string> };
  const added: Record<string, string> = { '@box-kite/react': options.boxKiteRange };
  for (const font of templates.fonts[options.design]) added[font] = options.fontRange;
  manifest.dependencies = sortKeys({ ...manifest.dependencies, ...added });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  written.push('package.json');

  for (const [path, source] of Object.entries(set.files)) {
    writeFileSync(join(directory, path), source);
    written.push(path);
  }
  const designPath = `src/design.${extension}`;
  writeFileSync(join(directory, designPath), set.designs[options.design]);
  written.push(designPath);

  for (const path of REPLACED) rmSync(join(directory, path), { force: true });
  const assets = join(directory, 'src', 'assets');
  if (existsSync(assets) && readdirSync(assets).length === 0) rmSync(assets, { recursive: true });

  return written;
}

/** npm writes dependencies in alphabetical order, so an install does not reorder the file it was just given. */
function sortKeys(record: Record<string, string>) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}
