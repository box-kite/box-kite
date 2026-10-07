import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxStyleProps } from '../../types';
import { Keyframes } from './keyframes';
import { ADOPTION_ATTRIBUTE, adoptionManifest } from './styleAdoption';
import { createStyleEngine, StyleEngine } from './styleEngine';

/**
 * D10: a server-rendered sheet is the browser engine's own from the first render — only the rules the client
 * adds are inserted, and a sheet whose manifest does not match keeps styling the page under no id.
 */
const ID = 'adopted-styles';

// The prerendered page: a breakpoint, a pseudo-class with a colour token, a keyframes sequence and a rule on `html`.
const card: BoxStyleProps = { p: 4, md: { p: 8 }, hover: { color: 'blue-500' }, animation: 'spin' };
const rootStyles: BoxStyleProps = { colorScheme: 'light dark' };

function serverRender(props: BoxStyleProps[], variables: string[] = []): { tag: string; classes: string[] } {
  const server = createStyleEngine({ classNames: 'stable', sink: 'string', styleElementId: ID });
  variables.forEach((name) => server.getVariableValue(name));
  const classes = props.map((p) => server.classNames(p));
  server.addGlobalStyles(rootStyles, 'html');

  return { tag: server.getStyleTag(), classes };
}

function hydrateHead(tag: string): HTMLStyleElement {
  document.head.insertAdjacentHTML('afterbegin', tag);

  return document.getElementById(ID) as HTMLStyleElement;
}

function client(): StyleEngine {
  return createStyleEngine({ classNames: 'stable', styleElementId: ID });
}

function selectors(element: HTMLStyleElement): string[] {
  return [...element.sheet!.cssRules].map((rule) => rule.cssText.slice(0, rule.cssText.indexOf('{')).trim());
}

afterEach(() => {
  vi.restoreAllMocks();
  document.head.querySelectorAll('style').forEach((element) => element.remove());
});

