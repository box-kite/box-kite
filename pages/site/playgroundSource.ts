/**
 * A docs snippet, as something the playground can run. Framework-free, and the same judgement for every
 * snippet on the site: "Open in playground" hands this exactly the string a `<Code>` block shows, so a
 * snippet that would need editing before it runs is a link not worth offering.
 *
 * The rule is read off the corpus of all 314 snippets rather than invented — a snippet is JSX, optionally
 * preceded by the setup it needs — and the *compiler* is what applies it: each candidate boundary is
 * transformed, and the first one that parses wins. A scanner of our own counted brackets but knew nothing
 * of JSX, so a multi-line opening tag whose `>` sat on its own line split the element down the middle.
 */
import type { ComponentType } from 'react';
import { importedNames, isImportLine } from './playground';
import type { PlaygroundScope } from './playgroundScope';

/** What the playground runs, and what it could not resolve on the way. */
export interface PlaygroundModule {
  /** The body of the component to render: the snippet's setup, then a `return`. TSX, not yet transformed. */
  body: string;
  /** Names the snippet imported for itself, so one the scope cannot answer is named rather than thrown. */
  imported: string[];
  /** False when there is nothing to show — an import line, a `Box.configure()` block, or an `error`. */
  renders: boolean;
  /**
   * Why nothing renders, in the compiler's own words, when the snippet plainly meant to show something.
   * Null for one that meant not to — the difference between an editor mid-keystroke and an import line.
   */
  error: string | null;
}

/**
 * The snippet with its own imports taken out and its `export`s unwrapped. Both have to go: the setup
 * becomes a function body, where neither is legal, and the scope already holds what the imports name.
 */
function prepare(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => !isImportLine(line))
    .map((line) => line.replace(/^export\s+default\s+/, '').replace(/^export\s+/, ''));
}

/**
 * A `//` line inside the fragment is *text*, not a comment — JSX children have no line comments — so the
 * docs' own asides would render as prose. Only column-0 lines are touched: an indented one is inside an
 * element, where the docs already write `{/* … *\/}`.
 */
