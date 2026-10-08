import ts from 'typescript';

export type JsxEl = ts.JsxElement | ts.JsxSelfClosingElement;

export const isJsxEl = (node: ts.Node): node is JsxEl => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);

export const openingOf = (el: JsxEl): ts.JsxOpeningLikeElement => (ts.isJsxElement(el) ? el.openingElement : el);

export interface Attr {
  name: string;
  node: ts.JsxAttribute;
  /** `undefined` is the bare `disabled` form, which means `true`. */
  initializer: ts.JsxAttributeValue | undefined;
}

export type AttrOrSpread = { kind: 'attr'; attr: Attr } | { kind: 'spread'; node: ts.JsxSpreadAttribute };

export function attributesOf(el: JsxEl): AttrOrSpread[] {
  return openingOf(el).attributes.properties.map((property) =>
    ts.isJsxSpreadAttribute(property)
      ? { kind: 'spread', node: property }
      : { kind: 'attr', attr: { name: property.name.getText(), node: property, initializer: property.initializer } },
  );
}

export function findAttr(el: JsxEl, name: string): Attr | undefined {
  for (const item of attributesOf(el)) if (item.kind === 'attr' && item.attr.name === name) return item.attr;

  return undefined;
}

/** The expression inside `{…}`, or the string literal itself. */
export function valueNode(attr: Attr): ts.Expression | undefined {
  const init = attr.initializer;
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) return init;
  if (ts.isJsxExpression(init)) return init.expression;

  return init;
}

export function stringValue(attr: Attr | undefined): string | undefined {
  if (!attr) return undefined;
  const node = valueNode(attr);

  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
}

export function numberValue(attr: Attr | undefined): number | undefined {
  const node = attr && valueNode(attr);
  if (!node) return undefined;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text);
  }

  return undefined;
}

export function booleanValue(attr: Attr | undefined): boolean | undefined {
  if (!attr) return undefined;
  if (!attr.initializer) return true;
  const node = valueNode(attr);
  if (node?.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node?.kind === ts.SyntaxKind.FalseKeyword) return false;

  return undefined;
}

/** Text that carries no rendering: whitespace containing a line break, which JSX drops. */
export function isBlank(child: ts.JsxChild): boolean {
  return ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces;
}

export const childrenOf = (el: JsxEl): readonly ts.JsxChild[] => (ts.isJsxElement(el) ? el.children : []);

export const meaningfulChildren = (el: JsxEl) => childrenOf(el).filter((child) => !isBlank(child) && !isEmptyExpression(child));

// An expression container holding only a comment renders nothing.
export const isEmptyExpression = (child: ts.Node) => ts.isJsxExpression(child) && !child.expression;

export const isIdentifierName = (name: string) => /^[A-Za-z_$][\w$]*$/.test(name);

/** `{ 'aria-label': x }` — a key that is not an identifier is quoted. */
export const objectKey = (name: string) => (isIdentifierName(name) ? name : `'${name}'`);

/** An attribute as JSX writes it: `name`, `name="text"` or `name={expr}`. */
export function attribute(name: string, expression: string | true): string {
  if (expression === true) return name;

  // A plain double-quoted string is written the way JSX writes one: `label="Account"`.
  return /^"[^"\\\n{}]*"$/.test(expression) ? `${name}=${expression}` : `${name}={${expression}}`;
}

export function stringAttribute(name: string, value: string): string {
  return /["\\\n]/.test(value) ? `${name}={${JSON.stringify(value)}}` : `${name}="${value}"`;
}

export function element(tag: string, attrs: readonly string[], children?: string): string {
  const open = attrs.length ? `<${tag} ${attrs.join(' ')}` : `<${tag}`;

  return children === undefined || children.trim() === '' ? `${open} />` : `${open}>${children}</${tag}>`;
}

/** Every identifier the text uses, which is how a render-prop parameter avoids shadowing (`t` is often i18n). */
export function mentions(text: string, name: string): boolean {
  return new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`).test(text);
}
