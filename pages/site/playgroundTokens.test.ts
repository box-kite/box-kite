import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectDocsSnippets } from '../../scripts/docsSnippets.mjs';
import { classifierOf } from './playgroundCompletion';
import { completionContext } from './playgroundContext';
import { TokenKind, tokenize, toHtml } from './playgroundTokens';
import createCompletions from './playgroundVocabulary';

const classifier = classifierOf(createCompletions().vocabulary);

/** Each token as `kind:text`, for the ones worth asserting on. */
const read = (source: string, kinds?: TokenKind[]) =>
  tokenize(source, classifier)
    .filter((token) => !kinds || kinds.includes(token.kind))
    .map((token) => `${token.kind}:${source.slice(token.from, token.to)}`);

describe('tokenize', () => {
  it('colours a name by what the library makes of it', () => {
    expect(
      read('<Slider min={0} bgColor="sky-500" hover={{ p: 2 }} onValueChange={set} props={{}} href="/" />', [
        'componentProp',
        'styleProp',
        'nestingProp',
        'event',
        'reserved',
        'unknownProp',
      ]),
    ).toEqual([
      'componentProp:min',
      'styleProp:bgColor',
      'nestingProp:hover',
      'styleProp:p',
      'event:onValueChange',
      'reserved:props',
      'unknownProp:href',
    ]);
  });

  it('reads the keys of a nested style object, through a theme and a breakpoint', () => {
    expect(read("<Box theme={{ dark: { md: { color: 'white', colr: 'x' } } }} />", ['nestingProp', 'styleProp', 'unknownProp'])).toEqual([
      'nestingProp:theme',
      'nestingProp:dark',
      'nestingProp:md',
      'styleProp:color',
      'unknownProp:colr',
    ]);
  });

  it('leaves an object that is not a style object alone', () => {
    expect(read("<Box bgGradient={{ linear: 'r' }} props={{ href: '/' }} />", ['unknownProp', 'styleProp'])).toEqual([
      'styleProp:bgGradient',
    ]);
  });

  it('flags an HTML attribute on an element that takes only style props', () => {
    expect(read('<Link href="/about" props={{ href: "/about" }}>About</Link>', ['unknownProp'])).toEqual(['unknownProp:href']);
  });

  it('flags nothing on a tag the catalog does not describe', () => {
    expect(read('<Path d="M0 0" /><div className="x" />', ['unknownProp'])).toEqual([]);
  });

  it('pairs brackets by depth', () => {
    expect(read('f({ a: [1] })', ['bracket0', 'bracket1', 'bracket2'])).toEqual([
      'bracket0:(',
      'bracket1:{',
      'bracket2:[',
      'bracket2:]',
      'bracket1:}',
      'bracket0:)',
    ]);
  });

  it('survives a snippet halfway through being typed', () => {
    expect(read('<Box p={', ['styleProp', 'component'])).toEqual(['component:Box', 'styleProp:p']);
    expect(() => tokenize('<Box theme={{ dark: { "')).not.toThrow();
  });
});

describe('toHtml', () => {
  it('escapes the text and loses none of it', () => {
    const source = '<Box p={4}>a < b && c</Box>';
    const html = toHtml(source, tokenize(source), new Proxy({} as Record<TokenKind, string>, { get: (_, kind) => String(kind) }));
    const text = html
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    expect(text).toBe(source);
    expect(html).toContain('<span class="component">Box</span>');
  });
});

describe('the docs corpus', () => {
  const snippets = collectDocsSnippets(join(import.meta.dirname, '..', '..')).filter(
    (snippet) => snippet.check && snippet.code && /[<{]/.test(snippet.code),
  );

  it('flags no prop on a snippet the docs checker compiles', () => {
    // Every snippet here typechecks against the library, so a squiggle on one is the highlighter being wrong.
    const flagged = snippets.flatMap((snippet) =>
      read(snippet.code!, ['unknownProp']).map((token) => `${snippet.path}:${snippet.line} ${token}`),
    );

    expect(flagged).toEqual([]);
  });

  it('reads a context at every caret position of every snippet without throwing', () => {
    let contexts = 0;

    for (const { code } of snippets) {
      for (let caret = 0; caret <= code!.length; caret += 1) if (completionContext(code!, caret)) contexts += 1;
    }

    expect(contexts).toBeGreaterThan(10_000);
  });
});
