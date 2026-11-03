import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Checkbox from './checkbox';

/**
 * The API around the control — the label it renders and the mixed state it reports.
 * `checkbox.a11y.test.tsx` owns the pattern a user meets.
 */
describe('Checkbox', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const checkbox = () => screen.getByRole('checkbox') as HTMLInputElement;

  it('renders a bare input when there is no label, so nothing wraps what a consumer laid out', () => {
    const { container } = render(<Checkbox name="terms" />);

    expect(container.querySelector('label')).toBeNull();
    expect(container.firstElementChild).toBe(checkbox());
  });

  it('wraps the input in the label that names it', () => {
    render(<Checkbox name="terms" label="Accept the terms" />);

    expect(screen.getByRole('checkbox', { name: 'Accept the terms' })).toBe(checkbox());
    expect(checkbox().closest('label')).not.toBeNull();
  });

  it('toggles when the label text is clicked, since the label is the one the input is inside', () => {
    render(<Checkbox name="terms" label="Accept the terms" />);

    fireEvent.click(screen.getByText('Accept the terms'));

    expect(checkbox().checked).toBe(true);
  });

  it('styles the label element through labelProps without touching the box itself', () => {
    render(<Checkbox name="terms" label="Accept" labelProps={{ gap: 4 }} />);

    const label = checkbox().closest('label')!;

    expect(label.className).not.toBe(checkbox().className);
    expect(label.className).toContain('gap-4');
  });

  it('sets the indeterminate property and reports the mixed state to assistive technology', () => {
    render(<Checkbox name="terms" indeterminate />);

    expect(checkbox().indeterminate).toBe(true);
    expect(checkbox().getAttribute('aria-checked')).toBe('mixed');
  });

  it('drops both again when the flag goes away', () => {
    const { rerender } = render(<Checkbox name="terms" indeterminate />);

    rerender(<Checkbox name="terms" indeterminate={false} />);

    expect(checkbox().indeterminate).toBe(false);
    expect(checkbox().getAttribute('aria-checked')).toBeNull();
  });

  it('reads the state out of the tuple form, where it arrives beside the styles for it', () => {
    render(<Checkbox name="terms" indeterminate={[true, { opacity: 0.6 }]} />);

    expect(checkbox().indeterminate).toBe(true);
  });

  it('styles the mixed state without entering it when the tuple says false', () => {
    render(<Checkbox name="terms" indeterminate={[false, { opacity: 0.6 }]} />);

    expect(checkbox().indeterminate).toBe(false);
    expect(checkbox().getAttribute('aria-checked')).toBeNull();
  });

  // The types only allow a boolean or the tuple, so this is what a JavaScript consumer can still
  // reach: bare styles where the state belongs. `Boolean(styles)` is `true`, which would have
  // pinned the control in the mixed state it was only meant to describe.
  it('does not become indeterminate because a JS caller passed styles alone', () => {
    render(<Checkbox name="terms" {...({ indeterminate: { opacity: 0.6 } } as Record<string, unknown>)} />);

    expect(checkbox().indeterminate).toBe(false);
    expect(checkbox().getAttribute('aria-checked')).toBeNull();
  });

  it('draws its mark in a colour the page chooses, and in system colours where the palette is gone', () => {
    render(<Checkbox name="terms" />);

    const css = (document.getElementById('box-kite-styles') as HTMLStyleElement | null)?.textContent ?? '';

    // The tick is a shape painted by `bgColor`, not an image with white baked in: a theme or a design
    // recolours it, and a forced-colors mode can turn it into `HighlightText` (#317).
    expect(css).toMatch(/\.\S+:checked::before\{mask-image:url\("data:image\/svg\+xml,/);
    expect(css).toMatch(/\.\S+:indeterminate::before\{mask-image:url\("data:image\/svg\+xml,/);
    expect(css).toMatch(/\.\S+:checked::before\{background-color:var\(--white,#fff\)\}/);
    expect(css).toMatch(/@media \(forced-colors: active\)\{\.\S+:checked\{background-color:Highlight\}\}/);
    expect(css).toMatch(/@media \(forced-colors: active\)\{\.\S+:checked::before\{background-color:HighlightText\}\}/);
    // A dark theme's fill is the more specific rule, so the pair is repeated inside it.
    expect(css).toMatch(/@media \(forced-colors: active\)\{@scope \(\.dark\)[^{]*\{[^{}]*:checked\{background-color:Highlight\}/);
  });
});
