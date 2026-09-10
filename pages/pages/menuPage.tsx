import { CornerDownRight, Keyboard, Layers, ListChecks, ShieldCheck, SquareMenu } from 'lucide-react';
import { ReactNode, useState } from 'react';
import menuApi from '../../api/components/menu.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Menu, { MenuReason } from '../../src/components/menu';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function MenuPage() {
  useTableOfContents(sidebarLinks);

  const [lastReason, setLastReason] = useState<MenuReason>();
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState('name');

  return (
    <Box>
      <PageHeader
        icon={SquareMenu}
        title="Menu"
        description="A menu button and its menu, on the platform's own Popover API: the top layer, light dismiss and focus return are the browser's, and a submenu is a popover nested inside its menu."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Menu from '@box-kite/react/components/menu';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Menu trigger={(t) => <Button {...t}>Actions</Button>}>
  <Menu.Item onSelect={duplicate}>Duplicate</Menu.Item>
  <Menu.Item disabled>Move</Menu.Item>
  <Menu.Separator />
  <Menu.Sub label="Share">
    <Menu.Item onSelect={copyLink}>Copy link</Menu.Item>
    <Menu.Item onSelect={email}>Email</Menu.Item>
  </Menu.Sub>
</Menu>`}
          >
            <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
              <Menu trigger={(t) => <Button {...t}>Actions</Button>}>
                <Menu.Item>Duplicate</Menu.Item>
                <Menu.Item disabled>Move</Menu.Item>
                <Menu.Separator />
                <Menu.Sub label="Share">
                  <Menu.Item>Copy link</Menu.Item>
                  <Menu.Item>Email</Menu.Item>
                </Menu.Sub>
              </Menu>
            </Flex>
          </Code>

          <Section id="native" title="What the platform does, so this does not">
            <Box>
              A menu is a floating layer with a keyboard on it. The layer half is the browser's — this component is the Popover API plus
              APG's roles and keys, and every other library's portal, focus trap and <Mono>z-index</Mono> strategy is simply absent:
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Layers} title="The top layer, and no portal">
                  The menu paints above every stacking context and outside every clipped ancestor, while staying where it was declared — so
                  it inherits the theme, the custom properties and the text direction around it, and the tab order runs trigger → menu with
                  nothing to arrange.
                </Note>
                <Note icon={ShieldCheck} title="Light dismiss, one layer per press">
                  Escape and a press outside are the browser's, and Escape closes the <em>innermost</em> menu first: a submenu, then the
                  menu it came out of. Choosing an item closes the lot, which is the component's own doing.
                </Note>
                <Note icon={CornerDownRight} title="A submenu is a nested popover">
                  Its panel is declared beside its item, inside the menu it belongs to, which is what makes the two nest: opening a submenu
                  leaves its parent open, a press inside it is a press inside the parent, and closing the menu closes every submenu with it.
                </Note>
                <Note icon={Keyboard} title="What is left is the half APG asks for">
                  The roles, <Mono>aria-checked</Mono>, the arrow keys, Home and End, typeahead, and the two focus moves the platform does
                  not make: into the first item on open, and back onto a submenu's item when that submenu closes — the browser returns focus
                  for the outermost layer only.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="items" title="The items a menu owns">
            <Box>
              A command is a <Mono>Menu.Item</Mono>; the two that carry a state are <Mono>Menu.CheckboxItem</Mono> and{' '}
              <Mono>Menu.RadioItem</Mono> inside a <Mono>Menu.RadioGroup</Mono>. A <Mono>Menu.Group</Mono> is a titled section — its{' '}
              <Mono>label</Mono> names the group through <Mono>aria-labelledby</Mono>, so the items are read as a set — and a{' '}
              <Mono>Menu.Separator</Mono> is the line between two of them.
            </Box>
            <Box mt={4}>
              <Note icon={ListChecks} title="A state does not close the menu, a command does">
                <Mono>Menu.Item</Mono> closes on select, because choosing a command is the end of the visit. A checkbox or a radio item does
                not, so several boxes can be ticked in one go — <Mono>closeOnSelect</Mono> is the prop that swaps either default.
              </Note>
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Menu trigger={(t) => <Button {...t}>View</Button>}>
  <Menu.Group label="Rows">
    <Menu.CheckboxItem checked={compact} onCheckedChange={setCompact}>Compact rows</Menu.CheckboxItem>
  </Menu.Group>
  <Menu.Separator />
  <Menu.RadioGroup label="Sort by" value={sort} onValueChange={setSort}>
    <Menu.RadioItem value="name">Name</Menu.RadioItem>
    <Menu.RadioItem value="date">Date added</Menu.RadioItem>
  </Menu.RadioGroup>
</Menu>`}
            >
              <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
                <Menu trigger={(t) => <Button {...t}>View</Button>}>
                  <Menu.Group label="Rows">
                    <Menu.CheckboxItem checked={compact} onCheckedChange={setCompact}>
                      Compact rows
                    </Menu.CheckboxItem>
                  </Menu.Group>
                  <Menu.Separator />
                  <Menu.RadioGroup label="Sort by" value={sort} onValueChange={setSort}>
                    <Menu.RadioItem value="name">Name</Menu.RadioItem>
                    <Menu.RadioItem value="date">Date added</Menu.RadioItem>
                  </Menu.RadioGroup>
                </Menu>
                <Box fontSize={14}>
                  Rows are <Mono>{compact ? 'compact' : 'roomy'}</Mono>, sorted by <Mono>{sort}</Mono>.
                </Box>
              </Flex>
            </Code>
          </Section>

          <Section id="disabled" title="A disabled item is aria-disabled, and stays focusable">
            <Box>
              APG asks that a disabled menu item stay reachable, so that a keyboard user finds out it is there at all. The{' '}
              <Mono>disabled</Mono> prop therefore writes <Mono>aria-disabled</Mono> rather than the attribute, which would take the item
              out of the keyboard's reach and silence it: the arrows still land on it, the item announces itself as unavailable, and
              activating it does nothing.
            </Box>
          </Section>

          <Section id="submenus" title="Submenus, and the arrow that opens them">
            <Box>
              <Mono>Menu.Sub</Mono> renders its own item — the label, the chevron, <Mono>aria-haspopup="menu"</Mono> and{' '}
              <Mono>aria-expanded</Mono> — and the menu beside it. It opens on the arrow pointing the way the text runs, on Enter or Space,
              and on hover; it closes on the arrow pointing back, on Escape, and whenever focus lands on another item, which is what makes
              hovering across the menu behave.
            </Box>
            <Box mt={4}>
              In a right-to-left menu the two arrows swap, because the key is the <em>reading order</em> rather than the letter on it — and
              the chevron turns round with them, from one <Mono>rtl</Mono> rule in the style tree.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Menu trigger={(t) => <Button {...t}>Export</Button>}>
  <Menu.Item>Export as CSV</Menu.Item>
  <Menu.Sub label="Export as image">
    <Menu.Item>PNG</Menu.Item>
    <Menu.Item>SVG</Menu.Item>
    <Menu.Sub label="More">
      <Menu.Item>WebP</Menu.Item>
    </Menu.Sub>
  </Menu.Sub>
