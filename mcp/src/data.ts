import rulesMarkdown from '../../.claude/rules/box-kite-rules.md?raw';
import agentsMarkdown from '../../AGENTS.md?raw';
import propsApi from '../../api/props.json';
import { name as libraryName, version as libraryVersion } from '../../package.json';
import { installCommand, registryItems, RegistryItem } from '../../pages/site/registry';
import { SITE_URL } from '../../pages/site/site';
import { createStyleEngine } from '../../src/core';
import catalogManifest from '../../src/utils/catalog/catalogManifest';

/**
 * The corpora, all of them generated somewhere else in this repository: the prop reference F3
 * measures off the engine, the component reference G4 extracts from the sources, the rules file AI3
 * installs as a skill, and F4's registry items. Nothing here is written down a second time — a
 * transcribed fact is the one an agent trusts over its priors and the one that goes stale.
 */

export interface PropExample {
  value: unknown;
  css: string;
}

export interface PropRecord {
  name: string;
  description: string;
  /** The CSS properties it writes. More than one when the prop composes (`shadow`, the filters). */
  properties: string[];
  example: PropExample;
  /** Whether a number is accepted, and whether values outside the listed set are. */
  numeric: boolean;
  open: boolean;
  /** The listed values, or a count alone where the reference cut a long list short. Numeric scales list numbers. */
  values?: (string | number)[];
  valueCount?: number;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default: string | null;
  description: string;
}

export interface ComponentPart {
  name: string;
  description: string;
  props: ComponentProp[];
}

export interface ComponentKey {
  mode: string | null;
  keys: string;
  action: string;
}

export interface ComponentRecord {
  name: string;
  route: string;
  import: string;
  description: string;
  pattern?: string;
  props: ComponentProp[];
  parts?: ComponentPart[];
  keyboard?: ComponentKey[];
  a11y?: string[];
  styleTree?: string[];
}

export interface RuleRecord {
  number: number;
  /** The bolded lead sentence — what the rule is about, without its 300 words of detail. */
  heading: string;
  body: string;
}

export const packageName = libraryName;
export const packageVersion = libraryVersion;
export const siteUrl = SITE_URL;

export const props: readonly PropRecord[] = propsApi.props as PropRecord[];

const propsByName = new Map(props.map((prop) => [prop.name, prop]));

export const prop = (name: string): PropRecord | undefined => propsByName.get(name);

const componentFiles = import.meta.glob<ComponentRecord>('../../api/components/*.json', { import: 'default', eager: true });

const documented: ComponentRecord[] = Object.values(componentFiles);

const byDocumentedName = new Set(documented.map((entry) => entry.name));

/**
 * The manifest covers the semantic elements the API pages do not — `H1`, `P`, `Ul`, `Link` and the
 * rest — so a question about one of those gets its import line rather than "no such component",
 * which is the answer that sends a model back to `<Box tag="h1">`. Where both hold a component the
 * extracted record wins: it has the parts, the keyboard map and the ARIA.
 */
const fromManifest: ComponentRecord[] = Object.entries(catalogManifest.components)
  .filter(([name]) => !byDocumentedName.has(name))
  .map(([name, entry]) => ({
    name,
    route: '/box',
    import: entry.import,
    description: entry.description,
    props: Object.entries(entry.props).map(([prop, schema]) => ({
      name: prop,
      type: String((schema as { type?: unknown }).type ?? 'unknown'),
      required: entry.required.includes(prop),
      default: null,
      description: (schema as { description?: string }).description ?? '',
    })),
  }));

export const components: readonly ComponentRecord[] = [...documented, ...fromManifest].sort((a, b) => a.name.localeCompare(b.name));

const componentsByName = new Map(components.map((entry) => [entry.name.toLowerCase(), entry]));

/** Case-insensitive, because a model asks for `datagrid` as readily as `DataGrid`. */
export const component = (name: string): ComponentRecord | undefined => componentsByName.get(name.toLowerCase().replace(/[\s_-]/g, ''));

/**
 * The rules file split on its numbered items. The heading is the run of bold text the rule opens
 * with, which is the sentence worth showing in a search result; `search_docs` ranks on the body.
 */
function splitRules(markdown: string): RuleRecord[] {
  const items = markdown.split(/\n(?=\d+\. \*\*)/).filter((chunk) => /^\d+\. \*\*/.test(chunk));

  return items.map((chunk) => {
    const number = Number(chunk.slice(0, chunk.indexOf('.')));
    const body = chunk.slice(chunk.indexOf('.') + 2).trim();
    const heading = body.match(/^\*\*(.+?)\*\*/)?.[1] ?? body.slice(0, 120);

    return { number, heading, body };
  });
}

export const rules: readonly RuleRecord[] = splitRules(rulesMarkdown);

/** The heading of the block `AGENTS.md` opens with, whose bullets are the facts a model's priors get wrong. */
const FACTS_HEADING = '## This library is not in your training data';

/**
 * Those bullets, verbatim — the server's `instructions`, which a client puts in front of the model
 * before it calls anything. `scripts/agentSources.mjs` reads the same block for `llms.txt` and the
 * skill; `data.test.ts` pins this reader to that one, because two parsers of one file is how a fact
 * comes to be stated two ways.
 */
export const priorFacts: readonly string[] = agentsMarkdown
  .slice(agentsMarkdown.indexOf(FACTS_HEADING))
  .split('\n## ')[0]
  .split('\n')
  .filter((line) => line.startsWith('- '))
  .map((line) => line.slice(2).trim());

export const blocks: readonly RegistryItem[] = registryItems;

export const blockInstall = (name: string): string => installCommand(name);

/**
 * A fresh engine with readable class names and no DOM: what `check_styles` judges a value with. One
 * per call rather than one for the process, so a caller's `vars` or `css` cannot leak into the next
 * answer through the rule registry.
 */
export const styleEngine = () => createStyleEngine({ classNames: 'readable', sink: 'string' });

/**
 * Every style prop's accepted values, live off the registry rather than out of `props.json`, which
 * cuts a list over 40 short — and a colour prop's 295 tokens are exactly the list worth having.
 */
export function acceptedValues(name: string): string[] {
  const definitions = styleEngine().getCatalogSource().styleProps[name];
  if (!definitions) return [];

  const values = definitions.flatMap((definition) =>
    Array.isArray(definition.values) ? definition.values.filter((value) => typeof value !== 'object').map(String) : [],
  );

  return [...new Set(values)];
}
