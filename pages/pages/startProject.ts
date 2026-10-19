import type { DesignId } from '../designs/designs';

export type Language = 'ts' | 'js';
export type Manager = 'npm' | 'pnpm' | 'yarn';

export const MANAGERS: readonly Manager[] = ['npm', 'pnpm', 'yarn'];

/** The fonts each design imports, the same list `scripts/createTemplates.mjs` adds to `package.json` (tested). */
export const DESIGN_FONTS: Record<DesignId, readonly string[]> = {
  classic: [],
  ember: ['@fontsource-variable/fraunces', '@fontsource-variable/inter'],
  azure: ['@fontsource-variable/sora', '@fontsource-variable/inter'],
  mono: ['@fontsource-variable/roboto'],
};

/** The `src/index.css` the command writes, as text: a stylesheet comes back empty from a `?raw` import (tested to match). */
export const INDEX_CSS =
  '/* The design paints the page, so all that is left here is the margin the browser adds. */\nbody {\n  margin: 0;\n}\n';

// The files the command writes, as committed: the page shows exactly what an app is given.
const files = import.meta.glob<string>('../../create/templates/**/*.{tsx,jsx}', { query: '?raw', import: 'default', eager: true });

const extension = (language: Language) => (language === 'ts' ? 'tsx' : 'jsx');

/** One template file, by its path in the app: `src/main`, `src/App`, `src/index.css`. */
export function templateSource(language: Language, path: string): string {
  if (path === 'src/index.css') return INDEX_CSS;
  const file = `${path}.${extension(language)}`;
  const source = files[`../../create/templates/${language}/${file}`];
  if (source === undefined) throw new Error(`create/templates/${language}/${file} does not exist.`);
  return source;
}

/** A design's file, which the app keeps as `src/design.tsx` (or `.jsx`). */
export function designSource(language: Language, design: DesignId): string {
  return templateSource(language, design === 'classic' ? 'src/design' : `designs/${design}`);
}

export const designPath = (language: Language) => `src/design.${extension(language)}`;

/** The command that makes the app, then the two that open it. npm alone needs `--` before the options. */
export function createCommand(manager: Manager, design: DesignId, language: Language): string {
  const options = [`--design ${design}`, ...(language === 'js' ? ['--template react'] : [])].join(' ');
  const create = manager === 'npm' ? `npm create @box-kite@latest my-app -- ${options}` : `${manager} create @box-kite my-app ${options}`;
  return [create, 'cd my-app', manager === 'npm' ? 'npm run dev' : `${manager} dev`].join('\n');
}

/** Box Kite and the design's fonts, added to an app that already exists. */
export function installCommand(manager: Manager, design: DesignId): string {
  return [manager === 'npm' ? 'npm install' : `${manager} add`, '@box-kite/react', ...DESIGN_FONTS[design]].join(' ');
}
