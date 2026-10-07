import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Textarea from './textarea';
import Textbox from './textbox';

/**
 * `placeholder` is an attribute on an `<input>` and a pseudo-element on a Box, and both readings are
 * right — the same collision `Rect`'s `width` and `Path`'s `d` have. A string is the text, an object is
 * the `::placeholder` styles, and both at once puts the text in `props`, where attributes go.
 */
describe('the placeholder prop', () => {
  afterEach(() => {
    cleanup();
  });

  const css = () => (document.getElementById('box-kite-styles') as HTMLStyleElement | null)?.textContent ?? '';

  it('is the attribute when it is a string', () => {
    render(<Textbox placeholder="Search projects" />);

    expect(screen.getByPlaceholderText('Search projects')).toBeTruthy();
  });

  it('is the ::placeholder styles when it is an object, and writes no attribute', () => {
    render(<Textbox placeholder={{ color: 'red-500' }} props={{ 'aria-label': 'Query' }} />);

    expect(css()).toContain('::placeholder{color:var(--red-500,oklch(63.7% .237 25.3))}');
    expect(screen.getByLabelText('Query').getAttribute('placeholder')).toBe(null);
  });

  it('takes both at once, with the text where every other attribute goes', () => {
    render(<Textbox props={{ placeholder: 'Search projects' }} placeholder={{ fontStyle: 'italic' }} />);

    expect(screen.getByPlaceholderText('Search projects')).toBeTruthy();
    expect(css()).toContain('::placeholder{font-style:italic}');
  });

  it('works the same on a Textarea', () => {
    render(<Textarea placeholder="Notes" />);

    expect(screen.getByPlaceholderText('Notes')).toBeTruthy();
  });
});
