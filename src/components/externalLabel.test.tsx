import { cleanup, render } from '@testing-library/react';
import { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Checkbox from './checkbox';
import Combobox from './combobox';
import DateField from './dateField';
import DatePicker from './datePicker';
import RadioButton from './radioButton';
import RadioGroup from './radioGroup';
import Select from './select';
import Slider from './slider';
import Switch from './switch';
import Textarea from './textarea';
import Textbox from './textbox';
import TimeZoneSelect from './timeZoneSelect';

const people = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Grace Hopper' },
];

function renderLabelled(control: ReactElement) {
  const { container } = render(
    <>
      <label htmlFor="owner">Owner</label>
      {control}
    </>,
  );

  return { matches: container.querySelectorAll('[id="owner"]'), label: container.querySelector('label[for="owner"]') };
}

/** A control a `<label htmlFor>` can name carries the top-level `id` itself, and nothing else carries it. */
const labelable: [string, ReactElement][] = [
  ['Combobox', <Combobox key="c" id="owner" data={people} def={{ key: 'id', label: 'name' }} placeholder="Search people…" />],
  ['TimeZoneSelect', <TimeZoneSelect key="tz" id="owner" zones={['UTC', 'Europe/Chisinau']} defaultValue="UTC" />],
  ['Select', <Select key="s" id="owner" data={people} def={{ valueKey: 'id', displayKey: 'name' }} />],
  ['Textbox', <Textbox key="t" id="owner" />],
  ['Textarea', <Textarea key="ta" id="owner" />],
  ['Checkbox', <Checkbox key="cb" id="owner" />],
  ['Switch', <Switch key="sw" id="owner" />],
  ['RadioButton', <RadioButton key="rb" id="owner" value="a" />],
];

/** A group of spinbuttons, thumbs or radios is no labelable element: the `id` lands on the group, once (`labelledBy` names it). */
const groups: [string, ReactElement][] = [
  ['DateField', <DateField key="df" id="owner" defaultValue="2026-10-21" />],
  ['DatePicker', <DatePicker key="dp" id="owner" defaultValue="2026-10-21" />],
  ['DatePicker pickOnly', <DatePicker key="dpp" id="owner" defaultValue="2026-10-21" pickOnly />],
  ['Slider', <Slider key="sl" id="owner" defaultValue={10} />],
  [
    'RadioGroup',
    <RadioGroup key="rg" id="owner" name="plan">
      <RadioGroup.Item value="a" label="A" />
    </RadioGroup>,
  ],
];

describe('a top-level id', () => {
  ignoreLogs();
  afterEach(cleanup);

  it.each(labelable)('%s puts it on the control, which the label names', (_, control) => {
    const { matches, label } = renderLabelled(control);

    expect(matches).toHaveLength(1);
    const element = matches[0] as HTMLInputElement;
    expect(['INPUT', 'TEXTAREA', 'BUTTON']).toContain(element.tagName);
    expect(element.labels?.[0]).toBe(label);
  });

  it.each(groups)('%s puts it on one element', (_, control) => {
    const { matches } = renderLabelled(control);

    expect(matches).toHaveLength(1);
  });
});
