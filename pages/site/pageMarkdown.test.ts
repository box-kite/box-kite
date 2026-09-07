import { describe, expect, it } from 'vitest';
import { elementMarkdown, markdownHref, markdownPath, pageMarkdown } from './pageMarkdown';
import { SiteRoute } from './site';

const SITE = 'https://example.test';

/** The markdown of a fragment of rendered page, the way the prerender pass converts one. */
function convert(html: string): string {
  const root = document.createElement('main');
  root.innerHTML = html;

  return elementMarkdown(root, SITE);
}

describe('markdownPath', () => {
  it('appends .md, and names the home page index', () => {
    expect(markdownPath('/box')).toBe('/box.md');
    expect(markdownPath('/releases/1.0.0')).toBe('/releases/1.0.0.md');
    expect(markdownPath('/')).toBe('/index.md');
  });

  it('ignores the trailing slash the canonical form carries', () => {
    expect(markdownPath('/box/')).toBe('/box.md');
  });
});

describe('markdownHref', () => {
  it('points an internal link at the markdown copy of its page', () => {
    expect(markdownHref('/installation', SITE)).toBe(`${SITE}/installation.md`);
    expect(markdownHref('/variants#groups', SITE)).toBe(`${SITE}/variants.md#groups`);
  });

  it('leaves a file and an external address alone', () => {
    expect(markdownHref('/llms.txt', SITE)).toBe(`${SITE}/llms.txt`);
    expect(markdownHref('https://github.com/box-kite/box-kite', SITE)).toBe('https://github.com/box-kite/box-kite');
    expect(markdownHref('#top', SITE)).toBe('#top');
  });
});

describe('elementMarkdown', () => {
  it('turns headings into their level, and prose in a Box into a paragraph', () => {
    const markdown = convert('<div id="concept"><h2>A class, not a style attribute</h2><div>Every prop is a closed typed set.</div></div>');

    expect(markdown).toBe('## A class, not a style attribute\n\nEvery prop is a closed typed set.');
  });

  it('keeps the inline markup a sentence carries', () => {
    const markdown = convert('<div>The cost is <code>mix-blend-mode</code>, and <strong>that is the feature</strong>.</div>');

    expect(markdown).toBe('The cost is `mix-blend-mode`, and **that is the feature**.');
  });

  it('fences a code block under the language its class names', () => {
    const markdown = convert('<pre class="language-jsx"><code class="language-jsx">&lt;Box p={4} /&gt;\n</code></pre>');

    expect(markdown).toBe('```jsx\n<Box p={4} />\n```');
  });

  it('writes a table as a table', () => {
    const markdown = convert(
      '<table><thead><tr><th>Key</th><th>What happens</th></tr></thead><tbody><tr><td><code>Enter</code></td><td>Chooses it</td></tr></tbody></table>',
    );

    expect(markdown).toBe('| Key | What happens |\n| --- | --- |\n| `Enter` | Chooses it |');
  });

  it('keeps a list a list, nested items included', () => {
    const markdown = convert('<ul><li>A typed prop<ul><li>if one exists</li></ul></li><li>Then <code>css</code></li></ul>');

    expect(markdown).toBe('- A typed prop\n  - if one exists\n- Then `css`');
  });

  it('leaves out a control or a rendered demo, and bolds a label', () => {
    const markdown = convert(
      '<div data-md="label">A property with no prop</div><div data-md="skip">400 rows of mock data</div><div>The snippet.</div>',
    );

    expect(markdown).toBe('**A property with no prop**\n\nThe snippet.');
  });

  it('puts the separator back between chips written with no whitespace between them', () => {
    const markdown = convert('<div data-md="inline"><code>display</code><code>inline</code></div>');

    expect(markdown).toBe('`display` · `inline`');
  });

  it('separates the blocks a card wrapped in one link is built from', () => {
    const markdown = convert('<a href="/releases/1.0.0"><div>Box Kite 1.0.0</div><div>Latest</div></a>');

    expect(markdown).toBe(`[Box Kite 1.0.0 Latest](${SITE}/releases/1.0.0.md)`);
  });

  it('renders nothing for the chrome around a page', () => {
    expect(convert('<nav><a href="/box">Box</a></nav><button>Copy</button><svg><path d="M0 0" /></svg>')).toBe('');
  });
});

describe('pageMarkdown', () => {
  const route: SiteRoute = { path: '/escape-hatch', name: 'Escape Hatch', description: 'The css prop.' };

  it('keeps the page own heading, and says which address it is a copy of', () => {
    const file = pageMarkdown({ route, body: '# Escape Hatch\n\nThe 5%.', version: '1.2.3', siteUrl: SITE });

    expect(file.startsWith(`# Escape Hatch\n\n_Box Kite 1.2.3 · a markdown copy of ${SITE}/escape-hatch/_\n\nThe 5%.`)).toBe(true);
  });

  it('gives a page that rendered no heading the name its route carries', () => {
    const file = pageMarkdown({ route, body: 'The 5%.', version: '1.2.3', siteUrl: SITE });

    expect(file.startsWith('# Escape Hatch\n')).toBe(true);
    expect(file).toContain('The 5%.');
  });

  it('ends on the two files an agent reads next', () => {
    const file = pageMarkdown({ route, body: '# Escape Hatch\n\nThe 5%.', version: '1.2.3', siteUrl: SITE });

    expect(file.trimEnd().endsWith(`_Every page: ${SITE}/llms.txt · every prop, measured: ${SITE}/props.md_`)).toBe(true);
  });
});
