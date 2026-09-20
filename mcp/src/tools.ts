import { ComponentProp, ComponentRecord, acceptedValues, blockInstall, blocks, components, prop, props, rules, siteUrl } from './data';
import { declarations, written } from './engine';
import { Hit, componentsWithProp, resolveComponent, search } from './search';
import { checkStyles } from './styles';
import { nestingKey, nestingKeys, nestingKindLabel } from './vocabulary';

/**
 * What each tool answers with. Markdown rather than JSON: the caller is a model, these are read and
 * not parsed, and a table of measured CSS is the shortest thing that settles a question.
 *
 * Every number in here comes off the engine at call time. Nothing states a divider — `fontSize={14}`
 * is shown becoming `0.875rem`, which cannot drift the way a sentence about dividers can.
 */

const KIND_LABEL: Record<Hit['kind'], string> = { prop: 'prop', component: 'component', nesting: 'nesting key', rule: 'rule' };

const bullet = (hit: Hit) => `- **${hit.name}** (${KIND_LABEL[hit.kind]}) — ${hit.summary}`;

/** Joins the parts that are there. A `&&` guard on a `length` hands this a `0`, so anything but a non-empty string goes. */
const section = (...parts: (string | number | false | undefined)[]) =>
  parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join('\n\n');

/**
 * The divider, shown rather than stated. Four numbers through the engine is the whole answer to the
 * question this library's props get wrong most often, and it cannot go stale: change a divider and
 * this table changes with it.
 */
function scale(name: string): string | undefined {
  const rows = [1, 2, 4, 8].map((value) => ({ value, css: declarations(name, value) })).filter((row) => row.css);

  if (rows.length < 2) return undefined;

  return ['| written | CSS |', '| --- | --- |', ...rows.map((row) => `| \`${name}={${row.value}}\` | \`${row.css}\` |`)].join('\n');
}

/** Whether this prop takes the `/40` opacity modifier — measured, since only a colour value does. */
const takesAlpha = (name: string) => Boolean(declarations(name, 'sky-500/40'));

function valueLine(name: string): string {
  const record = prop(name);
  const values = acceptedValues(name);
  const parts: string[] = [];

  if (record?.numeric) parts.push('a number');
  if (values.length > 30) parts.push(`${values.length} named values (${values.slice(0, 12).join(', ')}, …)`);
  else if (values.length) parts.push(values.map((value) => `\`${value}\``).join(', '));
  if (!parts.length) parts.push('a value its own grammar defines — `check_styles` is the way to test one');
  if (takesAlpha(name))
    parts.push('and any of them with an opacity: `sky-500/40` → `color-mix(in oklab, var(--sky-500) 40%, transparent)`');

  return parts.join(' · ');
}

/** `search_docs` — the entry point when the caller knows the goal and not the name. */
export function searchDocs(query: string, kind?: Hit['kind'], limit?: number): string {
  const hits = search(query, { kind, limit });
  const owners = componentsWithProp(query.trim());

  if (!hits.length && !owners.length) {
    return `Nothing matched "${query}". The whole surface is ${props.length} style props, ${components.length} components and ${rules.length} rules — try a CSS property name, what the UI should do, or call \`get_rules\` with no arguments for the index.`;
  }

  return section(
    `Matches for "${query}":`,
    hits.map(bullet).join('\n'),
    owners.length > 0 &&
      `\`${query.trim()}\` is also a prop of: ${owners.map((name) => `\`${name}\``).join(', ')}. Call \`get_component\` for its type and default.`,
    'Full records: `get_props`, `get_component`, `get_rules`. To test a value, `check_styles`.',
  );
}

/** `get_props` — the record for named style props, with the scale measured rather than stated. */
export function getProps(names: string[]): string {
  return names
    .map((name) => {
      const record = prop(name);
      const nesting = nestingKey(name);

      if (!record && nesting) {
        return section(
          `## ${name} (nesting key, not a style prop)`,
          `${nestingKindLabel(nesting.kind)} → \`${nesting.compiles}\`${nesting.deprecated ? ' — **deprecated**' : ''}`,
          `It takes a block of props: \`${name}={{ … }}\`. Everything nests in either direction.`,
        );
      }

      if (!record) {
        const hits = search(name, { kind: 'prop', limit: 5 });

        return section(
          `## ${name}`,
          `No prop is called \`${name}\`.`,
          hits.length > 0 && `Closest: ${hits.map((hit) => `\`${hit.name}\``).join(', ')}.`,
        );
      }

      return section(
        `## ${record.name}`,
        `Writes \`${record.properties.join('`, `')}\`.`,
        record.description,
        `**Example, measured:** \`${written(record.name, record.example.value)}\` → \`${record.example.css}\``,
        record.numeric ? scale(record.name) : undefined,
        `**Accepts:** ${valueLine(record.name)}`,
      );
    })
    .join('\n\n---\n\n');
}

