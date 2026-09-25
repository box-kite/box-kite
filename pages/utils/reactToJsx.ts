import { Children, isValidElement, ReactNode } from 'react';

interface Options {
  indent?: number;
  maxInlineProps?: number;
}

export default function reactToJsx(node: ReactNode, options: Options = {}): string {
  const { indent = 0, maxInlineProps = 3 } = options;
  const spaces = '  '.repeat(indent);

  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string') {
    return node.trim() ? `${spaces}${node.trim()}` : '';
  }

  if (typeof node === 'number') {
    return `${spaces}{${node}}`;
  }

  if (Array.isArray(node)) {
    return node
      .map((child) => reactToJsx(child, { ...options, indent }))
      .filter(Boolean)
      .join('\n');
  }

  if (!isValidElement(node)) {
    return '';
  }

  const { type, props } = node;

  // Get component name
  let tagName: string;
  if (typeof type === 'string') {
    tagName = type;
  } else if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string };
    tagName = fn.displayName || fn.name || 'Unknown';
  } else if (typeof type === 'object' && type !== null) {
    // Handle forwardRef, memo, etc.
    const typeObj = type as { displayName?: string; name?: string; render?: { displayName?: string; name?: string } };
    tagName = typeObj.displayName || typeObj.name || typeObj.render?.displayName || typeObj.render?.name || 'Unknown';
  } else {
    tagName = 'Unknown';
  }

  // Process props — React 19 types ReactElement.props as `unknown`.
  const { children, ...restProps } = props as { children?: ReactNode } & Record<string, unknown>;
  const propEntries = Object.entries(restProps).filter(([key]) => !key.startsWith('__'));

  const propsString = propEntries
    .map(([key, value]) => formatProp(key, value))
    .filter(Boolean)
    .join(' ');

  // Process children
  const childrenArray = Children.toArray(children);
  const hasChildren = childrenArray.length > 0;

  // Determine if we should use multiline format
  const useMultiline = propEntries.length > maxInlineProps || propsString.length > 60;

  if (!hasChildren) {
    // Self-closing tag
    if (useMultiline) {
      const formattedProps = propEntries
        .map(([key, value]) => `${spaces}  ${formatProp(key, value)}`)
        .filter(Boolean)
        .join('\n');
      return `${spaces}<${tagName}\n${formattedProps}\n${spaces}/>`;
    }
    return `${spaces}<${tagName}${propsString ? ' ' + propsString : ''} />`;
  }

  // With children
  const childrenString = childrenArray
    .map((child) => reactToJsx(child, { ...options, indent: indent + 1 }))
    .filter(Boolean)
    .join('\n');

  // Check if children is simple text
  const isSimpleText = childrenArray.length === 1 && typeof childrenArray[0] === 'string';

  if (isSimpleText && !useMultiline) {
    return `${spaces}<${tagName}${propsString ? ' ' + propsString : ''}>${childrenArray[0]}</${tagName}>`;
  }

  if (useMultiline) {
    const formattedProps = propEntries
      .map(([key, value]) => `${spaces}  ${formatProp(key, value)}`)
      .filter(Boolean)
      .join('\n');
    return `${spaces}<${tagName}\n${formattedProps}\n${spaces}>\n${childrenString}\n${spaces}</${tagName}>`;
  }

  return `${spaces}<${tagName}${propsString ? ' ' + propsString : ''}>\n${childrenString}\n${spaces}</${tagName}>`;
}

function formatProp(key: string, value: unknown): string {
  if (value === undefined) return '';

  // Boolean true can be shorthand
  if (value === true) return key;

  // Boolean false
  if (value === false) return `${key}={false}`;

  // String
  if (typeof value === 'string') return `${key}="${value}"`;

  // Number
  if (typeof value === 'number') return `${key}={${value}}`;

  // A function's source is whatever the bundler made of it — readable in the prerender, minified in the
  // browser — so printing it put two different snippets on one page and Copy handed over the minified one.
  if (typeof value === 'function') return `${key}={() => {}}`;

  // Array
  if (Array.isArray(value)) {
    const simple = JSON.stringify(value);
    if (simple.length < 40) return `${key}={${simple}}`;
    return `${key}={[...]}`;
  }

  // Object (including style, nested props like hover, theme, etc.)
  if (typeof value === 'object' && value !== null) {
    return `${key}={${formatObject(value)}}`;
  }

  return `${key}={${JSON.stringify(value)}}`;
}

function formatObject(obj: object, depth = 0): string {
  if (depth > 2) return '{ ... }';

  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';

  const parts = entries.map(([k, v]) => {
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${k}'`;

    if (v === undefined) return '';
    if (v === null) return `${key}: null`;
    if (typeof v === 'string') return `${key}: '${v}'`;
    if (typeof v === 'number' || typeof v === 'boolean') return `${key}: ${v}`;
    if (typeof v === 'function') return `${key}: () => {}`;
    if (Array.isArray(v)) return `${key}: ${JSON.stringify(v)}`;
    if (typeof v === 'object') return `${key}: ${formatObject(v, depth + 1)}`;
    return `${key}: ${JSON.stringify(v)}`;
  });

  const inner = parts.filter(Boolean).join(', ');

  // Keep short objects on one line
  if (inner.length < 50) return `{ ${inner} }`;

  return `{ ${inner} }`;
}
