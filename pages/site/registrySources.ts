import { registryItems } from './registry';

// Read at build time, as the release notes are: the blocks are sources in this repository, and the
// registry JSON is those sources inlined. One reader for the page that shows the code and the build
// that publishes it, so what a reader copies and what the CLI writes cannot differ.
const files = import.meta.glob<string>('../../registry/blocks/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

/** Every block file, keyed by its repository path — the same key `RegistryFile.path` uses. */
export const registrySources: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(files).map(([path, source]) => [path.replace('../../', ''), source]),
);

/**
 * A block whose file the glob did not pick up is a published item with nothing in it, so it fails here
 * rather than at install time. The path being wrong is the only way this happens, and it is silent.
 */
export function missingSources(): string[] {
  return registryItems.flatMap((item) => item.files.filter((file) => !registrySources[file.path]).map((file) => file.path));
}
