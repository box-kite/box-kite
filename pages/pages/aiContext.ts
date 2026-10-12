import { createStyleEngine } from '../../src/core';
import Diagnostics from '../../src/core/diagnostics';
import type { BoxStyleProps } from '../../src/types';
import { MCP_SERVER } from './start';

/**
 * What /ai-context offers before it explains anything: the one-click installs, and `check_styles` run in the
 * reader's own tab. Kept out of the page so `aiContext.test.ts` can hold the links and the verdicts to the real thing.
 */

const [MCP_COMMAND, ...MCP_ARGS] = MCP_SERVER.split(' ');

/** Cursor's MCP install link: the server's `mcp.json` entry, base64'd, with the name beside it. */
export const CURSOR_INSTALL_URL = `cursor://anysphere.cursor-deeplink/mcp/install?name=box-kite&config=${btoa(
  JSON.stringify({ command: MCP_COMMAND, args: MCP_ARGS }),
)}`;

/** VS Code's: the object `code --add-mcp` takes, URL-encoded. */
export const VSCODE_INSTALL_URL = `vscode:mcp/install?${encodeURIComponent(
  JSON.stringify({ name: 'box-kite', command: MCP_COMMAND, args: MCP_ARGS }),
)}`;

export type Verdict = 'ok' | 'misread' | 'rejected' | 'attribute' | 'unknown';

export interface PropCheck {
  name: string;
  /** The prop as JSX writes it, which is how the row is labelled. */
  written: string;
  verdict: Verdict;
  /** The rules it wrote — empty unless `ok` or `misread`. */
  css: string;
  note?: string;
}

export type Parsed = { ok: true; props: [string, unknown][] } | { ok: false; error: string };

/** The starting bag: one prop of each verdict, so the first thing a reader sees is all four answers. */
export const CHECK_EXAMPLES = [
  { label: 'Common mistakes', source: '<Box p={4} bgColor="bleu-500" fontSize={4} href="/pricing" />' },
  { label: 'The divider trap', source: '<Box p={4} fontSize={4} lineHeight={1.5} transitionDuration={0.3} />' },
  { label: 'Nested states', source: '<Box bgColor="indigo-500/80" hover={{ bgColor: \'indigo-600\' }} md={{ px: 8 }} />' },
  { label: 'All correct', source: '<Box p={4} borderRadius={2} bgColor="white" shadow="md" fontSize={14} />' },
] as const;

const NAME = /[A-Za-z_][\w-]*/y;

/**
 * JSX attributes into a prop bag, as far as a style prop needs: strings, numbers, booleans and object literals.
 * A whole `<Box … />` is accepted too, since that is what a reader pastes.
 */
export function parseProps(source: string): Parsed {
  const text = unwrap(source);
  const props: [string, unknown][] = [];
  let index = 0;

  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }

    NAME.lastIndex = index;
    const name = NAME.exec(text)?.[0];
    if (!name) return { ok: false, error: `Expected a prop name at “${text.slice(index, index + 12)}”.` };
    index += name.length;

    if (text[index] !== '=') {
      props.push([name, true]);
      continue;
    }
    index += 1;

    const quote = text[index];
    if (quote === '"' || quote === "'") {
      const end = text.indexOf(quote, index + 1);
      if (end < 0) return { ok: false, error: `The value of ${name} has no closing quote.` };
      props.push([name, text.slice(index + 1, end)]);
      index = end + 1;
      continue;
    }

    if (quote !== '{') return { ok: false, error: `The value of ${name} goes in quotes or braces.` };
    const end = closingBrace(text, index);
    if (end < 0) return { ok: false, error: `The braces after ${name} do not close.` };

    const value = expression(text.slice(index + 1, end));
    if (value === undefined) return { ok: false, error: `The value of ${name} is not a literal this checker can read.` };
    props.push([name, value]);
    index = end + 1;
  }

  return { ok: true, props };
}

/** The checked props as a playground snippet, where the same bag renders and every rule it wrote is listed. */
export function playgroundSnippet(source: string): string {
  const attributes = unwrap(source).replace(/\s+/g, ' ').trim();

  return `<Box ${attributes}>\n  Edit a prop and watch the CSS\n</Box>`;
}

