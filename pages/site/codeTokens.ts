/**
 * The site's syntax highlighting: one tokenizer for every code block and for the playground's editor, so
 * the two can never colour the same snippet differently. A lexer rather than a parser, and written here
 * rather than pulled in: it has to survive a snippet halfway through being typed, and it ships on every
 * page — Lezer's JSX grammar was 46 KB gzipped against the few this costs (Lezer checks it in the tests).
 *
 * Each token's kind is a part of the `code` style tree in `pages/extends.ts`, which is where the colours
 * live, per theme.
 */

export type TokenKind =
  | 'keyword'
  | 'control'
  | 'string'
  | 'number'
  | 'literal'
  | 'comment'
  | 'regex'
  | 'variable'
  | 'function'
  | 'property'
  | 'type'
  | 'operator'
  | 'punctuation'
  | 'bracket1'
  | 'bracket2'
  | 'bracket3'
  | 'tagBracket'
  | 'tag'
  | 'component'
  | 'text'
  | 'attribute'
  | 'attributeValue'
  | 'nesting'
  | 'componentProp'
  | 'event'
  | 'reserved'
  | 'unknown';

export const TOKEN_KINDS: readonly TokenKind[] = [
  'keyword',
  'control',
  'string',
  'number',
  'literal',
  'comment',
  'regex',
  'variable',
  'function',
  'property',
  'type',
  'operator',
  'punctuation',
  'bracket1',
  'bracket2',
  'bracket3',
  'tagBracket',
  'tag',
  'component',
  'text',
  'attribute',
  'attributeValue',
  'nesting',
  'componentProp',
  'event',
  'reserved',
  'unknown',
];

export interface Token {
  from: number;
  to: number;
  kind: TokenKind;
}

export type CodeLanguage = 'jsx' | 'javascript' | 'json' | 'css' | 'shell' | 'auto';

/** What a name on a tag, or a key in a style object, is to this library. Null where it cannot say. */
export type NameKind = 'style' | 'nesting' | 'prop' | 'event' | 'reserved' | 'unknown';

export interface Classifier {
  attribute(tag: string, name: string): NameKind | null;
  /** A key inside a nested style object: `hover={{ bgColor }}`, `theme={{ dark: { … } }}`. */
  key(name: string): NameKind | null;
  /** Whether a nesting key is keyed by names rather than props: `theme`'s themes, `cq`'s sizes, `dataAttr`'s attributes. */
  records(name: string): boolean;
}

const NAME_TOKEN: Record<NameKind, TokenKind> = {
  style: 'attribute',
  nesting: 'nesting',
  prop: 'componentProp',
  event: 'event',
  reserved: 'reserved',
  unknown: 'unknown',
};

const CONTROL = new Set([
  'if',
  'else',
  'return',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'await',
  'yield',
  'import',
  'export',
  'from',
  'default',
]);
const KEYWORD = new Set([
  'const',
  'let',
  'var',
  'function',
  'class',
  'extends',
  'new',
  'typeof',
  'instanceof',
  'in',
  'of',
  'void',
  'delete',
  'this',
  'super',
  'async',
  'interface',
  'type',
  'enum',
  'declare',
  'readonly',
  'keyof',
  'as',
  'satisfies',
  'namespace',
  'module',
  'static',
  'get',
  'set',
]);
const LITERAL = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER = /[A-Za-z0-9_$]/;
// What may stand before a `<` that opens an element, or a `/` that opens a regex, rather than an operator.
const EXPRESSION_START = new Set(['', '(', ',', '=', '?', ':', '&', '|', '{', '[', '}', ';', '!', '=>', 'return', '&&', '||', '??', '\n']);

/** Where an object literal sits: a style object, a record of names whose values are style objects, or neither. */
type Scope = 'style' | 'names' | null;

