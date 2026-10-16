import { Archive, Bell, Hand, Keyboard, List as ListIcon, Moon, MousePointerClick, Pin, Server, Trash2, Wifi } from 'lucide-react';
import { ReactNode, useState } from 'react';
import listApi from '../../api/components/list.json';
import sortableListApi from '../../api/components/sortablelist.json';
import swipeItemApi from '../../api/components/swipeitem.json';
import virtualListApi from '../../api/components/virtuallist.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import List from '../../src/components/list';
import { H2, Span } from '../../src/components/semantics';
import SortableList from '../../src/components/sortableList';
import SwipeItem from '../../src/components/swipeItem';
import Switch from '../../src/components/switch';
import VirtualList from '../../src/components/virtualList';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

const PEOPLE = [
  {
    id: 'ada',
    name: 'Ada Lovelace',
    initials: 'AL',
    time: '9:41',
    text: 'The engine might compose elaborate and scientific pieces of music of any degree of complexity.',
  },
  {
    id: 'grace',
    name: 'Grace Hopper',
    initials: 'GH',
    time: 'Yesterday',
    text: 'It is easier to ask forgiveness than it is to get permission — so the compiler ships on Friday.',
  },
  {
    id: 'alan',
    name: 'Alan Turing',
    initials: 'AT',
    time: 'Mon',
    text: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.',
  },
];

