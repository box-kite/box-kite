import { Search } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import comboboxApi from '../../api/components/combobox.json';
import Box from '../../src/box';
import Combobox, { ComboboxUtils } from '../../src/components/combobox';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

interface Tag {
  id: string;
  name: string;
}

interface Person {
  id: number;
  name: string;
  team: string;
  away?: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Ada Lovelace', team: 'Engineering' },
  { id: 2, name: 'Grace Hopper', team: 'Engineering' },
  { id: 3, name: 'Alan Turing', team: 'Research', away: true },
  { id: 4, name: 'Katherine Johnson', team: 'Research' },
  { id: 5, name: 'José Ferreira', team: 'Design' },
  { id: 6, name: 'Radia Perlman', team: 'Infrastructure' },
];

const def = { label: 'name', key: 'id', disabled: 'away' } as const;

export default function ComboboxPage() {
  useTableOfContents(sidebarLinks);

  const [assignee, setAssignee] = useState<Person | null>(people[0]);
  const [reviewers, setReviewers] = useState<Person[]>([people[1]]);
  const [tags, setTags] = useState<Tag[]>([]);
  const { rows, loading, onQueryChange } = useRemoteSearch();

  return (
    <Box>
      <PageHeader
        icon={Search}
        title="Combobox"
        description="A text field over a list of your own rows: APG's editable combobox, object values, a filter you can compose, chips, and a create row."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Combobox from '@box-kite/react/components/combobox';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Combobox
  data={people}
  def={{ label: 'name', key: 'id' }}
  label="Assignee"
  onValueChange={(person) => assign(person)}
/>`}
          >
            <Box py={6} maxWidth={80}>
              <Combobox<Person> data={people} def={def} label="Assignee" value={assignee} onValueChange={setAssignee} />
              <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                <Mono>{assignee ? `{ id: ${assignee.id}, name: '${assignee.name}' }` : 'null'}</Mono>
              </Box>
            </Box>
          </Code>

          <Section id="rows" title="A row in is a row out">
            <Box>
              <Mono>data</Mono> is the list you already have, and the value is one of <em>those rows</em> — not a string dug out of one.{' '}
              <Mono>onValueChange</Mono> hands the object straight back, typed, so there is no lookup table on the other side of the
              handler. That is the complaint every string-only select collects, and it is the reason this component exists.
            </Box>
            <Box mt={4}>
              <Mono>def</Mono> is how a row is read: <Mono>label</Mono> is its text — searched, displayed and read out — and{' '}
              <Mono>key</Mono> is what makes two rows the same row, so a list refetched from the server still shows the selection as chosen.
              Both take a key of the row or a function. <Mono>disabled</Mono> and <Mono>display</Mono> are the other two.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Combobox
  data={people}
  def={{ label: (p) => \`\${p.name} · \${p.team}\`, key: 'id', disabled: 'away' }}
  label="Reviewer"
/>`}
                context="declare const people: { id: number; name: string; team: string; away?: boolean }[];"
              >
                <Box py={6} maxWidth={80}>
                  <Combobox<Person>
                    data={people}
                    def={{ label: (person) => `${person.name} · ${person.team}`, key: 'id', disabled: 'away' }}
                    label="Reviewer"
                  />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="multiple" title="Several rows are chips">
            <Box>
              <Mono>multiple</Mono> puts the selection in front of the field as chips and turns the value into an array — the one shape
              decision that cannot be read off the value itself, because a combobox usually starts with nothing in it. Choosing a row that
              is already chosen takes it off again.
            </Box>
            <Box mt={4}>
              A chip's remove button is deliberately <strong>not</strong> a tab stop: twenty selections would otherwise cost twenty presses
              to Tab past. <Mono>Backspace</Mono> on an empty field removes the last one, and the listbox toggles any row back off, so
              nothing here needs a mouse.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Combobox data={people} def={{ label: 'name', key: 'id' }} label="Reviewers" multiple />`}>
                <Box py={6} maxWidth={80}>
                  <Combobox<Person> data={people} def={def} label="Reviewers" multiple value={reviewers} onValueChange={setReviewers} />
                  <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                    <Mono>[{reviewers.map((person) => person.id).join(', ')}]</Mono>
                  </Box>
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="filter" title="The filter is yours to compose">
            <Box>
              The built-in one folds case and strips accents, so <Mono>jose</Mono> finds <Mono>José</Mono>, and matches anywhere in the
              label rather than only at the front. <Mono>filter</Mono> replaces it, and it takes the <em>whole list</em> so it can rank as
              well as reject — it is handed the label reader, so starting from the built-in one costs nothing.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Combobox
  data={people}
  def={{ label: 'name', key: 'id' }}
  label="Assignee"
  filter={(rows, query, labelOf) => ComboboxUtils.filterRows(rows, query, labelOf).slice(0, 3)}
/>`}
                context="import { ComboboxUtils } from '@box-kite/react/components/combobox';"
              >
                <Box py={6} maxWidth={80}>
                  <Combobox<Person>
                    data={people}
                    def={def}
                    label="Assignee (first three matches)"
                    filter={(rows, query, labelOf) => ComboboxUtils.filterRows(rows, query, labelOf).slice(0, 3)}
                  />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="async" title="A server that already searched">
            <Box>
              <Mono>filter={'{false}'}</Mono> says the data arrived filtered, so nothing is thrown away a second time.{' '}
              <Mono>onQueryChange</Mono> is the hook the request hangs off, and <Mono>loading</Mono> makes the popup say the rows are coming
              rather than that there are none — which is the difference between "still looking" and "nothing here".
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Combobox
  data={rows}
  def={{ label: 'name', key: 'id' }}
  label="Search people"
  filter={false}
  loading={loading}
  onQueryChange={(query) => search(query)}