type Frame =
  | { type: 'code'; closeOn: 'none' | 'brace'; returnTo: 'tag' | 'children' | 'template' | 'code' }
  // `name` is `/` for a closing tag, and each open tag keeps its own — a nested element must not reset its parent's.
  | { type: 'tag'; name: string; attribute: string }
  | { type: 'children' };

interface ObjectFrame {
  scope: Scope;
  /** The brace depth this object's `{` opened at, so its `}` is recognised. */
  depth: number;
}

/** The tokens of `source`, in order and non-overlapping. Whatever no token covers is the block's plain colour. */
export function tokenize(source: string, language: CodeLanguage = 'jsx', classifier?: Classifier): Token[] {
  if (language === 'css') return tokenizeCss(source);
  if (language === 'shell') return tokenizeShell(source);
  if (language === 'auto') return [];

  return new ScriptLexer(source, language === 'json' ? undefined : classifier).run();
}

class ScriptLexer {
  private tokens: Token[] = [];
  private index = 0;
  private stack: Frame[] = [{ type: 'code', closeOn: 'none', returnTo: 'code' }];
  private objects: ObjectFrame[] = [];
  private braces = 0;
  private brackets = 0;
  // The last significant token's text, which is what decides `<` (element or comparison) and `/` (regex or division).
  private previous = '';
  private lineStart = true;
  private attributeScope: Scope = null;
  private attributeDepth = -1;

  constructor(
    private readonly source: string,
    private readonly classifier?: Classifier,
  ) {}

  run(): Token[] {
    const { source } = this;

    while (this.index < source.length) {
      const frame = this.stack[this.stack.length - 1];
      const before = this.index;

      if (frame.type === 'tag') this.tag();
      else if (frame.type === 'children') this.children();
      else this.code(frame);

      // A character nothing claimed is plain text; move on rather than loop.
      if (this.index === before) this.index += 1;
    }

    return this.tokens;
  }

  private push(from: number, to: number, kind: TokenKind) {
    if (to > from) this.tokens.push({ from, to, kind });
  }

  private skipWhitespace(): boolean {
    const start = this.index;
    while (this.index < this.source.length && /\s/.test(this.source[this.index])) {
      if (this.source[this.index] === '\n') this.lineStart = true;
      this.index += 1;
    }

    return this.index > start;
  }

  private readWhile(pattern: RegExp): string {
    const start = this.index;
    while (this.index < this.source.length && pattern.test(this.source[this.index])) this.index += 1;

    return this.source.slice(start, this.index);
  }

  private nextSignificant(from: number): string {
    let at = from;
    while (at < this.source.length && /[ \t]/.test(this.source[at])) at += 1;

    return this.source[at] ?? '';
  }

  private string(quote: string, kind: TokenKind) {
    const start = this.index;
    this.index += 1;

    while (this.index < this.source.length) {
      const character = this.source[this.index];
      if (character === '\\') this.index += 2;
      else if (character === quote) {
        this.index += 1;
        break;
      } else if (character === '\n' && quote !== '`') break;
      else this.index += 1;
    }
    this.push(start, this.index, kind);
  }

  private openBracket(from: number, text: string) {
    this.push(from, from + text.length, `bracket${(this.brackets % 3) + 1}` as TokenKind);
    this.brackets += 1;
  }

  private closeBracket(from: number, text: string) {
    this.brackets = Math.max(0, this.brackets - 1);
    this.push(from, from + text.length, `bracket${(this.brackets % 3) + 1}` as TokenKind);
  }

  // ---- JavaScript -----------------------------------------------------------------------------------

