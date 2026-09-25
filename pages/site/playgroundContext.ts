/**
 * Where the caret is, as the completion popup reads it: typing a component's name, a prop's name, a key
 * inside a nested style object, or a value. A scanner over the snippet up to the caret rather than a
 * parser, because the text being completed is by definition not valid yet — `<Flex bgC` parses as nothing.
 */

/** Where the text being completed sits, and what the popup replaces when a suggestion is taken. */
export interface Span {
  from: number;
  to: number;
}

/**
 * How a value is written where the caret is. `string` is inside quotes, `expression` inside a prop's
 * braces, `bare` an object value with no quote yet, `none` straight after `=` with nothing typed.
 */
export type ValueForm = 'string' | 'expression' | 'bare' | 'none';

export type CompletionContext =
  | ({ kind: 'tag'; query: string } & Span)
  | ({ kind: 'attribute'; tag: string; query: string; present: string[] } & Span)
  | ({ kind: 'key'; tag: string; path: string[]; query: string; present: string[] } & Span)
  | ({
      kind: 'value';
      tag: string;
      /** The props that lead here: `['hover', 'bgColor']` for `hover={{ bgColor: '…' }}`. The last is the one valued. */
      path: string[];
      /** In an attribute, or inside a nested style object — which decides how a string is quoted. */
      site: 'attribute' | 'object';
      form: ValueForm;
      query: string;
      /** The whole written value, quotes or braces included: what a suggestion of another type replaces. */
      outer: Span;
    } & Span);

type Frame =
  | { type: 'code' }
  | { type: 'children' }
  | {
      type: 'tag';
      name: string;
      nameStart: number;
      state: 'name' | 'space' | 'attr' | 'eq';
      attrStart: number;
      attr: string;
      present: string[];
    }
  | { type: 'attrString'; tag: string; attr: string; quote: string; start: number }
  | { type: 'expression'; tag: string; attr: string; start: number; objectSeen: boolean }
  | {
      type: 'object';
      tag: string;
      path: string[];
      state: 'key' | 'value';
      key: string;
      keyStart: number;
      valueStart: number;
      /** `(` and `[` opened inside the current entry, so a comma in `colors: ['a', 'b']` ends nothing. */
      nest: number;
      present: string[];
    }
  | { type: 'block' }
  | { type: 'string'; quote: string; start: number; owner: 'key' | 'value' | 'code' };

const IDENTIFIER = /[A-Za-z0-9_$]/;
const TAG_NAME = /[A-Za-z0-9_.$-]/;
const ATTRIBUTE = /[A-Za-z0-9_:-]/;
const VALUE_TOKEN = /[A-Za-z0-9_./%-]/;
// What may stand before a `<` that opens an element rather than compares: `a < b` is a comparison.
const BEFORE_ELEMENT = new Set(['', '(', ',', '=', '?', ':', '&', '|', '{', '[', '}', '>', ';', '\n']);

const scanWhile = (source: string, from: number, pattern: RegExp) => {
  let index = from;
  while (index < source.length && pattern.test(source[index])) index += 1;

  return index;
};

/**
 * The closing quote of a string opened before `from`. One that is not there yet — the reader has just
 * typed the opening quote — ends the value at the token instead, or the rest of the line would be replaced.
 */
function stringEnd(source: string, from: number, quote: string): number {
  const close = source.indexOf(quote, from);
  const between = close < 0 ? '' : source.slice(from, close);
  if (close >= 0 && !/[\n=<>{}]/.test(between)) return close;

  return scanWhile(source, from, VALUE_TOKEN);
}

/** The brace closing an expression opened before `from`, counting the ones opened after it. */
function braceEnd(source: string, from: number): number {
  let depth = 0;

  for (let index = from; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] !== '}') continue;
    if (depth === 0) return index;
    depth -= 1;
  }

  return source.length;
}

