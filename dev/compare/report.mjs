/**
 * Where this library stands against the ones it is usually weighed against — in a terminal, for whoever
 * is building it, and nowhere else. The tables used to be three pages on the docs site; they are a
 * development instrument now, because a site that argues with other libraries is a site about them.
 *
 * The data is held to the library by `*.test.ts` beside it, which `npm test` runs: a prop added and not
 * mapped fails the suite, so what this prints cannot quietly go stale.
 *
 *   npm run compare              # all three
 *   npm run compare:tailwind     # utility-family coverage
 *   npm run compare:radix        # pattern coverage and bytes
 *   npm run compare:grid         # data grid features and what they cost elsewhere
 *
 * The data is TypeScript, so it is bundled with esbuild — already here for the build — rather than
 * adding a TS runner the repository has no other use for.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = import.meta.dirname;
const sections = { tailwind: tailwindReport, radix: radixReport, grid: gridReport };
/** How wide a proportion bar is drawn. Declared up here because the dispatch below runs before the rest. */
const BAR_WIDTH = 28;

const asked = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const unknown = asked.filter((name) => !(name in sections));

if (unknown.length > 0) {
  console.error(`Unknown section(s): ${unknown.join(', ')}. Pick from ${Object.keys(sections).join(', ')}.`);
  process.exit(1);
}

const chosen = asked.length > 0 ? asked : Object.keys(sections);
const data = await load();

for (const name of chosen) sections[name](data[name]);

