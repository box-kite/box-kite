import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/catalog';
import { createStyleEngine } from '../../src/core';
import { accept, complete, createMeasure, fuzzyMatch, numberSamples, opensOn, valueShape } from './playgroundCompletion';
import { completionContext } from './playgroundContext';
import createCompletions from './playgroundVocabulary';

const vocabulary = createCompletions().vocabulary;

/** The completion at the `|` in `snippet`, with the marker taken out. */
function at(snippet: string) {
  const caret = snippet.indexOf('|');
  const source = snippet.slice(0, caret) + snippet.slice(caret + 1);
  const context = completionContext(source, caret);

  return { source, completion: context ? complete(vocabulary, context) : null };
}

const labels = (snippet: string, count = 5) =>
  at(snippet)
    .completion!.suggestions.slice(0, count)
    .map((suggestion) => suggestion.label);

/** The source after taking the suggestion labelled `label`, with the caret marked. */
function take(snippet: string, label: string) {
  const { source, completion } = at(snippet);
  const suggestion = completion!.suggestions.find((candidate) => candidate.label === label);
  expect(suggestion, `${label} is offered`).toBeDefined();
  const edit = accept(source, completion!, suggestion!);

  return { text: edit.source.slice(0, edit.caret) + '|' + edit.source.slice(edit.caret), reopen: edit.reopen };
}

describe('fuzzyMatch', () => {
  it('ranks a prefix over word starts over scattered letters', () => {
    const prefix = fuzzyMatch('bg', 'bgColor')!;
    const humps = fuzzyMatch('bgc', 'bgColor')!;
    const scattered = fuzzyMatch('bgc', 'borderBackground')!;

    expect(prefix.indices).toEqual([0, 1]);
    expect(humps.indices).toEqual([0, 1, 2]);
    expect(fuzzyMatch('bC', 'borderColor')!.indices).toEqual([0, 6]);
    expect(humps.score).toBeGreaterThan(scattered?.score ?? -Infinity);
    expect(fuzzyMatch('xyz', 'bgColor')).toBeNull();
    expect(fuzzyMatch('disp', 'borderRadiusTop')).toBeNull();
  });
});

describe('props', () => {
  it('offers every prop a component takes, its own first', () => {
    const { completion } = at('<Slider |');
    const names = completion!.suggestions.map((suggestion) => suggestion.label);

    expect(names.slice(0, 3)).toEqual(['min', 'max', 'step']);
    expect(names).toContain('onValueChange');
    expect(names).toContain('bgColor');
    expect(names).toContain('hover');
    expect(names).toContain('props');
  });

  it('filters by the query, and finds a prop by the CSS it writes', () => {
    expect(labels('<Box bgC|', 2)).toEqual(['bgClip', 'bgColor']);
    expect(labels('<Box sh|', 2)).toEqual(['shadow', 'shadowColor']);
    expect(labels('<Slider m|', 2)).toEqual(['max', 'min']);
    expect(labels('<Box hov|')[0]).toBe('hover');

    const padding = at('<Box padding|').completion!.suggestions.find((suggestion) => suggestion.label === 'p');
    expect(padding?.alias).toBe('padding');
  });

  it('leaves out the props already written', () => {
    expect(labels('<Box p={2} |', 300)).not.toContain('p');
  });

  it('says what each one takes', () => {
    const detail = (label: string) => at('<Box |').completion!.suggestions.find((suggestion) => suggestion.label === label)?.detail;

    expect(detail('bgColor')).toBe('color');
    expect(detail('display')).toBe('enum');
    expect(detail('p')).toBe('number | enum');
    expect(detail('flex1')).toBe('boolean');
    expect(detail('css')).toBe('{ }');
    expect(detail('hover')).toBe('state');
    expect(detail('md')).toBe('breakpoint');
  });

  it('offers the style props and the nesting keys inside a nested object', () => {
    expect(labels('<Box hover={{ bgC| }} />', 2)).toEqual(['bgClip', 'bgColor']);
    expect(labels('<Box theme={{ | }} />')).toEqual(['light', 'dark']);
    expect(labels('<Box theme={{ dark: { | } }} />', 300)).toContain('color');
    expect(labels('<Box cq={{ | }} />', 2)).toEqual(['xs', 'maxXs']);
  });

  it('offers nothing for keys that are the reader’s own names, or inside a value that is an object', () => {
    expect(at('<Box dataAttr={{ | }} />').completion).toBeNull();
    expect(at('<Box bgGradient={{ | }} />').completion).toBeNull();
    expect(at('<Box props={{ | }} />').completion).toBeNull();
    // …and the props again once inside the key's own object.
    expect(labels("<Box dataAttr={{ 'state=open': { op| } }} />")[0]).toBe('opacity');
  });

  it('offers the components in scope after a `<`', () => {
    expect(labels('<Fle|')[0]).toBe('Flex');
    expect(labels('<Tabs.T|')).toContain('Tabs.Tab');
  });
});

