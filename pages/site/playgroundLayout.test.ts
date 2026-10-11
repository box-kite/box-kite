import { transform } from 'sucrase';
import { describe, expect, it } from 'vitest';
import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import { providedNames } from './playground';
import { EXAMPLE_COLUMNS, PLAYGROUND_EXAMPLES, STARTER } from './playgroundExamples';
import { clampSplit, DEFAULT_LAYOUT, readLayout, splitAt, SPLIT_MAX, SPLIT_MIN, writeLayout } from './playgroundLayout';
import type { PlaygroundScope } from './playgroundScope';
import { compileSnippet } from './playgroundSource';

function memoryStorage(initial?: string) {
  const items = new Map<string, string>(initial === undefined ? [] : [['playground:layout', initial]]);

  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => void items.set(key, value) };
}

describe('the playground layout', () => {
  it('keeps the divider inside the bounds, and whole', () => {
    expect(clampSplit(10)).toBe(SPLIT_MIN);
    expect(clampSplit(90)).toBe(SPLIT_MAX);
    expect(clampSplit(42.6)).toBe(43);
    expect(clampSplit(NaN)).toBe(DEFAULT_LAYOUT.split);
  });

  it('reads a pointer as a share of the row it is over', () => {
    expect(splitAt(600, 100, 1000)).toBe(50);
    expect(splitAt(150, 100, 1000)).toBe(SPLIT_MIN);
    expect(splitAt(600, 100, 0)).toBe(DEFAULT_LAYOUT.split);
  });

  it('round-trips through storage', () => {
    const storage = memoryStorage();

    writeLayout(storage, { wide: false, split: 38, preview: false, css: true });

    expect(readLayout(storage)).toEqual({ wide: false, split: 38, preview: false, css: true });
  });

  it('falls back to the defaults on missing, damaged or out-of-range data', () => {
    expect(readLayout(null)).toEqual(DEFAULT_LAYOUT);
    expect(readLayout(memoryStorage('{not json'))).toEqual(DEFAULT_LAYOUT);
    expect(readLayout(memoryStorage('{"wide":"yes","split":400,"preview":0}'))).toEqual({ ...DEFAULT_LAYOUT, split: SPLIT_MAX });
    expect(
      readLayout({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual(DEFAULT_LAYOUT);
  });

  it('survives storage that throws on write', () => {
    expect(() =>
      writeLayout(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        DEFAULT_LAYOUT,
      ),
    ).not.toThrow();
  });
});

describe('the playground examples', () => {
  const scope: PlaygroundScope = {
    values: Object.fromEntries([...Object.keys(SNIPPET_SCOPE), ...providedNames()].map((name) => [name, () => null])),
    transform: (tsx) => transform(tsx, { transforms: ['jsx', 'typescript'], production: true }).code,
  };

  it('opens on the first one', () => {
    expect(STARTER).toBe(PLAYGROUND_EXAMPLES[0].source);
  });

  it.each(PLAYGROUND_EXAMPLES.map((example) => [example.title, example.source]))('compiles and renders %s', (_title, source) => {
    const compiled = compileSnippet(source, scope);

    expect(compiled.error).toBeNull();
    expect(compiled.unresolved).toEqual([]);
    expect(compiled.renders).toBe(true);
  });

  it('gives every example its own id', () => {
    expect(new Set(PLAYGROUND_EXAMPLES.map((example) => example.id)).size).toBe(PLAYGROUND_EXAMPLES.length);
  });

  /** The editor does not wrap, so a longer line is one a reader has to scroll sideways to finish. */
  it('fits every line in the editor', () => {
    const long = PLAYGROUND_EXAMPLES.flatMap((example) =>
      example.source
        .split('\n')
        .filter((line) => line.length > EXAMPLE_COLUMNS)
        .map((line) => `${example.id}: ${line}`),
    );

    expect(long).toEqual([]);
  });
});
