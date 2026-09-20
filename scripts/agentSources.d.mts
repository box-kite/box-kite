// Types for the plain-ESM reader the generated agent files share. Only `priorFacts` is reached from
// TypeScript — `mcp/src/data.test.ts` pins the MCP server's own parse of that block against this one.
export function priorFacts(): string[];
export function rulesBody(reference: string): string;
export function deprecations(): { name: string; instead: string }[];
