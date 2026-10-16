import { describe, expect, it } from 'vitest';
import { mergeDeep } from './mergeDeep';

/**
 * `mergeDeep` is what puts a component's default styles under the props a caller passes, so what it does
 * with an absent prop decides whether a conditional style prop can erase a component's own block.
 */
describe('mergeDeep', () => {
  it('keeps what it is merging into when the value is undefined', () => {
    // `hoverGroup={cond ? {…} : undefined}` — the shape every component here uses — used to delete the
    // component style's own `hoverGroup` whenever the condition was false (bug #61).
    const merged = mergeDeep({ hoverGroup: { resizer: { bgColor: 'gray-600' } }, p: 4 }, { hoverGroup: undefined, p: 2 });

    expect(merged).toEqual({ hoverGroup: { resizer: { bgColor: 'gray-600' } }, p: 2 });
  });

  it('still lets `clean` drop a component block on purpose', () => {
    const merged = mergeDeep({ hover: { bgColor: 'gray-600', color: 'white' } }, { hover: { clean: true, color: 'black' } });

    expect(merged).toEqual({ hover: { clean: true, color: 'black' } });
  });

  // A variant's gradient was appended to the base one's stops, so a secondary button wore the primary's colours (bug #265).
  it('replaces an array rather than appending to it', () => {
    const merged = mergeDeep(
      { bgGradient: { linear: 'r', colors: ['orange-700', 'rose-700'] }, scrollbarColor: ['gray-400', 'gray-100'] },
      { bgGradient: { colors: ['transparent', 'transparent'] }, scrollbarColor: ['sky-500', 'white'] },
    );

    expect(merged).toEqual({ bgGradient: { linear: 'r', colors: ['transparent', 'transparent'] }, scrollbarColor: ['sky-500', 'white'] });
  });

  it('merges the blocks both sides declare', () => {
    const merged = mergeDeep({ hover: { bgColor: 'gray-600', color: 'white' } }, { hover: { color: 'black' } });

    expect(merged).toEqual({ hover: { bgColor: 'gray-600', color: 'black' } });
  });
});
