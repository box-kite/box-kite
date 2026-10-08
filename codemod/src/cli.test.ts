// @vitest-environment node
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { run, USAGE } from './cli';

const FIXTURES = join(import.meta.dirname, '../fixtures/shadcn');
const dirs: string[] = [];

/** A throwaway copy of the corpus: the CLI writes to the files it is given. */
function project() {
  const dir = mkdtempSync(join(tmpdir(), 'radix-to-box-'));
  dirs.push(dir);
  cpSync(FIXTURES, dir, { recursive: true });

  return dir;
}

function capture() {
  const out: string[] = [];
  const err: string[] = [];

  return { io: { log: (line: string) => out.push(line), error: (line: string) => err.push(line) }, out, err };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('the CLI', () => {
  it('prints its usage, and refuses a transform it does not have', async () => {
    const help = capture();
    expect(await run(['--help'], help.io)).toBe(0);
    expect(help.out).toEqual([USAGE]);

    const unknown = capture();
    expect(await run(['tw-to-box', '.'], unknown.io)).toBe(1);
    expect(unknown.err[0]).toContain('Unknown transform "tw-to-box"');
  });

  it('writes nothing on a dry run, and still reports', async () => {
    const dir = project();
    const before = readFileSync(join(dir, 'examples/dialog-demo.tsx'), 'utf8');
    const { io, out } = capture();

    expect(await run(['radix-to-box', '.', '--dry'], io, dir)).toBe(0);
    expect(readFileSync(join(dir, 'examples/dialog-demo.tsx'), 'utf8')).toBe(before);
    expect(out[0]).toMatch(/^radix-to-box: 23 file\(s\) would change, 15 shadcn wrapper\(s\) left alone$/);
    expect(readFileSync(join(dir, '.migration/README.md'), 'utf8')).toContain('A dry run: nothing was written.');
  });

  it('rewrites the call sites, leaves the wrappers, and writes a report per family', async () => {
    const dir = project();
    const wrapper = readFileSync(join(dir, 'ui/dialog.tsx'), 'utf8');
    const { io } = capture();

    expect(await run(['radix-to-box', 'examples', 'ui', '--no-format', '--report', 'out'], io, dir)).toBe(0);
    expect(readFileSync(join(dir, 'examples/dialog-demo.tsx'), 'utf8')).toContain('import Dialog from "@box-kite/react/components/dialog"');
    expect(readFileSync(join(dir, 'ui/dialog.tsx'), 'utf8')).toBe(wrapper);

    const report = readFileSync(join(dir, 'out/README.md'), 'utf8');
    expect(report).toMatch(/\*\*\d+ of \d+\*\* Radix elements converted without a TODO/);
    expect(report).toContain('`examples/collapsible-demo.tsx:');
    // Dialog's header and footer are shadcn layout, not Radix, so the call site still imports them from the wrapper.
    expect(report).toContain('- `ui/dialog.tsx` — still imported by');
    expect(report).toContain('- `ui/progress.tsx` — nothing imports it any more; delete it');
    expect(existsSync(join(dir, 'out/dropdown-menu.md'))).toBe(true);
    expect(readFileSync(join(dir, 'out/select.md'), 'utf8')).toContain('**TODO** Dropdown has no option groups');
  });

  it('says so when a path does not exist', async () => {
    const { io, err } = capture();

    expect(await run(['radix-to-box', 'nowhere'], io, project())).toBe(1);
    expect(err).toEqual(['No such file or folder: nowhere']);
  });
});
