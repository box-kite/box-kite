import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useControllableState, { ChangeHandler } from './useControllableState';

describe('useControllableState', () => {
  type Reason = 'trigger' | 'escape';

  function setup(options: { value?: boolean; defaultValue?: boolean; onChange?: ChangeHandler<boolean, Reason> } = {}) {
    return renderHook((props: typeof options) => useControllableState<boolean, Reason>({ defaultValue: false, ...props }), {
      initialProps: options,
    });
  }

  describe('uncontrolled', () => {
    it('starts at the default value and updates on set', () => {
      const { result } = setup();

      expect(result.current[0]).toBe(false);

      act(() => result.current[1](true, { reason: 'trigger' }));

      expect(result.current[0]).toBe(true);
    });

    it('drops a second call in the same handler that asks for the value the first already set', () => {
      const onChange = vi.fn();
      const { result } = setup({ onChange });

      act(() => {
        result.current[1](true, { reason: 'trigger' });
        result.current[1](true, { reason: 'escape' });
      });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('calls the default value factory once, not on every render', () => {
      const factory = vi.fn(() => 'first');
      const { rerender } = renderHook(() => useControllableState({ defaultValue: factory }));

      rerender();
      rerender();

      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('resolves an updater against the current value', () => {
      const { result } = setup();

      act(() => result.current[1]((current) => !current, { reason: 'trigger' }));
      act(() => result.current[1]((current) => !current, { reason: 'trigger' }));

      expect(result.current[0]).toBe(false);
    });
  });

  describe('controlled', () => {
    it('renders the value the consumer passes, not the one it was set to', () => {
      const { result } = setup({ value: false });

      act(() => result.current[1](true, { reason: 'trigger' }));

      expect(result.current[0]).toBe(false);
    });

    it('reports the change so the consumer can apply it', () => {
      const onChange = vi.fn();
      const { result, rerender } = setup({ value: false, onChange });

      act(() => result.current[1](true, { reason: 'trigger' }));
      rerender({ value: true, onChange });

      expect(onChange).toHaveBeenCalledWith(true, { reason: 'trigger' });
      expect(result.current[0]).toBe(true);
    });

    it('remembers a value it was set to, for a consumer that later stops passing one', () => {
      const { result, rerender } = setup({ value: false });

      act(() => result.current[1](true, { reason: 'trigger' }));
      rerender({});

      expect(result.current[0]).toBe(true);
    });

    it('asks again when the consumer refused the first request', () => {
      const onChange = vi.fn();
      const { result } = setup({ value: false, defaultValue: true, onChange });

      act(() => result.current[1](true, { reason: 'trigger' }));
      act(() => result.current[1](true, { reason: 'trigger' }));

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('change details', () => {
    it('hands the reason and the event to the consumer', () => {
      const onChange = vi.fn();
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      const { result } = setup({ onChange });

      act(() => result.current[1](true, { reason: 'escape', event }));

      expect(onChange).toHaveBeenCalledWith(true, { reason: 'escape', event });
    });

    it('says nothing when the value it is set to is the one it already holds', () => {
      const onChange = vi.fn();
      const { result } = setup({ defaultValue: true, onChange });

      act(() => result.current[1](true, { reason: 'trigger' }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls the handler it has now, not the one the setter closed over', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { result, rerender } = setup({ onChange: first });
      const setValue = result.current[1];

      rerender({ onChange: second });
      act(() => setValue(true, { reason: 'trigger' }));

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith(true, { reason: 'trigger' });
    });
  });

  it('keeps the same setter across renders, so an effect can depend on it', () => {
    const { result, rerender } = setup();
    const setValue = result.current[1];

    act(() => result.current[1](true, { reason: 'trigger' }));
    rerender({});

    expect(result.current[1]).toBe(setValue);
  });
});