const unwrap = (source: string) =>
  source
    .trim()
    .replace(/^<[A-Za-z][\w.]*/, '')
    .replace(/\/?>$/, '');

/** The brace matching the one at `start`, skipping any inside a string. */
function closingBrace(text: string, start: number): number {
  let depth = 0;
  let quote = '';

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return index;
  }

  return -1;
}

/** A JS literal read as JSON once its keys are quoted and its quotes are double. */
function expression(source: string): unknown {
  const text = source.trim();
  if (/^-?\d*\.?\d+$/.test(text)) return Number(text);

  try {
    return JSON.parse(
      text
        .replace(/'([^']*)'/g, (_, inner: string) => JSON.stringify(inner))
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
        .replace(/,\s*([}\]])/g, '$1'),
    );
  } catch {
    return undefined;
  }
}

const engineOptions = { classNames: 'readable', sink: 'string', styleElementId: 'ai-context-probe', warnings: false } as const;

/** Top-level rules, by brace depth: an at-rule block keeps the rules nested in it. */
function splitRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] !== '}' || --depth > 0) continue;

    rules.push(css.slice(start, index + 1).trim());
    start = index + 1;
  }

  return rules.filter(Boolean);
}

let baseRules: Set<string> | undefined;

/** What one prop writes, on an engine of its own so nothing it adds hides behind another prop's rule. */
function measure(name: string, value: unknown): string {
  const engine = createStyleEngine(engineOptions);
  baseRules ??= new Set(splitRules(engine.getStyles()));
  engine.classNames({ [name]: value } as BoxStyleProps);

  return splitRules(engine.getStyles())
    .filter((rule) => !baseRules!.has(rule) && !rule.startsWith(':root'))
    .join('\n');
}

/** The verdicts `check_styles` gives, from the same engine and the same diagnostics the console prints. */
export function checkProps(props: [string, unknown][]): PropCheck[] {
  const definitions = createStyleEngine(engineOptions).getCatalogSource().styleProps;

  return props.map(([name, value]) => {
    // A nested block as JSON is noise in a row label; its CSS says what it was.
    const written = typeof value === 'object' && value !== null ? `${name}={{…}}` : Diagnostics.written(name, value);
    const attribute = Diagnostics.attribute(name);
    if (attribute) return { name, written, verdict: 'attribute', css: '', note: attribute };

    const css = measure(name, value);
    if (css) {
      const misread = Diagnostics.misread(name, value);

      return misread ? { name, written, verdict: 'misread', css, note: misread } : { name, written, verdict: 'ok', css };
    }

    const known = definitions[name];
    if (!known && (typeof value !== 'object' || value === null)) {
      return { name, written, verdict: 'unknown', css: '', note: `${name} is not a Box prop, so it wrote nothing.` };
    }

    return { name, written, verdict: 'rejected', css: '', note: Diagnostics.rejected(name, value, known) };
  });
}

/** Questions people search for before they install, answered in a sentence or two each. */
export const FAQ = [
  {
    question: 'Which AI coding agents does it work with?',
    answer:
      'Any agent that reads AGENTS.md, installs an Agent Skill or speaks MCP — Claude Code, Cursor, GitHub Copilot in VS Code, Codex, Windsurf, Cline, Zed and Gemini CLI among them.',
  },
  {
    question: 'Does the MCP server need an API key or a network connection?',
    answer:
      'No. It runs locally over stdio through npx, with the references and the style engine built into the package, so nothing leaves your machine.',
  },
  {
    question: 'AGENTS.md, the skill or the MCP server — which one do I need?',
    answer:
      'They compose. AGENTS.md or the skill gives the agent the rules up front; the MCP server answers the questions that come up mid-task, like whether a value it just wrote produced any CSS. Most setups use a rules file and the server.',
  },
  {
    question: 'Will the instructions go out of date?',
    answer:
      'They ship inside the package and are generated from the prop registry during the build, so the version you install describes exactly the code you installed.',
  },
  {
    question: 'Does it work in an existing project?',
    answer:
      'Yes. Install @box-kite/react, add the server and a rules file, and it works beside whatever styling the project already has — Box writes its own classes and needs no stylesheet or build plugin.',
  },
  {
    question: 'Is it free?',
    answer: 'Yes. Box Kite, its skill and its MCP server are open source under the MIT licence.',
  },
] as const;
