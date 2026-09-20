import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { components, packageName, packageVersion, priorFacts, props, rules } from './data';
import { checkStylesTool, getBlocks, getComponent, getProps, getRules, nestingSummary, searchDocs } from './tools';

/**
 * `@box-kite/mcp` — the retrieval channel for an agent mid-task.
 *
 * Deliberately six tools at *capability* level rather than one per document: what may I write, what
 * does this component take, and — the one no docs mirror can answer — does this value actually work.
 * The package is built from this repository, so every answer is the reference the same commit
 * generated: `api/props.json` measured off the engine, `api/components/*.json` extracted from the
 * sources, the rules file the skill installs, and the engine itself for `check_styles`.
 */

/**
 * What a client puts in front of the model before it calls anything. The facts are `AGENTS.md`'s own
 * lead block — the four a model's memory of a library with these prop names gets wrong — because an
 * agent that never calls a tool should still be told the dividers differ.
 */
export const instructions = [
  `${packageName} ${packageVersion}. This library was renamed at 1.0.0 and its prop surface nearly doubled, so a plausible-looking memory of it is a memory of a different library. Four facts:`,
  ...priorFacts.map((fact) => `- ${fact}`),
  '',
  `Before writing props, call \`search_docs\`; before believing a value, call \`check_styles\` — a value this library does not accept writes no CSS and no class name, silently. ${props.length} style props, ${components.length} components, ${rules.length} rules.`,
].join('\n');

/** The server, transport-free so a test can drive it over an in-memory pair. */
export function createServer(): McpServer {
  const server = new McpServer({ name: packageName, version: packageVersion }, { instructions });

  server.registerTool(
    'search_docs',
    {
      title: 'Search Box Kite',
      description:
        'Find the prop, component, nesting key or rule for what you are trying to build. Ranked across all four, so a goal ("fade in on mount", "sticky header", "right-to-left") finds the answer without knowing its name. Start here.',
      inputSchema: {
        query: z.string().describe('What the UI should do, a CSS property, or a name you half-remember.'),
        kind: z.enum(['prop', 'component', 'nesting', 'rule']).optional().describe('Narrow to one corpus. Leave out to search all four.'),
        limit: z.number().int().min(1).max(40).optional().describe('How many hits (default 12).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, kind, limit }) => text(searchDocs(query, kind, limit)),
  );

  server.registerTool(
    'get_props',
    {
      title: 'Box style props',
      description: `The full record for named style props: the CSS they write, every value they accept, and a measured example — plus, for a numeric prop, the scale measured at 1/2/4/8, because the dividers differ per prop (${props.length} props in all). Nesting keys are answered here too: ${nestingSummary()}.`,
      inputSchema: { names: z.array(z.string()).min(1).max(20).describe('Prop names, e.g. ["fontSize", "borderRadius", "bgColor"].') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ names }) => text(getProps(names)),
  );

  server.registerTool(
    'get_component',
    {
      title: 'Box Kite component',
      description:
        "One component's whole contract: its props and their defaults, its sub-parts, its keyboard map and the ARIA it writes. Ask before composing a Dialog, Menu, Tabs, Combobox, DataGrid or any other behaviour component — the accessible mechanics are already in it.",
      inputSchema: {
        name: z.string().describe('Component name, e.g. "Tabs", "DataGrid", "Popover". A part name works too ("Tabs.Tab").'),
        include: z
          .array(z.enum(['props', 'parts', 'keyboard', 'a11y', 'styles']))
          .optional()
          .describe('Only these sections. Leave out for all of them.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name, include }) => text(getComponent(name, include)),
  );

  server.registerTool(
    'check_styles',
    {
      title: 'Check props against the engine',
      description:
        'Run a prop bag through the real styling engine and get back the CSS each prop writes — or why it wrote none. This is the only way to be sure: an unknown prop and an unaccepted value both produce no rule and no class name, with no warning anywhere. Use it on any prop bag you were not certain about, especially numbers and colour tokens.',
      inputSchema: {
        props: z
          .record(z.string(), z.unknown())
          .describe('The props as JSON, exactly as written: {"p": 4, "bgColor": "blue-550", "hover": {"opacity": 1}}.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ props: bag }) => text(checkStylesTool(bag)),
  );

  server.registerTool(
    'get_rules',
    {
      title: 'Box Kite rules',
      description: `The ${rules.length} rules this library is written by — where the element comes from, where HTML attributes go, how a layer is anchored, how a theme scopes. With no arguments it lists all ${rules.length} headings; pass numbers for the ones you need in full.`,
      inputSchema: {
        numbers: z.array(z.number().int()).max(10).optional().describe('Rule numbers to read in full. Leave out for the index.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ numbers }) => text(getRules(numbers)),
  );

  server.registerTool(
    'get_blocks',
    {
      title: 'Installable blocks',
      description:
        'Whole sections rather than atoms — a data-grid page, a settings form, a dashboard shell — installed by the shadcn CLI, which also installs the package. Reach for one before composing a large surface by hand.',
      inputSchema: { name: z.string().optional().describe('A block name for its files and dependencies. Leave out to list them.') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => text(getBlocks(name)),
  );

  return server;
}

const text = (body: string) => ({ content: [{ type: 'text' as const, text: body }] });