describe('adopting a server-rendered stylesheet', () => {
  it('writes the manifest only where the class names survive the trip', () => {
    expect(serverRender([card]).tag).toMatch(new RegExp(`^<style id="${ID}" ${ADOPTION_ATTRIBUTE}="1;[^"]+">`));

    const counted = createStyleEngine({ classNames: 'hashed', sink: 'string', styleElementId: ID });
    counted.classNames(card);
    expect(counted.getStyleTag()).toMatch(new RegExp(`^<style id="${ID}">`));
  });

  it('inserts nothing for the rules the server already wrote', () => {
    const { tag, classes } = serverRender([card]);
    const element = hydrateHead(tag);
    const before = element.sheet!.cssRules.length;
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    const engine = client();
    expect(engine.classNames(card)).toBe(classes[0]);
    engine.addGlobalStyles(rootStyles, 'html');
    engine.flushSync();

    expect(insertRule).not.toHaveBeenCalled();
    expect(element.sheet!.cssRules.length).toBe(before);
    expect(document.getElementById(ID)).toBe(element);
    expect(element.hasAttribute(ADOPTION_ATTRIBUTE)).toBe(false);
  });

  it('places a rule the client adds among the adopted ones, by its cascade position', () => {
    const element = hydrateHead(serverRender([card]).tag);
    const engine = client();
    engine.classNames(card);
    engine.flushSync();
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    // `p={2}` sorts ahead of the adopted `md` padding, so it has to land before it or the breakpoint loses.
    const [, padding] = engine.classNames({ p: 2 }).split(' ');
    engine.flushSync();

    const order = selectors(element);
    const added = order.indexOf(`.${padding}`);
    const breakpoint = order.findIndex((selector) => selector.startsWith('@media (min-width'));
    expect(insertRule).toHaveBeenCalledTimes(1);
    expect(added).toBeGreaterThan(-1);
    expect(added).toBeLessThan(breakpoint);
  });

  it('declares no variable and no keyframes the adopted sheet already holds', () => {
    const element = hydrateHead(serverRender([card]).tag);
    const engine = client();
    engine.classNames(card);
    engine.flushSync();
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    // `blue-500` and `spin` are both in the server's sheet: one rule each, and no `:root` or `@keyframes` beside them.
    engine.classNames({ color: 'blue-500', focus: { animation: 'spin' } });
    engine.flushSync();

    expect(document.getElementById(ID)).toBe(element);
    expect(insertRule).toHaveBeenCalledTimes(2);
    expect(insertRule.mock.calls.map(([rule]) => rule).join('')).not.toMatch(/:root|@keyframes/);
  });

  it('writes no variable read before the first render when the sheet declares it', () => {
    hydrateHead(serverRender([card], ['blue-500']).tag);
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    // What an app's module scope does (`Box.getVariableValue` in an extends file), ahead of any Box.
    const engine = client();
    engine.getVariableValue('blue-500');
    engine.flushSync();
    engine.classNames(card);
    engine.flushSync();

    expect(insertRule).not.toHaveBeenCalled();
  });

  // Bug #205: a `:root` insert after the first paint recalculates every element on the page.
  it('inserts the rule for a token the sheet never used, and no :root block for it', () => {
    hydrateHead(serverRender([card]).tag);
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    const engine = client();
    engine.classNames(card);
    engine.classNames({ bgColor: 'violet-300' });
    engine.flushSync();

    const inserted = insertRule.mock.calls.map(([rule]) => rule);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatch(/\{background-color:var\(--violet-300,oklch\(81\.1% \.111 293\.6\)\)\}$/);
  });

  it('adds a breakpoint the server never wrote to the block the server opened for it', () => {
    // A new top-level at-rule after the first paint restyles the whole page (bug #207).
    const element = hydrateHead(serverRender([card]).tag);
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');

    const engine = client();
    engine.classNames(card);
    engine.classNames({ xl: { m: 2 } });
    engine.flushSync();

    expect(insertRule).not.toHaveBeenCalled();
    expect([...element.sheet!.cssRules].map((rule) => rule.cssText).join('')).toMatch(
      /@media \(min-width: 1280px\) \{[^@]*margin: 0\.5rem/,
    );
  });

  it('does not re-emit a sequence the sheet holds when the client registers it after adopting', () => {
    const sequence: Keyframes = { 'card-in': { from: { opacity: 0 } } };
    const server = createStyleEngine({ classNames: 'stable', sink: 'string', styleElementId: ID });
    server.keyframes(sequence);
    server.classNames({ animationName: 'card-in' });
    hydrateHead(server.getStyleTag());

    const engine = client();
    engine.classNames(card);
    engine.flushSync();
    const insertRule = vi.spyOn(CSSStyleSheet.prototype, 'insertRule');
    // A route module loading after hydration started: the same definition the server registered.
    engine.keyframes(sequence);
    engine.classNames({ animationName: 'card-in' });
    engine.flushSync();

    expect(insertRule.mock.calls.map(([rule]) => rule).join('')).not.toMatch(/@keyframes/);
  });

  it('leaves a sheet the browser did not parse whole in place, and writes its own after it', () => {
    // The test DOM drops `@starting-style`, which is what a browser without it does: an index would then be off by one.
    const entrance: BoxStyleProps = { opacity: 1, startingStyle: { opacity: 0 } };
    const stale = hydrateHead(serverRender([card, entrance]).tag);

    const engine = client();
    engine.classNames(card);
    engine.flushSync();

    const own = document.getElementById(ID) as HTMLStyleElement;
    expect(own).not.toBe(stale);
    expect(stale.hasAttribute('id')).toBe(false);
    expect(stale.nextElementSibling).toBe(own);
    expect(own.sheet!.cssRules.length).toBeGreaterThan(0);
  });

  it('does not adopt a sheet under class names it would not produce itself', () => {
    const stale = hydrateHead(serverRender([card]).tag);

    const engine = createStyleEngine({ classNames: 'readable', styleElementId: ID });
    engine.classNames(card);
    engine.flushSync();

    expect(document.getElementById(ID)).not.toBe(stale);
    expect(stale.nextElementSibling).toBe(document.getElementById(ID));
  });

  it('regenerates everything once cleared', () => {
    const element = hydrateHead(serverRender([card]).tag);
    const engine = client();
    engine.classNames(card);
    engine.clear();

    engine.classNames(card);
    engine.flushSync();

    expect(document.getElementById(ID)).toBe(element);
    // `md={{ p: 8 }}`, written once — inside the block the engine opened for its breakpoint.
    expect(
      [...element.sheet!.cssRules]
        .map((rule) => rule.cssText)
        .join('')
        .match(/padding: 2rem/g),
    ).toHaveLength(1);
  });
});

describe('adoptionManifest', () => {
  it('writes the sort keys as runs of base-36 deltas', () => {
    const [version, runs] = adoptionManifest(['a', 'b', 'c', 'd'], [3, 3, 5, 100005], []).split(';');

    expect(version).toBe('1');
    expect(runs).toBe(`3*2.2.${(100000).toString(36)}`);
  });

  it('names the root-selector rules, escaped for an attribute', () => {
    expect(adoptionManifest([], [], ['_ab@html%20%3E%20body']).split(';')[3]).toBe('_ab@html%20%3E%20body');
  });
});
