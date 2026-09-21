import { readdirSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { resolve, sep } from 'path';
import { describe, expect, it } from 'vitest';
import { ComponentApi } from '../site/componentApi';
import { siteRoutes } from '../site/site';
import { products } from './gridComparison';
import { APG_PATTERNS, completions, patternRows, pillars, quotedTiers, totals, typeProof } from './home';

const root = process.cwd();

interface PropEntry {
  name: string;
  example: { value: string | number; css: string };
}

const propsApi: { propCount: number; props: PropEntry[] } = JSON.parse(readFileSync(resolve(root, 'api/props.json'), 'utf8'));

const componentApis: ComponentApi[] = readdirSync(resolve(root, 'api/components')).map((file) =>
  JSON.parse(readFileSync(resolve(root, 'api/components', file), 'utf8')),
);

/**
 * The homepage is the one page whose whole job is to make claims, so each one is held to the artifact it
 * came out of. Every failure here is the page having gone stale rather than the generator having a bug.
 */
describe('the homepage counts', () => {
  it('prints the prop count the reference was generated with', () => {
    expect(totals.props).toBe(propsApi.propCount);
  });

  it('prints the number of components that have a generated reference', () => {
    expect(totals.components).toBe(componentApis.length);
  });

  it('prints the size of the keyboard map and the axe sweep', () => {
    const keyboardRows = componentApis.reduce((sum, api) => sum + api.keyboard.length, 0);
    const fixtures = componentApis.reduce((sum, api) => sum + api.axe.fixtures.length, 0);

    expect({ keyboardRows, fixtures }).toEqual({ keyboardRows: totals.keyboardRows, fixtures: totals.fixtures });
  });

  // The claim the page makes loudest, and the one the ledger itself guards: `knownViolations` fails both
  // on a new violation and on a listed one that stopped firing, so an empty ledger is a measured zero.
  it('prints the axe ledger as it stands', () => {
    const listed = componentApis.flatMap((api) => api.axe.knownViolations.map((violation) => `${api.name}: ${violation}`));

    expect(listed).toEqual([]);
    expect(totals.knownViolations).toBe(listed.length);
  });
});

describe('the hero completion list', () => {
  it('shows each prop the CSS the engine measured for it', () => {
    const wrong = completions.filter((completion) => {
      const entry = propsApi.props.find((prop) => prop.name === completion.prop);

      return !entry || entry.example.css !== completion.css || completion.written !== written(entry.example.value);
    });

    expect(wrong.map((completion) => completion.prop)).toEqual([]);
  });

  // The list is an argument about a number meaning different things, so it needs one number that does.
  // Two of the three share the spacing scale and the border does not, which is the whole story.
  it('shows the same 4 landing as two different lengths', () => {
    const fours = completions.filter((completion) => completion.written === '{4}');
    const lengths = [...new Set(fours.map((completion) => completion.css.split(': ')[1]))].sort();

    expect(fours.length).toBe(3);
    expect(lengths).toEqual(['1rem', '4px']);
  });
});

describe('the pattern table', () => {
  it('names every component that implements a published pattern, and no others', () => {
    const patterned = componentApis.filter((api) => api.pattern).map((api) => api.name);

    expect([...patternRows].map((row) => row.name).sort()).toEqual(patterned.sort());
  });

  it('agrees with each component reference about its pattern, its keyboard map and its fixtures', () => {
    const wrong = patternRows.filter((row) => {
      const api = componentApis.find((candidate) => candidate.name === row.name);

      return (
        !api ||
        api.route !== row.route ||
        api.pattern !== `${APG_PATTERNS}${row.pattern}/` ||
        api.keyboard.length !== row.keyboard ||
        api.axe.fixtures.length !== row.fixtures
      );
    });

    expect(wrong.map((row) => row.name)).toEqual([]);
  });

  it('links every row to a page this site serves', () => {
    const paths = new Set<string>(siteRoutes.map((route) => route.path));

    expect(patternRows.filter((row) => !paths.has(row.route)).map((row) => row.name)).toEqual([]);
  });
});

describe('the pillars', () => {
  it('gives each one a unique anchor', () => {
    const ids = pillars.map((pillar) => pillar.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('quotes only tiers the comparison page prices', () => {
    const priced = new Set(products.filter((product) => product.price).map((product) => product.id));

    expect(quotedTiers.filter((id) => !priced.has(id))).toEqual([]);
  });
});

/**
 * The page prints a compiler error, so the compiler is what says whether it still prints it. A program of
 * one in-memory file against the real `src/box.ts`: the fixture cannot be committed, since a file with a
 * deliberate type error in it would fail `npm run compile`.
 */
describe('the type-error proof', () => {
  it('is what the compiler says today', async () => {
    const ts = createRequire(import.meta.url)('typescript') as typeof import('typescript');
    const slash = (path: string) => path.split(sep).join('/');
    const fileName = `${slash(root)}/pages/pages/__typeProof.tsx`;
    const source = `import Box from '../../src/box';\nexport const wrong = <Box bgColor="${typeProof.wrong}" />;\n`;

    const options: import('typescript').CompilerOptions = {
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    };

    const host = ts.createCompilerHost(options, true);
    const isFixture = (name: string) => slash(name) === fileName;
    const { getSourceFile, fileExists, readFile } = host;
    host.getSourceFile = (name, ...rest) =>
      isFixture(name)
        ? ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
        : getSourceFile.call(host, name, ...rest);
    host.fileExists = (name) => isFixture(name) || fileExists.call(host, name);
    host.readFile = (name) => (isFixture(name) ? source : readFile.call(host, name));

    const program = ts.createProgram([fileName], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file && isFixture(diagnostic.file.fileName));

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([typeProof.code]);

    const message = ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' ');

    expect(message.startsWith(typeProof.head)).toBe(true);
    expect(message.endsWith(typeProof.tail)).toBe(true);
  }, 60_000);
});

/** `p={4}` for a number, `bgColor="sky-500"` for a string — how the reference's example value is written. */
function written(value: string | number): string {
  return typeof value === 'number' ? `{${value}}` : `"${value}"`;
}
