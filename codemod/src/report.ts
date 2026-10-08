import type { Finding } from './transform';

export interface FileReport {
  path: string;
  findings: Finding[];
  changed: boolean;
  error?: string;
  leftovers: string[];
}

export interface Wrapper {
  path: string;
  importers: string[];
}

export interface Totals {
  elements: number;
  automated: number;
  files: number;
  filesClean: number;
}

/** Automated is everything that is not a TODO: a part converted, or one removed because Box Kite draws it. */
export function totals(files: readonly FileReport[]): Totals {
  const touched = files.filter((file) => file.findings.length);
  const findings = touched.flatMap((file) => file.findings);

  return {
    elements: findings.length,
    automated: findings.filter((f) => f.outcome !== 'todo').length,
    files: touched.length,
    filesClean: touched.filter((file) => !file.error && file.findings.every((f) => f.outcome !== 'todo')).length,
  };
}

export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

const families = (files: readonly FileReport[]) => [...new Set(files.flatMap((file) => file.findings.map((f) => f.family)))].sort();

/** `.migration/README.md`: the totals, a row per family, and every TODO with where it is. */
export function summary(files: readonly FileReport[], wrappers: readonly Wrapper[], dry: boolean): string {
  const t = totals(files);
  const lines = [
    '# radix-to-box',
    '',
    dry ? 'A dry run: nothing was written.' : 'What the codemod changed, and what it left for you.',
    '',
    `- **${t.automated} of ${t.elements}** Radix elements converted without a TODO (${percent(t.automated, t.elements)})`,
    `- **${t.filesClean} of ${t.files}** files need nothing more (${percent(t.filesClean, t.files)})`,
    '',
    '| Family | Elements | Automated | TODO |',
    '| --- | ---: | ---: | ---: |',
  ];
  for (const family of families(files)) {
    const found = files.flatMap((file) => file.findings.filter((f) => f.family === family));
    const todo = found.filter((f) => f.outcome === 'todo').length;
    lines.push(`| [${family}](./${family}.md) | ${found.length} | ${found.length - todo} | ${todo} |`);
  }

  const todos = files.flatMap((file) =>
    file.findings.filter((f) => f.outcome === 'todo').map((f) => `- \`${file.path}:${f.line}\` — ${f.part}: ${f.todo}`),
  );
  if (todos.length) lines.push('', '## TODO', '', 'Each one is a `TODO(radix-to-box)` comment in the code as well.', '', ...todos);

  const failed = files.filter((file) => file.error);
  if (failed.length)
    lines.push(
      '',
      '## Not written',
      '',
      ...failed.map((file) => `- \`${file.path}\` — the result did not parse (${file.error}), so the file was left alone`),
    );

  const leftovers = files.filter((file) => file.leftovers.length);
  if (leftovers.length) {
    lines.push('', '## Still imported from Radix', '', ...leftovers.map((file) => `- \`${file.path}\` — ${file.leftovers.join(', ')}`));
  }

  if (wrappers.length) {
    lines.push('', '## shadcn wrappers', '', 'Left alone: their call sites were converted instead.', '');
    for (const wrapper of wrappers) {
      lines.push(
        wrapper.importers.length
          ? `- \`${wrapper.path}\` — still imported by ${wrapper.importers.map((p) => `\`${p}\``).join(', ')}`
          : `- \`${wrapper.path}\` — nothing imports it any more; delete it`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

/** `.migration/<family>.md`: every element of one family, and what became of it. */
export function familyReport(family: string, files: readonly FileReport[]): string {
  const lines = [`# ${family}`, ''];
  for (const file of files) {
    const found = file.findings.filter((f) => f.family === family);
    if (!found.length) continue;
    lines.push(`## \`${file.path}\``, '');
    for (const f of found) {
      const what = f.outcome === 'todo' ? `**TODO** ${f.todo}` : f.outcome;
      lines.push(`- line ${f.line} — ${f.part}: ${what}${f.notes.length ? ` (${f.notes.join('; ')})` : ''}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export { families };
