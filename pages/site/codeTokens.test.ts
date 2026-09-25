import { join } from 'node:path';
import { parser } from '@lezer/javascript';
import { describe, expect, it } from 'vitest';
import { collectDocsSnippets } from '../../scripts/docsSnippets.mjs';
import { registryClassifier } from './codeClassifier';
import { CodeLanguage, TokenKind, tokenize } from './codeTokens';
import { classifierOf } from './playgroundCompletion';
import createCompletions from './playgroundVocabulary';

const classifier = classifierOf(createCompletions().vocabulary);

/** Each token as `kind:text`, for the kinds worth asserting on. */
const read = (source: string, kinds?: TokenKind[], language: CodeLanguage = 'jsx', using = classifier) =>
  tokenize(source, language, using)
    .filter((token) => !kinds || kinds.includes(token.kind))
    .map((token) => `${token.kind}:${source.slice(token.from, token.to)}`);

describe('tokenize: JSX', () => {
  it('reads the parts of an element', () => {
    expect(read('<Flex gap={2}>Hello {name}</Flex>', ['tagBracket', 'component', 'attribute', 'number', 'text', 'variable'])).toEqual([
      'tagBracket:<',
      'component:Flex',
      'attribute:gap',
      'number:2',
      'tagBracket:>',
      'text:Hello ',
      'variable:name',
      'tagBracket:</',
      'component:Flex',
      'tagBracket:>',
    ]);
    expect(read('<div className="x" />', ['tag', 'reserved', 'attributeValue', 'tagBracket'])).toEqual([
      'tagBracket:<',
      'tag:div',
      'reserved:className',
      'attributeValue:"x"',
      'tagBracket:/>',
    ]);
  });

  it('colours a name by what the library makes of it', () => {
    expect(
      read('<Slider min={0} bgColor="sky-500" hover={{ p: 2 }} onValueChange={set} props={{}} href="/" />', [
        'componentProp',
        'attribute',
        'nesting',
        'event',
        'reserved',
        'unknown',
      ]),
    ).toEqual([
      'componentProp:min',
      'attribute:bgColor',
      'nesting:hover',
      'attribute:p',
      'event:onValueChange',
      'reserved:props',
      'unknown:href',
    ]);
  });

  it('reads the keys of a nested style object, through a theme, a record and a breakpoint', () => {
    expect(read("<Box theme={{ dark: { md: { color: 'white', colr: 'x' } } }} />", ['nesting', 'attribute', 'unknown'])).toEqual([
      'nesting:theme',
      'nesting:dark',
      'nesting:md',
      'attribute:color',
      'unknown:colr',
    ]);
    expect(read("<Box group={{ 'card/hover': { opacity: 1 } }} nth={{ odd: { p: 1 } }} />", ['nesting', 'attribute'])).toEqual([
      'nesting:group',
      'attribute:opacity',
      'nesting:nth',
      'nesting:odd',
      'attribute:p',
    ]);
  });

  it('leaves an object that is not a style object alone', () => {
    expect(read("<Box bgGradient={{ linear: 'r' }} props={{ href: '/' }} />", ['unknown', 'attribute', 'property'])).toEqual([
      'attribute:bgGradient',
      'property:linear',
      'property:href',
    ]);
  });

  it('flags an HTML attribute on an element that takes only style props, and nothing on one the catalog does not describe', () => {
    expect(read('<Link href="/about" props={{ href: "/about" }}>About</Link>', ['unknown'])).toEqual(['unknown:href']);
    // An empty reference entry (flex.json lists none of its own) still takes only style props.
    expect(read('<Flex href="/" gap={4} />', ['unknown'])).toEqual(['unknown:href']);
    expect(read('<Path d="M0 0" /><div className="x" />', ['unknown'])).toEqual([]);
  });

  it('pairs brackets by depth, JSX braces included', () => {
    expect(read('f({ a: [1] })', ['bracket1', 'bracket2', 'bracket3'])).toEqual([
      'bracket1:(',
      'bracket2:{',
      'bracket3:[',
      'bracket3:]',
      'bracket2:}',
      'bracket1:)',
    ]);
    expect(read('<Box p={f(1)} />', ['bracket1', 'bracket2'])).toEqual(['bracket1:{', 'bracket2:(', 'bracket2:)', 'bracket1:}']);
  });

  it('reads the code around the markup', () => {
    expect(
      read('const [open, setOpen] = useState(false); // why\nreturn items.map((item) => <Li key={item.id}>{item.label}</Li>);', [
        'keyword',
        'control',
        'function',
        'literal',
        'comment',
        'property',
      ]),
    ).toEqual([
      'keyword:const',
      'function:useState',
      'literal:false',
      'comment:// why',
      'control:return',
      'function:map',
      'property:id',
      'property:label',
    ]);
  });

  it('tells an element from a comparison, and a regex from a division', () => {
    expect(read('const small = width < height;', ['tagBracket', 'operator'])).toEqual(['operator:=', 'operator:<']);
    expect(read('const half = total / 2; const re = /a[/]b/g;', ['regex', 'operator'])).toEqual([
      'operator:=',
      'operator:/',
      'operator:=',
      'regex:/a[/]b/g',
    ]);
  });

  it('follows a template literal into its expression and back out', () => {
    expect(read('const a = `x ${f(1)} y`;', ['string', 'function', 'bracket1'])).toEqual([
      'string:`x ',
      'bracket1:${',
      'function:f',
      'bracket1:}',
      'string: y`',
    ]);
  });

  it('survives a snippet halfway through being typed', () => {
    expect(read('<Box p={', ['attribute', 'component'])).toEqual(['component:Box', 'attribute:p']);
    expect(() => tokenize('<Box theme={{ dark: { "', 'jsx', classifier)).not.toThrow();
    expect(() => tokenize('`${', 'jsx')).not.toThrow();
  });

  it('colours the props of a code block without the playground’s vocabulary', () => {
    expect(
      read(
        '<Box bgColor="red-500" hover={{ p: 2 }} href="/" />',
        ['attribute', 'nesting', 'componentProp', 'unknown'],
        'jsx',
        registryClassifier(),
      ),
    ).toEqual(['attribute:bgColor', 'nesting:hover', 'attribute:p', 'componentProp:href']);
  });
});

