/**
 * The catalog: every component a generated UI may name, and every value its props may take. Two sources
 * meet here and neither could do it alone — the **engine** says what a prop accepts (so an `extend()` prop
 * is in the catalog with no build step) and the **manifest** says what it means (so `fontSize` carries its
 * divider, which no registry entry knows). Framework-free, because a catalog is a model.
 */
import { BoxStyle } from '../coreTypes';
import { Components } from '../extends/boxComponents';
import * as CatalogSchemas from './catalogSchema';
import { BoxCatalog, CatalogComponent, CatalogContract, CatalogManifest, CatalogOptions, CatalogSchema } from './catalogTypes';

/** The format's own version. Bumped when the shape changes, never when the library's props do. */
const VERSION = 1;

/**
 * What a JSON Schema cannot say and a prompt has to. Every one of them is a number whose unit is the
 * prop's own — the single most expensive thing for a generator to get wrong, since a wrong divider still
 * validates and still renders.
 */
const RULES = [
  'Spacing, sizing, gap, borderRadius and the inset props divide by 4: p={4} is 1rem (16px).',
  'fontSize divides by 16: fontSize={14} is 14px. Border widths and lineHeight are direct pixels: b={1} is 1px.',
  'Animation and transition times are milliseconds: transitionDuration={200}. SVG lengths carry no unit at all.',
  'A colour is a palette token, optionally with an opacity: bgColor="blue-500/40". Nothing else is a colour.',
  'HTML attributes go in the props prop: props={{ href: "/about" }}. There is no style attribute.',
];

/** Every style-tree node a host may restyle, as the dotted paths `Box.components()` takes. */
function styleTree(components: Components, path = ''): string[] {
  return Object.entries(components).flatMap(([name, component]) => {
    const node = path ? `${path}.${name}` : name;

    return [node, ...(component.children ? styleTree(component.children, node) : [])];
  });
}

/** What the engine and the generated manifest bring between them. */
export interface CatalogSource {
  /** The live prop registry, `Box.extend()` included. */
  styleProps: Readonly<Record<string, BoxStyle[]>>;
  /** Every colour name a colour prop accepts: the palette, plus the variables `Box.extend()` declared. */
  colors: string[];
  /** The `@keyframes` sequences registered on this engine. */
  animations: string[];
  componentStyles: Components;
  manifest: CatalogManifest;
  /** The object props no extraction could describe, by component name. See `CatalogContract`. */
  contracts?: Record<string, CatalogContract>;
}

/** The style props one call allows, in registry order so two catalogs of the same set read the same. */
function selected(styleProps: Readonly<Record<string, BoxStyle[]>>, allowed: CatalogOptions['styleProps']): string[] {
  if (allowed === false) return [];
  if (allowed === undefined || allowed === true) return Object.keys(styleProps);

  return Object.keys(styleProps).filter((name) => allowed.includes(name));
}

/** Where a component's colour props point, rather than each carrying the whole palette grammar again. */
const COLOR_REF = '#/$defs/color';

function component(name: string, source: CatalogSource, styleProps: string[], schemas: Map<string, CatalogSchema>): CatalogComponent {
  const entry = source.manifest.components[name];
  const contract = source.contracts?.[name];
  // A contract describes what the extraction had to drop, so it wins the name it shares with anything.
  const properties: Record<string, CatalogSchema> = { ...entry.props, ...contract?.props };
  const required = [...new Set([...entry.required, ...(contract?.required ?? [])])];
  let colors = false;

  // The component's own props are declared first and win a name collision: `Rect`'s `width` is an SVG
  // attribute and Box's is the layout scale, and the component is the one that settled that.
  if (entry.styled) {
    for (const prop of styleProps) {
      if (prop in properties) continue;

      const description = source.manifest.props[prop];

      if (CatalogSchemas.isColor(source.styleProps[prop])) {
        colors = true;
        properties[prop] = { $ref: COLOR_REF, ...(description ? { description } : {}) };
        continue;
      }

      // Built once and shared by every component that takes it: a prop's schema does not depend on which
      // component carries it, and building all 221 of them for each of the 78 was most of the work here.
      if (!schemas.has(prop)) schemas.set(prop, CatalogSchemas.styleProp(source.styleProps[prop], description));

      properties[prop] = schemas.get(prop)!;
    }
  }

  return {
    description: entry.description,
    import: entry.import,
    slots: entry.slots,
    events: entry.events,
    props: {
      type: 'object',
      // Local to the component, so its props schema is still one self-contained document — which is what
      // makes handing it to `z.fromJSONSchema` or a structured-output API a single call.
      ...(colors ? { $defs: { color: CatalogSchemas.color(source.colors) } } : {}),
      properties,
      ...(required.length ? { required } : {}),
      // Strict, so a structured-output API can take the schema as it stands and an invented prop is a
      // validation failure rather than a prop silently dropped at render.
      additionalProperties: false,
    },
  };
}

/** The catalog this engine can render, narrowed to what the app allows. */
export function build(source: CatalogSource, options: CatalogOptions = {}): BoxCatalog {
  const { include, exclude } = options;
  const styleProps = selected(source.styleProps, options.styleProps);
  const schemas = new Map<string, CatalogSchema>();
  const names = Object.keys(source.manifest.components)
    .filter((name) => !include || include.includes(name))
    .filter((name) => !exclude || !exclude.includes(name));

  return {
    version: VERSION,
    library: '@box-kite/react',
    tokens: { colors: source.colors, animations: source.animations, components: styleTree(source.componentStyles) },
    rules: RULES,
    components: names.reduce<Record<string, CatalogComponent>>((catalog, name) => {
      catalog[name] = component(name, source, styleProps, schemas);

      return catalog;
    }, {}),
  };
}