/** The completion context at `caret`, or null where nothing can be completed (children text, a function body). */
export function completionContext(source: string, caret: number): CompletionContext | null {
  const stack: Frame[] = [{ type: 'code' }];
  // The last character outside whitespace, which is what tells an element's `<` from a comparison's.
  let previous = '';
  let lineStart = true;

  const top = () => stack[stack.length - 1];

  for (let index = 0; index < caret; index += 1) {
    const character = source[index];
    const frame = top();

    if (frame.type === 'string') {
      if (character === '\\') index += 1;
      else if (character === frame.quote || (character === '\n' && frame.quote !== '`')) {
        stack.pop();
        const parent = top();
        if (frame.owner === 'key' && parent.type === 'object') parent.key = source.slice(frame.start + 1, index);
      }
      continue;
    }

    if (frame.type === 'attrString') {
      if (character === frame.quote) {
        stack.pop();
        const tag = top();
        if (tag.type === 'tag') tag.state = 'space';
      }
      continue;
    }

    if (frame.type === 'tag') {
      if (frame.state === 'name' && TAG_NAME.test(character)) continue;
      if (frame.state === 'name') frame.name = source.slice(frame.nameStart, index);

      if (frame.state === 'attr') {
        if (ATTRIBUTE.test(character)) continue;

        frame.attr = source.slice(frame.attrStart, index);
        frame.present.push(frame.attr);
        frame.state = character === '=' ? 'eq' : 'space';
        if (character === '=') continue;
      }

      if (frame.state === 'eq') {
        if (/\s/.test(character)) continue;
        if (character === '"' || character === "'") {
          stack.push({ type: 'attrString', tag: frame.name, attr: frame.attr, quote: character, start: index });
          continue;
        }
        if (character === '{') {
          stack.push({ type: 'expression', tag: frame.name, attr: frame.attr, start: index, objectSeen: false });
          previous = character;
          continue;
        }
        frame.state = 'space';
      }

      if (character === '>') {
        stack.pop();
        if (source[index - 1] !== '/') stack.push({ type: 'children' });
        previous = '>';
        continue;
      }
      if (character === '/' && source[index + 1] === '*') {
        const end = source.indexOf('*/', index + 2);
        index = end < 0 ? caret : end + 1;
        frame.state = 'space';
        continue;
      }
      if (character === '{') {
        // A spread, `{...rest}`: code until its brace closes, and then more attributes.
        stack.push({ type: 'block' });
        previous = character;
        continue;
      }
      if (/[A-Za-z_$]/.test(character)) {
        frame.state = 'attr';
        frame.attrStart = index;
        continue;
      }
      frame.state = 'space';
      continue;
    }

    if (frame.type === 'children') {
      if (character === '{') {
        stack.push({ type: 'block' });
        previous = character;
      } else if (character === '<' && source[index + 1] === '/') {
        index = Math.min(source.indexOf('>', index) < 0 ? caret : source.indexOf('>', index), caret);
        stack.pop();
        previous = '>';
      } else if (character === '<' && /[A-Za-z]/.test(source[index + 1] ?? '')) {
        stack.push({ type: 'tag', name: '', nameStart: index + 1, state: 'name', attrStart: 0, attr: '', present: [] });
      }
      continue;
    }

    // Code: the top level, an attribute's expression, a nested style object, or a block of neither.
    if (character === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index);
      index = end < 0 ? caret : end - 1;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? caret : end + 1;
      continue;
    }

    if (character === '\n') lineStart = true;
    if (/\s/.test(character)) continue;

    const opensElement =
      character === '<' &&
      /[A-Za-z]/.test(source[index + 1] ?? '') &&
      (lineStart || BEFORE_ELEMENT.has(previous) || (frame.type === 'expression' && !frame.objectSeen));
    lineStart = false;

    if (frame.type === 'expression' && !frame.objectSeen && character !== '}') {
      frame.objectSeen = true;
      if (character === '{') {
        stack.push({
          type: 'object',
          tag: frame.tag,
          path: [frame.attr],
          state: 'key',
          key: '',
          keyStart: -1,
          valueStart: -1,
          nest: 0,
          present: [],
        });
        previous = character;
        continue;
      }
    }

    if (frame.type === 'object') {
      if (frame.state === 'key') {
        if (character === '"' || character === "'") {
          stack.push({ type: 'string', quote: character, start: index, owner: 'key' });
        } else if (IDENTIFIER.test(character)) {
          if (frame.keyStart < 0) frame.keyStart = index;
          const end = scanWhile(source, index, IDENTIFIER);
          if (end >= caret) break;
          frame.key = source.slice(frame.keyStart, end);
          index = end - 1;
        } else if (character === ':') {
          frame.present.push(frame.key);
          frame.state = 'value';
          frame.valueStart = -1;
        } else if (character === '}') {
          stack.pop();
        } else if (character === ',') {
          frame.keyStart = -1;
          frame.key = '';
        }
        previous = character;
        continue;
      }

      // An entry's value.
      if (frame.nest === 0 && character === ',') {
        frame.state = 'key';
        frame.keyStart = -1;
        frame.key = '';
        previous = character;
        continue;
      }
      if (frame.nest === 0 && character === '}') {
        stack.pop();
        previous = character;
        continue;
      }
      if (frame.valueStart < 0) frame.valueStart = index;
      if (character === '{' && frame.nest === 0 && frame.valueStart === index) {
        stack.push({
          type: 'object',
          tag: frame.tag,
          path: [...frame.path, frame.key],
          state: 'key',
          key: '',
          keyStart: -1,
          valueStart: -1,
          nest: 0,
          present: [],
        });
        previous = character;
        continue;
      }
      if (character === '(' || character === '[') frame.nest += 1;
      if (character === ')' || character === ']') frame.nest -= 1;
    }

    if (character === '"' || character === "'" || character === '`') {
      stack.push({ type: 'string', quote: character, start: index, owner: frame.type === 'object' ? 'value' : 'code' });
    } else if (opensElement) {
      stack.push({ type: 'tag', name: '', nameStart: index + 1, state: 'name', attrStart: 0, attr: '', present: [] });
    } else if (character === '{' && frame.type === 'object') {
      frame.nest += 1;
    } else if (character === '{') {
      stack.push({ type: 'block' });
    } else if (character === '}' && frame.type === 'object') {
      frame.nest -= 1;
    } else if (character === '}' && stack.length > 1) {
      stack.pop();
      const parent = top();
      if (frame.type === 'expression' && parent.type === 'tag') parent.state = 'space';
    }
    previous = character;
  }

  return contextOf(source, caret, top(), stack);
}