describe('tokenize: other languages', () => {
  it('reads CSS', () => {
    expect(read('/* x */\n.card:hover { color: #fff; margin: 1rem auto; --gap: 2px; }', undefined, 'css')).toEqual([
      'comment:/* x */',
      'type:.card',
      'type::hover',
      'bracket1:{',
      'property:color',
      'punctuation::',
      'number:#fff',
      'punctuation:;',
      'property:margin',
      'punctuation::',
      'number:1rem',
      'literal:auto',
      'punctuation:;',
      'variable:--gap',
      'punctuation::',
      'number:2px',
      'punctuation:;',
      'bracket1:}',
    ]);
  });

  it('reads a shell line', () => {
    expect(read('npm install -D @box-kite/react && npx box "hi" # done', undefined, 'shell')).toEqual([
      'function:npm',
      'property:-D',
      'operator:&&',
      'function:npx',
      'string:"hi"',
      'comment:# done',
    ]);
  });

  it('reads JSON', () => {
    expect(read('{ "name": "x", "n": 1, "ok": true }', ['string', 'number', 'literal'], 'json')).toEqual([
      'string:"name"',
      'string:"x"',
      'string:"n"',
      'number:1',
      'string:"ok"',
      'literal:true',
    ]);
  });
});

// ---------------------------------------------------------------------------------------------------------

const snippets = collectDocsSnippets(join(import.meta.dirname, '..', '..')).filter(
  (snippet) => snippet.check && snippet.code && ['jsx', 'javascript'].includes(snippet.language),
);

/** What Lezer's tree says a stretch of source is, for the node kinds a tokenizer can be held to. */
const ORACLE: Record<string, TokenKind[]> = {
  // Lezer reads a second top-level element as a comparison, so its attribute values come out as `String`.
  String: ['string', 'attributeValue'],
  Number: ['number'],
  LineComment: ['comment'],
  BlockComment: ['comment'],
  JSXAttributeValue: ['attributeValue'],
  BooleanLiteral: ['literal'],
};

describe('the docs corpus', () => {
  it('has snippets to check', () => {
    expect(snippets.length).toBeGreaterThan(250);
  });

  it('agrees with Lezer on every string, number, comment, literal and attribute value', () => {
    const jsx = parser.configure({ dialect: 'jsx ts' });
    const disagreements: string[] = [];

    for (const snippet of snippets) {
      const code = snippet.code!;
      const tokens = tokenize(code, 'jsx', classifier);
      const at = new Map(tokens.map((token) => [`${token.from}:${token.to}`, token.kind]));
      // Where we read a comment and Lezer a string, Lezer has misread a snippet of several top-level
      // elements (the second parses as a comparison); a comment is the reading the page means.
      const comments = tokens.filter((token) => token.kind === 'comment');
      const inComment = (from: number) => comments.some((token) => token.from <= from && from < token.to);

      jsx.parse(code).iterate({
        enter(node) {
          const wanted = ORACLE[node.name];
          if (!wanted) return;

          const kind = at.get(`${node.from}:${node.to}`);
          if (inComment(node.from)) return false;
          if (!kind || !wanted.includes(kind)) {
            disagreements.push(`${snippet.path}:${snippet.line} ${node.name} ${JSON.stringify(code.slice(node.from, node.to))} → ${kind}`);
          }

          return false;
        },
      });
    }

    expect(disagreements).toEqual([]);
  });

  it('agrees with Lezer on every tag name and attribute name', () => {
    const jsx = parser.configure({ dialect: 'jsx ts' });
    const disagreements: string[] = [];

    for (const snippet of snippets) {
      const code = snippet.code!;
      const at = new Map(tokenize(code, 'jsx', classifier).map((token) => [`${token.from}:${token.to}`, token.kind]));

      jsx.parse(code).iterate({
        enter(node) {
          if (node.name !== 'JSXIdentifier' && node.name !== 'JSXMemberExpression') return;
          const parent = node.node.parent?.name;
          if (parent === 'JSXMemberExpression') return false;

          const kind = at.get(`${node.from}:${node.to}`);
          const text = code.slice(node.from, node.to);
          const wanted: TokenKind[] =
            parent === 'JSXAttribute'
              ? ['attribute', 'nesting', 'componentProp', 'event', 'reserved']
              : /^[A-Z]|\./.test(text)
                ? ['component']
                : ['tag'];

          if (!kind || !wanted.includes(kind))
            disagreements.push(`${snippet.path}:${snippet.line} ${JSON.stringify(text)} (${parent}) → ${kind}`);

          return false;
        },
      });
    }

    expect(disagreements).toEqual([]);
  });

  it('flags no prop on a snippet the docs checker compiles', () => {
    // Every snippet here typechecks against the library, so a squiggle on one is the highlighter being wrong.
    const flagged = snippets.flatMap((snippet) =>
      read(snippet.code!, ['unknown']).map((token) => `${snippet.path}:${snippet.line} ${token}`),
    );

    expect(flagged).toEqual([]);
  });
});
