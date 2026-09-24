/**
 * The playground's highlighting, VS Code style: a Lezer tree for the syntax, and the completion vocabulary
 * for what only this library knows — that `bgColor` is a style prop, `hover` nests, `href` on a `Link`
 * is dropped. Lezer rather than an AST parser because the text being edited is invalid most of the time,
 * and Lezer's tree survives that where Babel's or TypeScript's would throw or give up.
 */
import type { SyntaxNode } from '@lezer/common';
import { parser } from '@lezer/javascript';

export type TokenKind =
  | 'keyword'
  | 'control'
  | 'string'
  | 'number'
  | 'literal'
  | 'comment'
  | 'variable'
  | 'function'
  | 'property'
  | 'type'
  | 'operator'
  | 'bracket0'
  | 'bracket1'
  | 'bracket2'
  | 'tagPunctuation'
  | 'tag'
  | 'component'
  | 'text'
  | 'styleProp'
  | 'nestingProp'
  | 'componentProp'
  | 'event'
  | 'reserved'
  | 'unknownProp';

export interface Token {
  from: number;
  to: number;
  kind: TokenKind;
}

/** What a name on a tag, or a key in a style object, is to this library. Null where it does not know the tag. */
export type NameKind = 'style' | 'nesting' | 'prop' | 'event' | 'reserved' | 'unknown';

export interface Classifier {
  attribute(tag: string, name: string): NameKind | null;
  /** A key inside a nested style object: `hover={{ bgColor }}`, `theme={{ dark: { … } }}`. */
  key(name: string): NameKind | null;
  /** Whether a nesting key is keyed by names rather than props: `theme`'s themes, `cq`'s sizes, `dataAttr`'s attributes. */
  records(name: string): boolean;
}

const jsx = parser.configure({ dialect: 'jsx ts' });

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
const LITERAL = new Set(['BooleanLiteral', 'null', 'undefined', 'this', 'super']);
const OPEN = new Set(['{', '(', '[']);
const CLOSE = new Set(['}', ')', ']']);

const NAME_TOKEN: Record<NameKind, TokenKind> = {
  style: 'styleProp',
  nesting: 'nestingProp',
  prop: 'componentProp',
  event: 'event',
  reserved: 'reserved',
  unknown: 'unknownProp',
};

/** The element name an attribute belongs to, read off its tag: `Tabs.Tab` for a member expression. */
function tagName(attribute: SyntaxNode, source: string): string {
  const tag = attribute.parent;
  const name = tag?.getChild('JSXIdentifier') ?? tag?.getChild('JSXMemberExpression') ?? tag?.getChild('JSXNamespacedName');

  return name ? source.slice(name.from, name.to) : '';
}

/**
 * Whether an object literal is a style object — the value of a nesting prop on a tag, or of a nesting key
 * inside another style object — or a record of names whose values are (`theme`, `cq`, `dataAttr`).
 */
function styleScope(object: SyntaxNode, source: string, classifier: Classifier): 'style' | 'names' | null {
  const holder = object.parent;
  if (holder?.name === 'JSXEscape' && holder.parent?.name === 'JSXAttribute') {
    const attribute = holder.parent;
    const name = attribute.firstChild ? source.slice(attribute.firstChild.from, attribute.firstChild.to) : '';
    const kind = classifier.attribute(tagName(attribute, source), name) ?? classifier.key(name);
    if (kind !== 'nesting') return null;

    return classifier.records(name) ? 'names' : 'style';
  }
  if (holder?.name !== 'Property') return null;

  const key = holder.getChild('PropertyDefinition');
  const parentObject = holder.parent;
  if (!key || parentObject?.name !== 'ObjectExpression') return null;

  const scope = styleScope(parentObject, source, classifier);
  if (scope === 'names') return 'style';
  if (scope !== 'style') return null;

  const name = source.slice(key.from, key.to);
  if (classifier.key(name) !== 'nesting') return null;

  return classifier.records(name) ? 'names' : 'style';
}

