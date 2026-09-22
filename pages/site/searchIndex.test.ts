import { describe, expect, it } from 'vitest';
import { buildSearchIndex, pageSections, propSummary, RELEASE_TEXT_LIMIT } from './searchIndex';
import { SiteRoute } from './site';

/** The blocks a rendered page produces, the way the prerender pass reads them. */
function sections(html: string, maxText?: number) {
  const root = document.createElement('main');
  root.innerHTML = html;

  return pageSections(root, maxText === undefined ? {} : { maxText });
}

describe('pageSections', () => {
  it('opens a block at each heading and anchors it to the nearest id', () => {
    const found = sections('<div id="what"><h2>What a Box is</h2><div>One element, every style a prop.</div></div>');

    expect(found).toEqual([{ title: 'What a Box is', hash: 'what', text: 'One element, every style a prop.' }]);
  });

  it('keeps the lead above the first heading, with no title', () => {
    const found = sections('<div>Box renders on a server.</div><div id="rsc"><h2>No provider</h2><div>Nothing to import.</div></div>');

    expect(found[0]).toEqual({ title: '', text: 'Box renders on a server.' });
    expect(found[1].title).toBe('No provider');
  });

  it('titles a block by the label a component page gives it', () => {
    const found = sections('<div id="basic"><div data-md="label">Basic Button</div><div>Three variants.</div></div>');

    expect(found).toEqual([{ title: 'Basic Button', hash: 'basic', text: 'Three variants.' }]);
  });

  it('leaves out the code, the demo and the chrome, and keeps inline code', () => {
    const html =
      '<div id="css"><h2>The escape hatch</h2><div>Write <code>mixBlendMode</code> here.</div>' +
      '<div data-md="skip">A rendered demo</div><pre><code>const engine = createStyleEngine();</code></pre>' +
      '<nav>Next page</nav><button>Copy</button></div>';

    expect(sections(html)).toEqual([{ title: 'The escape hatch', hash: 'css', text: 'Write mixBlendMode here.' }]);
  });

  it('puts a space where a block ended, in a title and in the text', () => {
    const found = sections(
      '<h1><div>The React library your AI already knows.</div><div>Every prop is typed.</div></h1><p>One</p><p>Two</p>',
    );

    expect(found[0].title).toBe('The React library your AI already knows. Every prop is typed.');
    expect(found[0].text).toBe('One Two');
  });

  it('keeps the spaces around inline markup, which is where the prop names are', () => {
    expect(sections('<div>Write <code>p</code> = {4} for one rem.</div>')[0].text).toBe('Write p = {4} for one rem.');
  });

  it('ends a line at a table cell, which the markdown mirror never had to', () => {
    const html = '<table><tr><td><code>startingStyle</code></td><td>What a just-mounted element starts from</td></tr></table>';

    expect(sections(html)[0].text).toBe('startingStyle What a just-mounted element starts from');
  });

  it('has no hash for a page that carries no id', () => {
    expect(sections('<h2>Install it</h2><div>Two dependencies.</div>')[0].hash).toBeUndefined();
  });

  it('keeps a release note to its headings and the line under each', () => {
    const body = `<h2>Typed springs</h2><div>${'a spring is a curve and a settling time. '.repeat(20)}</div>`;
    const [first] = sections(body, RELEASE_TEXT_LIMIT);

    expect(first.title).toBe('Typed springs');
    expect(first.text.length).toBe(RELEASE_TEXT_LIMIT);
  });
});

describe('propSummary', () => {
  it('drops the backticks a JSDoc description writes prop names in', () => {
    expect(propSummary('Sets `padding` on every side.')).toBe('Sets padding on every side.');
  });

  it('cuts a long description at the sentence that runs past the line', () => {
    const summary = propSummary(`${'The divider is four, so p={4} is one rem. '.repeat(3)}And then a great deal more prose.`);

    expect(summary.endsWith('.')).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(160);
  });
});

describe('buildSearchIndex', () => {
  const route = { path: '/box', name: 'Box', description: 'The foundational component.' } satisfies SiteRoute;

  it('carries the route, its blocks and the props', () => {
    const index = buildSearchIndex({
      version: '2.1.0',
      pages: [{ route, sections: [{ title: 'Every prop', hash: 'finder', text: 'All of them.' }] }],
      props: [
        {
          name: 'fontSize',
          description: 'The text size. The divider is 16.',
          example: { css: 'font-size: 0.875rem' },
          values: ['small', 'large'],
        },
      ],
    });

    expect(index.version).toBe('2.1.0');
    expect(index.pages).toEqual([
      {
        path: '/box',
        name: 'Box',
        description: 'The foundational component.',
        sections: [{ title: 'Every prop', hash: 'finder', text: 'All of them.' }],
      },
    ]);
    expect(index.props).toEqual([
      { name: 'fontSize', description: 'The text size. The divider is 16.', css: 'font-size: 0.875rem', values: 'small, large' },
    ]);
  });
});
