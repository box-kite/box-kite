import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import * as prompt from '@clack/prompts';
import templateData from 'virtual:box-kite-templates';
import { type CreateOptions, type Design, DESIGNS, parseOptions, type Template, TEMPLATES } from './options';
import { detectPackageManager, runCommand } from './packageManager';
import { applyBoxKite, type Templates } from './project';

declare const __BOX_KITE_VERSION__: string;

const templates = templateData as Templates;

const label = (design: Design) => design[0].toUpperCase() + design.slice(1);

const DESIGN_HINTS: Record<Design, string> = {
  classic: 'indigo on gray in the system font, the components as they ship',
  ember: 'warm paper, vermilion and a serif',
  azure: 'clear-sky blue on frosted glass, pill controls',
  mono: 'ink on white in single pixels, Roboto',
};

const TEMPLATE_HINTS: Record<Template, string> = {
  'react-ts': 'TypeScript',
  'react-compiler-ts': 'TypeScript + React Compiler',
  react: 'JavaScript',
  'react-compiler': 'JavaScript + React Compiler',
};

const HELP = `Usage: npm create @box-kite@latest [directory] -- [options]

Creates a Vite + React app with Box Kite, a design and a sample page in it.

Options:
  -d, --design NAME                 ${DESIGNS.join(', ')} (asks when it is not given)
  -t, --template NAME               ${TEMPLATES.join(', ')} (react-ts by default)
  --no-install                      write the files and skip the install
  --overwrite                       empty the directory first when it has files in it
  --eslint                          use ESLint instead of Oxlint (passed to create-vite)
  --interactive / --no-interactive  ask, or never ask (asks when run in a terminal)
  -h, --help                        show this
  -v, --version                     show the version

Example:
  npm create @box-kite@latest my-app -- --design mono`;

class Cancelled extends Error {}

/** A prompt's answer, or out: Ctrl+C on any question ends the command without writing anything. */
function answered<T>(value: T): Exclude<T, symbol> {
  if (prompt.isCancel(value)) throw new Cancelled();
  return value as Exclude<T, symbol>;
}

async function ask(options: CreateOptions, interactive: boolean) {
  const directory =
    options.directory ??
    (interactive
      ? answered(await prompt.text({ message: 'Project name', placeholder: 'box-kite-app', defaultValue: 'box-kite-app' }))
      : 'box-kite-app');
  const template: Template =
    options.template ??
    (interactive
      ? answered(
          await prompt.select({
            message: 'Template',
            initialValue: 'react-ts' as Template,
            options: TEMPLATES.map((value) => ({ value, label: value, hint: TEMPLATE_HINTS[value] })),
          }),
        )
      : 'react-ts');
  const design: Design =
    options.design ??
    (interactive
      ? answered(
          await prompt.select({
            message: 'Design',
            initialValue: 'classic' as Design,
            options: DESIGNS.map((value) => ({ value, label: label(value), hint: DESIGN_HINTS[value] })),
          }),
        )
      : 'classic');
  return { directory: directory.trim() || 'box-kite-app', template, design };
}

/** Runs a command to the end; `quiet` keeps its output unless it fails, so only our own lines show. */
function run(command: string, args: string[], cwd: string, quiet: boolean): Promise<{ code: number; output: string }> {
  return new Promise((done) => {
    // Windows runs a package manager's `.cmd` shim only through a shell, which wants one command string.
    const shell = process.platform === 'win32' && command !== process.execPath;
    const child = shell
      ? spawn([command, ...args].join(' '), { cwd, shell: true, stdio: quiet ? 'pipe' : 'inherit' })
      : spawn(command, args, { cwd, stdio: quiet ? 'pipe' : 'inherit' });
    let output = '';
    child.stdout?.on('data', (chunk) => (output += chunk));
    child.stderr?.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => done({ code: 1, output: `${output}${error.message}` }));
    child.on('close', (code) => done({ code: code ?? 1, output }));
  });
}

/** The manager's own CLI when it set one (every one of them sets `npm_execpath` for the scripts it runs). */
function managerCommand(manager: string): [string, string[]] {
  const execPath = process.env.npm_execpath;
  return execPath && /\.c?js$/.test(execPath) ? [process.execPath, [execPath]] : [manager, []];
}

async function main() {
  const { options, errors } = parseOptions(process.argv.slice(2));
  if (options.help) return console.log(HELP);
  if (options.version) return console.log(__BOX_KITE_VERSION__);
  if (errors.length) {
    for (const error of errors) console.error(error);
    console.error('\nRun with --help to see every option.');
    process.exitCode = 1;
    return;
  }

  const interactive = options.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
  prompt.intro('Box Kite');
  const { directory, template, design } = await ask(options, interactive);
  const target = resolve(directory);

  let overwrite = options.overwrite;
  if (!overwrite && existsSync(target) && readdirSync(target).length > 0) {
    const where = directory === '.' ? 'This directory' : `"${directory}"`;
    if (!interactive) throw new Error(`${where} is not empty. Pass --overwrite to empty it first, or pick another directory.`);
    overwrite = answered(await prompt.confirm({ message: `${where} is not empty. Remove its files and continue?`, initialValue: false }));
    if (!overwrite) throw new Cancelled();
  }

  const scaffold = prompt.spinner();
  scaffold.start(`Creating a Vite app from ${template}`);
  const createVite = createRequire(import.meta.url).resolve('create-vite/index.js');
  const viteArgs = [createVite, directory, '--template', template, '--no-interactive', '--no-immediate'];
  if (overwrite) viteArgs.push('--overwrite');
  if (options.eslint !== undefined) viteArgs.push(options.eslint ? '--eslint' : '--no-eslint');
  const created = await run(process.execPath, viteArgs, process.cwd(), true);
  if (created.code !== 0 || !existsSync(resolve(target, 'package.json'))) {
    scaffold.error('create-vite did not finish');
    throw new Error(created.output.trim() || 'create-vite wrote no package.json.');
  }
  applyBoxKite(target, templates, { template, design, boxKiteRange: `^${__BOX_KITE_VERSION__}`, fontRange: '^5.3.0' });
  scaffold.stop(`Created a Vite app with Box Kite and the ${label(design)} design`);

  const manager = detectPackageManager(process.env.npm_config_user_agent);
  let installed = false;
  if (options.install) {
    prompt.log.step(`Installing with ${manager}`);
    const [command, prefix] = managerCommand(manager);
    installed = (await run(command, [...prefix, 'install'], target, false)).code === 0;
    if (!installed) prompt.log.warn(`The install did not finish. Run "${manager} install" in the project to try again.`);
  }

  const extension = template.endsWith('-ts') ? 'tsx' : 'jsx';
  const steps = [
    ...(directory === '.' ? [] : [`cd ${/\s/.test(relative(process.cwd(), target)) ? `"${directory}"` : directory}`]),
    ...(installed ? [] : [`${manager} install`]),
    runCommand(manager, 'dev'),
  ];
  prompt.note(steps.join('\n'), 'Next');
  prompt.outro(`src/design.${extension} is the design and src/App.${extension} the sample page. Both are yours to change.`);
}

main().catch((error: unknown) => {
  if (error instanceof Cancelled) {
    prompt.cancel('Cancelled. Nothing was created.');
  } else {
    prompt.cancel(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
});