</Menu>`}
            >
              <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
                <Menu trigger={(t) => <Button {...t}>Export</Button>}>
                  <Menu.Item>Export as CSV</Menu.Item>
                  <Menu.Sub label="Export as image">
                    <Menu.Item>PNG</Menu.Item>
                    <Menu.Item>SVG</Menu.Item>
                    <Menu.Sub label="More">
                      <Menu.Item>WebP</Menu.Item>
                    </Menu.Sub>
                  </Menu.Sub>
                </Menu>
                <Box fontSize={14}>Submenus nest as deeply as the markup does.</Box>
              </Flex>
            </Code>
          </Section>

          <Section id="controlled" title="Controlled, and the reason it changed">
            <Box>
              Leave <Mono>open</Mono> out and the menu owns its state. Pass it and you own it, with the asymmetry the platform imposes: a
              close cannot be refused, because the browser has already done it by the time <Mono>onOpenChange</Mono> runs.
            </Box>
            <Box mt={4}>
              Every change names its reason. <Mono>select</Mono> is an item being chosen — the one a consumer most often wants to tell apart
              — beside <Mono>trigger</Mono>, <Mono>escape</Mono>, <Mono>outside-pointer</Mono>, <Mono>tab</Mono> and <Mono>imperative</Mono>
              .
            </Box>
            <Flex gap={4} ai="center" mt={4} flexWrap="wrap">
              <Menu onOpenChange={(_, { reason }) => setLastReason(reason)} trigger={(t) => <Button {...t}>Open, then close it</Button>}>
                <Menu.Item>Choose me</Menu.Item>
                <Menu.Item>Or press Escape, or Tab</Menu.Item>
              </Menu>
              <Box fontSize={14}>
                Last reason: <Mono>{lastReason ?? '—'}</Mono>
              </Box>
            </Flex>
          </Section>

          <Section id="mounting" title="The menu is always rendered">
            <Box>
              Closed means <Mono>display: none</Mono>, not unmounted — the same shape as <Mono>&lt;Popover&gt;</Mono> and{' '}
              <Mono>&lt;Dialog&gt;</Mono>, and what lets the browser own showing and hiding. The entrance is <Mono>startingStyle</Mono> and
              the exit is <Mono>transitionBehavior="allow-discrete"</Mono>, both already in the component's styles, so there is no{' '}
              <Mono>&lt;Presence&gt;</Mono> anywhere near it.
            </Box>
            <Box mt={4}>The cost is that the items render whether or not anyone has opened the menu. Gate an expensive one yourself:</Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`const [open, setOpen] = useState(false);