  private code(frame: Extract<Frame, { type: 'code' }>) {
    const { source } = this;
    if (this.skipWhitespace()) return;

    const start = this.index;
    const character = source[start];
    const next = source[start + 1] ?? '';

    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', start);
      this.index = end < 0 ? source.length : end;
      this.push(start, this.index, 'comment');
      return;
    }
    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', start + 2);
      this.index = end < 0 ? source.length : end + 2;
      this.push(start, this.index, 'comment');
      return;
    }

    const expressionStart = this.lineStart || EXPRESSION_START.has(this.previous) || CONTROL.has(this.previous);
    this.lineStart = false;

    if (character === '"' || character === "'") {
      const object = this.objects[this.objects.length - 1];
      const key = object?.depth === this.braces && (this.previous === '{' || this.previous === ',');
      this.string(character, 'string');
      if (key && this.nextSignificant(this.index) === ':') this.lastKey = this.source.slice(start + 1, this.index - 1);
      this.previous = 'string';
      return;
    }
    if (character === '`') return this.template();

    if (character === '<' && expressionStart && /[A-Za-z>]/.test(next)) {
      this.stack.push({ type: 'tag', name: '', attribute: '' });
      this.push(start, start + 1, 'tagBracket');
      this.index += 1;
      return;
    }

    if (character === '/' && expressionStart) return this.regex();

    if (/[0-9]/.test(character) || (character === '.' && /[0-9]/.test(next))) {
      this.readWhile(/[0-9a-fA-FxXoObBn_.eE]/);
      this.push(start, this.index, 'number');
      this.previous = 'number';
      return;
    }

    if (IDENTIFIER_START.test(character)) return this.identifier(start);

    if (character === '{') {
      this.openBracket(start, '{');
      this.index += 1;
      this.braces += 1;
      this.objects.push({ scope: this.scopeForObject(), depth: this.braces });
      this.previous = '{';
      return;
    }
    if (character === '}') {
      this.closeBracket(start, '}');
      this.index += 1;
      const object = this.objects[this.objects.length - 1];
      if (object?.depth === this.braces) this.objects.pop();
      this.braces -= 1;
      this.previous = '}';

      // The brace that ends an attribute's expression, a child expression, or a template's `${}`.
      if (frame.closeOn === 'brace' && this.braces === this.frameBraces()) {
        this.stack.pop();
        this.frameStarts.pop();
        if (frame.returnTo === 'template') this.template(true);
      }
      return;
    }
    if (character === '(' || character === '[') {
      this.openBracket(start, character);
      this.index += 1;
      this.previous = character;
      return;
    }
    if (character === ')' || character === ']') {
      this.closeBracket(start, character);
      this.index += 1;
      this.previous = character;
      return;
    }

    const operator = source.slice(start).match(/^(=>|\?\?=?|\.\.\.|===?|!==?|<=|>=|&&=?|\|\|=?|\*\*|[+\-*/%]=?|[<>]=?|[=!&|^~?])/);
    if (operator) {
      this.index += operator[0].length;
      this.push(start, this.index, 'operator');
      this.previous = operator[0];
      return;
    }

    if (/[.,;:]/.test(character)) {
      this.index += 1;
      this.push(start, this.index, 'punctuation');
      this.previous = character;
    }
  }

  /** How many braces were open when the innermost brace-closed code frame began. */
  private frameStarts: number[] = [];

  private frameBraces(): number {
    return this.frameStarts[this.frameStarts.length - 1] ?? 0;
  }

  private pushCode(returnTo: 'tag' | 'children' | 'template') {
    this.stack.push({ type: 'code', closeOn: 'brace', returnTo });
    this.frameStarts.push(this.braces);
  }

  private identifier(start: number) {
    const word = this.readWhile(IDENTIFIER);
    const after = this.nextSignificant(this.index);
    const object = this.objects[this.objects.length - 1];
    const inKeyPosition = object && object.depth === this.braces && (this.previous === '{' || this.previous === ',') && after === ':';

    let kind: TokenKind;
    if (inKeyPosition) kind = this.keyKind(word, object.scope);
    else if (this.previous === '.') kind = after === '(' ? 'function' : 'property';
    else if (LITERAL.has(word)) kind = 'literal';
    else if (CONTROL.has(word)) kind = 'control';
    else if (KEYWORD.has(word)) kind = 'keyword';
    else if (after === '(') kind = 'function';
    else if (/^[A-Z]/.test(word)) kind = 'type';
    else kind = 'variable';

    this.push(start, this.index, kind);
    this.previous = CONTROL.has(word) || word === 'return' ? word : 'identifier';
    if (inKeyPosition) this.lastKey = word;
  }

  private lastKey = '';

  private keyKind(name: string, scope: Scope): TokenKind {
    if (scope === 'names') return 'nesting';
    if (scope === 'style' && this.classifier) {
      const kind = this.classifier.key(name);

      return kind ? NAME_TOKEN[kind] : 'unknown';
    }

    return 'property';
  }

  /** What an object opening here is: the value of a nesting prop, or of a nesting key inside a style object. */
  private scopeForObject(): Scope {
    const classifier = this.classifier;
    if (!classifier) return null;

    const parent = this.objects[this.objects.length - 1];
    // The first `{` inside an attribute's braces: `hover={{`. `braces` already counts this one.
    if (this.attributeDepth >= 0 && this.braces === this.attributeDepth + 1 && this.previous === '{') {
      const scope = this.attributeScope;
      this.attributeDepth = -1;

      return scope;
    }
    if (!parent || this.previous !== ':') return null;
    if (parent.scope === 'names') return 'style';
    if (parent.scope !== 'style' || classifier.key(this.lastKey) !== 'nesting') return null;

    return classifier.records(this.lastKey) ? 'names' : 'style';
  }

  private template(resume = false) {
    const { source } = this;
    const start = this.index;
    if (!resume) this.index += 1;

    while (this.index < source.length) {
      const character = source[this.index];
      if (character === '\\') this.index += 2;
      else if (character === '`') {
        this.index += 1;
        break;
      } else if (character === '$' && source[this.index + 1] === '{') {
        this.push(start, this.index, 'string');
        this.openBracket(this.index, '${');
        this.index += 2;
        this.pushCode('template');
        this.braces += 1;
        this.previous = '{';
        return;
      } else this.index += 1;
    }
    this.push(start, this.index, 'string');
    this.previous = 'string';
  }

  private regex() {
    const { source } = this;
    const start = this.index;
    let inClass = false;
    this.index += 1;

    while (this.index < source.length && source[this.index] !== '\n') {
      const character = source[this.index];
      if (character === '\\') this.index += 1;
      else if (character === '[') inClass = true;
      else if (character === ']') inClass = false;
      else if (character === '/' && !inClass) {
        this.index += 1;
        this.readWhile(/[a-z]/);
        this.push(start, this.index, 'regex');
        this.previous = 'regex';
        return;
      }
      this.index += 1;
    }
    // No closing slash on the line: it was division after all.
    this.index = start + 1;
    this.push(start, this.index, 'operator');
    this.previous = '/';
  }

  // ---- JSX ------------------------------------------------------------------------------------------

  private tag() {
    const { source } = this;
    if (this.skipWhitespace()) return;

    const frame = this.stack[this.stack.length - 1] as Extract<Frame, { type: 'tag' }>;
    const start = this.index;
    const character = source[start];

    // A comment between attributes is legal JSX: `before={{ … }} // ::before`.
    if (character === '/' && source[start + 1] === '/') {
      const end = source.indexOf('\n', start);
      this.index = end < 0 ? source.length : end;
      this.push(start, this.index, 'comment');
      return;
    }

    if (character === '/' && source[start + 1] === '>') {
      this.index += 2;
      this.push(start, this.index, 'tagBracket');
      this.stack.pop();
      this.previous = '>';
      return;
    }
    if (character === '>') {
      this.index += 1;
      this.push(start, this.index, 'tagBracket');
      this.stack.pop();
      // A fragment's `<>` and an element's `>` both open children; a closing tag's `>` does not.
      if (frame.name !== '/') this.stack.push({ type: 'children' });
      this.previous = '>';
      return;
    }
    if (character === '/' && frame.name === '') {
      this.index += 1;
      this.push(start, this.index, 'tagBracket');
      frame.name = '/';
      return;
    }
    if (character === '/' && source[start + 1] === '*') {
      const end = source.indexOf('*/', start + 2);
      this.index = end < 0 ? source.length : end + 2;
      this.push(start, this.index, 'comment');
      return;
    }

    if (/[A-Za-z_$]/.test(character) && (frame.name === '' || frame.name === '/')) {
      const closing = frame.name === '/';
      const name = this.readWhile(/[A-Za-z0-9_$.:-]/);
      this.push(start, this.index, /^[A-Z]/.test(name) || name.includes('.') ? 'component' : 'tag');
      frame.name = closing ? '/' : name;
      return;
    }

    if (/[A-Za-z_$]/.test(character)) {
      const name = this.readWhile(/[A-Za-z0-9_$:-]/);
      const kind = this.classifier?.attribute(frame.name, name);
      this.push(start, this.index, kind ? NAME_TOKEN[kind] : 'attribute');
      frame.attribute = name;
      return;
    }

    // A type argument on the element itself: `<DataGrid<Person>`.
    if (character === '<' && frame.name !== '' && frame.name !== '/') {
      const end = source.indexOf('>', start);
      this.index = end < 0 ? source.length : end + 1;
      this.push(start, start + 1, 'punctuation');
      const inner = source.slice(start + 1, this.index - 1);
      for (const match of inner.matchAll(/[A-Za-z_$][\w$]*/g))
        this.push(start + 1 + match.index, start + 1 + match.index + match[0].length, 'type');
      this.push(this.index - 1, this.index, 'punctuation');
      return;
    }

    if (character === '=') {
      this.index += 1;
      this.push(start, this.index, 'operator');
      return;
    }
    if (character === '"' || character === "'") {
      this.string(character, 'attributeValue');
      return;
    }
    if (character === '{') {
      // An attribute's expression, or a spread; both are code until their brace closes.
      const kind = this.classifier?.attribute(frame.name, frame.attribute) ?? null;
      this.attributeScope = kind === 'nesting' ? (this.classifier!.records(frame.attribute) ? 'names' : 'style') : null;
      this.openBracket(start, '{');
      this.index += 1;
      this.pushCode('tag');
      this.braces += 1;
      this.attributeDepth = this.braces;
      this.previous = '{';
      frame.attribute = '';
    }
  }

  private children() {
    const { source } = this;
    const start = this.index;
    const character = source[start];

    if (character === '{') {
      this.openBracket(start, '{');
      this.index += 1;
      this.pushCode('children');
      this.braces += 1;
      this.previous = '{';
      return;
    }
    if (character === '<' && source[start + 1] === '/') {
      // The children end here; the closing tag is a tag of its own.
      this.stack.pop();
      this.stack.push({ type: 'tag', name: '/', attribute: '' });
      this.push(start, start + 2, 'tagBracket');
      this.index += 2;
      return;
    }
    if (character === '<') {
      this.stack.push({ type: 'tag', name: '', attribute: '' });
      this.push(start, start + 1, 'tagBracket');
      this.index += 1;
      return;
    }

    const text = this.readWhile(/[^{<]/);
    // Whitespace between elements is layout, not text; a run with a glyph in it is text, edges and all.
    if (text.trim()) this.push(start, this.index, 'text');
  }
}

