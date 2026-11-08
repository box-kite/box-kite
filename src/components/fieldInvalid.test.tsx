import { cleanup, render } from '@testing-library/react';
import { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Combobox from './combobox';
import Select from './select';
import Textarea from './textarea';
import Textbox from './textbox';

const people = [{ id: 1, name: 'Ada Lovelace' }];

/** Each field's frame, the element that draws the border, rendered plain and with `aria-invalid` on the control. */
const fields: [string, (invalid: boolean) => ReactElement, (container: HTMLElement) => Element][] = [
  [
    'Combobox',
    (invalid) => <Combobox data={people} def={{ key: 'id', label: 'name' }} props={{ 'aria-invalid': invalid || undefined }} />,
    // `aria-invalid` is on the input; the border belongs to the shell around it.
    (container) => container.querySelector('[role="combobox"]')!.parentElement!,
  ],
  ['Textbox', (invalid) => <Textbox props={{ 'aria-invalid': invalid || undefined }} />, (container) => container.querySelector('input')!],
  [
    'Textarea',
    (invalid) => <Textarea props={{ 'aria-invalid': invalid || undefined }} />,
    (container) => container.querySelector('textarea')!,
  ],
  [
    'Select',
    (invalid) => <Select data={people} def={{ valueKey: 'id', displayKey: 'name' }} props={{ 'aria-invalid': invalid || undefined }} />,
    (container) => container.querySelector('[role="combobox"]')!,
  ],
];

/** The unthemed, unhovered rules painting a red border that apply to `element`. */
function redBorderRulesMatching(element: Element): string[] {
  const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('');

  return css
    .split('}')
    .filter((rule) => rule.includes('{border-color:var(--red-500') && !rule.startsWith('@'))
    .map((rule) => rule.slice(0, rule.indexOf('{')))
    .filter((selector) => !selector.includes(':hover') && !selector.includes(':focus') && element.matches(selector));
}

describe('an invalid field', () => {
  ignoreLogs();
  afterEach(cleanup);

  // happy-dom resolves no `var()` fallback in a border colour, so the question is asked of the selectors instead.
  it.each(fields)('%s draws its border in the error colour', (_, field, frameOf) => {
    expect(redBorderRulesMatching(frameOf(render(field(false)).container))).toEqual([]);
    cleanup();
    expect(redBorderRulesMatching(frameOf(render(field(true)).container))).not.toEqual([]);
  });
});