const propRows = (list: readonly ComponentProp[]) =>
  [
    '| prop | type | default | what it does |',
    '| --- | --- | --- | --- |',
    ...list.map(
      (entry) =>
        `| \`${entry.name}\`${entry.required ? ' *(required)*' : ''} | \`${entry.type}\` | ${entry.default ? `\`${entry.default}\`` : '—'} | ${oneLine(entry.description)} |`,
    ),
  ].join('\n');

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');

export type ComponentSection = 'props' | 'parts' | 'keyboard' | 'a11y' | 'styles';

/** `get_component` — one component's whole contract: props, parts, the keyboard map and the ARIA. */
export function getComponent(name: string, include?: ComponentSection[]): string {
  const record = resolveComponent(name);

  if (!record) {
    const hits = search(name, { kind: 'component', limit: 5 });

    // "No such component" would be a claim this server cannot make: it carries the two generated
    // references, and a few components (`VisuallyHidden`, the `components/svg` elements) are in
    // neither. Saying what is covered is honest; saying the component does not exist is not.
    return section(
      `No component reference here is called \`${name}\`.`,
      hits.length > 0 && `Closest: ${hits.map((hit) => `\`${hit.name}\``).join(', ')}.`,
      `The ${components.length} covered: ${components.map((entry) => entry.name).join(', ')}.`,
      `For anything else, ${siteUrl} has the page.`,
    );
  }

  const wanted = (part: ComponentSection) => !include?.length || include.includes(part);

  return section(
    `# ${record.name}`,
    record.description,
    `\`\`\`tsx\n${record.import}\n\`\`\``,
    `Docs: ${siteUrl}${record.route}${record.pattern ? ` · APG: ${record.pattern}` : ''}`,
    wanted('props') && record.props.length > 0 && section('## Props', propRows(record.props)),
    wanted('parts') &&
      record.parts?.length &&
      section(
        '## Parts',
        record.parts
          .map((part) => section(`### ${part.name}`, part.description, part.props.length ? propRows(part.props) : undefined))
          .join('\n\n'),
      ),
    wanted('keyboard') &&
      record.keyboard?.length &&
      section(
        '## Keyboard',
        [
          '| keys | what happens |',
          '| --- | --- |',
          ...record.keyboard.map((entry) => `| \`${entry.keys}\`${entry.mode ? ` (${entry.mode})` : ''} | ${oneLine(entry.action)} |`),
        ].join('\n'),
      ),
    wanted('a11y') && record.a11y?.length && section('## Accessibility', record.a11y.map((note) => `- ${note}`).join('\n')),
    wanted('styles') &&
      record.styleTree?.length &&
      section('## Style tree', `\`Box.components()\` keys: ${record.styleTree.map((key) => `\`${key}\``).join(', ')}`),
    'Every visual value on it is a Box prop — `check_styles` judges one.',
  );
}

const VERDICT_MARK = { ok: '✅', 'rejected-value': '❌', 'unknown-prop': '❌', 'html-attribute': '⚠️', reserved: 'ℹ️' } as const;

/** `check_styles` — the engine's own answer, which is the only one that counts. */
export function checkStylesTool(bag: Record<string, unknown>): string {
  const result = checkStyles(bag);

  const lines = result.checks.map((check) => {
    const head = `${VERDICT_MARK[check.verdict]} \`${check.name}\``;
    const detail = check.verdict === 'ok' ? `→ \`${check.css.replace(/\n/g, ' ')}\`` : check.note;
    const suggestions = check.suggestions?.length ? ` Try: ${check.suggestions.map((entry) => `\`${entry}\``).join(', ')}.` : '';

    return `- ${head} ${detail ?? ''}${suggestions}`;
  });

  return section(
    result.ok ? 'Every prop writes CSS.' : 'Some of these write no CSS at all — a rejected value is silent, by design.',
    lines.join('\n'),
    `Class attribute: \`${result.className}\``,
    !result.ok && 'A prop that wrote nothing renders nothing: there is no fallback and no warning. Fix it before shipping.',
  );
}

/** `get_rules` — the numbered rules, or the index of them. */
export function getRules(numbers?: number[]): string {
  if (!numbers?.length) {
    return section(
      `The ${rules.length} rules. Call \`get_rules\` with the numbers you want in full.`,
      rules.map((rule) => `${rule.number}. ${rule.heading}`).join('\n'),
    );
  }

  const wanted = numbers.map((number) => rules.find((rule) => rule.number === number));

  return wanted
    .map((rule, index) =>
      rule
        ? `## Rule ${rule.number}\n\n${rule.body}`
        : `## Rule ${numbers[index]}\n\nThere is no rule ${numbers[index]} — they run 1–${rules.length}.`,
    )
    .join('\n\n---\n\n');
}

/** `get_blocks` — F4's registry: whole sections the shadcn CLI installs, wired and compiling. */
export function getBlocks(name?: string): string {
  if (!name) {
    return section(
      'Installable blocks — whole sections, not atoms. Each one installs the package and drops working code in.',
      blocks.map((item) => `- **${item.name}** — ${item.description}\n  \`${blockInstall(item.name)}\``).join('\n'),
      'Call `get_blocks` with a name for its files and dependencies.',
    );
  }

  const item = blocks.find((entry) => entry.name === name || `@box-kite/${entry.name}` === name);

  if (!item) return `No block is called \`${name}\`. There are ${blocks.length}: ${blocks.map((entry) => entry.name).join(', ')}.`;

  return section(
    `# ${item.title}`,
    item.description,
    `\`\`\`bash\n${blockInstall(item.name)}\n\`\`\``,
    item.dependencies.length > 0 && `Installs: ${item.dependencies.map((dependency) => `\`${dependency}\``).join(', ')}.`,
    `Files: ${item.files.map((file) => `\`${file.target}\``).join(', ')}.`,
  );
}

/** Every nesting key, for the tool description's "what else can I write" — small enough to state whole. */
export const nestingSummary = (): string =>
  nestingKeys
    .filter((entry) => !entry.deprecated)
    .map((entry) => entry.key)
    .join(', ');

export type { ComponentRecord };
