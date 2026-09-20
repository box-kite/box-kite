/**
 * `@box-kite/react/interop` — the agentic runtimes, in this library's shapes.
 *
 * ```ts
 * import { toolPart, a2uiSurface, a2uiToSpec } from '@box-kite/react/interop';
 *
 * const part = toolPart(message);                        // AI SDK, assistant-ui or CopilotKit
 * const spec = a2uiToSpec(a2uiSurface(state), { catalog }); // an A2UI stream, as a <SpecRenderer> tree
 * ```
 *
 * Four runtimes generate UI and ask for permission, and every one of them describes the same two things
 * — a tool call, and a tree of components — in words of its own. What ships here is the half this
 * library owns: the mapping, framework-free, with no dependency on any of them. An adapter that pulled
 * in a runtime would be choosing it for the app, and the app has already chosen.
 *
 * Its own entry, and it carries neither the engine nor React: a route handler building an agent's
 * catalog and a client folding its messages both import from here, and neither pays for the other.
 *
 * `docs/interop.md` has the recipe per runtime, json-render and AG-UI included.
 */
export { default as ToolInterop } from './utils/interop/toolInterop';
export type { ToolPart, ToolPartKind } from './utils/interop/toolInterop';

export { default as A2uiInterop } from './utils/interop/a2uiInterop';
export type { A2uiCatalogOptions, A2uiComponent, A2uiSpecOptions, A2uiState, A2uiSurface } from './utils/interop/a2uiInterop';

export { default as AssistantUiInterop } from './utils/interop/assistantUiInterop';
export type { GenerativeUiLoss, GenerativeUiNode, GenerativeUiSpec } from './utils/interop/assistantUiInterop';

export type { ApprovalDecision, ToolCallStatus } from './utils/agent/agentUtils';
export type { SpecNode } from './utils/spec/specTypes';

import A2uiInterop from './utils/interop/a2uiInterop';
import AssistantUiInterop from './utils/interop/assistantUiInterop';
import ToolInterop from './utils/interop/toolInterop';

/** Where a tool call is, from whichever of the three runtimes handed you the part. */
export const toolPart = ToolInterop.toolPart;

/** AG-UI reports events rather than parts, so its cards are a fold: one call per event, oldest first. */
export const applyToolEvent = ToolInterop.applyEvent;

/** One A2UI message folded into the surfaces it names. Pure, and the same state back when nothing moved. */
export const a2uiApply = A2uiInterop.apply;
export const a2uiApplyAll = A2uiInterop.applyAll;

/** A surface by id, or the first one the agent opened. */
export const a2uiSurface = A2uiInterop.surface;

/** A surface's adjacency list as one `<SpecRenderer>` tree. */
export const a2uiToSpec = A2uiInterop.toSpec;

/** `catalog()` as an A2UI catalog document — what an agent generates against. */
export const a2uiCatalog = A2uiInterop.catalogDocument;

/** One component of that document, self-contained: a `$ref` resolves against the document, not the part. */
export const a2uiComponentSchema = A2uiInterop.componentSchema;

/** The state an A2UI fold starts from. */
export const a2uiEmpty = A2uiInterop.EMPTY;

/** assistant-ui's generative-UI spec as ours, and back. */
export const fromGenerativeUi = AssistantUiInterop.toSpec;
export const toGenerativeUi = AssistantUiInterop.fromSpec;