/** The three data modules, transpiled together and imported once. */
async function load() {
  const dir = mkdtempSync(join(tmpdir(), 'box-kite-compare-'));

  try {
    const entries = ['tailwindParity', 'radixComparison', 'gridComparison'];

    await build({
      entryPoints: entries.map((name) => resolve(here, `${name}.ts`)),
      outdir: dir,
      format: 'esm',
      platform: 'node',
      bundle: true,
      logLevel: 'silent',
    });

    const [tailwind, radix, grid] = await Promise.all(entries.map((name) => import(pathToFileURL(join(dir, `${name}.js`)).href)));

    return { tailwind, radix, grid };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* --------------------------------------------------------------------------------------- printing */

function heading(title, subtitle) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  if (subtitle) console.log(`\x1b[2m${subtitle}\x1b[0m`);
  console.log();
}

/** A proportion as a bar, so a column of them is readable without reading the numbers. */
function bar(fraction) {
  const filled = Math.round(fraction * BAR_WIDTH);

  return `\x1b[32m${'█'.repeat(filled)}\x1b[2m${'░'.repeat(BAR_WIDTH - filled)}\x1b[0m`;
}

/** Rows of cells, each column as wide as its widest cell. `align` right-aligns by column index. */
function table(rows, align = []) {
  if (rows.length === 0) return;

  const widths = rows[0].map((_, index) => Math.max(...rows.map((row) => plain(row[index] ?? '').length)));

  for (const row of rows) {
    const line = row
      .map((cell, index) => {
        const pad = ' '.repeat(widths[index] - plain(cell ?? '').length);

        return align[index] === 'right' ? `${pad}${cell}` : `${cell}${pad}`;
      })
      .join('  ');

    console.log(`  ${line.trimEnd()}`);
  }
}

/** A cell's printable width, with the colour escapes taken back off. */
function plain(text) {
   
  return String(text).replace(/\x1b\[[0-9;]*m/g, '');
}

function dim(text) {
  return `\x1b[2m${text}\x1b[0m`;
}

/* ---------------------------------------------------------------------------------- the three */

/** Utility-family coverage, by group — which families have a prop, which have part of one, which none. */
function tailwindReport({ propertyGroups, variantGroups, allGroups, countBy }) {
  heading('Utility-family coverage', 'Every CSS utility family and nesting key, against the props the registry ships.');

  const rows = [[dim('Group'), dim('Covered'), dim('Partial'), dim('None'), '', dim('Share')]];

  for (const group of [...propertyGroups, ...variantGroups]) {
    const has = group.rows.filter((row) => row.status === 'has').length;
    const partial = group.rows.filter((row) => row.status === 'partial').length;
    const none = group.rows.filter((row) => row.status === 'none').length;
    const share = (has + partial * 0.5) / group.rows.length;

    rows.push([group.name, String(has), String(partial), none > 0 ? `\x1b[33m${none}\x1b[0m` : '0', bar(share), `${Math.round(share * 100)}%`]);
  }

  table(rows, [, 'right', 'right', 'right', , 'right']);

  const has = countBy(allGroups, 'has');
  const partial = countBy(allGroups, 'partial');
  const none = countBy(allGroups, 'none');
  const total = has + partial + none;

  console.log(`\n  \x1b[1m${has}\x1b[0m of ${total} families covered outright, ${partial} partial, ${none} with no prop.`);

  const gaps = allGroups.flatMap((group) => group.rows.filter((row) => row.status !== 'has').map((row) => ({ group: group.name, ...row })));

  if (gaps.length > 0) {
    console.log(dim('\n  The gaps, each with the reason it is one:\n'));
    table(gaps.map((gap) => [dim(gap.group), gap.tailwind, gap.status === 'partial' ? '\x1b[33mpartial\x1b[0m' : '\x1b[31mnone\x1b[0m', dim(gap.note ?? '')]));
  }
}

/** Pattern coverage and what the patterns weigh, against the two primitive libraries. */
function radixReport({ libraries, sizeRows, coverageRows, countCovered, marginalSum, soloSum, totalFor, kb, VERIFIED_ON, BOX_BASELINE }) {
  heading('Accessible-pattern coverage and bytes', `Measured ${VERIFIED_ON}. Bytes are gzipped, from dev/published-size.mjs.`);

  const ids = libraries.map((library) => library.id);
  const mine = ids[0];

  console.log(dim('  What an app pays before its first component, and for all thirteen patterns:\n'));

  table(
    [
      [dim('Library'), dim('Version'), dim('Engine'), dim('13 patterns'), dim('Total'), dim('Styled')],
      ...libraries.map((library) => [
        library.id === mine ? `\x1b[1m${library.name}\x1b[0m` : library.name,
        dim(library.version),
        `${kb(library.engine)} KB`,
        `${kb(library.thirteen)} KB`,
        `${kb(totalFor(library.id))} KB`,
        library.styled ? '\x1b[32myes\x1b[0m' : `\x1b[33mno\x1b[0m ${dim('(CSS not counted)')}`,
      ]),
    ],
    [, , 'right', 'right', 'right'],
  );

  console.log(dim(`\n  The engine is ${kb(BOX_BASELINE)} KB once; the other two start at nothing and have no styles anywhere.`));
  console.log(dim('  Per-pattern, what one more costs an app that already has the other twelve:\n'));

  table(
    [
      [dim('Pattern'), ...libraries.map((library) => dim(library.column))],
      ...sizeRows.map((row) => {
        const best = Math.min(...ids.map((id) => row.cells[id].marginal));

        return [
          row.pattern,
          ...ids.map((id) => {
            const value = `${kb(row.cells[id].marginal)} KB`;

            return row.cells[id].marginal === best ? `\x1b[32m${value}\x1b[0m` : value;
          }),
        ];
      }),
      [dim('Sum of the thirteen'), ...ids.map((id) => dim(`${kb(marginalSum(id))} KB`))],
      [dim('If each were alone'), ...ids.map((id) => dim(`${kb(soloSum(id))} KB`))],
    ],
    [, 'right', 'right', 'right'],
  );

  console.log(dim('\n  The patterns beyond those thirteen, and who answers them:\n'));

  table(
    [
      [dim('Pattern'), ...libraries.map((library) => dim(library.column))],
      ...coverageRows.map((row) => [row.pattern, ...ids.map((id) => mark(row.cells[id].has))]),
      [dim('Answered'), ...ids.map((id) => dim(`${countCovered(id)}/${coverageRows.length}`))],
    ],
    [, 'right', 'right', 'right'],
  );

  const behind = coverageRows.filter((row) => row.cells[mine].has === 'none');

  if (behind.length > 0) {
    console.log(`\n  \x1b[33mNot shipped here:\x1b[0m ${behind.map((row) => row.pattern).join(', ')}.`);
  }
}

/** A coverage cell, as a word. `prop` is "you can, with a prop rather than a component". */
function mark(has) {
  if (has === 'component') return '\x1b[32m●\x1b[0m component';
  if (has === 'prop') return '\x1b[36m◐\x1b[0m prop';

  return dim('○ —');
}

/** Data grid features against the tiers that charge for them. */
function gridReport({ products, comparisonRows, countShipped, VERIFIED_ON }) {
  heading('Data grid features, and what they cost elsewhere', `Prices as each vendor's own page printed them on ${VERIFIED_ON}.`);

  const ids = products.map((product) => product.id);
  const mine = ids[0];

  table(
    [
      [dim('Product'), dim('Price'), dim('Terms'), dim('Features')],
      ...products.map((product) => [
        product.id === mine ? `\x1b[1m${product.name}\x1b[0m` : product.name,
        product.price ?? dim('—'),
        dim(product.terms ?? ''),
        `${countShipped(product.id)}/${comparisonRows.length}`,
      ]),
    ],
    [, , , 'right'],
  );

  console.log(dim('\n  Feature by feature:\n'));

  table([
    [dim('Feature'), ...products.map((product) => dim(product.column))],
    ...comparisonRows.map((row) => [row.feature, ...ids.map((id) => availability(row.cells[id].has))]),
  ]);

  const missing = comparisonRows.filter((row) => row.cells[mine].has !== 'yes');

  if (missing.length > 0) {
    console.log(`\n  \x1b[33mNot shipped here:\x1b[0m ${missing.map((row) => row.feature).join(', ')}.`);
  }
}

function availability(has) {
  if (has === 'yes') return '\x1b[32m●\x1b[0m';
  if (has === 'diy') return '\x1b[36m◐\x1b[0m';

  return dim('○');
}