describe('values', () => {
  it('lists an enum in the registry’s order', () => {
    expect(labels('<Box display="|" />', 3)).toEqual(['none', 'block', 'inline']);
    expect(labels('<Box display="fl|" />', 2)).toEqual(['flex', 'inline-flex']);
  });

  it('lists the palette for a colour, carrying an opacity modifier along', () => {
    expect(labels('<Box bgColor="sky-5|" />', 1)).toEqual(['sky-50']);
    expect(labels('<Box bgColor="sky-500/4|" />', 1)).toEqual(['sky-500/4']);
    expect(at('<Box color="|" />').completion!.shape!.color).toBe(true);
  });

  it('describes what a list cannot show', () => {
    const shape = at('<Box fontSize={|} />').completion!.shape!;

    expect(shape.choices).toEqual(['inherit']);
    expect(shape.types.map((hint) => hint.type)).toEqual(['number']);
    expect(valueShape(catalog().components.Box.props.properties!.width).types.map((hint) => hint.label)).toEqual([
      'a percentage',
      "an anchor's size",
      'a number',
    ]);
  });

  it('reads the number being typed, for the live measurement', () => {
    expect(at('<Box p={1|} />').completion!.typed).toBe(1);
    expect(at('<Box hover={{ p: 6| }} />').completion!.typed).toBe(6);
    expect(at('<Box display="|" />').completion!.typed).toBeUndefined();
  });

  it('knows a component’s own values', () => {
    expect(labels('<Slider orientation="|" />')).toEqual(['horizontal', 'vertical']);
  });
});

describe('accept', () => {
  it('writes a prop with the value form it takes, caret inside', () => {
    expect(take('<Box bgC|', 'bgColor')).toEqual({ text: '<Box bgColor="|"', reopen: true });
    expect(take('<Box fontS|', 'fontSize')).toEqual({ text: '<Box fontSize={|}', reopen: true });
    expect(take('<Box hov|', 'hover')).toEqual({ text: '<Box hover={{ | }}', reopen: true });
    expect(take('<Box flex|', 'flex1')).toEqual({ text: '<Box flex1|', reopen: false });
    expect(take('<Button onCl|', 'onClick')).toEqual({ text: '<Button onClick={() => {|}}', reopen: false });
  });

  it('keeps a word the caret was typed in front of', () => {
    expect(take('<Box bgC|gap={4} />', 'bgColor').text).toBe('<Box bgColor="|" gap={4} />');
  });

  it('only renames a prop that already has a value', () => {
    expect(take('<Box bgC|olor="red-500" />', 'bgColor').text).toBe('<Box bgColor|="red-500" />');
  });

  it('writes a key inside a nested object', () => {
    expect(take('<Box hover={{ bgC| }} />', 'bgColor').text).toBe("<Box hover={{ bgColor: '|' }} />");
    expect(take('<Box hover={{ p| }} />', 'p').text).toBe('<Box hover={{ p: | }} />');
    expect(take('<Box theme={{ d| }} />', 'dark')).toEqual({ text: '<Box theme={{ dark: { | } }} />', reopen: true });
  });

  it('writes a value quoted or braced by its type, whatever was there', () => {
    expect(take('<Box display="fl|" />', 'flex').text).toBe('<Box display="flex"| />');
    expect(take('<Box display={|} />', 'grid').text).toBe('<Box display="grid"| />');
    expect(take('<Box display=|', 'grid').text).toBe('<Box display="grid"|');
    expect(take('<Box opacity="|" />', '0.5').text).toBe('<Box opacity={0.5}| />');
    expect(take("<Box hover={{ bgColor: 'sk|' }} />", 'sky-50').text).toBe("<Box hover={{ bgColor: 'sky-50'| }} />");
    expect(take('<Box md={{ display: fl| }} />', 'flex').text).toBe("<Box md={{ display: 'flex'| }} />");
  });

  it('keeps a value typed after the equals sign apart from the prop after it', () => {
    expect(take('<Box display=|px={4} />', 'grid').text).toBe('<Box display="grid"| px={4} />');
  });

  it('closes a quote the reader has only opened', () => {
    expect(take('<Box display="fl| p={4} />', 'flex').text).toBe('<Box display="flex"| p={4} />');
  });
});

describe('opensOn', () => {
  it('opens on a letter in a name and on the characters that start a value', () => {
    const context = (snippet: string) => completionContext(snippet.replace('|', ''), snippet.indexOf('|'));

    expect(opensOn('b', context('<Box b|'))).toBe(true);
    expect(opensOn('=', context('<Box display=|'))).toBe(true);
    expect(opensOn('"', context('<Box display="|'))).toBe(true);
    expect(opensOn(' ', context('<Box |'))).toBe(false);
    expect(opensOn('x', context('<P>Some x|'))).toBe(false);
  });
});

describe('measure', () => {
  const measure = createMeasure(() => createStyleEngine({ classNames: 'readable', sink: 'string' }));

  it('answers with the declarations the engine wrote, and nothing for a value it refused', () => {
    expect(measure('p', 4)).toBe('padding: 1rem');
    expect(measure('fontSize', 14)).toBe('font-size: 0.875rem');
    expect(measure('display', 'flex')).toBe('display: flex');
    expect(measure('bgColor', 'blue-550')).toBe('');
  });

  it('samples a numeric prop around its example', () => {
    expect(numberSamples(4)).toEqual([2, 4, 8]);
    expect(numberSamples(14)).toEqual([7, 14, 28]);
    expect(numberSamples(undefined)).toEqual([1, 2, 4, 8]);
  });
});
