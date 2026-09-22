import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteRoutes } from '../site/site';
import { entries, entriesIn, groups } from './showcase';

/**
 * The showcase claims to be every component the library ships, and a claim like that is worth exactly
 * as much as the thing that checks it. `api/components/*.json` is written from the components
 * themselves, so it is the list: a component added to the library and not to the page fails here.
 */
const root = resolve(import.meta.dirname, '../..');

const shipped = readdirSync(resolve(root, 'api/components'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(resolve(root, 'api/components', file), 'utf8')) as { name: string; route: string });

describe('the showcase', () => {
  it('draws every component the library ships, and nothing it does not', () => {
    expect([...entries.map((entry) => entry.name)].sort()).toEqual([...shipped.map((component) => component.name)].sort());
  });

  it('sends each card to the page its own reference names', () => {
    const documented = new Map(shipped.map((component) => [component.name, component.route]));
    const wrong = entries.filter((entry) => documented.get(entry.name) !== entry.route);

    expect(wrong.map((entry) => `${entry.name} → ${entry.route}`)).toEqual([]);
  });

  it('links only to routes the site serves', () => {
    const served = new Set(siteRoutes.map((route) => route.path));

    expect(entries.filter((entry) => !served.has(entry.route)).map((entry) => entry.name)).toEqual([]);
  });

  it('names each component once', () => {
    expect(new Set(entries.map((entry) => entry.name)).size).toBe(entries.length);
  });

  // An empty section is a heading with nothing under it, which is how a group left over from a
  // reshuffle shows itself.
  it('fills every section it declares', () => {
    expect(groups.filter((group) => entriesIn(group.id).length === 0).map((group) => group.id)).toEqual([]);
  });

  it('places every card in a section', () => {
    const placed = groups.flatMap((group) => entriesIn(group.id));

    expect(placed).toHaveLength(entries.length);
  });

  // The cards sit in a grid, so one note twice the length of the rest sets the row height for all of them.
  it('keeps every note to a line', () => {
    const long = entries.filter((entry) => entry.note.length > 100);

    expect(long.map((entry) => `${entry.name} (${entry.note.length})`)).toEqual([]);
  });
});