function leafKind(node: SyntaxNode, source: string, classifier: Classifier | undefined): TokenKind | null {
  const { name } = node;
  const parent = node.parent;

  if (name === 'LineComment' || name === 'BlockComment') return 'comment';
  if (name === 'String' || name === 'TemplateString' || name === 'JSXAttributeValue') return 'string';
  if (name === 'Number') return 'number';
  if (LITERAL.has(name)) return 'literal';
  if (name === 'JSXText') return 'text';
  if (name === 'JSXStartTag' || name === 'JSXEndTag' || name === 'JSXSelfCloseEndTag' || name === 'JSXStartCloseTag')
    return 'tagPunctuation';

  if (name === 'JSXIdentifier') {
    if (parent?.name === 'JSXAttribute') {
      if (!classifier) return 'styleProp';
      const kind = classifier.attribute(tagName(parent, source), source.slice(node.from, node.to));

      return kind ? NAME_TOKEN[kind] : 'styleProp';
    }

    return /^[A-Z]/.test(source.slice(node.from, node.to)) || parent?.name === 'JSXMemberExpression' ? 'component' : 'tag';
  }

  if (name === 'PropertyDefinition' && classifier && parent?.parent?.name === 'ObjectExpression') {
    const scope = styleScope(parent.parent, source, classifier);
    if (scope === 'names') return 'nestingProp';
    if (scope === 'style') {
      const kind = classifier.key(source.slice(node.from, node.to));

      return kind ? NAME_TOKEN[kind] : 'unknownProp';
    }
  }

  if (name === 'VariableName' || name === 'VariableDefinition') {
    if (parent?.name === 'CallExpression' || parent?.name === 'FunctionDeclaration') return 'function';
    if (/^[A-Z]/.test(source.slice(node.from, node.to))) return 'type';

    return 'variable';
  }
  if (name === 'PropertyName' || name === 'PropertyDefinition')
    return parent?.name === 'MemberExpression' && parent.parent?.name === 'CallExpression' ? 'function' : 'property';
  if (name === 'TypeName' || name === 'TypeDefinition') return 'type';
  if (name === 'Arrow' || name === 'Equals' || name === 'ArithOp' || name === 'LogicOp' || name === 'CompareOp' || name === 'Spread')
    return 'operator';
  if (OPEN.has(name) || CLOSE.has(name)) return 'bracket0';

  // A keyword is a node named after its own text: `const`, `return`, `=>`'s neighbours.
  if (/^[a-z]+$/.test(name) && source.slice(node.from, node.to) === name) return CONTROL.has(name) ? 'control' : 'keyword';

  return null;
}

/** Every coloured stretch of `source`, in order, with the brackets paired by depth the way VS Code pairs them. */
export function tokenize(source: string, classifier?: Classifier): Token[] {
  const tokens: Token[] = [];
  const cursor = jsx.parse(source).cursor();
  let depth = 0;

  do {
    const node = cursor.node;
    // A string or a comment is one token, whatever the grammar nests inside it.
    const whole =
      node.name === 'String' || node.name === 'TemplateString' || node.name === 'JSXAttributeValue' || node.name.endsWith('Comment');
    if (node.firstChild && !whole) continue;

    const kind = leafKind(node, source, classifier);
    if (!kind || node.from === node.to) continue;

    if (kind === 'bracket0') {
      const text = source.slice(node.from, node.to);
      if (CLOSE.has(text)) depth = Math.max(0, depth - 1);
      tokens.push({ from: node.from, to: node.to, kind: `bracket${depth % 3}` as TokenKind });
      if (OPEN.has(text)) depth += 1;
      continue;
    }

    tokens.push({ from: node.from, to: node.to, kind });
  } while (nextLeaf(cursor));

  return tokens;
}

/** Depth-first, but past a string or a comment rather than into it. */
function nextLeaf(cursor: ReturnType<ReturnType<typeof jsx.parse>['cursor']>): boolean {
  const { name } = cursor;
  const whole = name === 'String' || name === 'TemplateString' || name === 'JSXAttributeValue' || name.endsWith('Comment');
  if (!whole && cursor.firstChild()) return true;

  do {
    if (cursor.nextSibling()) return true;
  } while (cursor.parent());

  return false;
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The source as markup, each token a span carrying the class `classes` gives its kind. */
export function toHtml(source: string, tokens: readonly Token[], classes: Readonly<Record<TokenKind, string>>): string {
  let html = '';
  let at = 0;

  for (const token of tokens) {
    if (token.from < at) continue;
    html += escapeHtml(source.slice(at, token.from));
    html += `<span class="${classes[token.kind]}">${escapeHtml(source.slice(token.from, token.to))}</span>`;
    at = token.to;
  }

  return html + escapeHtml(source.slice(at));
}
