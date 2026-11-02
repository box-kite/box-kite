import { cleanup, fireEvent, render } from '@testing-library/react';
import { createRef, Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FormUtils from '../utils/form/formUtils';
import Form from './form';

function renderForm(ref?: Ref<HTMLFormElement>, tagRef?: Ref<HTMLFormElement>) {
  const onSubmit = vi.fn();
  render(
    <Form ref={ref} props={tagRef ? ({ ref: tagRef } as object) : undefined} onSubmit={onSubmit}>
      <input name="email" defaultValue="ada@example.com" />
    </Form>,
  );
  fireEvent.submit(document.querySelector('form')!);

  return onSubmit;
}

describe('Form', () => {
  afterEach(() => {
    cleanup();
  });

  it('reads its entries and hands the caller its element through an object ref', () => {
    const ref = createRef<HTMLFormElement>();
    const onSubmit = renderForm(ref);

    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' }, expect.anything());
    expect(ref.current).toBe(document.querySelector('form'));
  });

  it('does the same through a callback ref', () => {
    const ref = vi.fn();
    const onSubmit = renderForm(ref);

    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' }, expect.anything());
    expect(ref).toHaveBeenCalledWith(document.querySelector('form'));
  });

  it('does the same through a ref in `props`', () => {
    const ref = createRef<HTMLFormElement>();
    const onSubmit = renderForm(undefined, ref);

    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' }, expect.anything());
    expect(ref.current).toBe(document.querySelector('form'));
  });

  it('hands the element to both refs when it is given two', () => {
    const ref = createRef<HTMLFormElement>();
    const tagRef = createRef<HTMLFormElement>();
    const onSubmit = renderForm(ref, tagRef);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(ref.current).toBe(document.querySelector('form'));
    expect(tagRef.current).toBe(document.querySelector('form'));
  });

  it('says what went wrong when its entries are read with no form, rather than a TypeError on null', () => {
    expect(() => FormUtils.getFormEntries(null as unknown as HTMLFormElement)).toThrow(
      '[box-kite] <Form> read its entries with no <form> element',
    );
  });
});
