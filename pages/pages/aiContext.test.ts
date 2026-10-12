import { describe, expect, it } from 'vitest';
import { CHECK_EXAMPLES, checkProps, CURSOR_INSTALL_URL, parseProps, playgroundSnippet, VSCODE_INSTALL_URL } from './aiContext';

const check = (source: string) => {
  const parsed = parseProps(source);
  if (!parsed.ok) throw new Error(parsed.error);

  return checkProps(parsed.props);
};

describe('the one-click installs', () => {
  it('hand Cursor the server as its mcp.json entry', () => {
    const config = new URL(CURSOR_INSTALL_URL).searchParams.get('config')!;

    expect(CURSOR_INSTALL_URL).toMatch(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=box-kite&/);
    expect(JSON.parse(atob(config))).toEqual({ command: 'npx', args: ['-y', '@box-kite/mcp'] });
  });

  it('hand VS Code the object --add-mcp takes', () => {
    const json = decodeURIComponent(VSCODE_INSTALL_URL.replace('vscode:mcp/install?', ''));

    expect(JSON.parse(json)).toEqual({ name: 'box-kite', command: 'npx', args: ['-y', '@box-kite/mcp'] });
  });
});

describe('parseProps', () => {
  it('reads strings, numbers, booleans and object literals, with or without the element around them', () => {
    expect(parseProps(`<Box p={4} bgColor="blue-500" hover={{ bgColor: 'blue-600', }} hidden />`)).toEqual({
      ok: true,
      props: [
        ['p', 4],
        ['bgColor', 'blue-500'],
        ['hover', { bgColor: 'blue-600' }],
        ['hidden', true],
      ],
    });
  });

  it('hands the playground the same props as an element it can render', () => {
    expect(playgroundSnippet('<Box p={4}\n  bgColor="sky-500" />')).toBe(
      '<Box p={4} bgColor="sky-500">\n  Edit a prop and watch the CSS\n</Box>',
    );
  });

  it('says what is wrong instead of guessing', () => {
    expect(parseProps('p={4')).toMatchObject({ ok: false, error: 'The braces after p do not close.' });
    expect(parseProps('p=4')).toMatchObject({ ok: false, error: 'The value of p goes in quotes or braces.' });
    expect(parseProps('p={someVariable}')).toMatchObject({ ok: false });
  });
});

describe('checkProps', () => {
  it('gives the four verdicts check_styles gives, measured on the engine', () => {
    const [p, bgColor, fontSize, href] = check(CHECK_EXAMPLES[0].source);

    expect(p).toMatchObject({ verdict: 'ok', written: 'p={4}' });
    expect(p.css).toContain('padding:1rem');
    expect(bgColor).toMatchObject({ verdict: 'rejected', css: '' });
    expect(bgColor.note).toContain('Did you mean "blue-500"');
    expect(fontSize.verdict).toBe('misread');
    expect(fontSize.note).toContain('fontSize={16}');
    expect(href.verdict).toBe('attribute');
  });

  it('measures a nested block and calls an invented name what it is', () => {
    const [hover, padding] = check(`hover={{ bgColor: 'indigo-600' }} padding={4}`);

    expect(hover.verdict).toBe('ok');
    expect(hover.css).toContain(':hover');
    expect(padding).toMatchObject({ verdict: 'unknown', css: '' });
  });

  it('keeps every example readable, and the clean one clean', () => {
    for (const example of CHECK_EXAMPLES) expect(parseProps(example.source).ok).toBe(true);
    expect(check(CHECK_EXAMPLES[3].source).every((row) => row.verdict === 'ok')).toBe(true);
  });
});
