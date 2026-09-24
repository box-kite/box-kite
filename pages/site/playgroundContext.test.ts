import { describe, expect, it } from 'vitest';
import { completionContext } from './playgroundContext';

/** The context at the `|` in `snippet`, with the marker taken out. */
function at(snippet: string) {
  const caret = snippet.indexOf('|');

  return completionContext(snippet.slice(0, caret) + snippet.slice(caret + 1), caret);
}

describe('completionContext', () => {
  it('reads a component name being typed', () => {
    expect(at('<Fl|')).toEqual({ kind: 'tag', from: 1, to: 3, query: 'Fl' });
    expect(at('<Flex d="row">\n  <Bu|\n</Flex>')).toMatchObject({ kind: 'tag', query: 'Bu' });
  });

  it('reads a prop name, with the props already written', () => {
    expect(at('<Flex d="row" gap={2} bgC|')).toEqual({
      kind: 'attribute',
      tag: 'Flex',
      from: 22,
      to: 25,
      query: 'bgC',
      present: ['d', 'gap'],
    });
    expect(at('<Flex |>')).toMatchObject({ kind: 'attribute', tag: 'Flex', query: '', present: [] });
    expect(at('<Tabs.Tab\n  value="a"\n  |\n/>')).toMatchObject({ kind: 'attribute', tag: 'Tabs.Tab', present: ['value'] });
  });

  it('replaces the whole word the caret is in, not only what is before it', () => {
    expect(at('<Box bg|Color="red-500" />')).toMatchObject({ kind: 'attribute', from: 5, to: 12, query: 'bg' });
  });

  it('reads a quoted value, and the span the quotes take', () => {
    expect(at('<Box display="fl|" />')).toEqual({
      kind: 'value',
      tag: 'Box',
      path: ['display'],
      site: 'attribute',
      form: 'string',
      from: 14,
      to: 16,
      query: 'fl',
      outer: { from: 13, to: 17 },
    });
  });

  it('ends a string with no closing quote yet at the token, not at the end of the line', () => {
    expect(at('<Box display="fl| p={4} />')).toMatchObject({ from: 14, to: 16, outer: { from: 13, to: 16 } });
    expect(at('<Box display="| p="x" />')).toMatchObject({ from: 14, to: 14 });
  });

  it('reads a value in braces, and the moment after the equals sign', () => {
    expect(at('<Box p={|} />')).toMatchObject({ kind: 'value', path: ['p'], form: 'expression', query: '', outer: { from: 7, to: 9 } });
    expect(at('<Box p={1|2} />')).toMatchObject({ form: 'expression', query: '1', to: 10 });
    expect(at('<Box p=|')).toMatchObject({ kind: 'value', path: ['p'], form: 'none', outer: { from: 7, to: 7 } });
  });

  it('gives up inside braces that hold code rather than a value', () => {
    expect(at('<Button onClick={() => set(|)} />')).toBeNull();
  });

  it('reads a key inside a nested style object, with its path', () => {
    expect(at('<Box hover={{ bgC| }} />')).toMatchObject({ kind: 'key', tag: 'Box', path: ['hover'], query: 'bgC', present: [] });
    expect(at('<Box theme={{ dark: { color: "white", hover: { | } } }} />')).toMatchObject({
      kind: 'key',
      path: ['theme', 'dark', 'hover'],
      query: '',
      present: [],
    });
    expect(at('<Box md={{ p: 4, | }} />')).toMatchObject({ kind: 'key', path: ['md'], present: ['p'] });
  });

  it('reads a value inside a nested style object, quoted or not', () => {
    expect(at("<Box hover={{ bgColor: 'sky|' }} />")).toMatchObject({
      kind: 'value',
      path: ['hover', 'bgColor'],
      site: 'object',
      form: 'string',
      query: 'sky',
    });
    expect(at('<Box md={{ p: |, m: 2 }} />')).toMatchObject({ kind: 'value', path: ['md', 'p'], form: 'bare', query: '' });
    expect(at('<Box md={{ p: 1|2 }} />')).toMatchObject({ kind: 'value', path: ['md', 'p'], form: 'bare', query: '1' });
  });

  it('keeps a comma inside brackets from ending the entry', () => {
    expect(at("<Box bgGradient={{ colors: ['a', 'b'], lin| }} />")).toMatchObject({ kind: 'key', present: ['colors'], query: 'lin' });
  });

  it('knows a quoted key', () => {
    expect(at("<Box group={{ 'card/hover': { op| } }} />")).toMatchObject({ kind: 'key', path: ['group', 'card/hover'], query: 'op' });
  });

  it('offers nothing in children text, in a string of code, or past a closed tag', () => {
    expect(at('<P>Some te|xt</P>')).toBeNull();
    expect(at('const label = "Fl|";')).toBeNull();
    expect(at('<Box p={4} />|')).toBeNull();
  });

  it('tells an element from a comparison', () => {
    expect(at('const small = width < he|')).toBeNull();
    expect(at('const card = <Box |')).toMatchObject({ kind: 'attribute', tag: 'Box' });
  });

  it('follows elements nested in children, in expressions and in props', () => {
    const snippet = '<Flex gap={2}>\n  {items.map((item) => (\n    <Li key={item}>{item}</Li>\n  ))}\n  <Box |';
    expect(at(snippet)).toMatchObject({ kind: 'attribute', tag: 'Box' });
    expect(at('<Tooltip content={<Box p|')).toMatchObject({ kind: 'attribute', tag: 'Box', query: 'p' });
    expect(at('<Flex>\n  <Icon size={4}><Star /></Icon>\n  <Box c|')).toMatchObject({ kind: 'attribute', tag: 'Box', query: 'c' });
  });

  it('skips comments and a spread', () => {
    expect(at('// <Box \n<Flex {...rest} g|')).toMatchObject({ kind: 'attribute', tag: 'Flex', query: 'g' });
    expect(at('<Flex /* d="row" */ |')).toMatchObject({ kind: 'attribute', present: [] });
  });
});
