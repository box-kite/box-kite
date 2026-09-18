import { describe, expect, it } from 'vitest';
import {
  buildRegistryIndex,
  buildRegistryItem,
  CATALOG_PATH,
  installCommand,
  itemPath,
  REGISTRY_NAME,
  REGISTRY_PATH,
  registryItems,
  registryTemplate,
  v0Url,
} from './registry';
import { missingSources, registrySources } from './registrySources';
import { SITE_URL } from './site';

/** Every component the package publishes, so an import in a block can be checked against what exists. */
const componentModules = import.meta.glob('../../src/components/*.tsx');
const packageJson = import.meta.glob<{ devDependencies: Record<string, string>; name: string }>('../../package.json', {
  import: 'default',
  eager: true,
});

const components = new Set(Object.keys(componentModules).map((path) => path.replace('../../src/components/', '').replace('.tsx', '')));
const { name: packageName, devDependencies } = Object.values(packageJson)[0];

/** The entries of the package's `exports` map that are not `./components/*`. */
const ENTRIES = new Set([packageName, `${packageName}/rsc`, `${packageName}/a11y`, `${packageName}/anchor`, `${packageName}/ssg`]);

const importsOf = (source: string) => [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);

describe('registry items', () => {
  it('declares a unique, CLI-safe name for each item', () => {
    const names = registryItems.map((item) => item.name);

    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('has the source of every file it publishes', () => {
    expect(missingSources()).toEqual([]);
  });

  it('lands each file under the name it has here', () => {
    for (const item of registryItems) {
      for (const file of item.files) {
        expect(file.path.startsWith('registry/blocks/')).toBe(true);
        expect(file.target.startsWith('@components/')).toBe(true);
        expect(file.target.split('/').pop()).toBe(file.path.split('/').pop());
      }
    }
  });

  // A block is a finished interactive section, so it is a client component wherever it lands. The
  // App Router's default is the other one, and the failure is at build time in somebody else's repo.
  it("declares 'use client' on every block file", () => {
    for (const item of registryItems) {
      for (const file of item.files.filter((entry) => entry.type === 'registry:block')) {
        expect(registrySources[file.path].startsWith("'use client';")).toBe(true);
      }
    }
  });

  // The equivalent of E8's "every free cell links to a working demo": an import the package does not
  // serve installs cleanly and then fails to compile, which is the worst way for a block to be wrong.
  it('imports only what the package actually exports', () => {
    for (const [path, source] of Object.entries(registrySources)) {
      for (const specifier of importsOf(source).filter((name) => name.startsWith(packageName))) {
        const component = specifier.startsWith(`${packageName}/components/`) ? specifier.split('/').pop() : undefined;

        if (component) expect(components, `${path} imports ${specifier}`).toContain(component);
        else expect(ENTRIES, `${path} imports ${specifier}`).toContain(specifier);
      }
    }
  });

  it('declares every third-party dependency its files import', () => {
    for (const item of registryItems) {
      const external = item.files
        .flatMap((file) => importsOf(registrySources[file.path]))
        .filter((specifier) => !specifier.startsWith('.') && !specifier.startsWith(packageName) && specifier !== 'react');

      for (const specifier of new Set(external)) {
        expect(item.dependencies, `${item.name} imports ${specifier}`).toContain(specifier);
        // And it is a package this repository itself installs, so the version the blocks are written
        // against is one that has been compiled here.
        expect(Object.keys(devDependencies)).toContain(specifier);
      }

      expect(item.dependencies).toContain(packageName);
    }
  });

  // `docs` is printed by the CLI once the files are written, so it is the one place that names a
  // component from outside the file that exports it — and a rename there is silent everywhere else.
  it('names the component each block exports in the note the CLI prints', () => {
    for (const item of registryItems) {
      const block = item.files.find((file) => file.type === 'registry:block');
      const exported = registrySources[block!.path].match(/export default function (\w+)/)?.[1];

      expect(exported, `${item.name} has no default export`).toBeTruthy();
      expect(item.docs, `${item.name} docs`).toContain(exported);
    }
  });
});

describe('the published JSON', () => {
  it('inlines the content of every file in an item', () => {
    for (const item of registryItems) {
      const published = JSON.parse(buildRegistryItem(item, registrySources));

      expect(published.$schema).toBe('https://ui.shadcn.com/schema/registry-item.json');
      expect(published.name).toBe(item.name);
      expect(published.type).toBe('registry:block');
      expect(published.files).toHaveLength(item.files.length);

      for (const file of published.files) {
        expect(file.content.length).toBeGreaterThan(100);
        expect(file.type).toBeTruthy();
        expect(file.target).toBeTruthy();
      }
    }
  });

  it('refuses to publish an item whose file was not read', () => {
    expect(() => buildRegistryItem(registryItems[0], {})).toThrow(/no content for/);
  });

  it('lists every item in the catalog, and no file contents with them', () => {
    const catalog = JSON.parse(buildRegistryIndex());

    expect(catalog.$schema).toBe('https://ui.shadcn.com/schema/registry.json');
    expect(catalog.name).toBe(REGISTRY_NAME);
    expect(catalog.homepage).toBe(SITE_URL);
    expect(catalog.items.map((item: { name: string }) => item.name)).toEqual(registryItems.map((item) => item.name));

    for (const item of catalog.items) for (const file of item.files) expect(file.content).toBeUndefined();
  });

  it('answers the two addresses the CLI derives from one template', () => {
    expect(REGISTRY_PATH).toBe('/registry.json');
    // `{name}` in the template is replaced with `registry` when the CLI wants the catalog.
    expect(CATALOG_PATH).toBe(registryTemplate('').replace('{name}', 'registry'));
    expect(registryTemplate()).toBe(`${SITE_URL}/r/{name}.json`);
  });

  it('builds the install command and the v0 link from the site address', () => {
    expect(installCommand('data-grid')).toBe(`npx shadcn@latest add ${SITE_URL}/r/data-grid.json`);
    expect(itemPath('data-grid')).toBe('/r/data-grid.json');
    expect(v0Url('data-grid')).toContain(encodeURIComponent(`${SITE_URL}/r/data-grid.json`));
  });
});
