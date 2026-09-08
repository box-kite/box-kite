import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Presence from '../../src/components/presence';
import { H2 } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function VariantsPage() {
  useTableOfContents(sidebarLinks);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [selected, setSelected] = useState('Overview');
  const [agreed, setAgreed] = useState(false);
  const [shown, setShown] = useState(false);
  const [amount, setAmount] = useState('5');
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

  return (
    <Box>
      <PageHeader
        icon={SlidersHorizontal}
        title="State Variants"
        description="Style an element by an attribute it carries, by what it contains, by where it sits, by a state it is not in — or by what an ancestor, a sibling, the browser or the device is doing."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="concept" title="A state somebody else set is still a prop">
            <Mono>hover</Mono> and <Mono>checked</Mono> describe states the browser knows about. Everything else — a menu that is open, a
            row that is selected, a step that is loading — is a state <em>your</em> code knows about, and until now the only way to style it
            was a ternary in the markup. The keys on this page put it back in CSS: five that add a fragment to the element's own selector,
            two that hang the rule off an ancestor or a sibling. One rule covers every element in that state, instead of a new class per
            render.
          </Section>

          <Code
            id="concept-code"
            label="The five keys"
            language="jsx"
            codeOnly
            code={`<Box
  dataAttr={{ 'state=open': { opacity: 1 }, loading: { cursor: 'wait' } }}   // [data-state="open"], [data-loading]
  ariaAttr={{ selected: { bgColor: 'indigo-500' } }}                        // [aria-selected="true"]
  has={{ ':checked': { borderColor: 'indigo-500' } }}                       // :has(:checked)
  not={{ hover: { opacity: 0.7 } }}                                         // :not(:hover)
  nth={{ odd: { bgColor: 'slate-50' } }}                                    // :nth-child(odd)
/>`}
          />

          <Section id="data" title="dataAttr — the attribute your own code writes">
            The record key is the attribute: <Mono>'state=open'</Mono> becomes <Mono>[data-state="open"]</Mono>, and a bare{' '}
            <Mono>'loading'</Mono> becomes <Mono>[data-loading]</Mono> — present with any value at all. The attribute itself goes in{' '}
            <Mono>props</Mono>, where every attribute goes.
          </Section>

          <Code
            id="data-demo"
            label="dataAttr"
            language="jsx"
            context="declare const state: 'idle' | 'busy' | 'done';"
            code={`<Box
  props={{ 'data-state': state }}
  dataAttr={{
    'state=idle': { bgColor: 'slate-500' },
    'state=busy': { bgColor: 'amber-500' },
    'state=done': { bgColor: 'emerald-500' },
  }}
/>`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Box
                props={{ 'data-state': state }}
                px={5}
                py={3}
                borderRadius={2}
                fontSize={14}
                color="white"
                transitionDuration={250}
                dataAttr={{
                  'state=idle': { bgColor: 'slate-500' },
                  'state=busy': { bgColor: 'amber-500' },
                  'state=done': { bgColor: 'emerald-500' },
                }}
              >
                data-state={state}
              </Box>
              <Flex gap={2}>
                {(['idle', 'busy', 'done'] as const).map((next) => (
                  <Button key={next} variant="secondary" onClick={() => setState(next)}>
                    {next}
                  </Button>
                ))}
              </Flex>
            </Flex>
          </Code>

          <Section id="aria" title="ariaAttr — the state a screen reader is already told about">
            Same grammar, one difference: a bare key means <Mono>="true"</Mono>, because that is what an ARIA state means. So{' '}
            <Mono>{`ariaAttr={{ selected: … }}`}</Mono> is <Mono>[aria-selected="true"]</Mono> and no second source of truth is invented —
            the attribute that makes the tab list correct is the one that colours it.
          </Section>

          <Code
            id="aria-demo"
            label="ariaAttr"
            language="jsx"
            context="declare const selected: string;declare const setSelected: (value: string) => void;"
            code={`{['Overview', 'Usage', 'API'].map((tab) => (
  <Button
    key={tab}
    props={{ role: 'tab', 'aria-selected': tab === selected }}
    onClick={() => setSelected(tab)}
    ariaAttr={{ selected: { bgColor: 'indigo-500', color: 'white' } }}
  >
    {tab}
  </Button>
))}`}
          >
            <Flex gap={2} props={{ role: 'tablist' }}>
              {['Overview', 'Usage', 'API'].map((tab) => (
                <Button
                  key={tab}
                  variant="secondary"
                  props={{ role: 'tab', 'aria-selected': tab === selected }}
                  onClick={() => setSelected(tab)}
                  ariaAttr={{ selected: { bgColor: 'indigo-500', color: 'white', borderColor: 'indigo-500' } }}
                >
                  {tab}
                </Button>
              ))}
            </Flex>
          </Code>

          <Section id="has" title="has — style a parent by what is inside it">
            <Mono>has</Mono> puts its key inside <Mono>:has()</Mono>, so a container can react to its own contents with no state lifted out
            of the DOM. The library already ships the common ones as pseudo-class props (<Mono>hasChecked</Mono>, <Mono>hasFocus</Mono>,{' '}
            <Mono>hasInvalid</Mono>); this is the general form for everything else.
          </Section>

          <Code
            id="has-demo"
            label="has"
            language="jsx"
            code={`<Box has={{ 'input:checked': { borderColor: 'indigo-500', bgColor: 'indigo-50' } }}>
  <Checkbox label="I agree to the terms" />
</Box>`}
          >
            <Box
              p={4}
              b={1}
              borderRadius={2}
              borderColor="slate-300"
              transitionDuration={250}
              has={{ 'input:checked': { borderColor: 'indigo-500' } }}
            >
              <Checkbox label="I agree to the terms" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            </Box>
          </Code>

          <Section id="not" title="not — the state you are not in">
            <Mono>not</Mono> is keyed by pseudo-class name rather than by a selector, so it stays typed and autocompletes: every key{' '}
            <Mono>hover</Mono>, <Mono>checked</Mono>, <Mono>disabled</Mono> and the rest already accept, minus the ones a{' '}
            <Mono>:not()</Mono> cannot hold. An attribute is negated the same way, with the prefix that says so —{' '}
            <Mono>{`not={{ 'data-loading': … }}`}</Mono>. It is the honest way to say "dim everything that is not the one being pointed at"
            without writing the positive rule twice.
          </Section>

          <Code
            id="not-demo"
            label="not"
            language="jsx"
            codeOnly
            code={`<Box group={{ 'deck/hover': { not: { hover: { opacity: 0.5 } } } }} />`}
          />

          <Section id="nth" title="nth — where the element sits among its siblings">
            The fifth key is a position rather than a state: <Mono>first</Mono>, <Mono>last</Mono>, <Mono>only</Mono>, <Mono>odd</Mono>,{' '}
            <Mono>even</Mono>, an <Mono>An+B</Mono> formula, or any of those counted from the end — <Mono>'last 2'</Mono> is the
            second-to-last child. Striping a list and dropping the divider under its last row is two records and no index arithmetic in the
            markup, so a row does not have to know how many rows there are.
          </Section>

          <Code
            id="nth-demo"
            label="nth"
            language="jsx"
            code={`{['Design', 'Build', 'Ship', 'Measure'].map((step) => (
  <Box
    key={step}
    px={4}
    py={3}
    bb={1}
    borderColor="slate-500/20"
    nth={{ odd: { bgColor: 'slate-500/10' }, 'last 1': { bb: 0 } }}
  >
    {step}
  </Box>
))}`}
          >
            <Box b={1} borderRadius={2} borderColor="slate-300" overflow="hidden" width={64}>
              {['Design', 'Build', 'Ship', 'Measure'].map((step) => (
                <Box
                  key={step}
                  px={4}
                  py={3}
                  bb={1}
                  fontSize={14}
                  borderColor="slate-500/20"
                  theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
                  nth={{ odd: { bgColor: 'slate-500/10' }, 'last 1': { bb: 0 } }}
                >
                  {step}
                </Box>
              ))}
            </Box>
          </Code>

          <Section id="group" title="group and peer — a state that belongs to somebody else">
            Every key above is about the element itself. <Mono>group</Mono> is about an <em>ancestor</em> and <Mono>peer</Mono> about a
            preceding <em>sibling</em>: the record key is the state, either on the default class (<Mono>group</Mono>, <Mono>peer</Mono> —
            the names Tailwind uses) or on one you name, <Mono>'card/hover'</Mono>. The state vocabulary is <Mono>not</Mono>'s, so any
            pseudo-class works, and a <Mono>data-</Mono>/<Mono>aria-</Mono> prefix reaches an attribute the ancestor carries instead.
          </Section>

          <Code
            id="group-demo"
            label="group"
            language="jsx"
            code={`<Flex className="card" ai="center" p={4} b={1} borderRadius={2}>
  <Box>Quarterly report</Box>
  <Box ml="auto" opacity={0} group={{ 'card/hover': { opacity: 1 } }}>
    Edit
  </Box>
</Flex>`}
          >
            <Flex
              className="card"
              ai="center"
              p={4}
              b={1}
              borderRadius={2}
              width="fit"
              maxWidth={96}
              borderColor="slate-300"
              theme={{ dark: { borderColor: 'slate-700' } }}
            >
              <Box fontSize={14} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
                Quarterly report
              </Box>
              <Box ml="auto" fontSize={13} color="indigo-500" opacity={0} group={{ 'card/hover': { opacity: 1 } }}>
                Edit
              </Box>
            </Flex>
          </Code>

          <Code
            id="peer-demo"
            label="peer"
            language="jsx"
            context="declare const agreed: boolean;declare const setAgreed: (value: boolean) => void;"
            code={`<Checkbox
  className="agree"
  checked={agreed}
  onChange={(event) => setAgreed(event.target.checked)}
  label={<Box peer={{ 'agree/checked': { color: 'emerald-500' } }}>I agree to the terms</Box>}
/>`}
          >
            <Checkbox
              className="agree"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              label={
                <Box
                  fontSize={14}
                  theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}
                  peer={{ 'agree/checked': { color: 'emerald-500', fontWeight: 600 } }}
                >
                  I agree to the terms
                </Box>
              }
            />
          </Code>

          <Section id="states" title="The states the browser already knows">
            Eight more pseudo-class keys, each one a state the platform tracks and nothing else can see: <Mono>open</Mono> (a{' '}
            <Mono>&lt;details&gt;</Mono>, a <Mono>&lt;dialog&gt;</Mono>, a popover, a <Mono>&lt;select&gt;</Mono>'s picker),{' '}
            <Mono>placeholderShown</Mono>, <Mono>autofill</Mono>, <Mono>inRange</Mono>/<Mono>outOfRange</Mono>, <Mono>visited</Mono>,{' '}
            <Mono>target</Mono> and <Mono>inert</Mono>. They nest like <Mono>hover</Mono>, negate under <Mono>not</Mono>, and go on a group.
            Two of them come with a caveat worth knowing: <Mono>visited</Mono> takes <em>colour</em> properties only — the browser refuses
            the rest, and lies about them, so that a page cannot read a reader's history — and <Mono>inert</Mono> matches the whole inert
            subtree, because inertness is inherited where the attribute is not.
          </Section>

          <Code
            id="states-demo"
            label="inRange / outOfRange"
            language="jsx"
            context="declare const amount: string;declare const setAmount: (value: string) => void;"
            code={`<Textbox
  type="number"
  value={amount}
  onChange={(event) => setAmount(event.target.value)}
  props={{ min: 1, max: 10, 'aria-label': 'Seats' }}
  b={2}
  borderStyle="solid"
  inRange={{ borderColor: 'emerald-500' }}
  outOfRange={{ borderColor: 'red-500' }}
/>`}
          >
            <Flex ai="center" gap={3}>
              <Textbox
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                props={{ min: 1, max: 10, 'aria-label': 'Seats' }}
                width={24}
                b={2}
                borderStyle="solid"
                borderColor="slate-300"
                inRange={{ borderColor: 'emerald-500' }}
                outOfRange={{ borderColor: 'red-500' }}
              />
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                1 to 10 seats
              </Box>
            </Flex>
          </Code>

          <Section id="pointer" title="pointerCoarse and pointerFine — what the device can do">
            The two device features sit beside the accessibility preferences (<Mono>motionReduce</Mono>, <Mono>forcedColors</Mono>,{' '}
            <Mono>contrastMore</Mono>) and behave exactly like a breakpoint: one <Mono>@media</Mono> block around one rule. A finger needs a
            bigger target than a mouse pointer, and a control that only appears on hover needs to be permanent where there is no hover at
            all. They rank <em>below</em> the preferences — what the pointer can do is a fact about the device, and what the reader asked
            for still wins.
          </Section>

          <Code
            id="pointer-code"
            label="pointerCoarse"
            language="jsx"
            codeOnly
            code={`<Button py={2} pointerCoarse={{ py: 3, fontSize: 16 }}>
  Add to cart
</Button>`}
          />

          <Section id="direction" title="rtl and ltr — the direction the reader is going">
            The logical props do most of a translation on their own: <Mono>ps</Mono>/<Mono>pe</Mono>, <Mono>ms</Mono>/<Mono>me</Mono>,{' '}
            <Mono>bs</Mono>/<Mono>be</Mono>, <Mono>insetStart</Mono>/<Mono>insetEnd</Mono> and <Mono>borderRadiusStart</Mono>/
            <Mono>borderRadiusEnd</Mono> swap sides the moment <Mono>dir="rtl"</Mono> is set on any ancestor, because the browser resolves
            them and nothing has to re-render. These two keys are for what is left: an arrow that has to point the other way, a shadow that
            has to fall the other way. The selector is <Mono>:dir(rtl)</Mono> rather than the <Mono>[dir="rtl"] &amp;</Mono> Tailwind emits
            — direction is a property of <em>this</em> element, so a <Mono>&lt;bdi&gt;</Mono> or a <Mono>dir="auto"</Mono> that flipped one
            paragraph is seen. The consequence worth knowing: with no <Mono>dir</Mono> anywhere the document is left-to-right, so{' '}
            <Mono>ltr</Mono> matches. It is a state, not an attribute you have to write.
          </Section>

          <Code
            id="direction-demo"
            label="One card, both directions"
            language="jsx"
            context="declare const dir: 'ltr' | 'rtl';"
            code={`import { ArrowRight } from 'lucide-react';

<Flex
  props={{ dir }}
  ai="center"
  gap={3}
  ps={4}
  pe={3}
  py={3}
  bs={4}
  borderStyle="solid"
  borderColor="indigo-500"
  borderRadiusEnd={2}
>
  <Box flex1 fontSize={14}>
    Your order is on its way
  </Box>
  <Box color="indigo-500" rtl={{ flip: 'xAxis' }}>
    <Icon size={5}>
      <ArrowRight />
    </Icon>
  </Box>
</Flex>`}
          >
            <Flex d="column" gap={3} ai="start">
              <Flex gap={2}>
                {(['ltr', 'rtl'] as const).map((next) => (
                  <Button key={next} variant="secondary" onClick={() => setDir(next)}>
                    dir="{next}"
                  </Button>
                ))}
              </Flex>
              <Flex
                props={{ dir }}
                width="fit"
                ai="center"
                gap={3}
                ps={4}
                pe={3}
                py={3}
                bs={4}
                borderStyle="solid"
                borderColor="indigo-500"
                borderRadiusEnd={2}
                theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-100' } }}
              >
                <Box flex1 fontSize={14}>
                  Your order is on its way
                </Box>
                <Box color="indigo-500" rtl={{ flip: 'xAxis' }}>
                  <Icon size={5}>
                    <ArrowRight />
                  </Icon>
                </Box>
              </Flex>
            </Flex>
          </Code>

          <Section id="composing" title="Everything else nests around them, in either direction">
            A variant is a fragment on the element's own compound selector, so it composes with all three of the other nesting kinds: a
            breakpoint or a preference wraps the rule, a theme or a group puts an ancestor in front of it, and a pseudo-class joins the same
            compound. The class name is built from the <em>set</em> rather than the order, so <Mono>{`dataAttr={{ x: { not: … } }}`}</Mono>{' '}
            and <Mono>{`not={{ … : { dataAttr: { x } } }}`}</Mono> resolve to one class and one rule.
          </Section>

          <Code
            id="composing-code"
            label="Composing"
            language="css"
            codeOnly
            check={false}
            code={`/* md={{ dataAttr: { 'state=open': { hover: { color: 'red-500' } } } }} */

@media (min-width: 768px) {
  .md-hover-dataAttr-state\\=open-color-red-500[data-state="open"]:hover { color: var(--red-500) }
}

/* No cascade rank of its own: .a[data-state="open"] is 0,2,0 against .b's 0,1,0,
   so the variant already outranks the plain class it overrides. */`}
          />

          <Section id="presence" title="The exit, written as CSS instead of a ternary">
            <Mono>&lt;Presence&gt;</Mono> hands its child <Mono>{`{ 'data-state': 'open' | 'closed' }`}</Mono> — the Radix and Base UI
            spelling, so a selector written for either works here. With <Mono>dataAttr</Mono> the whole entrance and exit is two records and
            no conditional value in the markup: the element says where it is, and the stylesheet says what that looks like.
          </Section>

          <Code
            id="presence-demo"
            label="Presence + dataAttr"
            language="jsx"
            context="declare const shown: boolean;"
            code={`<Presence present={shown}>
  {({ ref, props }) => (
    <Box
      ref={ref}
      props={props}
      transitionDuration={320}
      startingStyle={{ opacity: 0, translateY: -2 }}
      dataAttr={{
        'state=open': { opacity: 1, translateY: 0 },
        'state=closed': { opacity: 0, translateY: -2 },
      }}
    />
  )}
</Presence>`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Box height={14}>
                <Presence present={shown}>
                  {({ ref, props }) => (
                    <Box
                      ref={ref}
                      props={props}
                      px={5}
                      py={3}
                      borderRadius={2}
                      fontSize={14}
                      color="white"
                      bgImage="gradient-primary"
                      transitionDuration={320}
                      startingStyle={{ opacity: 0, translateY: -2 }}
                      dataAttr={{
                        'state=open': { opacity: 1, translateY: 0 },
                        'state=closed': { opacity: 0, translateY: -2 },
                      }}
                    >
                      Both directions, no ternary
                    </Box>
                  )}
                </Presence>
              </Box>
              <Button variant="secondary" onClick={() => setShown((value) => !value)}>
                {shown ? 'Hide' : 'Show'}
              </Button>
            </Flex>
          </Code>

          <Section id="attributes" title="What this library sets for you">
            Two attributes come out of the library itself, and both are documented targets rather than internals:{' '}
            <Mono>data-state="open" | "closed"</Mono> on whatever <Mono>&lt;Presence&gt;</Mono> is holding — which is every layer built on
            it, so <Mono>Tooltip</Mono>, the <Mono>Dropdown</Mono> popup and the DataGrid's column menu all carry it — and{' '}
            <Mono>data-theme</Mono> on the element <Mono>Box.Theme</Mono> writes to. Everything else is yours to set.
          </Section>

          <Section id="invalid" title="A key it cannot parse produces nothing">
            The record key becomes part of a selector, so it is validated before it gets there: an attribute name that is not one, a value
            carrying a quote, an unbalanced <Mono>:has()</Mono>. A key that fails drops its whole block — no rule and no class name, exactly
            what an unmatched prop value does. A typo is invisible rather than a selector nobody wrote, and nothing is ever left carrying a
            class with no rule behind it.
          </Section>
        </Flex>
      </Reveal>
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

const sidebarLinks = [
  { id: 'concept', label: 'What a variant is' },
  { id: 'data', label: 'dataAttr' },
  { id: 'aria', label: 'ariaAttr' },
  { id: 'has', label: 'has' },
  { id: 'not', label: 'not' },
  { id: 'nth', label: 'nth' },
  { id: 'group', label: 'group & peer' },
  { id: 'states', label: 'Browser states' },
  { id: 'pointer', label: 'Pointer features' },
  { id: 'direction', label: 'rtl & ltr' },
  { id: 'composing', label: 'Composing' },
  { id: 'presence', label: 'Presence + dataAttr' },
  { id: 'attributes', label: 'What the library sets' },
  { id: 'invalid', label: 'An unparseable key' },
];