export default function ListPage() {
  useTableOfContents(sidebarLinks);

  const [picked, setPicked] = useState<string[]>(['grace']);
  const [settings, setSettings] = useState({ notifications: true, dark: false });
  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <Box>
      <PageHeader
        icon={ListIcon}
        title="List"
        description="A list of things to read and pick from: rows of leading media, text and trailing values, one action covering each item — and not a line of JavaScript, so it renders on a server."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import List from '@box-kite/react/components/list';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<List>
  {people.map((person) => (
    <List.Item key={person.id} chevron>
      <List.Media variant="avatar">{person.initials}</List.Media>
      <List.Content>
        <List.Row>
          <List.Title lines={1}>
            <List.Action props={{ href: \`#\${person.id}\` }}>{person.name}</List.Action>
          </List.Title>
          <List.Meta>{person.time}</List.Meta>
        </List.Row>
        <List.Description lines={2}>{person.text}</List.Description>
      </List.Content>
    </List.Item>
  ))}
</List>`}
            context={`const people = [{ id: 'ada', initials: 'AL', name: 'Ada Lovelace', time: '9:41', text: 'The engine might compose music.' }];`}
          >
            <Frame>
              <List>
                {PEOPLE.map((person) => (
                  <List.Item key={person.id} chevron>
                    <List.Media variant="avatar">{person.initials}</List.Media>
                    <List.Content>
                      <List.Row>
                        <List.Title lines={1}>
                          <List.Action props={{ href: `#${person.id}` }}>{person.name}</List.Action>
                        </List.Title>
                        <List.Meta>{person.time}</List.Meta>
                      </List.Row>
                      <List.Description lines={2}>{person.text}</List.Description>
                    </List.Content>
                  </List.Item>
                ))}
              </List>
            </Frame>
          </Code>

          <Section id="anatomy" title="An item is a row, and its content is rows">
            <Box>
              A <Mono>List.Item</Mono> is a flex row of three slots: <Mono>List.Media</Mono> leading, <Mono>List.Content</Mono> taking the
              room, <Mono>List.End</Mono> trailing. The content is a column, and each line of it is a <Mono>List.Row</Mono> — its parts side
              by side, the first taking the room and the last pushed to the end, so a title and its time, or a status and a count, line up
              down the list. Every part is optional, and an item with none of them is simply a flex row of whatever it holds.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={ListIcon} title="One line, two or three">
                  A title alone is one line; a <Mono>List.Description</Mono> under it is two; a <Mono>List.Overline</Mono> above it, or a
                  description clamped at two lines, is three. That is Material&apos;s whole taxonomy, and it falls out of which parts are
                  there.
                </Note>
                <Note icon={Keyboard} title="Text stops where you say">
                  <Mono>lines={'{1}'}</Mono> ends a title or a description in an ellipsis, <Mono>2</Mono> and <Mono>3</Mono> clamp it. Unset
                  it wraps, which is right for a name whose end matters as much as its start.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="rows" title="A main row and a secondary one">
            <Box>
              <Mono>secondary</Mono> makes a row the quieter line under the main one — smaller and muted — which is the shape of a mail
              client, an order list or a pull-request queue: what it is and when on top, its state and its numbers below.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List variant="card">
  <List.Item>
    <List.Content>
      <List.Row>
        <List.Title lines={1}>
          <List.Action>Order 4182 · Grace Hopper</List.Action>
        </List.Title>
        <List.Meta>2 min ago</List.Meta>
      </List.Row>
      <List.Row secondary>
        <Span>Paid · 3 items</Span>
        <Span fontWeight={600} color="gray-900" theme={{ dark: { color: 'white' } }}>€42.00</Span>
      </List.Row>
    </List.Content>
  </List.Item>
</List>`}
            >
              <Frame>
                <List variant="card">
                  {[
                    ['4182', 'Grace Hopper', '2 min ago', 'Paid · 3 items', '€42.00'],
                    ['4181', 'Alan Turing', '1 h ago', 'Refunded · 1 item', '€9.50'],
                  ].map(([order, name, time, state, total]) => (
                    <List.Item key={order}>
                      <List.Content>
                        <List.Row>
                          <List.Title lines={1}>
                            <List.Action>
                              Order {order} · {name}
                            </List.Action>
                          </List.Title>
                          <List.Meta>{time}</List.Meta>
                        </List.Row>
                        <List.Row secondary>
                          <Span>{state}</Span>
                          <Span fontWeight={600} color="gray-900" theme={{ dark: { color: 'white' } }}>
                            {total}
                          </Span>
                        </List.Row>
                      </List.Content>
                    </List.Item>
                  ))}
                </List>
              </Frame>
            </Code>
          </Section>

          <Section id="wrap" title="A row that wraps">
            <Box>
              A row keeps to one line and squeezes its parts, which is what a title and a time want. <Mono>wrap</Mono> lets the parts go
              onto a new line instead and starts them all at the start — a set of tags, a list of labels — and on <Mono>List.Item</Mono> it
              lets the slots themselves wrap, so a trailing control drops under the text on a narrow screen rather than crushing it.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List>
  <List.Item wrap>
    <List.Content minWidth={48}>
      <List.Title>Design review</List.Title>
      <List.Row wrap>
        {['design', 'research', 'mobile', 'accessibility', 'typography', 'q4', 'roadmap'].map((tag) => (
          <Span key={tag} px={2} borderRadius={999} fontSize={12} bgColor="gray-100" theme={{ dark: { bgColor: 'gray-800' } }}>
            {tag}
          </Span>
        ))}
      </List.Row>
    </List.Content>
    <List.Actions>
      <Button variant="secondary">Join</Button>
    </List.Actions>
  </List.Item>
</List>`}
            >
              <Frame>
                <List>
                  <List.Item wrap>
                    <List.Content minWidth={48}>
                      <List.Title>Design review</List.Title>
                      <List.Row wrap>
                        {['design', 'research', 'mobile', 'accessibility', 'typography', 'q4', 'roadmap'].map((tag) => (
                          <Span
                            key={tag}
                            px={2}
                            borderRadius={999}
                            fontSize={12}
                            bgColor="gray-100"
                            theme={{ dark: { bgColor: 'gray-800' } }}
                          >
                            {tag}
                          </Span>
                        ))}
                      </List.Row>
                    </List.Content>
                    <List.Actions>
                      <Button variant="secondary">Join</Button>
                    </List.Actions>
                  </List.Item>
                </List>
              </Frame>
            </Code>
          </Section>

          <Section id="slots" title="Leading and trailing">
            <Box>
              <Mono>List.Media</Mono> takes three shapes as variants — <Mono>icon</Mono> (a tinted square), <Mono>avatar</Mono> (a circle
              that clips) and <Mono>image</Mono> (a larger thumbnail) — or none, for a bare icon. <Mono>List.End</Mono> stacks a value and
              its label and aligns them to the end, in tabular figures, so the numbers in a column of items line up. A <Mono>chevron</Mono>{' '}
              on the item says that pressing it goes somewhere with more.
            </Box>
            <Code
              language="jsx"
              mt={4}
              context="import { Wifi } from 'lucide-react';"
              code={`<List variant="card">
  <List.Item chevron>
    <List.Media variant="icon"><Icon size={5}><Wifi /></Icon></List.Media>
    <List.Content>
      <List.Title><List.Action>Wi-Fi</List.Action></List.Title>
    </List.Content>
    <List.End><List.Meta>Home 5G</List.Meta></List.End>
  </List.Item>
  <List.Item>
    <List.Media variant="image" bgGradient={{ linear: 'br', colors: ['sky-400', 'indigo-500'] }} />
    <List.Content>
      <List.Overline>Server · eu-west</List.Overline>
      <List.Title><List.Action>api-04</List.Action></List.Title>
      <List.Description>Healthy for 41 days</List.Description>
    </List.Content>
    <List.End>
      <Span fontWeight={600}>99.98%</Span>
      <List.Meta>Uptime</List.Meta>
    </List.End>
  </List.Item>
</List>`}
            >
              <Frame>
                <List variant="card">
                  <List.Item chevron>
                    <List.Media variant="icon">
                      <Icon size={5}>
                        <Wifi />
                      </Icon>
                    </List.Media>
                    <List.Content>
                      <List.Title>
                        <List.Action>Wi-Fi</List.Action>
                      </List.Title>
                    </List.Content>
                    <List.End>
                      <List.Meta>Home 5G</List.Meta>
                    </List.End>
                  </List.Item>
                  <List.Item>
                    <List.Media variant="image" bgGradient={{ linear: 'br', colors: ['sky-400', 'indigo-500'] }} />
                    <List.Content>
                      <List.Overline>Server · eu-west</List.Overline>
                      <List.Title>
                        <List.Action>api-04</List.Action>
                      </List.Title>
                      <List.Description>Healthy for 41 days</List.Description>
                    </List.Content>
                    <List.End>
                      <Span fontWeight={600}>99.98%</Span>
                      <List.Meta>Uptime</List.Meta>
                    </List.End>
                  </List.Item>
                </List>
              </Frame>
            </Code>
          </Section>

          <Section id="action" title="One action covers the item">
            <Box>
              <Mono>List.Action</Mono> goes in the title, and its <Mono>::after</Mono> stretches over the whole item — so the whole row
              presses, the focus ring draws round the whole row, and the name a reader hears is the title alone rather than every value in
              it. What it is follows from what it is given: an <Mono>href</Mono> makes it a link, an <Mono>htmlFor</Mono> makes it the label
              of a checkbox (a press anywhere on the item ticks it), and neither makes it a button.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={MousePointerClick} title="A control of the item's own goes in List.Actions">
                  A switch, a menu, a second button: <Mono>List.Actions</Mono> lifts them above the covering action, so they take their own
                  presses. Anything outside it — media, text, the end values — presses the action.
                </Note>
                <Note icon={Hand} title="A pressable item says so without a prop">
                  The hover, pressed, current (<Mono>aria-current</Mono>) and disabled states are read off the action with{' '}
                  <Mono>:has()</Mono>, so an item with no action is plain text and one with an action looks pressable — nothing to keep in
                  step.
                </Note>
              </Flex>
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List variant="card">
  {people.map((person) => (
    <List.Item key={person.id} selected={picked.includes(person.id)}>
      <List.Actions>
        <Checkbox id={\`pick-\${person.id}\`} checked={picked.includes(person.id)} onChange={() => toggle(person.id)} />
      </List.Actions>
      <List.Content>
        <List.Title><List.Action props={{ htmlFor: \`pick-\${person.id}\` }}>{person.name}</List.Action></List.Title>
      </List.Content>
    </List.Item>
  ))}
  <List.Item>
    <List.Media variant="icon"><Icon size={5}><Bell /></Icon></List.Media>
    <List.Content>
      <List.Title><List.Action props={{ htmlFor: 'setting-notifications' }}>Notifications</List.Action></List.Title>
    </List.Content>
    <List.Actions>
      <Switch id="setting-notifications" checked={notifications} onChange={toggleNotifications} />
    </List.Actions>
  </List.Item>
</List>`}
              context={`import { Bell } from 'lucide-react';
const people = [{ id: 'ada', name: 'Ada Lovelace' }];
const picked: string[] = [];
const toggle = (id: string) => {};
const notifications = true;
const toggleNotifications = () => {};`}
            >
              <Frame>
                <List variant="card">
                  {PEOPLE.map((person) => (
                    <List.Item key={person.id} selected={picked.includes(person.id)}>
                      <List.Actions>
                        <Checkbox id={`pick-${person.id}`} checked={picked.includes(person.id)} onChange={() => toggle(person.id)} />
                      </List.Actions>
                      <List.Content>
                        <List.Title>
                          <List.Action props={{ htmlFor: `pick-${person.id}` }}>{person.name}</List.Action>
                        </List.Title>
                      </List.Content>
                    </List.Item>
                  ))}
                  <List.Item>
                    <List.Media variant="icon">
                      <Icon size={5}>
                        <Bell />
                      </Icon>
                    </List.Media>
                    <List.Content>
                      <List.Title>
                        <List.Action props={{ htmlFor: 'setting-notifications' }}>Notifications</List.Action>
                      </List.Title>
                    </List.Content>
                    <List.Actions>
                      <Switch
                        id="setting-notifications"
                        checked={settings.notifications}
                        onChange={() => setSettings((current) => ({ ...current, notifications: !current.notifications }))}
                      />
                    </List.Actions>
                  </List.Item>
                  <List.Item>
                    <List.Media variant="icon">
                      <Icon size={5}>
                        <Moon />
                      </Icon>
                    </List.Media>
                    <List.Content>
                      <List.Title>
                        <List.Action props={{ htmlFor: 'setting-dark' }}>Dark mode</List.Action>
                      </List.Title>
                    </List.Content>
                    <List.Actions>
                      <Switch
                        id="setting-dark"
                        checked={settings.dark}
                        onChange={() => setSettings((current) => ({ ...current, dark: !current.dark }))}
                      />
                    </List.Actions>
                  </List.Item>
                </List>
              </Frame>
            </Code>
          </Section>

          <Section id="looks" title="Four looks, three sizes">
            <Box>
              Dividers are the default — the right look for a long list of things of one kind, where a frame round every item is noise.{' '}
              <Mono>variant="plain"</Mono> drops them, <Mono>"card"</Mono> frames the whole list as one block (the settings screen), and{' '}
              <Mono>"separated"</Mono> frames each item on its own with a gap between. An item&apos;s <Mono>size</Mono> is <Mono>sm</Mono>{' '}
              (44px, still a finger&apos;s width), <Mono>md</Mono> (56px) or <Mono>lg</Mono> (72px).
            </Box>
            <Code language="jsx" mt={4} code={`<List variant="separated">\n  <List.Item size="sm">…</List.Item>\n</List>`} check={false}>
              <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={6} p={4}>
                {(['default', 'plain', 'card', 'separated'] as const).map((look) => (
                  <Box key={look}>
                    <Box mb={2} fontSize={13} fontWeight={600} color="gray-500">
                      {look}
                    </Box>
                    <List variant={look === 'default' ? undefined : look}>
                      {(['sm', 'md', 'lg'] as const).map((size) => (
                        <List.Item key={size} size={size}>
                          <List.Media variant="icon">
                            <Icon size={4}>
                              <Server />
                            </Icon>
                          </List.Media>
                          <List.Content>
                            <List.Title>
                              <List.Action>size=&quot;{size}&quot;</List.Action>
                            </List.Title>
                          </List.Content>
                        </List.Item>
                      ))}
                    </List>
                  </Box>
                ))}
              </Grid>
            </Code>
          </Section>

          <Section id="fields" title="Labelled values">
            <Box>
              <Mono>List.Fields</Mono> is a <Mono>&lt;dl&gt;</Mono> of <Mono>List.Field</Mono>s, each a label over its value, as many to a
              line as fit at 8rem — two on a phone. Every value keeps its label for a screen reader as well as for the eye, which a row of
              bare values does not.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List variant="card">
  <List.Item ai="start">
    <List.Content>
      <List.Overline>Order 4182</List.Overline>
      <List.Row>
        <List.Title lines={1}><List.Action>Grace Hopper</List.Action></List.Title>
        <List.End><Span fontWeight={600}>€42.00</Span><List.Meta>Total</List.Meta></List.End>
      </List.Row>
      <List.Fields>
        <List.Field label="Status">Paid</List.Field>
        <List.Field label="Items">3</List.Field>
        <List.Field label="Placed">15 Oct</List.Field>
        <List.Field label="Ships">Tomorrow</List.Field>
      </List.Fields>
    </List.Content>
  </List.Item>
</List>`}
            >
              <Frame>
                <List variant="card">
                  <List.Item ai="start">
                    <List.Content>
                      <List.Overline>Order 4182</List.Overline>
                      <List.Row>
                        <List.Title lines={1}>
                          <List.Action>Grace Hopper</List.Action>
                        </List.Title>
                        <List.End>
                          <Span fontWeight={600}>€42.00</Span>
                          <List.Meta>Total</List.Meta>
                        </List.End>
                      </List.Row>
                      <List.Fields>
                        <List.Field label="Status">Paid</List.Field>
                        <List.Field label="Items">3</List.Field>
                        <List.Field label="Placed">15 Oct</List.Field>
                        <List.Field label="Ships">Tomorrow</List.Field>
                      </List.Fields>
                    </List.Content>
                  </List.Item>
                </List>
              </Frame>
            </Code>
          </Section>

          <Section id="groups" title="Groups, and a label that sticks">
            <Box>
              <Mono>List.Group</Mono> is an item holding its label and a list of its own, so a reader hears the label and then &quot;list, 3
              items&quot;. <Mono>level</Mono> makes the label a heading to jump between; <Mono>sticky</Mono> keeps it at the top of the
              screen while its items scroll under it, until the next group&apos;s label pushes it off — set{' '}
              <Mono>{`vars={{ 'list-sticky-top': '4rem' }}`}</Mono> on the list to clear an app&apos;s own header.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List variant="card">
  <List.Group label="Today" level={3} sticky>
    <List.Item>…</List.Item>
  </List.Group>
  <List.Group label="Earlier" level={3} sticky>
    <List.Item>…</List.Item>
  </List.Group>
</List>`}
              check={false}
            >
              <Box p={4}>
                <Box maxHeight={64} overflowY="auto" borderRadius={3}>
                  <List variant="card">
                    {['Today', 'Yesterday', 'Earlier'].map((day) => (
                      <List.Group key={day} label={day} level={3} sticky>
                        {PEOPLE.map((person) => (
                          <List.Item key={person.id}>
                            <List.Media variant="avatar">{person.initials}</List.Media>
                            <List.Content>
                              <List.Title lines={1}>
                                <List.Action>{person.name}</List.Action>
                              </List.Title>
                              <List.Description lines={1}>{person.text}</List.Description>
                            </List.Content>
                          </List.Item>
                        ))}
                      </List.Group>
                    ))}
                  </List>
                </Box>
              </Box>
            </Code>
          </Section>

          <Section id="swipe" title="Swipe an item for its commands">
            <Box>
              <Mono>SwipeItem</Mono> (<Mono>@box-kite/react/components/swipeItem</Mono>) is a <Mono>List.Item</Mono> whose row slides along
              the line while a tray of <Mono>SwipeItem.Action</Mono>s opens in the space it leaves — <Mono>startActions</Mono> under the
              start edge, <Mono>endActions</Mono> under the end, the first of each outermost. Past half open it opens, short of it it
              closes, and a flick goes the way it was going; with <Mono>fullSwipe</Mono>, carrying it most of the way across performs the
              outermost action. Nothing is drawn under the row, so it keeps whatever the list paints. Try it with a finger, a pen or a mouse
              — or Tab to the actions, which opens the tray they are in.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<List>
  <SwipeItem
    fullSwipe
    startActions={<SwipeItem.Action variant="accent" onClick={pin}>Pin</SwipeItem.Action>}
    endActions={
      <>
        <SwipeItem.Action variant="danger" onClick={remove}>Delete</SwipeItem.Action>
        <SwipeItem.Action onClick={snooze}>Snooze</SwipeItem.Action>
      </>
    }
  >
    <List.Content>
      <List.Title lines={1}>
        <List.Action props={{ href: '#ada' }}>Ada Lovelace</List.Action>
      </List.Title>
    </List.Content>
  </SwipeItem>
</List>`}
              context={`const pin = () => {}; const remove = () => {}; const snooze = () => {};`}
            >
              <SwipeDemo />
            </Code>
            <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={3} mt={4}>
              <Note icon={Keyboard} title="A swipe is a shortcut, not the only way in">
                The actions are real buttons in the tab order, and focus reaching one opens its tray. A path-based gesture still wants a way
                in for a pointer that cannot drag: put the same commands on the item&apos;s own page, or in a <Mono>Menu</Mono> in{' '}
                <Mono>List.Actions</Mono>.
              </Note>
              <Note icon={MousePointerClick} title="An open item closes before it opens">
                A press on an open item closes it rather than following its action, and a press anywhere else closes it too — the press was
                most likely aimed at the tray.
              </Note>
            </Grid>
          </Section>

          <Section id="sortable" title="Put the items in order by hand">
            <Box>
              <Mono>SortableList</Mono> (<Mono>@box-kite/react/components/sortableList</Mono>) is a <Mono>List</Mono> whose items are
              dragged by a <Mono>SortableList.Handle</Mono>. The app owns the order: <Mono>onOrderChange</Mono> reports it as the
              items&apos; <Mono>value</Mono>s, and the list draws whatever order it is rendered in. During a drag nothing is reordered — the
              item follows the pointer and its neighbours step aside — and the order changes once, on the drop, which glides into place.{' '}
              <Mono>onOrderCommit</Mono> is the one to save.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<SortableList onOrderChange={(order) => setIds(order)}>
  {ids.map((id) => (
    <SortableList.Item key={id} value={id} label={names[id]}>
      <List.Content>
        <List.Title>{names[id]}</List.Title>
      </List.Content>
      <SortableList.Handle />
    </SortableList.Item>
  ))}
</SortableList>`}
              context={`const ids = ['ada']; const setIds = (order: string[]) => {}; const names: Record<string, string> = { ada: 'Ada Lovelace' };`}
            >
              <SortableDemo />
            </Code>
            <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={3} mt={4}>
              <Note icon={Keyboard} title="The keyboard gets a grab">
                Enter or Space on a handle picks the item up, the arrows move it, Enter drops it and Escape puts it back — every step
                announced in a live region.
              </Note>
              <Note icon={Hand} title="Or press, then press where it goes">
                A press on a handle that does not drag picks the item up too, and a press on another item then drops it there: the way to
                reorder with a pointer that cannot drag.
              </Note>
            </Grid>
          </Section>

          <Section id="virtual" title="A list too long to render whole">
            <Box>
              <Mono>VirtualList</Mono> (<Mono>@box-kite/react/components/virtualList</Mono>) renders the items near the screen and makes the
              rest space. Each item drawn is measured and kept by its <Mono>itemKey</Mono>, so items of different heights mix; one not drawn
              yet counts as the mean of those that have been, and the list holds its height while it scrolls, so a dragged scrollbar thumb
              stays under the pointer. The scroller is found rather than declared — the nearest one that scrolls, or the page — and each
              item carries <Mono>aria-setsize</Mono> and <Mono>aria-posinset</Mono>, so a reader hears &quot;12 of 10,000&quot;.{' '}
              <Mono>onRangeChange</Mono> is where an endless list fetches its next page.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<VirtualList items={messages} itemKey={(message) => message.id}>
  {(message) => (
    <List.Item>
      <List.Content>
        <List.Title lines={1}>{message.subject}</List.Title>
        <List.Description lines={message.long ? 2 : 1}>{message.text}</List.Description>
      </List.Content>
    </List.Item>
  )}
</VirtualList>`}
              context={`const messages = [{ id: 1, subject: 'Hello', text: 'A message', long: false }];`}
            >
              <VirtualDemo />
            </Code>
          </Section>

          <Section id="accessibility" title="What a reader hears">
            <Box>
              A <Mono>&lt;ul role=&quot;list&quot;&gt;</Mono> — the role spelled out, because Safari stops reporting a list once its items
              lose their markers — and <Mono>tag=&quot;ol&quot;</Mono> when the order means something. A list is not a composite widget:
              each action is a tab stop of its own, and the arrow keys stay the page&apos;s. When the arrows should move between options and
              pick one, the pattern is a listbox, which is <Mono>Combobox</Mono> or <Mono>Select</Mono>.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Every part is a Box, so every prop is available on it and beats the part&apos;s own default. The style tree,{' '}
              <Mono>Box.components(&apos;list&apos;)</Mono>, holds the paint and none of the spacing, because every engine entry carries it:{' '}
              <Mono>list</Mono> (variants <Mono>plain</Mono>, <Mono>card</Mono>, <Mono>separated</Mono>), <Mono>list.item</Mono> (the
              divider&apos;s colour, the pressed, hover and current states, and the <Mono>selected</Mono> variant), <Mono>list.media</Mono>{' '}
              (<Mono>icon</Mono>, <Mono>avatar</Mono>, <Mono>image</Mono>), <Mono>list.muted</Mono> (every quieter part),{' '}
              <Mono>list.action</Mono> (the focus ring) and <Mono>list.label</Mono> (a group&apos;s label). The hairlines and the tints are
              mixed from <Mono>currentColor</Mono>, so they follow any theme of yours with no rule for it. What the list&apos;s look says to
              its items travels as custom properties, because a list has no context to hand them down — and they are yours to set:
            </Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`<List
  vars={{
    'list-divider': 'slate-200',      // the line between items
    'list-divider-inset': '4.5rem',   // start it at the text, not the edge
    'list-item-radius': '0.5rem',     // round each item's tint
    'list-sticky-top': '4rem',        // clear a fixed header
  }}
>`}
              check={false}
            />
          </Section>

          <ApiReference api={listApi} />
          <ApiReference api={swipeItemApi} />
          <ApiReference api={sortableListApi} />
          <ApiReference api={virtualListApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'anatomy', label: 'Anatomy' },
  { id: 'rows', label: 'Main and secondary rows' },
  { id: 'wrap', label: 'A row that wraps' },
  { id: 'slots', label: 'Leading and trailing' },
  { id: 'action', label: 'One action covers the item' },
  { id: 'looks', label: 'Looks and sizes' },
  { id: 'fields', label: 'Labelled values' },
  { id: 'groups', label: 'Groups' },
  { id: 'swipe', label: 'Swipe actions' },
  { id: 'sortable', label: 'Drag to reorder' },
  { id: 'virtual', label: 'A long list' },
  { id: 'accessibility', label: 'What a reader hears' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(listApi),
  ...apiSections(swipeItemApi),
  ...apiSections(sortableListApi),
  ...apiSections(virtualListApi),
];

/** An inbox to swipe through: the actions really do what they say. */
function SwipeDemo() {
  const [people, setPeople] = useState(PEOPLE);
  const [pinned, setPinned] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const remove = (id: string) => setPeople((current) => current.filter((person) => person.id !== id));
  const togglePin = (id: string) =>
    setPinned((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <Frame>
      <List variant="card">
        {people.map((person) => (
          <SwipeItem
            key={person.id}
            fullSwipe
            startActions={
              <SwipeItem.Action variant="accent" icon={<Pin size={18} />} onClick={() => togglePin(person.id)}>
                {pinned.includes(person.id) ? 'Unpin' : 'Pin'}
              </SwipeItem.Action>
            }
            endActions={
              <>
                <SwipeItem.Action variant="danger" icon={<Trash2 size={18} />} onClick={() => remove(person.id)}>
                  Delete
                </SwipeItem.Action>
                <SwipeItem.Action icon={<Archive size={18} />} onClick={() => setArchived((current) => [...current, person.id])}>
                  {archived.includes(person.id) ? 'Archived' : 'Archive'}
                </SwipeItem.Action>
              </>
            }
          >
            <List.Media variant="avatar">{person.initials}</List.Media>
            <List.Content>
              <List.Row>
                <List.Title lines={1}>
                  <List.Action props={{ href: `#${person.id}` }}>{person.name}</List.Action>
                </List.Title>
                <List.Meta>{pinned.includes(person.id) ? 'Pinned' : person.time}</List.Meta>
              </List.Row>
              <List.Description lines={1}>{person.text}</List.Description>
            </List.Content>
          </SwipeItem>
        ))}
      </List>
      {people.length < PEOPLE.length && (
        <Flex jc="center" mt={3}>
          <Button onClick={() => setPeople(PEOPLE)}>Bring them back</Button>
        </Flex>
      )}
    </Frame>
  );
}

