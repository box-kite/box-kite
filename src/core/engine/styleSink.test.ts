import { describe, expect, it } from 'vitest';
import { ruleListIn } from '../../../dev/engineHarness';
import { createStyleEngine, StyleEngine } from './styleEngine';
import { createCssomSink, createSink, SinkMode } from './styleSink';

/**
 * A sink is the only part of the engine that knows where CSS goes. The engine hands every sink the
 * same rules with the same sort keys, so the three implementations have to agree on the result —
 * otherwise the CSS an app gets from the server contradicts the one the browser builds, and no
 * test that renders through a single sink would ever notice.
 */
const sinkModes: SinkMode[] = ['cssom', 'textContent', 'string'];

function makeEngine(mode: SinkMode, styleElementId: string): StyleEngine {
  return createStyleEngine({ classNames: 'readable', sink: mode, styleElementId });
}

// A base rule, as opposed to something generated from props. Matched on the selector because the
// cssom sink reads its CSS back through the DOM's own serializer, which reformats everything —
// including the marker `generatedRulesIn` looks for, which is why this list has to be exhaustive.
// The reduced-motion query is a base rule too: it zeroes `--transitionTime`, which is how the
// library stops animating on its own. A rule a test wrote under `motionReduce` collapses to the
// same text here, so assert on those through `ruleList` rather than through `selectorsOf`.
const baseSelector = /^(:root|html|body|a,ul|button|input|#box-kite-portal|\._b|\._s|@media \(prefers-reduced-motion: reduce\))/;

/** The selectors in a sheet, in order, base rules dropped and the sink's formatting normalized. */
function selectorsOf(css: string): string[] {
  return ruleListIn(css)
    .map((rule) => rule.slice(0, rule.indexOf('{')).replace(/\s+/g, ' ').trim())
    .filter((selector) => selector.length > 0 && !baseSelector.test(selector));
}

/** Whether a rule for `selector` exists, whatever the sink formatted it into. */
function hasSelector(css: string, selector: string): boolean {
  return selectorsOf(css).includes(selector);
}

/** How many rules a sheet declares for `selector`. */
function countSelector(css: string, selector: string): number {
  return selectorsOf(css).filter((current) => current === selector).length;
}

describe('style sinks', () => {
  it('places a rule by its sort key even when it arrives in a later flush', () => {
    // `b` is declared near the top of the prop registry and `p` far below it, so `.b-1` belongs
    // ahead of `.p-4` however late it shows up. Appending — what the textContent sink used to do —
    // produced the reverse, i.e. a different cascade than the one the browser builds.
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-order-${mode}`);

      engine.resolveClassNames({ p: 4 }, false);
      engine.flushSync();
      engine.resolveClassNames({ b: 1 }, false);

      expect(selectorsOf(engine.getStyles()), mode).toEqual(['.b-1', '.p-4']);
    }
  });

  it('keeps arrival order for rules that share a sort key', () => {
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-tie-${mode}`);

      engine.resolveClassNames({ p: 4 }, false);
      engine.flushSync();
      engine.resolveClassNames({ p: 8 }, false);

      expect(selectorsOf(engine.getStyles()), mode).toEqual(['.p-4', '.p-8']);
    }
  });

  it('agrees on the order of a mixed tree across all three sinks', () => {
    const orders = sinkModes.map((mode) => {
      const engine = makeEngine(mode, `sink-parity-${mode}`);

      // Split over two flushes on purpose: breakpoints, pseudo classes and plain props have to
      // interleave by sort key, not by the flush they happened to arrive in.
      engine.resolveClassNames({ p: 4, sm: { p: 2 }, hover: { bgColor: 'red-500' } }, false);
      engine.flushSync();
      engine.resolveClassNames({ b: 1, xl: { m: 8 }, color: 'blue-500' }, false);

      return selectorsOf(engine.getStyles());
    });

    expect(orders[1]).toEqual(orders[0]);
    expect(orders[2]).toEqual(orders[0]);
    // Pinned so the shared order is a stated expectation and not merely an agreement: media
    // queries last (they have to win the cascade), everything else in registry declaration order.
    // `.m-8` is not listed: it was written under `xl`, so it lives inside the media rule.
    expect(orders[0]).toEqual([
      '.b-1',
      '.p-4',
      '.color-blue-500',
      '.hover-bgColor-red-500:hover',
      '@media (min-width: 640px)',
      '@media (min-width: 1280px)',
    ]);
  });

  it('writes the base rules once, ahead of everything generated, in every sink', () => {
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-base-${mode}`);

      engine.resolveClassNames({ p: 4 }, false);
      engine.flushSync();
      engine.resolveClassNames({ m: 4 }, false);

      const css = engine.getStyles();
      const boxRule = /\._b\s*\{/g;

      expect(css.search(boxRule), mode).toBeLessThan(css.search(/\.p-4\s*\{/));
      expect(css.match(boxRule), mode).toHaveLength(1);
    }
  });

  it('declares a variable used after initialization without repeating the first :root block', () => {
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-vars-${mode}`);
      engine.extend({ brand: '#123456', accent: '#654321' }, {}, {});

      engine.resolveClassNames({ bgColor: 'brand' } as never, false);
      engine.flushSync();
      engine.resolveClassNames({ color: 'accent' } as never, false);

      const css = engine.getStyles();

      expect(css.match(/--brand:/g), mode).toHaveLength(1);
      expect(css.match(/--accent:/g), mode).toHaveLength(1);
    }
  });

  it('empties the sink on clear and starts the next round from the base rules', () => {
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-reset-${mode}`);

      engine.resolveClassNames({ p: 4 }, false);
      engine.flushSync();
      engine.clear();

      // Nothing generated survives; the base reset is rewritten, so the sheet is never invalid.
      expect(selectorsOf(engine.getStyles()), mode).toEqual([]);

      engine.resolveClassNames({ m: 4 }, false);
      const css = engine.getStyles();

      expect(hasSelector(css, '.m-4'), mode).toBe(true);
      expect(css.search(/\._b\s*\{/), mode).toBeLessThan(css.search(/\.m-4\s*\{/));
    }
  });

  it('keeps a rule whose readable class name is not a valid CSS identifier', () => {
    // `width="1/2"` names the class `width-1/2`. Unescaped, the selector `.width-1/2` is rejected
    // by the CSS parser, so `insertRule` threw and the rule was lost — silently, with the class
    // still sitting in the markup.
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-escape-${mode}`);

      const { classNames } = engine.resolveClassNames({ width: '1/2', opacity: 0.5 }, false);
      const css = engine.getStyles();

      // The class in the markup keeps the value the caller wrote; only the selector is escaped.
      expect(classNames, mode).toEqual(['_b', 'width-1/2', 'opacity-0.5']);
      expect(hasSelector(css, '.width-1\\/2'), mode).toBe(true);
      expect(hasSelector(css, '.opacity-0\\.5'), mode).toBe(true);
    }
  });

  it('keeps breakpoint rules in a real stylesheet', () => {
    // Browsers accept `@media(min-width: 640px)` but happy-dom and jsdom reject the whole rule, so
    // without the space after the at-keyword every responsive rule vanished from a consumer's
    // tests as soon as they ran on the default (cssom) sink.
    const engine = makeEngine('cssom', 'sink-media');

    engine.resolveClassNames({ sm: { p: 4 } }, false);

    expect(hasSelector(engine.getStyles(), '@media (min-width: 640px)')).toBe(true);
  });

  it('does not repeat a rule when the same props render again', () => {
    for (const mode of sinkModes) {
      const engine = makeEngine(mode, `sink-dedupe-${mode}`);

      engine.resolveClassNames({ p: 4 }, false);
      engine.flushSync();
      engine.resolveClassNames({ p: 4 }, false);

      expect(countSelector(engine.getStyles(), '.p-4'), mode).toBe(1);
    }
  });

  it('falls back to a string sink when there is no document to write to', () => {
    const realDocument = globalThis.document;

    try {
      // @ts-expect-error — emulating a server process, where the engine must not need a DOM.
      delete globalThis.document;

      expect(createSink('sink-no-document').mode).toBe('string');
      expect(createSink('sink-no-document', 'cssom').mode).toBe('string');
      expect(createSink('sink-no-document', 'textContent').mode).toBe('string');
    } finally {
      globalThis.document = realDocument;
    }
  });

  it('writes nothing, rather than throwing, when the element has lost its stylesheet', () => {
    // Defensive: a style element only carries a `sheet` while it is in a document, and an app can
    // remove it. Every write is then a no-op instead of a crash in a layout effect.
    const sink = createCssomSink(() => ({ sheet: null }) as unknown as HTMLStyleElement);

    sink.writeBase(['._b{display:block}']);
    sink.writeVariables(':root{--red-500: #ef4444;}');
    sink.writeRules([{ sortKey: 1, rule: '.p-4{padding:1rem}' }]);
    sink.reset();

    expect(sink.getStyles()).toBe('');
  });

  it('prefers a stylesheet when a document is available', () => {
    expect(createSink('sink-with-document').mode).toBe('cssom');
  });

  it('starts a fresh stylesheet when the sink is switched after rules were written', () => {
    const engine = makeEngine('textContent', 'sink-switch');

    engine.resolveClassNames({ p: 4 }, false);
    engine.flushSync();
    expect(hasSelector(engine.getStyles(), '.p-4')).toBe(true);

    engine.configure({ sink: 'string' });

    // The rules stayed behind in the old sink, so the engine forgot them; the next render puts
    // them into the new one. The old sink is left empty rather than holding stale CSS.
    expect(selectorsOf(engine.getStyles())).toEqual([]);
    expect(document.getElementById('sink-switch')?.textContent).toBe('');

    engine.resolveClassNames({ p: 4 }, false);
    expect(hasSelector(engine.getStyles(), '.p-4')).toBe(true);
  });
  describe('at-rule blocks (bug #206)', () => {
    /** A cssom sink over a fresh element, plus the sheet's top-level rules as text with whitespace collapsed. */
    function blockSink(id: string, css = '', adopted?: { baseRulesCount: number; sortKeys: number[] }) {
      const element = document.createElement('style');
      element.id = id;
      element.textContent = css;
      document.head.append(element);
      const sink = createCssomSink(() => element, adopted);
      const topLevel = () => [...element.sheet!.cssRules].map((rule) => rule.cssText.replace(/\s+/g, ' '));

      return { sink, topLevel };
    }

    it('adds a late at-rule to the block its sort key and prelude already have', () => {
      // A new top-level at-rule makes Chrome restyle every element on the page; a style rule inside an
      // existing block is diffed like any other.
      const { sink, topLevel } = blockSink('blocks-join');

      sink.writeRules([{ sortKey: 5, rule: '@scope (.dark) to ([data-theme]){:scope .a{color:red}}' }]);
      sink.writeRules([{ sortKey: 5, rule: '@scope (.dark) to ([data-theme]){:scope .b{color:blue}}' }]);

      expect(topLevel()).toEqual(['@scope (.dark) to ([data-theme]) { :scope .a { color: red; } :scope .b { color: blue; } }']);
    });

    it('joins the innermost block of a nested chain', () => {
      const { sink, topLevel } = blockSink('blocks-nested');

      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){@scope (.dark) to ([data-theme]){:scope .a{color:red}}}' }]);
      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){@scope (.dark) to ([data-theme]){:scope .b{color:blue}}}' }]);

      expect(topLevel()).toHaveLength(1);
      expect(topLevel()[0]).toContain(':scope .a { color: red; } :scope .b { color: blue; }');
    });

    it('starts a new block for another sort key or another prelude, placed by its key', () => {
      const { sink, topLevel } = blockSink('blocks-apart');

      sink.writeRules([
        { sortKey: 5, rule: '@media (min-width: 40rem){.a{color:red}}' },
        { sortKey: 7, rule: '@media (min-width: 40rem){.c{color:red}}' },
      ]);
      sink.writeRules([
        { sortKey: 6, rule: '@media (min-width: 40rem){.b{color:red}}' },
        { sortKey: 5, rule: '@scope (.dark) to ([data-theme]){:scope .d{color:red}}' },
        { sortKey: 5, rule: '@media (min-width: 60rem){.e{color:red}}' },
      ]);

      expect(topLevel().map((rule) => rule.match(/\.[a-e](?![a-z])/g)!.join(''))).toEqual(['.a', '.d', '.e', '.b', '.c']);
    });

    it('never folds a plain rule into a block', () => {
      const { sink, topLevel } = blockSink('blocks-plain');

      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){.a{color:red}}' }]);
      sink.writeRules([{ sortKey: 5, rule: '.b{color:red}' }]);

      expect(topLevel()).toEqual(['@media (min-width: 40rem) { .a { color: red; } }', '.b { color: red; }']);
    });

    it('joins a block the server rendered into an adopted sheet', () => {
      const { sink, topLevel } = blockSink('blocks-adopted', '._b{display:block}@media (min-width: 40rem){.a{color:red}}', {
        baseRulesCount: 1,
        sortKeys: [5],
      });

      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){.b{color:blue}}' }]);

      expect(topLevel()).toEqual(['._b { display: block; }', '@media (min-width: 40rem) { .a { color: red; } .b { color: blue; } }']);
    });

    it('forgets its blocks on reset', () => {
      const { sink, topLevel } = blockSink('blocks-reset');

      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){.a{color:red}}' }]);
      sink.reset();
      sink.writeRules([{ sortKey: 5, rule: '@media (min-width: 40rem){.b{color:blue}}' }]);

      expect(topLevel()).toEqual(['@media (min-width: 40rem) { .b { color: blue; } }']);
    });
  });
});
