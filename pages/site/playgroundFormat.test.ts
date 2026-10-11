import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as prettier from 'prettier/standalone';
import { describe, expect, it } from 'vitest';
import { PLAYGROUND_EXAMPLES } from './playgroundExamples';
import { caretAfterFormat, formatSnippet } from './playgroundFormat';

const format = (code: string) =>
  prettier.format(code, { parser: 'babel-ts', printWidth: 80, singleQuote: true, trailingComma: 'all', plugins: [babel, estree] });

describe('formatSnippet', () => {
  it('formats a bare element without the semicolon a program would give it', async () => {
    expect(await formatSnippet('<Box   p={4}  hover={{scale:1.1}}>Hi</Box>', format)).toBe(
      '<Box p={4} hover={{ scale: 1.1 }}>\n  Hi\n</Box>',
    );
  });

  it('keeps a leading JSX comment a comment, not a block', async () => {
    expect(await formatSnippet('{/* Flip it */}\n<Flex   gap={3}><Box>a</Box></Flex>', format)).toBe(
      '{/* Flip it */}\n<Flex gap={3}>\n  <Box>a</Box>\n</Flex>',
    );
  });

  it('formats the setup above a demo as code, and the demo as JSX', async () => {
    expect(await formatSnippet("const items:string[]=['a']\n<Ul>{items.map((i)=><Li key={i}>{i}</Li>)}</Ul>", format)).toBe(
      "const items: string[] = ['a'];\n\n<Ul>\n  {items.map((i) => (\n    <Li key={i}>{i}</Li>\n  ))}\n</Ul>",
    );
  });

  it('formats a component declaration, and two elements side by side', async () => {
    expect(await formatSnippet('function Demo(){return <Button>Go</Button>}', format)).toBe(
      'function Demo() {\n  return <Button>Go</Button>;\n}',
    );
    expect(await formatSnippet('<Box>a</Box>\n<Box>b</Box>', format)).toBe('<Box>a</Box>\n<Box>b</Box>');
  });

  it('gives up on a snippet nothing can parse, rather than mangling it', async () => {
    expect(await formatSnippet('<Box p={4}', format)).toBeNull();
  });

  /** The examples are what a reader formats first, so each must already be in the shape Ctrl+S gives it. */
  it.each(PLAYGROUND_EXAMPLES.map((example) => [example.id, example.source]))('leaves the %s example as it is', async (_id, source) => {
    expect(await formatSnippet(source, format)).toBe(source);
  });
});

describe('caretAfterFormat', () => {
  it('keeps the caret after the same visible character', () => {
    const before = '<Box   p={4}>Hi</Box>';
    const after = '<Box p={4}>\n  Hi\n</Box>';

    expect(caretAfterFormat(before, before.indexOf('Hi') + 1, after)).toBe(after.indexOf('Hi') + 1);
    expect(caretAfterFormat(before, 0, after)).toBe(0);
    expect(caretAfterFormat(before, before.length, after)).toBe(after.length);
  });
});
