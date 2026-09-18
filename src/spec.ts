/**
 * `@box-kite/react/spec` — a generated UI, rendered safely.
 *
 * ```tsx
 * import Flex from '@box-kite/react/components/flex';
 * import { H2, P } from '@box-kite/react/components/semantics';
 * import { catalog } from '@box-kite/react/catalog';
 * import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';
 *
 * const registry = createSpecRegistry({ catalog: catalog({ include: ['Flex', 'H2', 'P'] }), components: { Flex, H2, P } });
 *
 * <SpecRenderer spec={spec} registry={registry} data={data} onAction={(action) => run(action)} />;
 * ```
 *
 * The catalog says what a model may write; this renders what it wrote. A name the app did not register
 * renders nothing, a prop its component's schema refuses is dropped, and the only prop that can become
 * a function is one the catalog lists as an event — so the tree is composed by the model and every
 * decision in it is still the app's.
 *
 * Its own entry, and it carries no engine: the components come from the app, so nothing here imports
 * Box. `specSchema()` is the other direction — the constraint a model generates under, built from the
 * same rules the renderer enforces.
 */
import SpecValidate from './utils/spec/specValidate';

export { default, default as SpecRenderer } from './react/spec/specRenderer';
export type { SpecRendererProps } from './react/spec/specRenderer';
export { renderSpec } from './react/spec/renderSpec';
export type { SpecActionDetails, SpecActionHandler, SpecRenderOptions, SpecRenderResult } from './react/spec/renderSpec';

export { default as createSpecRegistry } from './react/spec/specRegistry';
export type { SpecComponent, SpecRegistry, SpecRegistryEntry, SpecRegistryOptions } from './react/spec/specRegistry';

export { default as specSchema } from './utils/spec/specSchema';
export type { SpecSchemaComponent, SpecSchemaOptions, SpecSchemaSource } from './utils/spec/specSchema';

export type {
  SpecAction,
  SpecChild,
  SpecDataRef,
  SpecIndexRef,
  SpecIssue,
  SpecIssueCode,
  SpecItemRef,
  SpecNode,
  SpecRef,
  SpecRules,
} from './utils/spec/specTypes';

/** Whether a value is one a catalog schema allows: the check the renderer makes, for a host wanting it first. */
export const matchesSchema = SpecValidate.matches;
