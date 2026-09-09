import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useIdentifier from './useIdentifier';

describe('useIdentifier', () => {
  afterEach(() => {
    cleanup();
  });

  it('is stable across renders', () => {
    const { result, rerender } = renderHook(() => useIdentifier());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('is different for every instance', () => {
    const seen = new Set<string>();

    function Labelled() {
      seen.add(useIdentifier('field'));
      return null;
    }

    render(
      <>
        <Labelled />
        <Labelled />
        <Labelled />
      </>,
    );

    expect(seen.size).toBe(3);
  });

  it('carries the prefix it was given', () => {
    const { result } = renderHook(() => useIdentifier('listbox'));

    expect(result.current.startsWith('listbox-')).toBe(true);
  });

  it('holds nothing a CSS selector cannot address', () => {
    const { result } = renderHook(() => useIdentifier());

    // React's own ids are `:r1:` (18) or `«r1»` (19), neither of which survives
    // `querySelector('#…')` — the punctuation is stripped for exactly this.
    expect(result.current).toMatch(/^[\w-]+$/);
  });

  /**
   * The peer range starts at React 16.14, which has no `useId` — and CI runs the suite against 18
   * and 19 only, so this is the one place the fallback is exercised at all.
   */
  it('falls back to a counter on a React without useId', async () => {
    vi.resetModules();
    vi.doMock('react', async () => {
      const actual = await vi.importActual<typeof import('react')>('react');

      return { ...actual, default: { ...actual, useId: undefined }, useId: undefined };
    });

    try {
      const legacy = (await import('./useIdentifier')).default;
      const { renderHook: renderLegacy } = await import('@testing-library/react');

      const first = renderLegacy(() => legacy('field'));
      const second = renderLegacy(() => legacy('field'));

      expect(first.result.current).toMatch(/^field-\d+$/);
      expect(second.result.current).not.toBe(first.result.current);
    } finally {
      vi.doUnmock('react');
      vi.resetModules();
    }
  });

  it('wires one element to another', () => {
    function Field() {
      const id = useIdentifier('field');

      return (
        <>
          <span id={`${id}-label`}>Email</span>
          <input aria-labelledby={`${id}-label`} />
        </>
      );
    }

    render(<Field />);

    expect(screen.getByRole('textbox')).toHaveAccessibleName('Email');
    expect(document.querySelector(`#${screen.getByRole('textbox').getAttribute('aria-labelledby')}`)).toBeInTheDocument();
  });
});