const TASKS = ['Write the release notes', 'Measure the bundle', 'Check it at 390px', 'Open the pull request', 'Merge it'];

/** A to-do list put in order by hand. */
function SortableDemo() {
  const [order, setOrder] = useState(TASKS);

  return (
    <Frame>
      <SortableList variant="card" onOrderChange={setOrder}>
        {order.map((task, index) => (
          <SortableList.Item key={task} value={task}>
            <List.Media variant="icon" fontSize={14} fontWeight={600}>
              {index + 1}
            </List.Media>
            <List.Content>
              <List.Title lines={1}>{task}</List.Title>
            </List.Content>
            <SortableList.Handle />
          </SortableList.Item>
        ))}
      </SortableList>
    </Frame>
  );
}

const MESSAGES = Array.from({ length: 10_000 }, (_, index) => ({
  id: index,
  subject: `Message ${(index + 1).toLocaleString('en')}`,
  text: PEOPLE[index % 3].text,
  long: index % 4 === 0,
}));

/** Ten thousand items, a couple of dozen of them in the DOM. */
function VirtualDemo() {
  const [range, setRange] = useState({ startIndex: 0, endIndex: 0 });

  return (
    <Frame>
      <Box maxHeight={100} overflowY="auto" borderRadius={3}>
        <VirtualList variant="card" items={MESSAGES} itemKey={(message) => message.id} onRangeChange={setRange}>
          {(message) => (
            <List.Item>
              <List.Content>
                <List.Title lines={1}>{message.subject}</List.Title>
                <List.Description lines={message.long ? 2 : 1}>{message.text}</List.Description>
              </List.Content>
            </List.Item>
          )}
        </VirtualList>
      </Box>
      <Box mt={2} fontSize={13} textAlign="center" css={{ fontVariantNumeric: 'tabular-nums' }}>
        Rendering items {range.startIndex + 1}–{range.endIndex} of {MESSAGES.length.toLocaleString('en')}
      </Box>
    </Frame>
  );
}

/** The demo's own width: a list is read at a phone's, even on a wide page. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <Box p={4}>
      <Box maxWidth={110} mx="auto">
        {children}
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

function Note({ icon: NoteIcon, title, children }: { icon: typeof Bell; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-800' },
        light: { bgColor: 'slate-50', borderColor: 'slate-200' },
      }}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
        <NoteIcon size={16} />
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
