import { ChevronDown, Keyboard, ListTree, Tags } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Dropdown from '../../src/components/dropdown';
import Flex from '../../src/components/flex';
import Select from '../../src/components/select';
import { H2, H3 } from '../../src/components/semantics';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

interface User {
  id: number;
  name: string;
  role: string;
}

const users: User[] = [
  { id: 1, name: 'John Doe', role: 'Admin' },
  { id: 2, name: 'Joe Smith', role: 'Editor' },
  { id: 3, name: 'Alice Brown', role: 'Viewer' },
  { id: 4, name: 'Bob Wilson', role: 'Editor' },
];

export default function DropdownPage() {
  useTableOfContents(sidebarLinks);
  const [selectedValue, setSelectedValue] = useState<number>(2);

  return (
    <Box>
      <PageHeader icon={ChevronDown} title="Dropdown" description="Use Dropdown component to choose option(s) from a list." />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Dropdown from '@box-kite/react/components/dropdown';" />

          <Code
            id="basic"
            label="Basic Dropdown"
            language="jsx"
            code={`<Dropdown label="Choice" defaultValue={1}>
  <Dropdown.Item value={1}>Option 1</Dropdown.Item>
  <Dropdown.Item value={2}>Option 2</Dropdown.Item>
</Dropdown>`}
          >
            <Dropdown label="Choice" defaultValue={1} width={50}>
              <Dropdown.Item value={1}>Option 1</Dropdown.Item>
              <Dropdown.Item value={2}>Option 2</Dropdown.Item>
              {[3, 4].map((x) => (
                <Dropdown.Item value={x} key={x}>
                  Option {x}
                </Dropdown.Item>
              ))}
            </Dropdown>
          </Code>

          <Section id="a11y" title="Keyboard and roles">
            <Box>
              This is the APG combobox, whole — in both of its shapes. The trigger is a <Mono>role="combobox"</Mono> that keeps DOM focus
              the entire time; the popup is a <Mono>role="listbox"</Mono> of <Mono>role="option"</Mono> rows, and the option the arrows are
              on is named by <Mono>aria-activedescendant</Mono> rather than focused. Add <Mono>isSearchable</Mono> and the combobox becomes
              the text field instead of a button. You write none of that — and if you were writing it by hand before, delete it.
            </Box>
            <Flex d="column" gap={3} mt={4}>
              <Note icon={Tags} title="Give it a label">
                A combobox is not named by what it contains: the text in the trigger is its <em>value</em>. Pass <Mono>label</Mono> and the
                component renders it and wires <Mono>aria-labelledby</Mono> — or pass your own <Mono>aria-label</Mono> in <Mono>props</Mono>
                . Without either, the control has no accessible name, exactly like an input with only a placeholder.
              </Note>
              <Note icon={ListTree} title="Clear and Select all are options too">
                <Mono>Dropdown.Unselect</Mono> and <Mono>Dropdown.SelectAll</Mono> sit inside the listbox, so they carry{' '}
                <Mono>role="option"</Mono> and the arrow keys reach them like any other row.
              </Note>
              <Note icon={Keyboard} title="Searchable is the editable combobox">
                With <Mono>isSearchable</Mono> the text field <em>is</em> the combobox — the role, the ARIA and anything you pass in{' '}
                <Mono>props</Mono> live on the input, so nothing focusable sits inside anything else focusable. It is a different keyboard
                map, in the second table below: the printable keys type instead of navigating, and only Down and Up reach the listbox.
              </Note>
            </Flex>
            <Box mt={6}>
              <H3 fontSize={15} fontWeight={600} mb={3} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                Select-only — the default
              </H3>
              <KeyTable rows={interactions} />
            </Box>
            <Box mt={6}>
              <H3 fontSize={15} fontWeight={600} mb={3} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                Editable — with isSearchable
              </H3>
              <KeyTable rows={editableInteractions} />
            </Box>
          </Section>

          <Code
            id="controlled"
            label="Controlled Dropdown"
            language="jsx"
            code={`const [selectedValue, setSelectedValue] = useState<number>(2);

<Dropdown value={selectedValue} onChange={(value) => setSelectedValue(value!)}>
  <Dropdown.Item value={1}>Option 1</Dropdown.Item>
  <Dropdown.Item value={2}>Option 2</Dropdown.Item>
  <Dropdown.Item value={3}>Option 3</Dropdown.Item>
</Dropdown>`}
          >
            <Flex gap={4}>
              <Dropdown value={selectedValue} onChange={(value) => setSelectedValue(value!)} width={50}>
                <Dropdown.Item value={1}>Option 1</Dropdown.Item>
                <Dropdown.Item value={2}>Option 2</Dropdown.Item>
                <Dropdown.Item value={3}>Option 3</Dropdown.Item>
              </Dropdown>

              <Button onClick={() => setSelectedValue(3)}>Select option 3</Button>
            </Flex>
          </Code>

          <Code
            id="unselect"
            label="Unselect Item"
            language="jsx"
            code={`<Dropdown>
  <Dropdown.Unselect>Select</Dropdown.Unselect>
  <Dropdown.Item value={1}>Option 1</Dropdown.Item>
  <Dropdown.Item value={2}>Option 2</Dropdown.Item>
</Dropdown>`}
          >
            <Dropdown width={50}>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>Option 1</Dropdown.Item>
              <Dropdown.Item value={2}>Option 2</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="disabled" label="Disabled" language="jsx">
            <Dropdown disabled width={50}>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>Option 1</Dropdown.Item>
              <Dropdown.Item value={2}>Option 2</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="compact" label="Compact" language="jsx">
            <Dropdown variant="compact" width={40}>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>Option 1</Dropdown.Item>
              <Dropdown.Item value={2}>Option 2</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code
            id="variant"
            label="Custom Variant (outlined)"
            language="jsx"
            check={false}
            code={`// boxExtends.ts — register the variant, and export what you registered.
export const components = Box.components({
  dropdown: {
    variants: {
      outlined: {
        bgColor: 'transparent', b: 2, borderColor: 'indigo-500', color: 'indigo-600',
      },
    },
    children: {
      item: { variants: { outlined: { hover: { bgColor: 'indigo-50' }, selected: { bgColor: 'indigo-100' } } } },
      items: { variants: { outlined: { b: 2, borderColor: 'indigo-500' } } },
    },
  },
});

// box.d.ts — teach TypeScript the name, or variant="outlined" stays a type error.
import { ExtractComponentsAndVariants } from '@box-kite/core/types';
import { components } from './boxExtends';

declare module '@box-kite/core/types' {
  namespace Augmented {
    interface ComponentsTypes extends ExtractComponentsAndVariants<typeof components> {}
  }
}

// Use — the variant propagates to all children automatically.
<Dropdown variant="outlined">
  <Dropdown.Item value={1}>Option 1</Dropdown.Item>
  <Dropdown.Item value={2}>Option 2</Dropdown.Item>
</Dropdown>`}
          >
            <Dropdown variant="outlined" defaultValue={1} width={50}>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>Option 1</Dropdown.Item>
              <Dropdown.Item value={2}>Option 2</Dropdown.Item>
              <Dropdown.Item value={3}>Option 3</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="searchable" label="Searchable" language="jsx">
            <Dropdown label="User" isSearchable searchPlaceholder="Search users..." width={50}>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>John Doe</Dropdown.Item>
              <Dropdown.Item value={2}>Joe Smith</Dropdown.Item>
              <Dropdown.Item value={3}>Alice</Dropdown.Item>
              <Dropdown.Item value={4}>Bob</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="empty-item" label="Searchable with Empty Item" language="jsx">
            <Dropdown label="User" isSearchable searchPlaceholder="Search users..." width={50}>
              <Dropdown.EmptyItem>No options</Dropdown.EmptyItem>
              <Dropdown.Unselect>Select</Dropdown.Unselect>
              <Dropdown.Item value={1}>John Doe</Dropdown.Item>
              <Dropdown.Item value={2}>Joe Smith</Dropdown.Item>
              <Dropdown.Item value={3}>Alice</Dropdown.Item>
              <Dropdown.Item value={4}>Bob</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="multiple" label="Multiple Selection" language="jsx">
            <Dropdown multiple width={50}>
              <Dropdown.EmptyItem>No options</Dropdown.EmptyItem>
              <Dropdown.Unselect>Unselect All</Dropdown.Unselect>
              <Dropdown.SelectAll>Select All</Dropdown.SelectAll>
              <Dropdown.Item value={1}>John Doe</Dropdown.Item>
              <Dropdown.Item value={2}>Joe Smith</Dropdown.Item>
              <Dropdown.Item value={3}>Alice</Dropdown.Item>
              <Dropdown.Item value={4}>Bob</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="checkboxes" label="Multiple Selection with Checkboxes" language="jsx">
            <Dropdown multiple showCheckbox width={50}>
              <Dropdown.EmptyItem>No options</Dropdown.EmptyItem>
              <Dropdown.Unselect>Unselect All</Dropdown.Unselect>
              <Dropdown.SelectAll>Select All</Dropdown.SelectAll>
              <Dropdown.Item value={1}>John Doe</Dropdown.Item>
              <Dropdown.Item value={2}>Joe Smith</Dropdown.Item>
              <Dropdown.Item value={3}>Alice</Dropdown.Item>
              <Dropdown.Item value={4}>Bob</Dropdown.Item>
            </Dropdown>
          </Code>

          <Code id="custom-display" label="Multiple with Custom Display" language="jsx">
            <Dropdown multiple showCheckbox width={50}>
              <Dropdown.Display>{(selectedValues: number[]) => <Box height={16}>{selectedValues.join('+')}</Box>}</Dropdown.Display>
              <Dropdown.EmptyItem>No options</Dropdown.EmptyItem>
              <Dropdown.Unselect>Unselect All</Dropdown.Unselect>
              <Dropdown.SelectAll>Select All</Dropdown.SelectAll>
              <Dropdown.Item value={1}>John Doe</Dropdown.Item>
              <Dropdown.Item value={2}>Joe Smith</Dropdown.Item>
              <Dropdown.Item value={3}>Alice</Dropdown.Item>
              <Dropdown.Item value={4}>Bob</Dropdown.Item>
            </Dropdown>
          </Code>

          {/* Select Component Section */}
          <Box id="select" mt={8} pt={8} bt={1} borderColor="gray-200" theme={{ dark: { borderColor: 'gray-700' } }}>
            <H3 fontSize={24} fontWeight={700} mb={2}>
              Select
            </H3>
            <Box fontSize={14} color="gray-500" mb={8}>
              Data-driven dropdown — pass data + def instead of composing children. Wraps Dropdown internally.
            </Box>

            <Flex d="column" gap={8}>
              <Code label="Import" language="jsx" code="import Select from '@box-kite/react/components/select';" />

              <Code
                id="select-basic"
                label="Basic Select"
                language="jsx"
                code={`const users = [
  { id: 1, name: 'John Doe', role: 'Admin' },
  { id: 2, name: 'Joe Smith', role: 'Editor' },
  { id: 3, name: 'Alice Brown', role: 'Viewer' },
];

<Select
  label="User"
  data={users}
  def={{ valueKey: 'id', displayKey: 'name', placeholder: 'Pick a user...' }}
  width={50}
/>`}
              >
                <Select<User, number>
                  label="User"
                  data={users}
                  def={{ valueKey: 'id', displayKey: 'name', placeholder: 'Pick a user...' }}
                  width={50}
                />
              </Code>

              <Code
                id="select-display"
                label="Custom Item Display"
                language="jsx"
                context="declare const users: { id: number; name: string; role: string }[];"
                code={`<Select
  data={users}
  def={{
    valueKey: 'id',
    display: (user) => \`\${user.name} — \${user.role}\`,
    placeholder: 'Pick a user...',
  }}
/>`}
              >
                <Select<User, number>
                  data={users}
                  def={{
                    valueKey: 'id',
                    display: (user) => `${user.name} — ${user.role}`,
                    placeholder: 'Pick a user...',
                  }}
                  width={50}
                />
              </Code>

              <Code
                id="select-multiple"
                label="Multiple with Search"
                language="jsx"
                context="declare const users: { id: number; name: string; role: string }[];"
                code={`<Select
  data={users}
  def={{
    valueKey: 'id',
    displayKey: 'name',
    placeholder: 'Pick users...',
    selectAllText: 'Select all',
    emptyText: 'No users found',
    selectedDisplay: (rows) =>
      rows.length === 0 ? 'Pick users...' : \`\${rows.length} selected\`,
  }}
  label="Users" multiple showCheckbox isSearchable searchPlaceholder="Search users..."
/>`}
              >
                <Select<User, number>
                  label="Users"
                  data={users}
                  def={{
                    valueKey: 'id',
                    displayKey: 'name',
                    placeholder: 'Pick users...',
                    selectAllText: 'Select all',
                    emptyText: 'No users found',
                    selectedDisplay: (rows) => (rows.length === 0 ? 'Pick users...' : `${rows.length} selected`),
                  }}
                  multiple
                  showCheckbox
                  isSearchable
                  searchPlaceholder="Search users..."
                  width={50}
                />
              </Code>
            </Flex>
          </Box>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { label: 'Dropdown', section: true },
  { id: 'basic', label: 'Basic' },
  { id: 'a11y', label: 'Keyboard and roles' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'unselect', label: 'Unselect Item' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'compact', label: 'Compact' },
  { id: 'variant', label: 'Custom Variant' },
  { id: 'searchable', label: 'Searchable' },
  { id: 'empty-item', label: 'Empty Item' },
  { id: 'multiple', label: 'Multiple' },
  { id: 'checkboxes', label: 'Checkboxes' },
  { id: 'custom-display', label: 'Custom Display' },
  { label: 'Select', section: true },
  { id: 'select-basic', label: 'Basic' },
  { id: 'select-display', label: 'Custom Display' },
  { id: 'select-multiple', label: 'Multiple + Search' },
] as const;

const interactions: { input: string; result: string }[] = [
  { input: 'Down / Up (closed)', result: 'Opens, with the highlight on the selected option — or the first / last when nothing is chosen.' },
  { input: 'Alt + Down (closed)', result: 'Opens without moving the highlight.' },
  { input: 'Enter / Space (closed)', result: 'Opens. The browser own activation is suppressed, so it does not shut again.' },
  { input: 'Home / End (closed)', result: 'Opens at the first or the last option.' },
  { input: 'A printable character', result: 'Opens with the first option starting with it already highlighted.' },
  { input: 'Down / Up (open)', result: 'Moves the highlight, wrapping at the ends and skipping disabled options.' },
  { input: 'Home / End (open)', result: 'Jumps to the first or last option.' },
  { input: 'Typing (open)', result: 'Typeahead. A longer buffer narrows; the same letter twice cycles through the options sharing it.' },
  { input: 'Enter / Space (open)', result: 'Chooses the highlighted option and closes. In multiple mode it toggles and stays open.' },
  { input: 'Alt + Up (open)', result: 'Chooses the highlighted option and closes.' },
  { input: 'Escape', result: 'Closes, changing nothing. Focus never left the trigger, so nothing has to be restored.' },
  { input: 'Tab (open)', result: 'Chooses the highlighted option, then moves on to the next control.' },
];

const editableInteractions: { input: string; result: string }[] = [
  {
    input: 'A printable character',
    result: 'Types into the field, which opens the listbox and filters it. No typeahead — the field owns the keys.',
  },
  { input: 'Down / Up (closed)', result: 'Opens, with the highlight on the selected option — or the first / last when nothing is chosen.' },
  { input: 'Alt + Down (closed)', result: 'Opens without highlighting anything.' },
  { input: 'Down / Up (open)', result: 'Moves the highlight through what the filter left, wrapping and skipping disabled options.' },
  {
    input: 'Home / End, Left / Right',
    result: 'Move the caret, and hand the highlight back to the field — no option is where you are any more.',
  },
  { input: 'Space', result: 'Types a space. Only Enter chooses in this mode.' },
  {
    input: 'Enter (open)',
    result: 'Chooses the highlighted option and puts its text in the field. With nothing highlighted it does nothing.',
  },
  { input: 'Escape', result: 'Closes the listbox, keeping what was typed. Pressed again on a closed one, it clears the field.' },
  { input: 'Tab (open)', result: 'Chooses the highlighted option, then moves on to the next control.' },
  {
    input: 'Clicking away',
    result: 'Closes, and the field goes back to the value — a query left behind would describe a filter that is gone.',
  },
];

function KeyTable({ rows }: { rows: { input: string; result: string }[] }) {
  return (
    <Box tag="table" width="fit" css={{ borderCollapse: 'collapse' }}>
      <Box tag="thead">
        <Box tag="tr">
          <HeadCell>Key</HeadCell>
          <HeadCell>What happens</HeadCell>
        </Box>
      </Box>
      <Box tag="tbody">
        {rows.map((row) => (
          <Box tag="tr" key={row.input}>
            <Cell>
              <Mono>{row.input}</Mono>
            </Cell>
            <Cell>{row.result}</Cell>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

function Note({ icon: Icon, title, children }: { icon: typeof Tags; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-800' }, light: { bgColor: 'slate-50', borderColor: 'slate-200' } }}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
        <Icon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
          {title}
        </Box>
        <Box fontSize={14}>{children}</Box>
      </Box>
    </Flex>
  );
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="th"
      textAlign="left"
      fontSize={13}
      fontWeight={600}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-300', borderColor: 'slate-700' }, light: { color: 'slate-700', borderColor: 'slate-200' } }}
    >
      {children}
    </Box>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="td"
      fontSize={14}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-400', borderColor: 'slate-800' }, light: { color: 'slate-600', borderColor: 'slate-100' } }}
    >
      {children}
    </Box>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="code"
      display="inline"
      px={1}
      borderRadius={1}
      fontSize={13}
      theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' }, light: { bgColor: 'slate-100', color: 'slate-800' } }}
    >
      {children}
    </Box>
  );
}
