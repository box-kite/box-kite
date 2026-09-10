import { Gauge, Keyboard, ListCollapse, Rows3, ScanEye } from 'lucide-react';
import { ReactNode, useState } from 'react';
import accordionApi from '../../api/components/accordion.json';
import collapsibleApi from '../../api/components/collapsible.json';
import Box from '../../src/box';
import Accordion, { Collapsible } from '../../src/components/accordion';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function AccordionPage() {
  useTableOfContents(sidebarLinks);

  const [controlled, setControlled] = useState<string[]>(['shipping']);

  return (
    <Box>
      <PageHeader
        icon={ListCollapse}
        title="Accordion"
        description="APG's accordion, and the disclosure under it — where the height animation is a shared class rather than a pixel somebody measured."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Accordion, { Collapsible } from '@box-kite/react/components/accordion';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Accordion defaultValue={['shipping']}>
  <Accordion.Item value="shipping">
    <Accordion.Trigger>Shipping</Accordion.Trigger>
    <Accordion.Panel>Two to four working days, tracked.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <Accordion.Trigger>Returns</Accordion.Trigger>
    <Accordion.Panel>Thirty days, in the packaging it came in.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="warranty">
    <Accordion.Trigger>Warranty</Accordion.Trigger>
    <Accordion.Panel>Two years against anything we got wrong.</Accordion.Panel>
  </Accordion.Item>
</Accordion>`}
          >
            <Box py={6}>
              <Accordion defaultValue={['shipping']}>
                <Accordion.Item value="shipping">
                  <Accordion.Trigger>Shipping</Accordion.Trigger>
                  <Accordion.Panel>Two to four working days, tracked.</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="returns">
                  <Accordion.Trigger>Returns</Accordion.Trigger>
                  <Accordion.Panel>Thirty days, in the packaging it came in.</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="warranty">
                  <Accordion.Trigger>Warranty</Accordion.Trigger>
                  <Accordion.Panel>Two years against anything we got wrong.</Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Box>
          </Code>

          <Section id="animation" title="The height animation is a class">
            <Box>
              Every other library measures: an effect reads the panel's height, writes it into a custom property, and a{' '}
              <Mono>ResizeObserver</Mono> keeps it up to date. Nothing here does. The panel sits in a grid of one row whose track runs{' '}
              <Mono>1fr</Mono> to <Mono>0fr</Mono> — so the height that is animated is the one the browser was going to compute anyway.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Gauge} title="A hundred items share one rule">
                  There is no number to write down, so there is nothing per instance: two classes do the whole animation, and they are the
                  same two classes on every accordion on the page. A measured height is a rule per panel that is never freed.
                </Note>
                <Note icon={ScanEye} title="Content that grows while it is open grows with it">
                  Nothing was pinned, so an image that loads or a list that fetches simply makes the panel taller. A measured height has to
                  notice and re-measure.
                </Note>
                <Note icon={Keyboard} title="A closed panel is hidden, not merely clipped">
                  <Mono>visibility</Mono> is what takes it out of the tab order and the accessibility tree — and unlike <Mono>display</Mono>{' '}
                  it is animatable, so it flips to hidden only once the track has closed and back the instant it opens. That is also why the
                  entrance needs no <Mono>@starting-style</Mono>: a server-rendered open panel does not animate itself open on load.
                </Note>
              </Flex>
            </Box>
            <Box mt={4}>
              It rides <Mono>--transitionTime</Mono> like everything else, which <Mono>prefers-reduced-motion</Mono> zeroes with no opt-in —
              turn the setting on and the panels snap. The panel is always in the DOM, so what it holds survives being shut; gate children
              too expensive to render closed yourself.
            </Box>
          </Section>

          <Section id="multiple" title="Several at once">
            <Box>
              One panel at a time is the default, so opening one closes the last. <Mono>multiple</Mono> lets them all stand open — and
              either way, closing the open one is allowed, so an accordion can stand with everything shut and needs no second prop to say
              so.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Accordion multiple defaultValue={['size', 'colour']}>
  <Accordion.Item value="size">
    <Accordion.Trigger>Size</Accordion.Trigger>
    <Accordion.Panel>Small, medium, large.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="colour">
    <Accordion.Trigger>Colour</Accordion.Trigger>
    <Accordion.Panel>Six of them, none of them beige.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="stock">
    <Accordion.Trigger>In stock only</Accordion.Trigger>
    <Accordion.Panel>Hides what we have run out of.</Accordion.Panel>
  </Accordion.Item>
</Accordion>`}
            >
              <Box py={6}>
                <Accordion multiple defaultValue={['size', 'colour']}>
                  <Accordion.Item value="size">
                    <Accordion.Trigger>Size</Accordion.Trigger>
                    <Accordion.Panel>Small, medium, large.</Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="colour">
                    <Accordion.Trigger>Colour</Accordion.Trigger>
                    <Accordion.Panel>Six of them, none of them beige.</Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="stock">
                    <Accordion.Trigger>In stock only</Accordion.Trigger>
                    <Accordion.Panel>Hides what we have run out of.</Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            </Code>
          </Section>

          <Section id="keyboard" title="The keyboard, and the heading">
            <Box>
              An accordion is not a composite widget: <em>every</em> header is its own tab stop, and Down and Up are a shortcut between them
              rather than the only way in. That is the opposite of <Mono>Tabs</Mono>, where the whole list is one stop — and it is APG's
              rule for each.
            </Box>
            <Box mt={4}>
              Each header is a real <Mono>&lt;button&gt;</Mono> inside a heading, which is the pair the pattern asks for. The level is{' '}
              <Mono>level</Mono>, default <Mono>3</Mono>, and it has to fit the page around it: a heading level is the document's outline,
              and a screen reader navigates by it. A disabled section is the <Mono>disabled</Mono> attribute, so the browser has already
              taken it out of the tab sequence, and Down and Up step over it for the same reason.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Accordion level={2}>
  <Accordion.Item value="who">
    <Accordion.Trigger>Who can see this</Accordion.Trigger>
    <Accordion.Panel>Everyone in the workspace.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="audit" disabled>
    <Accordion.Trigger>Audit log</Accordion.Trigger>
    <Accordion.Panel>On the Team plan.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="delete">
    <Accordion.Trigger>Delete this project</Accordion.Trigger>
    <Accordion.Panel>There is no undo.</Accordion.Panel>
  </Accordion.Item>
</Accordion>`}
            >
              <Box py={6}>
                <Accordion level={2}>
                  <Accordion.Item value="who">
                    <Accordion.Trigger>Who can see this</Accordion.Trigger>
                    <Accordion.Panel>Everyone in the workspace.</Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="audit" disabled>
                    <Accordion.Trigger>Audit log</Accordion.Trigger>
                    <Accordion.Panel>On the Team plan.</Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="delete">
                    <Accordion.Trigger>Delete this project</Accordion.Trigger>
                    <Accordion.Panel>There is no undo.</Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            </Code>
            <Box mt={4}>
              The panel is a <Mono>role="region"</Mono> named by its header. Past half a dozen of them the landmarks are noise, which is
              APG's own caveat — <Mono>{`props={{ role: undefined }}`}</Mono> on the panel drops it.
            </Box>
          </Section>

          <Section id="collapsible" title="One on its own">
            <Box>
              <Mono>Collapsible</Mono> is the same mechanism with no heading, no group and no arrow keys, because a lone button needs none
              of them. Note the shape: the trigger is the render prop and the children are the content, the way <Mono>Popover</Mono> reads.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Collapsible trigger={(trigger) => <Button {...trigger}>What is in the box?</Button>}>
  <Box pt={3}>A kite, and the string for it.</Box>
</Collapsible>`}
            >
              <Box py={6}>
                <Collapsible trigger={(trigger) => <Button {...trigger}>What is in the box?</Button>}>
                  <Box pt={3}>A kite, and the string for it.</Box>
                </Collapsible>
              </Box>
            </Code>
            <Box mt={4}>
              Its content carries no role of its own: a region wants a name, and a trigger is not a heading. Where the sections are document
              structure, that is what <Mono>Accordion</Mono> is for.
            </Box>
          </Section>

          <Section id="controlled" title="Controlled">
            <Box>
              Pass <Mono>value</Mono> — the values of every panel standing open — and the consumer owns it. <Mono>onValueChange</Mono>{' '}
              reports the new set and why it changed.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`const [value, setValue] = useState(['shipping']);

<Accordion value={value} onValueChange={setValue}>
  …
</Accordion>`}
            >
              <Box py={6}>
                <Flex gap={2} mb={4}>
                  <Button variant="secondary" onClick={() => setControlled(['shipping', 'returns'])}>
                    Open both
                  </Button>
                  <Button variant="secondary" onClick={() => setControlled([])}>
                    Close all
                  </Button>
                </Flex>
                <Accordion multiple value={controlled} onValueChange={setControlled}>
                  <Accordion.Item value="shipping">
                    <Accordion.Trigger>Shipping</Accordion.Trigger>
                    <Accordion.Panel>Two to four working days.</Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="returns">
                    <Accordion.Trigger>Returns</Accordion.Trigger>
                    <Accordion.Panel>Thirty days.</Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
                <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                  open: <Mono>{controlled.length ? controlled.join(', ') : 'nothing'}</Mono>
                </Box>
              </Box>
            </Code>
          </Section>

          <Section id="composition" title="A section keeps what is in it">
            <Box>
              A closed panel is hidden rather than unmounted, so a half-filled form in one survives being shut — type into this and close
              it. The headers are read off the DOM rather than out of a registry, so a header a consumer wrapped, rendered from a list or
              put behind a condition navigates like any other, and an accordion inside a panel belongs to itself.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Accordion defaultValue={['address']}>
  <Accordion.Item value="address">
    <Accordion.Trigger>Delivery address</Accordion.Trigger>
    <Accordion.Panel>
      <Textbox props={{ 'aria-label': 'Postcode' }} />
    </Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="note">
    <Accordion.Trigger>Note for the driver</Accordion.Trigger>
    <Accordion.Panel>Left with a neighbour is fine.</Accordion.Panel>
  </Accordion.Item>