function asJsxComments(lines: string[]): string[] {
  return lines.map((line) => (/^\/\//.test(line) ? `{/* ${line.slice(2).trim().replace(/\*\//g, '*\\/')} */}` : line));
}

/** A component the snippet declares and can be rendered with no props of its own. */
function componentToRender(lines: string[]): string | null {
  const text = lines.join('\n');
  const declared = [...text.matchAll(/^(?:function\s+([A-Z]\w*)\s*\(\s*\)|(?:const|let)\s+([A-Z]\w*)\s*=\s*\(\s*\)\s*=>)/gm)];

  // The last one declared: a snippet that builds a small component to use inside a bigger one writes them
  // in that order, and the one a reader came to see is the outer one.
  return declared.length ? (declared[declared.length - 1][1] ?? declared[declared.length - 1][2]) : null;
}

function bodyFor(setup: string[], render: string[]): string {
  const head = setup.join('\n').trim();
  const tail = render.length ? `return (\n  <>\n${asJsxComments(render).join('\n')}\n  </>\n);` : '';

  return [head, tail].filter(Boolean).join('\n\n');
}

/** The first line of a block that is not a comment — what says whether the block is JSX or code. */
function firstCodeLine(lines: string[]): string {
  return (
    lines.map((line) => line.trim()).find((line) => line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) ?? ''
  );
}

/** Blank-line-separated blocks, each one the demo or the code around it. */
function blocksOf(lines: string[]): { render: boolean; lines: string[] }[] {
  const blocks: string[][] = [[]];

  for (const line of lines) {
    if (line.trim()) blocks[blocks.length - 1].push(line);
    else if (blocks[blocks.length - 1].length) blocks.push([]);
  }

  return blocks.filter((block) => block.length).map((block) => ({ render: /^[<{]/.test(firstCodeLine(block)), lines: block }));
}

/**
 * The bodies worth trying, best first. Blocks come first because they are the only reading that survives
 * setup written *after* the demo — a `Box.components()` override under the element it restyles, which the
 * boundary scan below swallows into the fragment, where an object literal is not a JSX child (#…). The scan
 * is the fallback, and it is what covers a blank line written inside one element.
 */
function* candidates(lines: string[]): Generator<string> {
  const blocks = blocksOf(lines);

  if (blocks.some((block) => block.render)) {
    const setup = blocks.filter((block) => !block.render).flatMap((block) => [...block.lines, '']);
    const render = blocks.filter((block) => block.render).flatMap((block) => [...block.lines, '']);

    yield bodyFor(setup, render);
  }

  for (const [index, line] of lines.entries()) {
    if (/^[<{]/.test(line)) yield bodyFor(lines.slice(0, index), lines.slice(index));
  }
}

/**
 * A snippet as the body of a component. `check` is the transform the caller already has — sucrase in the
 * browser, the same in a test — returning what it did not like, which is what makes the split a judgement
 * about real syntax rather than a guess about brackets.
 *
 * The message kept is the *first* candidate's: it is the reading the snippet was most likely written as, so
 * it is the one whose complaint a reader can act on. The later candidates fail in ways nobody asked for.
 */
export default function playgroundModule(source: string, check: (tsx: string) => string | null): PlaygroundModule {
  const lines = prepare(source);
  const imported = importedNames(source);
  let first: string | null = null;

  for (const body of candidates(lines)) {
    const error = check(body);

    if (!error) return { body, imported, renders: true, error: null };

    first ??= error;
  }

  const component = componentToRender(lines);
  const body = bodyFor(lines, component ? [`<${component} />`] : []);
  const error = check(body);

  if (component && !error) return { body, imported, renders: true, error: null };

  return { body, imported, renders: false, error: first ?? error };
}

const SNIPPET_COMPONENT = '__Snippet';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A snippet as a module the compiler can parse: a top-level `return` is a syntax error on its own. */
function wrap(body: string): string {
  return `const ${SNIPPET_COMPONENT} = () => {\n${body}\n};`;
}

/** What the preview got: a component to render, a reason it has none, or nothing to show at all. */
export interface CompiledSnippet {
  /** The component the preview renders. Null when the snippet would not compile, or has nothing to show. */
  Component: ComponentType | null;
  /** The component body the snippet became — what the exported StackBlitz project puts inside its `App`. */
  body: string;
  /** The compiler's own words — the line and column a reader can go and look at. */
  error: string | null;
  /** Imports the scope cannot answer, said up front rather than left to surface as `X is not defined`. */
  unresolved: string[];
  /** False for a snippet that is an import line or a `Box.configure()` block: nothing failed, nothing renders. */
  renders: boolean;
}

/**
 * A snippet, compiled against the scope and evaluated into a component. The scope's names are the compiled
 * function's *parameters*, so a snippet reaches exactly what the checker compiled it against and nothing
 * else on the page — no globals to shadow, and a name that is missing says so by name.
 */
export function compileSnippet(source: string, scope: PlaygroundScope): CompiledSnippet {
  const check = (body: string) => {
    try {
      scope.transform(wrap(body));

      return null;
    } catch (error) {
      return messageOf(error);
    }
  };

  const module = playgroundModule(source, check);
  const { body } = module;
  const unresolved = module.imported.filter((name) => !(name in scope.values));

  if (!module.renders) return { Component: null, body, error: module.error, unresolved, renders: false };

  try {
    const compiled = scope.transform(wrap(body));
    const names = Object.keys(scope.values);
    const factory = new Function(...names, `${compiled}\nreturn ${SNIPPET_COMPONENT};`);

    return { Component: factory(...Object.values(scope.values)) as ComponentType, body, error: null, unresolved, renders: true };
  } catch (error) {
    return { Component: null, body, error: messageOf(error), unresolved, renders: false };
  }
}
