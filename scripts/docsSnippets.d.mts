// Types for the snippet collector the checker and the playground test share. Written by hand, the way
// `agentSources.d.mts` is: the source is plain ESM because a build script cannot import TypeScript.

/** One `<Code>` block, as the page wrote it. */
export interface DocsSnippet {
  /** Repo-relative path of the page that shows it. */
  path: string;
  /** The line the `<Code>` element starts on. */
  line: number;
  /** The line the snippet's own first line sits on, for a diagnostic a reader can click. */
  codeLine: number | null;
  language: string;
  /** Whether the block has a `code` attribute at all — without one it is printed from the live demo. */
  hasCode: boolean;
  /** The snippet, when the attribute is a literal. Absent for one assembled at runtime. */
  code?: string;
  /** `false` when the block opted out with `check={false}`: deliberately not compilable code. */
  check: boolean;
  /** Declarations the snippet is written against but does not show. */
  context?: string;
}

export function collectDocsSnippets(root: string, dir?: string): DocsSnippet[];
