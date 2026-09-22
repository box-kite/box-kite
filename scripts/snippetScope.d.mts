// Types for the scope record the snippet checker and the playground share. Written by hand, the way
// `agentSources.d.mts` is: the source is plain ESM because a build script cannot import TypeScript.

/** Where a provided name comes from: the published specifier, and `default`, `*` or the named export. */
export interface SnippetScopeEntry {
  from: string;
  export: string;
}

export const SNIPPET_SCOPE: Record<string, SnippetScopeEntry>;

export function importStatement(name: string, entry: SnippetScopeEntry): string;
