/**
 * The shapes `catalog()` returns. JSON Schema (draft 2020-12) rather than a shape of this library's own,
 * because the consumers are other people's runtimes: a generative-UI renderer turns it into its own
 * validator (`z.fromJSONSchema` for json-render), and a structured-output API takes it as it stands.
 */

/** The JSON Schema subset the catalog emits — everything a prop registry can say, and nothing else. */
export interface CatalogSchema {
  /** Definitions this schema refers to, so one component's twenty-six colour props name one grammar. */
  $defs?: Record<string, CatalogSchema>;
  /** A pointer into this same schema's `$defs`. Kept local, so a component's props stand on their own. */
  $ref?: string;
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
  enum?: (string | number | boolean)[];
  /** The grammar a value follows where an enum cannot carry it — a colour token with its opacity modifier. */
  pattern?: string;
  description?: string;
  examples?: (string | number | boolean)[];
  anyOf?: CatalogSchema[];
  items?: CatalogSchema;
  properties?: Record<string, CatalogSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

/** One component a generated spec may name. */
export interface CatalogComponent {
  /** What it is, in one sentence — the line a prompt shows beside the name. */
  description: string;
  /** The import a human writing the same tree would type. */
  import: string;
  /** Where children go. `['default']` is the ordinary `children` slot; a named slot is a `ReactNode` prop. */
  slots: string[];
  /** Everything a JSON spec can set on it: its own props, then the style props. */
  props: CatalogSchema;
  /**
   * Props that take a function. A JSON spec cannot carry one, so they are named rather than described —
   * the host wires them to its own handlers the way its runtime does events.
   */
  events: string[];
}

/** What a generated tree may use: the components, and the values their props are allowed to take. */
export interface BoxCatalog {
  /** The catalog format's own version, bumped when the shape changes rather than when its contents do. */
  version: number;
  library: string;
  /** The design language the props are constrained to — what makes generated UI on-brand by construction. */
  tokens: {
    /** Every colour name a colour prop accepts, palette and `Box.extend()` alike, before the `/alpha`. */
    colors: string[];
    /** The `@keyframes` sequences `animation` can name. */
    animations: string[];
    /** The style-tree nodes `Box.components()` registered, so a host can see what it is allowed to restyle. */
    components: string[];
  };
  /** The rules a prompt has to carry, because a JSON Schema cannot: the dividers, and where the units are. */
  rules: string[];
  components: Record<string, CatalogComponent>;
}

/** Which of it the app allows. The allow-list is the app's — the library ships everything it can render. */
export interface CatalogOptions {
  /** Only these components. Left out, every component in the catalog. */
  include?: string[];
  /** Everything but these. Applied after `include`. */
  exclude?: string[];
  /**
   * The style props each component carries: `true` for every registered prop (the default), `false` for
   * the component's own props alone, or the names to allow. A list is the useful setting — a prompt that
   * offers all of them spends more tokens on the catalog than on the UI.
   */
  styleProps?: boolean | string[];
}

/**
 * The prose half, generated from the same extraction the docs and the AI context come from: what a prop
 * *means*, which the runtime registry cannot say. The registry stays the authority on what it accepts.
 */
export interface CatalogManifest {
  /** Prop name → its first sentence. */
  props: Record<string, string>;
  components: Record<string, ManifestComponent>;
}

export interface ManifestComponent {
  description: string;
  import: string;
  slots: string[];
  events: string[];
  /** The component's own props, as JSON Schema — only the ones a JSON spec can express. */
  props: Record<string, CatalogSchema>;
  required: string[];
  /** Whether this component takes Box's style props at all. `<Presence>` and friends do not. */
  styled: boolean;
}