function contextOf(source: string, caret: number, frame: Frame, stack: Frame[]): CompletionContext | null {
  if (frame.type === 'tag') {
    if (frame.state === 'name') {
      return { kind: 'tag', from: frame.nameStart, to: scanWhile(source, caret, TAG_NAME), query: source.slice(frame.nameStart, caret) };
    }
    if (frame.state === 'eq') {
      const outer = { from: caret, to: caret };

      return { kind: 'value', tag: frame.name, path: [frame.attr], site: 'attribute', form: 'none', query: '', ...outer, outer };
    }

    const from = frame.state === 'attr' ? frame.attrStart : caret;
    const present = frame.present.slice();

    return { kind: 'attribute', tag: frame.name, from, to: scanWhile(source, caret, ATTRIBUTE), query: source.slice(from, caret), present };
  }

  if (frame.type === 'attrString') {
    const to = stringEnd(source, caret, frame.quote);
    const outer = { from: frame.start, to: source[to] === frame.quote ? to + 1 : to };

    return {
      kind: 'value',
      tag: frame.tag,
      path: [frame.attr],
      site: 'attribute',
      form: 'string',
      from: frame.start + 1,
      to,
      query: source.slice(frame.start + 1, caret),
      outer,
    };
  }

  if (frame.type === 'expression') {
    const end = braceEnd(source, caret);
    const written = source.slice(frame.start + 1, end);
    // Only a value being typed: a function or a variable in the braces is somebody's code, not a query.
    if (!/^\s*-?[A-Za-z0-9_.]*\s*$/.test(written)) return null;

    const outer = { from: frame.start, to: source[end] === '}' ? end + 1 : end };

    return {
      kind: 'value',
      tag: frame.tag,
      path: [frame.attr],
      site: 'attribute',
      form: 'expression',
      from: frame.start + 1,
      to: end,
      query: source.slice(frame.start + 1, caret).trim(),
      outer,
    };
  }

  if (frame.type === 'object') {
    if (frame.state === 'key') {
      const from = frame.keyStart >= 0 ? frame.keyStart : caret;
      const query = source.slice(from, caret);
      if (!/^[A-Za-z0-9_$]*$/.test(query)) return null;

      return {
        kind: 'key',
        tag: frame.tag,
        path: frame.path,
        from,
        to: scanWhile(source, caret, IDENTIFIER),
        query,
        present: frame.present.slice(),
      };
    }

    const from = frame.valueStart >= 0 ? frame.valueStart : caret;
    const query = source.slice(from, caret);
    if (!/^-?[A-Za-z0-9_./%-]*$/.test(query)) return null;

    const to = scanWhile(source, caret, VALUE_TOKEN);
    const path = [...frame.path, frame.key];

    return { kind: 'value', tag: frame.tag, path, site: 'object', form: 'bare', from, to, query, outer: { from, to } };
  }

  if (frame.type === 'string' && frame.owner === 'value') {
    const parent = stack[stack.length - 2];
    if (parent?.type !== 'object') return null;

    const to = stringEnd(source, caret, frame.quote);
    const outer = { from: frame.start, to: source[to] === frame.quote ? to + 1 : to };

    return {
      kind: 'value',
      tag: parent.tag,
      path: [...parent.path, parent.key],
      site: 'object',
      form: 'string',
      from: frame.start + 1,
      to,
      query: source.slice(frame.start + 1, caret),
      outer,
    };
  }

  return null;
}
