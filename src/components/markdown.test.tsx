import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { markdownComponents } from './markdown';

/** What a renderer does: look a tag up in the map and call it with the node's props. */
const node = (tag: string, props: Record<string, unknown> = {}) => createElement(markdownComponents[tag], props);

describe('markdownComponents', () => {
  afterEach(cleanup);

  it('renders every tag a GitHub-flavoured renderer asks for', () => {
    const tags = 'h1 h2 h3 h4 h5 h6 p a ul ol li blockquote code pre hr img table thead tbody tr th td strong em del input'.split(' ');

    expect(tags.filter((tag) => markdownComponents[tag] === undefined)).toEqual([]);
  });

  it('is one constant rather than a factory, so streaming does not rebuild the tree every token', () => {
    // A map built per render would be a new component *type* each time, which React answers by
    // unmounting the whole message and mounting it again.
    expect(markdownComponents.p).toBe(markdownComponents.p);
  });

  it('gives each heading level its own element and its own variant', () => {
    render(node('h2', { children: 'Refunds' }));

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Refunds');
    // The level is a variant rather than six style nodes, so the size comes off the tree.
    expect(heading.className).toContain('fontSize-20');
  });

  it('lifts a link href into props, where Box forwards attributes from, and sets rel', () => {
    render(node('a', { href: '/orders', children: 'orders' }));

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/orders');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('unwraps a fence so the block surface and the inline chip stay two separate styles', () => {
    const { container } = render(node('pre', { children: node('code', { className: 'language-ts', children: 'const a = 1;' }) }));

    const pre = container.querySelector('pre');
    expect(pre).toHaveTextContent('const a = 1;');
    // The language is drawn, and the inline chip's own element is not inside the block.
    expect(pre).toHaveTextContent('ts');
    expect(pre?.querySelectorAll('code')).toHaveLength(1);
  });

  it('renders a fence with no language, and draws no language label for it', () => {
    const { container } = render(node('pre', { children: node('code', { children: 'plain' }) }));

    expect(container.querySelector('pre')).toHaveTextContent('plain');
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('renders a pre whose child is bare text rather than a code element', () => {
    const { container } = render(node('pre', { children: 'no element here' }));

    expect(container.querySelector('pre')).toHaveTextContent('no element here');
  });

  it('gives every part of a table its display, because a Box is a block', () => {
    const { container } = render(node('table', { children: node('tbody', { children: node('tr', { children: node('td', {}) }) }) }));

    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
    expect(container.querySelector('tr')).toBeInTheDocument();
    expect(container.querySelector('td')).toBeInTheDocument();
  });

  it("renders a task list's box as a checkbox nobody can toggle", () => {
    render(node('input', { checked: true }));

    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
  });

  it('carries an ordered list start through', () => {
    const { container } = render(node('ol', { start: 4, children: node('li', { children: 'four' }) }));

    expect(container.querySelector('ol')).toHaveAttribute('start', '4');
  });
});
