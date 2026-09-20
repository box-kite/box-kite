import { acceptedValues, prop, props, styleEngine } from './data';
import { measure, written } from './engine';
import { attributeNames, nestingKey, reservedProps } from './vocabulary';

/**
 * `check_styles`: the answer an agent cannot get from prose. A value this library does not accept
 * produces **no rule and no class name** — silently, by design — so the only honest way to say
 * whether `bgColor="blue-550"` works is to hand it to the engine and look at what came back.
 *
 * Each prop is measured on its own, because one bag would let a rejected value hide behind an
 * accepted one in the same class list.
 */

export type Verdict = 'ok' | 'rejected-value' | 'unknown-prop' | 'html-attribute' | 'reserved';

export interface PropCheck {
  name: string;
  verdict: Verdict;
  /** The rules this prop wrote, at-rules included. Empty unless `ok`. */
  css: string;
  /** What to do about it, when the verdict is not `ok`. */
  note?: string;
  /** Prop names worth trying instead, closest first. */
  suggestions?: string[];
}

export interface StyleCheck {
  checks: PropCheck[];
  /** The class attribute the whole bag resolves to — what `<Box {...props}>` would render. */
  className: string;
  ok: boolean;
}

/**
 * What the writer meant. The commonest miss is not a typo but the CSS property itself — `padding`,
 * `backgroundColor`, `marginTop` — and an edit distance never finds `p` from `padding`, so the first
 * question is which props *write* the property that name spells. A typo falls through to the second.
 */
function nearest(name: string): string[] {
  const property = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const writers = props.filter((candidate) => candidate.properties.includes(property)).map((candidate) => candidate.name);
  if (writers.length) return writers.slice(0, 4);

  const target = name.toLowerCase();

  return props
    .map((candidate) => ({ name: candidate.name, distance: distance(target, candidate.name.toLowerCase()) }))
    .filter((candidate) => candidate.distance <= Math.max(2, Math.floor(target.length / 3)))
    .sort((a, b) => a.distance - b.distance || a.name.length - b.name.length)
    .slice(0, 4)
    .map((candidate) => candidate.name);
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }

  return row[b.length];
}

/** The props whose CSS property this one also writes — what a name a model half-remembers usually meant. */
function writingSameProperty(name: string): string[] {
  const properties = new Set(prop(name)?.properties ?? []);
  if (!properties.size) return [];

  return props
    .filter((other) => other.name !== name && other.properties.some((property) => properties.has(property)))
    .map((other) => other.name);
}

const HTML_ATTRIBUTE = (name: string) =>
  attributeNames.has(name) || name.startsWith('data-') || name.startsWith('aria-') || /^on[A-Z]/.test(name);

function checkOne(name: string, value: unknown): PropCheck {
  if (name in reservedProps) return { name, verdict: 'reserved', css: '', note: reservedProps[name] };

  const nesting = nestingKey(name);
  const record = prop(name);

  if (!record && !nesting) {
    if (HTML_ATTRIBUTE(name)) {
      return {
        name,
        verdict: 'html-attribute',
        css: '',
        note: `an HTML attribute, not a style prop. Written at the top level it typechecks and is then dropped — it goes in \`props={{ ${JSON.stringify(name)}: … }}\`.`,
      };
    }

    const suggestions = nearest(name);

    return {
      name,
      verdict: 'unknown-prop',
      css: '',
      note: `no prop of that name.${suggestions.length ? '' : ' Call `search_docs` with what it should do.'}`,
      ...(suggestions.length ? { suggestions } : {}),
    };
  }

  const { css, classNames } = measure(name, value);
  if (classNames.length && css) return { name, verdict: 'ok', css };

  if (nesting) {
    return {
      name,
      verdict: 'rejected-value',
      css: '',
      note: `nests, and this block wrote nothing. It takes props of its own (\`${name}={{ … }}\`), and a key its grammar rejects drops the whole block rather than one entry.`,
    };
  }

  const values = acceptedValues(name);
  const listed =
    values.length > 12 ? `${values.slice(0, 12).join(', ')}, … (${values.length} in all — call \`get_props\`)` : values.join(', ');
  const accepts = [record?.numeric ? 'a number' : '', listed].filter(Boolean).join(', ') || 'values its own grammar defines';
  const sameProperty = writingSameProperty(name);

  return {
    name,
    verdict: 'rejected-value',
    css: '',
    note: `does not accept ${written(name, value).slice(name.length + 1)} — no rule and no class name were written. It takes ${accepts}.`,
    ...(sameProperty.length > 0 && sameProperty.length <= 6 ? { suggestions: sameProperty } : {}),
  };
}

/** Judge a whole prop bag: one verdict per prop, plus the class attribute the bag as a whole resolves to. */
export function checkStyles(bag: Record<string, unknown>): StyleCheck {
  const checks = Object.entries(bag).map(([name, value]) => checkOne(name, value));
  const stylable = Object.fromEntries(Object.entries(bag).filter(([name]) => !(name in reservedProps)));

  return {
    checks,
    className: styleEngine().classNames(stylable),
    ok: checks.every((check) => check.verdict === 'ok' || check.verdict === 'reserved'),
  };
}