/>`}
              >
                <Box py={6} maxWidth={80}>
                  <Combobox<Person>
                    data={rows}
                    def={def}
                    label="Search people"
                    placeholder="Type a name"
                    filter={false}
                    loading={loading}
                    onQueryChange={onQueryChange}
                  />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="create" title="A row that is not there yet">
            <Box>
              <Mono>createRow</Mono> turns what was typed into the row it would make, or returns <Mono>null</Mono> to refuse it. Its
              presence is what offers the create row at all, and one is never offered for a query a row already answers by name — offering
              "Create Design" beside Design is how a list grows twins. The change arrives with reason <Mono>create</Mono>.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Combobox
  data={tags}
  def={{ label: 'name', key: 'id' }}
  label="Tags"
  multiple
  createRow={(query) => ({ id: query, name: query })}
/>`}
              >
                <Box py={6} maxWidth={80}>
                  <Combobox<Tag>
                    data={tags}
                    def={{ label: 'name', key: 'id' }}
                    label="Tags"
                    multiple
                    value={tags}
                    createRow={(query) => ({ id: query, name: query })}
                    onValueChange={setTags}
                  />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="keyboard" title="What the keyboard does">
            <Box>
              It is APG's editable combobox. Typing filters and never highlights a suggestion — that is <em>list</em> autocomplete, not
              inline, and a highlight nobody asked for is one <Mono>Tab</Mono> away from being committed. The arrows move through what the
              filter left; <Mono>Home</Mono>, <Mono>End</Mono> and the sideways arrows move the caret and hand the highlight back to the
              field; <Mono>Enter</Mono> chooses the highlighted row and does nothing when there is none.
            </Box>
            <Box mt={4}>
              <Mono>Escape</Mono> closes the listbox keeping what was typed, and a second one clears the field. The whole control is one tab
              stop however many options are open, because DOM focus never leaves the input — the listbox is named by{' '}
              <Mono>aria-activedescendant</Mono> instead.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Every part is a node of the <Mono>combobox</Mono> style tree: <Mono>combobox.label</Mono>, <Mono>combobox.field</Mono>,{' '}
              <Mono>combobox.chip</Mono> and its <Mono>combobox.remove</Mono>, <Mono>combobox.icon</Mono>, <Mono>combobox.items</Mono>,{' '}
              <Mono>combobox.item</Mono> and <Mono>combobox.message</Mono>. A row's chosen state is its own <Mono>aria-selected</Mono>, and
              where the keyboard is is the <Mono>highlighted</Mono> variant — a listbox driven by <Mono>aria-activedescendant</Mono> holds
              DOM focus nowhere, so <Mono>:focus-within</Mono> never fires and the highlight has to be drawn from state.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Combobox data={people} def={{ label: 'name' }} label="Assignee" borderRadius={4} itemsProps={{ p: 2 }} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Combobox<Person> data={people} def={def} label="Assignee" borderRadius={4} itemsProps={{ p: 2 }} />
                </Box>
              </Code>
            </Box>
          </Section>

          <ApiReference api={comboboxApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

/**
 * A search that answers late, so the loading state is the one on screen rather than a screenshot of it.
 * A timer rather than a fetch: the page is prerendered and must not reach the network to paint.
 */
function useRemoteSearch() {
  const [query, setQuery] = useState('');
  const [settled, setSettled] = useState('');

  const onQueryChange = useMemo(
    () => (next: string) => {
      setQuery(next);
      setTimeout(() => setSettled(next), 500);
    },
    [],
  );

  const rows = useMemo(() => ComboboxUtils.filterRows(people, settled, (person) => person.name), [settled]);

  return { rows, loading: query !== settled, onQueryChange };
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'rows', label: 'A row in is a row out' },
  { id: 'multiple', label: 'Several rows are chips' },
  { id: 'filter', label: 'The filter is yours' },
  { id: 'async', label: 'A server that searched' },
  { id: 'create', label: 'A row that is not there' },
  { id: 'keyboard', label: 'What the keyboard does' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(comboboxApi),
];

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
