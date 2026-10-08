import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FAMILIES, familyFile } from './families';
import { FileReport, familyReport, families, percent, summary, totals, Wrapper } from './report';
import { transformSource } from './transform';

export const USAGE = `Usage: npx @box-kite/codemod radix-to-box <path…> [options]

Rewrites Radix primitives — imported from @radix-ui/react-*, from radix-ui, or through a
shadcn components/ui folder — and sonner onto Box Kite, and writes a report of what it did.

Options:
  --dry           report what would change, write nothing
  --report <dir>  where the report goes (default .migration)
  --no-report     write no report
  --no-format     do not run the project's prettier over the changed files
  -h, --help      this text
`;

const EXTENSIONS = /\.(tsx|jsx|ts|js)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.migration', '.turbo']);
const WRAPPER_NAMES = new Set([...FAMILIES.map(familyFile), 'sonner']);

export interface Io {
  log(line: string): void;
  error(line: string): void;
}

interface Options {
  paths: string[];
  dry: boolean;
  report: string | false;
  format: boolean;
}

function parseArgs(argv: readonly string[]): Options | string {
  const [command, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') return USAGE;
  if (command !== 'radix-to-box') return `Unknown transform "${command}" — the one there is, is radix-to-box.\n\n${USAGE}`;

  const options: Options = { paths: [], dry: false, report: '.migration', format: true };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--dry') options.dry = true;
    else if (arg === '--no-report') options.report = false;
    else if (arg === '--no-format') options.format = false;
    else if (arg === '--report') options.report = rest[++i] ?? '.migration';
    else if (arg === '-h' || arg === '--help') return USAGE;
    else if (arg.startsWith('-')) return `Unknown option ${arg}\n\n${USAGE}`;
    else options.paths.push(arg);
  }

  return options.paths.length ? options : `Name at least one file or folder.\n\n${USAGE}`;
}

function* walk(path: string): Generator<string> {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (EXTENSIONS.test(path) && !path.endsWith('.d.ts')) yield path;
    return;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    yield* walk(join(path, entry));
  }
}

/** A shadcn wrapper module (`components/ui/dialog.tsx`): its call sites are what get converted, not it. */
const wrapperName = (path: string) => /(?:^|[\\/])ui[\\/]([a-z-]+)\.[jt]sx?$/.exec(path)?.[1];
const isWrapper = (path: string) => WRAPPER_NAMES.has(wrapperName(path) ?? '');

type Prettier = typeof import('prettier');

/** The project's own prettier, if it has one — never this package's, whose config would not be theirs. */
async function projectPrettier(cwd: string): Promise<Prettier | undefined> {
  try {
    const require = createRequire(join(cwd, 'noop.js'));
    const module = (await import(pathToFileURL(require.resolve('prettier')).href)) as Prettier & { default?: Prettier };

    return module.default ?? module;
  } catch {
    return undefined;
  }
}

export async function run(argv: readonly string[], io: Io, cwd = process.cwd()): Promise<number> {
  const options = parseArgs(argv);
  if (typeof options === 'string') {
    (options === USAGE ? io.log : io.error)(options);
    return options === USAGE ? 0 : 1;
  }

  const files: string[] = [];
  for (const path of options.paths) {
    const absolute = resolve(cwd, path);
    if (!existsSync(absolute)) {
      io.error(`No such file or folder: ${path}`);
      return 1;
    }
    files.push(...walk(absolute));
  }

  const prettier = options.format && !options.dry ? await projectPrettier(cwd) : undefined;
  const reports: FileReport[] = [];
  const wrappers: string[] = [];
  const outputs = new Map<string, string>();

  for (const file of files) {
    const path = relative(cwd, file).split(sep).join('/');
    if (isWrapper(file)) {
      wrappers.push(path);
      continue;
    }
    const text = readFileSync(file, 'utf8');
    if (!/radix|sonner|\/ui\//.test(text)) continue;

    const result = transformSource(text, file);
    let output = result.output;
    if (result.changed && prettier) {
      try {
        output = await prettier.format(output, { ...(await prettier.resolveConfig(file)), filepath: file });
      } catch {
        // An unformatted file is still a correct one.
      }
    }
    outputs.set(path, result.changed ? output : text);
    if (result.changed && !options.dry) writeFileSync(file, output);
    if (result.findings.length || result.error)
      reports.push({ path, findings: result.findings, changed: result.changed, error: result.error, leftovers: result.leftovers });
  }

  const wrapperReports: Wrapper[] = wrappers.map((path) => {
    const name = wrapperName(path)!;
    const importers = [...outputs].filter(([, text]) => new RegExp(`from\\s+['"][^'"]*\\/ui\\/${name}['"]`).test(text)).map(([p]) => p);
    return { path, importers };
  });

  const t = totals(reports);
  io.log(
    `radix-to-box: ${reports.filter((r) => r.changed).length} file(s) ${options.dry ? 'would change' : 'changed'}, ${wrappers.length} shadcn wrapper(s) left alone`,
  );
  io.log(`  ${t.automated} of ${t.elements} Radix elements converted without a TODO (${percent(t.automated, t.elements)})`);
  for (const report of reports.filter((r) => r.error)) io.error(`  not written: ${report.path} — ${report.error}`);

  if (options.report) {
    const dir = resolve(cwd, options.report);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'README.md'), summary(reports, wrapperReports, options.dry));
    for (const family of families(reports)) writeFileSync(join(dir, `${family}.md`), familyReport(family, reports));
    io.log(`  report: ${relative(cwd, join(dir, 'README.md')).split(sep).join('/')}`);
  }

  return 0;
}
