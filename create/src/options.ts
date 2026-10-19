import { parseArgs } from 'node:util';

/** The create-vite templates a design can be added to: React, in TypeScript or JavaScript. */
export const TEMPLATES = ['react-ts', 'react-compiler-ts', 'react', 'react-compiler'] as const;
export type Template = (typeof TEMPLATES)[number];

export const DESIGNS = ['classic', 'ember', 'azure', 'mono'] as const;
export type Design = (typeof DESIGNS)[number];

export interface CreateOptions {
  directory?: string;
  template?: Template;
  design?: Design;
  /** `false` writes the files and leaves the install to the reader. */
  install: boolean;
  /** Unset means "ask when there is a terminal to ask in", which is create-vite's own rule. */
  interactive?: boolean;
  overwrite: boolean;
  /** Passed through to create-vite, which swaps Oxlint for ESLint. */
  eslint?: boolean;
  help: boolean;
  version: boolean;
}

export const isTemplate = (value: string): value is Template => (TEMPLATES as readonly string[]).includes(value);
export const isDesign = (value: string): value is Design => (DESIGNS as readonly string[]).includes(value);
export const isTypeScript = (template: Template) => template.endsWith('-ts');

/** argv after the command name, as options plus whatever was wrong with it: one message per mistake. */
export function parseOptions(argv: readonly string[]): { options: CreateOptions; errors: string[] } {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    allowNegative: true,
    strict: false,
    options: {
      template: { type: 'string', short: 't' },
      design: { type: 'string', short: 'd' },
      install: { type: 'boolean' },
      interactive: { type: 'boolean' },
      overwrite: { type: 'boolean' },
      eslint: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  const errors: string[] = [];
  const known = new Set(['template', 'design', 'install', 'interactive', 'overwrite', 'eslint', 'help', 'version']);
  for (const name of Object.keys(values)) if (!known.has(name)) errors.push(`Unknown option --${name}.`);
  if (positionals.length > 1) errors.push(`One directory, please: got ${positionals.map((p) => `"${p}"`).join(' and ')}.`);

  const text = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);
  const template = text(values.template);
  const design = text(values.design)?.toLowerCase();
  // `--template` with nothing after it reads as a boolean, which is a mistake rather than "ask me".
  if (values.template === true) errors.push(`--template needs a name: ${TEMPLATES.join(', ')}.`);
  if (values.design === true) errors.push(`--design needs a name: ${DESIGNS.join(', ')}.`);
  if (template && !isTemplate(template)) {
    errors.push(`"${template}" is not a React template. Box Kite is a React library, so --template takes ${TEMPLATES.join(', ')}.`);
  }
  if (design && !isDesign(design)) errors.push(`There is no "${design}" design. --design takes ${DESIGNS.join(', ')}.`);

  const flag = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

  return {
    options: {
      directory: positionals[0]?.trim().replace(/[\\/]+$/, '') || undefined,
      template: template && isTemplate(template) ? template : undefined,
      design: design && isDesign(design) ? design : undefined,
      install: flag(values.install) ?? true,
      interactive: flag(values.interactive),
      overwrite: flag(values.overwrite) ?? false,
      eslint: flag(values.eslint),
      help: flag(values.help) ?? false,
      version: flag(values.version) ?? false,
    },
    errors,
  };
}
