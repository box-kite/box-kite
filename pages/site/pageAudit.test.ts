import { describe, expect, it } from 'vitest';
import { auditPage, sitePath } from './pageAudit';

const head = { title: 'A page — Box Kite', description: 'What it is.' };

function audit(html: string, meta = head) {
  const root = document.createElement('div');
  root.innerHTML = html;

  return auditPage(root, meta);
}

describe('auditPage', () => {
  it('passes a page with one h1 and headings that step down one level at a time', () => {
    expect(audit('<h1>Page</h1><h2>A</h2><h3>A.1</h3><h2>B</h2>').problems).toEqual([]);
  });

  it('wants exactly one h1', () => {
    expect(audit('<h2>No title</h2>').problems).toEqual(['0 <h1> elements, expected exactly one']);
    expect(audit('<h1>One</h1><h1>Two</h1>').problems).toEqual(['2 <h1> elements, expected exactly one']);
  });

  it('reports a skipped level, where it happened', () => {
    expect(audit('<h1>Page</h1><h3>Card</h3>').problems).toEqual(['<h3> "Card" follows an <h1>, skipping a level']);
  });

  it('leaves a live demo’s headings to the demo', () => {
    expect(audit('<h1>Page</h1><h2>Demo</h2><div data-preview><h1>App</h1><h4>Deep</h4></div>').problems).toEqual([]);
  });

  it('holds the title and the description to what a search result shows', () => {
    const problems = audit('<h1>Page</h1>', { title: 'x'.repeat(61), description: 'y'.repeat(161) }).problems;

    expect(problems).toEqual([`the title is 61 characters, over 60: "${'x'.repeat(61)}"`, 'the description is 161 characters, over 160']);
  });

  it('wants every image named — an empty alt is a decision, a missing one is not', () => {
    const problems = audit(
      '<h1>Page</h1><img src="/a.png" alt=""><img src="/b.png"><svg role="img"></svg><svg role="img" aria-label="Chart"></svg>',
    ).problems;

    expect(problems).toEqual(['an <img> with no alt: /b.png', 'a role="img" with no name: <svg class="">']);
  });

  it('collects the site-relative links once each, leaving other hosts alone', () => {
    const { links } = audit(
      '<h1>Page</h1><a href="/box/#props">a</a><a href="/box">b</a><a href="//cdn.example.com/x">c</a><a href="https://example.com">d</a>',
    );

    expect(links).toEqual(['/box']);
  });
});

describe('sitePath', () => {
  it('drops the hash, the query and the trailing slash, and keeps the home page', () => {
    expect(sitePath('/blocks/react-settings-form/?x=1#install')).toBe('/blocks/react-settings-form');
    expect(sitePath('/')).toBe('/');
  });
});