</Accordion>`}
            >
              <Box py={6}>
                <Accordion defaultValue={['address']}>
                  <Accordion.Item value="address">
                    <Accordion.Trigger>Delivery address</Accordion.Trigger>
                    <Accordion.Panel>
                      <Textbox props={{ 'aria-label': 'Postcode' }} />
                    </Accordion.Panel>
                  </Accordion.Item>
                  <Accordion.Item value="note">
                    <Accordion.Trigger>Note for the driver</Accordion.Trigger>
                    <Accordion.Panel>Left with a neighbour is fine.</Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Box>
            </Code>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Every part is a Box, so every prop is available, and the defaults live in <Mono>Box.components('accordion')</Mono> — with{' '}
              <Mono>accordion.item</Mono>, <Mono>accordion.heading</Mono>, <Mono>accordion.trigger</Mono>, <Mono>accordion.arrow</Mono> and{' '}
              <Mono>accordion.panel</Mono> beneath it. The open state on a header is its own <Mono>aria-expanded</Mono>, so{' '}
              <Mono>{`ariaAttr={{ expanded: … }}`}</Mono> is what styles it — no variant, because the attribute the pattern already has to
              write is the selector.
            </Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`<Accordion.Trigger
  py={4}
  ariaAttr={{ expanded: { color: 'emerald-600' } }}
>
  Shipping
</Accordion.Trigger>`}
            />
            <Box mt={4}>
              The one part that is not yours is <Mono>accordion.clip</Mono>, the grid the panel opens in: a padding or a border on it would
              keep the track from ever reaching zero, so the component keeps it. The clip is permanent, which is what pays for the animation
              — the panel's own padding is the room a focus ring on something at its edge needs.
            </Box>
          </Section>

          <ApiReference api={accordionApi} />

          <ApiReference api={collapsibleApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'animation', label: 'The animation is a class' },
  { id: 'multiple', label: 'Several at once' },
  { id: 'keyboard', label: 'Keyboard and heading' },
  { id: 'collapsible', label: 'Collapsible' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'composition', label: 'Composition' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(accordionApi),
  ...apiSections(collapsibleApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Rows3; title: string; children: ReactNode }) {
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
