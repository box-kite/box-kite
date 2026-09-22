/**
 * What a docs snippet may use without importing it — one entry per name, naming the published
 * specifier and the export behind it.
 *
 * Two readers, which is why it is a record rather than a list of import lines. `check-docs-snippets.mjs`
 * turns each entry into an `import` and compiles the snippet against the published entry points, and the
 * playground (`pages/site/playgroundScope.ts`) turns the same entry into a *value* and evaluates the
 * snippet with it. A name in one and not the other is a snippet that compiles in CI and throws
 * `X is not defined` the moment a reader opens it in the playground.
 */
export const SNIPPET_SCOPE = {
  React: { from: 'react', export: '*' },
  useCallback: { from: 'react', export: 'useCallback' },
  useEffect: { from: 'react', export: 'useEffect' },
  useMemo: { from: 'react', export: 'useMemo' },
  useRef: { from: 'react', export: 'useRef' },
  useState: { from: 'react', export: 'useState' },
  flushSync: { from: 'react-dom', export: 'flushSync' },
  BaseSvg: { from: '@box-kite/react/components/baseSvg', export: 'default' },
  Box: { from: '@box-kite/react', export: 'default' },
  useAnchorPosition: { from: '@box-kite/react/anchor', export: 'useAnchorPosition' },
  AlertDialog: { from: '@box-kite/react/components/dialog', export: 'AlertDialog' },
  Button: { from: '@box-kite/react/components/button', export: 'default' },
  Checkbox: { from: '@box-kite/react/components/checkbox', export: 'default' },
  Combobox: { from: '@box-kite/react/components/combobox', export: 'default' },
  Accordion: { from: '@box-kite/react/components/accordion', export: 'default' },
  ApprovalCard: { from: '@box-kite/react/components/agent', export: 'ApprovalCard' },
  Reasoning: { from: '@box-kite/react/components/agent', export: 'Reasoning' },
  ToolCallCard: { from: '@box-kite/react/components/agent', export: 'ToolCallCard' },
  StreamingText: { from: '@box-kite/react/components/agent', export: 'StreamingText' },
  Skeleton: { from: '@box-kite/react/components/skeleton', export: 'default' },
  markdownComponents: { from: '@box-kite/react/components/markdown', export: 'markdownComponents' },
  Collapsible: { from: '@box-kite/react/components/accordion', export: 'Collapsible' },
  Progress: { from: '@box-kite/react/components/progress', export: 'default' },
  Slider: { from: '@box-kite/react/components/slider', export: 'default' },
  SpecRenderer: { from: '@box-kite/react/spec', export: 'default' },
  DashboardGrid: { from: '@box-kite/react/components/dashboard', export: 'default' },
  DataGrid: { from: '@box-kite/react/components/dataGrid', export: 'default' },
  Widget: { from: '@box-kite/react/components/dashboard', export: 'Widget' },
  Dialog: { from: '@box-kite/react/components/dialog', export: 'default' },
  Dropdown: { from: '@box-kite/react/components/dropdown', export: 'default' },
  Flex: { from: '@box-kite/react/components/flex', export: 'default' },
  Form: { from: '@box-kite/react/components/form', export: 'default' },
  Grid: { from: '@box-kite/react/components/grid', export: 'default' },
  Icon: { from: '@box-kite/react/components/icon', export: 'default' },
  Menu: { from: '@box-kite/react/components/menu', export: 'default' },
  Overlay: { from: '@box-kite/react/components/overlay', export: 'default' },
  Popover: { from: '@box-kite/react/components/popover', export: 'default' },
  Presence: { from: '@box-kite/react/components/presence', export: 'default' },
  RadioButton: { from: '@box-kite/react/components/radioButton', export: 'default' },
  RadioGroup: { from: '@box-kite/react/components/radioGroup', export: 'default' },
  Select: { from: '@box-kite/react/components/select', export: 'default' },
  Switch: { from: '@box-kite/react/components/switch', export: 'default' },
  Tabs: { from: '@box-kite/react/components/tabs', export: 'default' },
  Textarea: { from: '@box-kite/react/components/textarea', export: 'default' },
  Textbox: { from: '@box-kite/react/components/textbox', export: 'default' },
  Toaster: { from: '@box-kite/react/components/toaster', export: 'default' },
  toast: { from: '@box-kite/react/components/toaster', export: 'toast' },
  Tooltip: { from: '@box-kite/react/components/tooltip', export: 'default' },
  VisuallyHidden: { from: '@box-kite/react/components/visuallyHidden', export: 'default' },
  useClassNames: { from: '@box-kite/react', export: 'useClassNames' },
  createThemeController: { from: '@box-kite/core', export: 'createThemeController' },
  // The generative-UI pair: the catalog a model generates under, and the registry that renders it back.
  catalog: { from: '@box-kite/react/catalog', export: 'catalog' },
  specSchema: { from: '@box-kite/react/catalog', export: 'specSchema' },
  createSpecRegistry: { from: '@box-kite/react/spec', export: 'createSpecRegistry' },
  // The runtime adapters, which a snippet folds an agent's own words through.
  toolPart: { from: '@box-kite/react/interop', export: 'toolPart' },
  applyToolEvent: { from: '@box-kite/react/interop', export: 'applyToolEvent' },
  a2uiApply: { from: '@box-kite/react/interop', export: 'a2uiApply' },
  a2uiSurface: { from: '@box-kite/react/interop', export: 'a2uiSurface' },
  a2uiToSpec: { from: '@box-kite/react/interop', export: 'a2uiToSpec' },
  a2uiCatalog: { from: '@box-kite/react/interop', export: 'a2uiCatalog' },
  AgentUtils: { from: '@box-kite/react/components/agent', export: 'AgentUtils' },
  DashboardUtils: { from: '@box-kite/react/components/dashboard', export: 'DashboardUtils' },
  // The semantic tags a snippet writes prose with, all from the one entry.
  H1: { from: '@box-kite/react/components/semantics', export: 'H1' },
  H2: { from: '@box-kite/react/components/semantics', export: 'H2' },
  H3: { from: '@box-kite/react/components/semantics', export: 'H3' },
  H4: { from: '@box-kite/react/components/semantics', export: 'H4' },
  H5: { from: '@box-kite/react/components/semantics', export: 'H5' },
  H6: { from: '@box-kite/react/components/semantics', export: 'H6' },
  Li: { from: '@box-kite/react/components/semantics', export: 'Li' },
  Ol: { from: '@box-kite/react/components/semantics', export: 'Ol' },
  P: { from: '@box-kite/react/components/semantics', export: 'P' },
  Ul: { from: '@box-kite/react/components/semantics', export: 'Ul' },
  // The chart primitives and the theming container, one entry between them.
  ChartContainer: { from: '@box-kite/react/components/chart', export: 'ChartContainer' },
  Gauge: { from: '@box-kite/react/components/chart', export: 'Gauge' },
  MiniDonut: { from: '@box-kite/react/components/chart', export: 'MiniDonut' },
  ProgressRing: { from: '@box-kite/react/components/chart', export: 'ProgressRing' },
  Sparkline: { from: '@box-kite/react/components/chart', export: 'Sparkline' },
  // The SVG elements — one entry each, so a drawing in a snippet reads as a drawing would.
  Circle: { from: '@box-kite/react/components/svg', export: 'Circle' },
  ClipPath: { from: '@box-kite/react/components/svg', export: 'ClipPath' },
  Defs: { from: '@box-kite/react/components/svg', export: 'Defs' },
  Ellipse: { from: '@box-kite/react/components/svg', export: 'Ellipse' },
  G: { from: '@box-kite/react/components/svg', export: 'G' },
  Line: { from: '@box-kite/react/components/svg', export: 'Line' },
  LinearGradient: { from: '@box-kite/react/components/svg', export: 'LinearGradient' },
  Marker: { from: '@box-kite/react/components/svg', export: 'Marker' },
  Mask: { from: '@box-kite/react/components/svg', export: 'Mask' },
  Path: { from: '@box-kite/react/components/svg', export: 'Path' },
  Polygon: { from: '@box-kite/react/components/svg', export: 'Polygon' },
  Polyline: { from: '@box-kite/react/components/svg', export: 'Polyline' },
  RadialGradient: { from: '@box-kite/react/components/svg', export: 'RadialGradient' },
  Rect: { from: '@box-kite/react/components/svg', export: 'Rect' },
  Stop: { from: '@box-kite/react/components/svg', export: 'Stop' },
  Svg: { from: '@box-kite/react/components/svg', export: 'Svg' },
  SvgSymbol: { from: '@box-kite/react/components/svg', export: 'SvgSymbol' },
  SvgText: { from: '@box-kite/react/components/svg', export: 'SvgText' },
  TSpan: { from: '@box-kite/react/components/svg', export: 'TSpan' },
  Use: { from: '@box-kite/react/components/svg', export: 'Use' },
};

/** An entry as the import statement a snippet would have written for itself. */
export function importStatement(name, { from, export: exported }) {
  const clause = exported === '*' ? `* as ${name}` : exported === 'default' ? name : `{ ${exported} }`;

  return `import ${clause} from '${from}';`;
}