<Menu open={open} onOpenChange={setOpen} trigger={(t) => <Button {...t}>Reports</Button>}>
  {open ? <Menu.Item>The expensive part</Menu.Item> : null}
</Menu>`}
            />
          </Section>

          <Section id="placement" title="Where it goes">
            <Box>
              <Mono>side</Mono>, <Mono>align</Mono>, <Mono>offset</Mono> and <Mono>flip</Mono> are the four placement props every floating
              layer in the library takes, and <Mono>Menu.Sub</Mono> takes them too — its defaults being <Mono>side="end"</Mono> and{' '}
              <Mono>offset=&#123;0&#125;</Mono>, so a submenu abuts the menu it came out of. The browser places both with CSS anchor
              positioning, so nothing is measured and no scroll listener exists.
            </Box>
            <Box mt={4}>
              One caveat the top layer costs, measured in Chrome 152: a menu <strong>keeps the side it chose when it opened</strong>,
              because Chrome never re-evaluates <Mono>position-try-fallbacks</Mono> for an element in the top layer. Every open picks the
              right side; only a scroll <em>while</em> the menu is open can leave it hanging off the viewport, so close a menu if the page
              can scroll far underneath it.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The menu and every part of it are Boxes, so every prop is available, and the defaults live in{' '}
              <Mono>Box.components('menu')</Mono> — with <Mono>menu.item</Mono>, <Mono>menu.group</Mono>, <Mono>menu.label</Mono>,{' '}
              <Mono>menu.separator</Mono>, and <Mono>menu.indicator</Mono>, <Mono>menu.check</Mono>, <Mono>menu.dot</Mono> and{' '}
              <Mono>menu.arrow</Mono> for the four marks a menu draws. All four are borders and a radius rather than an asset: this library
              ships no icons.
            </Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`<Menu p={2} borderRadius={3} minWidth={56} trigger={(t) => <Button {...t}>Actions</Button>}>
  <Menu.Item py={2.5} focus={{ bgColor: 'indigo-50' }}>Duplicate</Menu.Item>
</Menu>`}
            />
          </Section>

          <ApiReference api={menuApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'native', label: 'What the platform does' },
  { id: 'items', label: 'The items' },
  { id: 'disabled', label: 'Disabled items' },
  { id: 'submenus', label: 'Submenus' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'mounting', label: 'Always rendered' },
  { id: 'placement', label: 'Where it goes' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(menuApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: ReactNode }) {
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