// ---- CSS --------------------------------------------------------------------------------------------

function tokenizeCss(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let depth = 0;
  // Inside a block, before the colon: a property. After it: a value. Outside every block: a selector.
  let inValue = false;
  const push = (from: number, to: number, kind: TokenKind) => to > from && tokens.push({ from, to, kind });

  while (index < source.length) {
    const start = index;
    const character = source[index];
    const rest = source.slice(index);

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (rest.startsWith('/*')) {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      push(start, index, 'comment');
      continue;
    }
    if (character === '"' || character === "'") {
      const end = source.indexOf(character, index + 1);
      index = end < 0 ? source.length : end + 1;
      push(start, index, 'string');
      continue;
    }
    if (character === '{' || character === '}') {
      if (character === '}') depth = Math.max(0, depth - 1);
      push(start, start + 1, `bracket${(depth % 3) + 1}` as TokenKind);
      if (character === '{') depth += 1;
      inValue = false;
      index += 1;
      continue;
    }
    if (character === ';' || character === ',' || character === '(' || character === ')') {
      if (character === ';') inValue = false;
      push(start, start + 1, 'punctuation');
      index += 1;
      continue;
    }
    if (character === ':' && depth > 0 && !inValue) {
      inValue = true;
      push(start, start + 1, 'punctuation');
      index += 1;
      continue;
    }

    const at = rest.match(/^@[\w-]+/);
    if (at) {
      index += at[0].length;
      push(start, index, 'control');
      continue;
    }
    const color = rest.match(/^#[0-9a-fA-F]{3,8}\b/);
    if (color && (inValue || depth === 0)) {
      index += color[0].length;
      push(start, index, 'number');
      continue;
    }
    const number = rest.match(/^-?\d*\.?\d+(%|[a-z]+)?/);
    if (number && inValue) {
      index += number[0].length;
      push(start, index, 'number');
      continue;
    }

    const word = rest.match(/^[\w-]+/) ?? rest.match(/^[.#:]+[\w-]*/) ?? rest.match(/^\S/)!;
    index += word[0].length;
    const text = word[0];

    if (depth === 0 || (!inValue && /^[.#:&]/.test(text)) || (!inValue && source.slice(index).match(/^[^;:{}]*\{/))) {
      push(start, index, /^[.#:]/.test(text) ? 'type' : 'tag');
    } else if (!inValue) {
      push(start, index, text.startsWith('--') ? 'variable' : 'property');
    } else if (text.startsWith('--')) {
      push(start, index, 'variable');
    } else if (source[index] === '(') {
      push(start, index, 'function');
    } else if (/^[\w-]+$/.test(text)) {
      push(start, index, 'literal');
    }
  }

  return tokens;
}

// ---- Shell ------------------------------------------------------------------------------------------

function tokenizeShell(source: string): Token[] {
  const tokens: Token[] = [];
  const push = (from: number, to: number, kind: TokenKind) => to > from && tokens.push({ from, to, kind });
  let offset = 0;

  for (const line of source.split('\n')) {
    let index = 0;
    // The first word of a line, or of a command after `|`, `&&` or `;`, is the command.
    let command = true;

    while (index < line.length) {
      const start = index;
      const character = line[index];
      const rest = line.slice(index);

      if (/\s/.test(character)) {
        index += 1;
        continue;
      }
      if (character === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
        push(offset + index, offset + line.length, 'comment');
        break;
      }
      if (character === '$' && index === 0 && line[1] === ' ') {
        push(offset, offset + 1, 'punctuation');
        index += 1;
        continue;
      }
      if (character === '"' || character === "'") {
        const end = line.indexOf(character, index + 1);
        index = end < 0 ? line.length : end + 1;
        push(offset + start, offset + index, 'string');
        command = false;
        continue;
      }
      const operator = rest.match(/^(&&|\|\||[|;>&<])/);
      if (operator) {
        index += operator[0].length;
        push(offset + start, offset + index, 'operator');
        command = operator[0] !== '>' && operator[0] !== '<';
        continue;
      }
      const variable = rest.match(/^\$\{?[\w]+\}?/);
      if (variable) {
        index += variable[0].length;
        push(offset + start, offset + index, 'variable');
        continue;
      }

      const word = rest.match(/^[^\s|;&<>"']+/)![0];
      index += word.length;
      if (command) push(offset + start, offset + index, 'function');
      else if (word.startsWith('-')) push(offset + start, offset + index, 'property');
      command = false;
    }
    offset += line.length + 1;
  }

  return tokens;
}
