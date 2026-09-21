import { describe, expect, it } from 'vitest';
import type { SearchIndex } from './searchIndex';
import { propHref, queryTerms, searchDocs } from './searchQuery';

const index: SearchIndex = {
  version: '2.1.0',
  pages: [
    {
      path: '/dropdown',
      name: 'Dropdown',
      description: 'The APG select-only combobox: choose one option or many.',
      sections: [
        {
          title: 'Multiple selection',
          hash: 'multiple',
          text: 'Hold the selection as chips, and the value is the row rather than its label.',
        },
        {
          title: 'Keyboard',
          hash: 'keyboard',
          text: 'The arrow keys move between the options and wrap at the ends, Home and End go to the first and the last of them, and typeahead jumps to the next option starting with the letter.',
        },
        { title: 'Styling', hash: 'styling', text: 'The dropdown tree, one node per part of the popup.' },
        { title: 'Anatomy', hash: 'anatomy', text: 'The trigger, the popup and the option rows of a dropdown.' },
      ],
    },
    {
      path: '/escape-hatch',
      name: 'Escape Hatch',
      description: 'The css prop: a style object for the properties this library has no prop for.',
      sections: [
        {
          title: 'One shared class',
          hash: 'class',
          text: 'A css entry is compiled into a class like every other prop, never an inline style attribute.',
        },
      ],
    },
  ],
  props: [
    { name: 'fontSize', description: 'The size of the text. The divider is 16.', css: 'font-size: 0.875rem' },
    { name: 'p', description: 'Padding on every side. The divider is 4.', css: 'padding: 1rem' },
    {
      name: 'jc',
      description: 'How a flex container distributes its free space.',
      css: 'justify-content: center',
      values: 'center, space-between, safe center',
    },
  ],
};

const titles = (query: string, options?: Parameters<typeof searchDocs>[2]) =>
  searchDocs(index, query, options).map((result) => result.title);

describe('queryTerms', () => {
  it('lowercases, splits on anything but a letter or a digit, and dedupes', () => {
    expect(queryTerms('Font-size  fontSize')).toEqual(['font', 'size', 'fontsize']);
  });

  it('is empty for a query of punctuation', () => {
    expect(queryTerms('  ?? ')).toEqual([]);
  });
});

describe('searchDocs', () => {
  it('answers nothing before anything is typed', () => {
    expect(searchDocs(index, '')).toEqual([]);
  });

  it('puts the page itself above its own sections', () => {
    expect(titles('dropdown')[0]).toBe('Dropdown');
  });

  it('finds a prop by its name, and points it at the finder', () => {
    const [first] = searchDocs(index, 'fontSize');

    expect(first.title).toBe('fontSize');
    expect(first.href).toBe(propHref('fontSize'));
    expect(first.href).toBe('/box?prop=fontSize#finder');
  });

  it('reads a capital as the start of a word, so half a camelCase name finds it', () => {
    expect(titles('size')).toContain('fontSize');
  });

  it('finds a prop by the CSS it writes', () => {
    expect(titles('padding')).toContain('p');
  });

  it('finds a prop by a value it takes, which is what the finder it links to searches too', () => {
    expect(titles('space-between')).toEqual(['jc']);
  });

  it('wants every term to match somewhere', () => {
    expect(titles('dropdown chips')).toEqual(['Multiple selection']);
  });

  it('falls back to any of the words rather than answering nothing at all', () => {
    expect(titles('dropdown parsnips')[0]).toBe('Dropdown');
    expect(titles('parsnips')).toEqual([]);
  });

  it('finds a name with its spaces taken out', () => {
    expect(titles('escapehatch')[0]).toBe('Escape Hatch');
  });

  it('lets one page contribute three results, so it cannot fill the list', () => {
    const results = searchDocs(index, 'dropdown');

    expect(results.filter((result) => result.page === 'Dropdown')).toHaveLength(3);
  });

  it('links a section to its anchor and a page to itself', () => {
    expect(searchDocs(index, 'typeahead')[0].href).toBe('/dropdown#keyboard');
    expect(searchDocs(index, 'escape hatch')[0].href).toBe('/escape-hatch');
  });

  it('cuts the excerpt around the match and marks it', () => {
    const [first] = searchDocs(index, 'inline');
    const marked = first.ranges.map(([start, end]) => first.excerpt.slice(start, end));

    expect(first.excerpt).toContain('inline style attribute');
    expect(marked).toEqual(['inline']);
  });

  it('keeps whole words at a cut, and says it cut', () => {
    const [first] = searchDocs(index, 'typeahead');

    expect(first.excerpt.startsWith('…')).toBe(true);
    expect(first.excerpt).not.toMatch(/^…[a-z]/);
  });

  it('honours the limit', () => {
    expect(searchDocs(index, 'the', { limit: 2 })).toHaveLength(2);
  });
});
