'use client';
import Button from '@box-kite/react/components/button';
import Dropdown from '@box-kite/react/components/dropdown';
import Flex from '@box-kite/react/components/flex';
import Form from '@box-kite/react/components/form';
import RadioGroup from '@box-kite/react/components/radioGroup';
import { H2, Label, P, Span } from '@box-kite/react/components/semantics';
import Slider from '@box-kite/react/components/slider';
import Switch from '@box-kite/react/components/switch';
import Textarea from '@box-kite/react/components/textarea';
import Textbox from '@box-kite/react/components/textbox';
import { toast } from '@box-kite/react/components/toaster';
import { type ReactNode, useId } from 'react';

/**
 * A settings panel: text fields, a searchable select, a radio group, a slider and a switch, each a real
 * form control. `Form` reads its own fields when it submits, so none of this needs state — `values` is
 * built from the elements carrying a `name`.
 *
 * `<Toaster />` has to be mounted once near the root of the app for the confirmation to show.
 */
export interface Settings {
  name: string;
  email: string;
  bio: string;
  timezone: string;
  theme: string;
  density: string;
  notify: boolean;
}

const TIMEZONES = ['Europe/Chisinau', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];

/**
 * A text field and its name. The control sits *inside* the `<label>`, so the two are associated with no
 * `htmlFor`/`id` pair to keep in step. `Dropdown`, `RadioGroup` and `Switch` draw their own label from a
 * `label` prop, so they are written bare below.
 */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Label display="flex" d="column" gap={2} width="fit">
      <Span fontSize={14} fontWeight={500}>
        {label}
      </Span>
      {children}
      {hint && (
        <Span fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
          {hint}
        </Span>
      )}
    </Label>
  );
}

export default function SettingsForm() {
  // A Slider's `label` names the thumb and draws nothing, and no `<label>` can wrap it, so the caption is an
  // element `labelledBy` points at — with `useId`'s id, so two forms on one page do not label each other's slider.
  const densityLabel = useId();

  return (
    <Form<Settings>
      p={6}
      b={1}
      borderRadius={3}
      borderColor="slate-200"
      bgColor="white"
      theme={{ dark: { borderColor: 'slate-800', bgColor: 'slate-900' } }}
      onSubmit={(values) => toast.success('Settings saved', { description: `${values.name || 'Your profile'} is up to date.` })}
    >
      <H2 fontSize={20} fontWeight={600}>
        Settings
      </H2>
      <P mt={1} mb={5} fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
        Every control here is a native element with its name attached, so the keyboard, the focus ring and the screen reader are the
        platform&apos;s.
      </P>

      <Flex d="column" gap={5}>
        <Flex d="column" gap={5} md={{ d: 'row' }}>
          <Field label="Display name">
            <Textbox name="name" defaultValue="Ada Lovelace" width="fit" />
          </Field>
          <Field label="Email">
            <Textbox name="email" type="email" defaultValue="ada@example.com" width="fit" />
          </Field>
        </Flex>

        <Field label="About" hint="Shown on your public profile.">
          <Textarea name="bio" rows={3} placeholder="A sentence or two." width="fit" />
        </Field>

        <Dropdown<string> name="timezone" label="Time zone" defaultValue={TIMEZONES[0]} isSearchable searchPlaceholder="Search zones…">
          {TIMEZONES.map((zone) => (
            <Dropdown.Item key={zone} value={zone}>
              {zone}
            </Dropdown.Item>
          ))}
        </Dropdown>

        <RadioGroup label="Theme" name="theme" defaultValue="system" orientation="horizontal">
          <RadioGroup.Item value="system" label="Follow the system" />
          <RadioGroup.Item value="light" label="Light" />
          <RadioGroup.Item value="dark" label="Dark" />
        </RadioGroup>

        <Flex d="column" gap={2}>
          <Span id={densityLabel} fontSize={14} fontWeight={500}>
            Row density
          </Span>
          <Slider name="density" labelledBy={densityLabel} defaultValue={44} min={32} max={64} step={4} format={(value) => `${value}px`} />
          <Span fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
            How tall a row is in tables across the app.
          </Span>
        </Flex>

        <Switch name="notify" label="Email me when something needs a decision" defaultChecked />
      </Flex>

      <Flex mt={6} gap={3} jc="end">
        <Button variant="secondary" type="reset">
          Reset
        </Button>
        <Button type="submit">Save changes</Button>
      </Flex>
    </Form>
  );
}
