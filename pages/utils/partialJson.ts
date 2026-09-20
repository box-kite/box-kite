/**
 * Half a JSON document, read as far as it goes. `streamObject` does this for an app calling a model; the
 * docs site replays a recorded generation instead, so it needs the same thing: a prefix arrives, and what
 * can be made of it renders while the rest is still coming.
 */

/** Where a prefix stopped: the brackets still open, and whether it stopped inside a string. */
function scan(text: string) {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const character of text) {
    if (escaped) escaped = false;
    else if (character === '\\' && inString) escaped = true;
    else if (character === '"') inString = !inString;
    else if (inString) continue;
    else if (character === '{' || character === '[') stack.push(character === '{' ? '}' : ']');
    else if (character === '}' || character === ']') stack.pop();
  }

  return { stack, inString };
}

/** A prefix closed into a whole document: the open string finished, the trailing comma gone, every bracket shut. */
function close(text: string): string {
  const { stack, inString } = scan(text);
  const finished = inString ? `${text}"` : text.replace(/[\s,]+$/, '');

  // A key whose value has not arrived yet is a key with nothing after the colon.
  return (finished.endsWith(':') ? `${finished}null` : finished) + stack.reverse().join('');
}

/**
 * The value a JSON prefix carries, or `null` while it carries none. A tail that cannot be closed into
 * anything — half a number, half a keyword, a key with no colon yet — is cut back a character at a time
 * until it can be, which is at most the length of the token being written.
 */
export function parsePartialJson<T = unknown>(prefix: string): T | null {
  const trimmed = prefix.trimEnd();

  for (let end = trimmed.length; end > 0; end--) {
    try {
      return JSON.parse(close(trimmed.slice(0, end))) as T;
    } catch {
      // Not a document yet. The next character back is one closer to the end of a whole token.
    }
  }

  return null;
}

export default parsePartialJson;
