import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import RadioButton from './radioButton';

/** The look of the control. `radioButton.a11y.test.tsx` owns the pattern a user meets. */
describe('RadioButton', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const styles = () => (document.getElementById('box-kite-styles') as HTMLStyleElement | null)?.textContent ?? '';

  it('draws its dot in a colour the page chooses, and in system colours where the palette is gone', () => {
    render(<RadioButton name="plan" value="free" />);

    const css = styles();
    expect(css).toMatch(/\.\S+:checked::before\{mask-image:url\("data:image\/svg\+xml,/);
    expect(css).toMatch(/@media \(forced-colors: active\)\{\.\S+:checked\{background-color:Highlight\}\}/);
    expect(css).toMatch(/@media \(forced-colors: active\)\{\.\S+:checked::before\{background-color:HighlightText\}\}/);
  });

  // Every Box is a block, and Firefox stretches a block radio across its container (#318).
  it('is inline, like the checkbox beside it', () => {
    const { container } = render(<RadioButton name="plan" value="free" />);
    const input = container.querySelector('input') as HTMLInputElement;

    const css = styles();
    expect(input.className.split(' ').some((name) => css.includes(`.${name}{display:inline-block}`))).toBe(true);
  });
});
