import { Highlighter } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2, Li, P, Ul } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function PseudoElementsPage() {
  useTableOfContents(sidebarLinks);
  const [saved, setSaved] = useState(false);

  return (
    <Box>
      <PageHeader
        icon={Highlighter}
        title="Pseudo-Elements"
        description="A badge, an underline, a custom bullet, the colour of selected text — nine pseudo-elements as nested props, and content that quotes itself."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="concept" title="Decoration without another element">
            A <Mono>::before</Mono> is a box the browser gives you for free, and the reason to want one is that it costs no markup: a badge,
            a focus ring that overshoots, a gradient underline that grows on hover. Nine of them are nesting keys now — <Mono>before</Mono>,{' '}
            <Mono>after</Mono>, <Mono>placeholder</Mono>, <Mono>selection</Mono>, <Mono>marker</Mono>, <Mono>firstLine</Mono>,{' '}
            <Mono>firstLetter</Mono>, <Mono>backdrop</Mono> and <Mono>fileButton</Mono> — and every prop, state, breakpoint and theme works
            inside them.
          </Section>

          <Code
            id="concept-code"
            label="The nine keys"
            language="jsx"
            codeOnly
            code={`<Box
  before={{ width: 2, bgColor: 'indigo-500' }}   // ::before  — content comes with it
  after={{ content: 'attr(data-suffix)' }}       // ::after
  placeholder={{ color: 'slate-400' }}           // ::placeholder
  selection={{ bgColor: 'indigo-200' }}          // ::selection
  marker={{ color: 'indigo-500' }}               // ::marker
  firstLine={{ fontWeight: 600 }}                // ::first-line
  firstLetter={{ fontSize: 48 }}                 // ::first-letter
  backdrop={{ bgColor: 'slate-900' }}            // ::backdrop
  fileButton={{ bgColor: 'indigo-500' }}         // ::file-selector-button
/>`}
          />

          <Section id="content" title="content, which you no longer have to remember">
            A generated element with no <Mono>content</Mono> renders nothing at all — the single commonest way a <Mono>::before</Mono> is
            silently missing. So declaring <Mono>before</Mono> or <Mono>after</Mono> supplies <Mono>content: ''</Mono> unless you say
            otherwise, and the pseudo-element exists in exactly the states you styled it in: put it under <Mono>hover</Mono> and it appears
            on hover.
          </Section>

          <Code
            id="content-code"
            label="What content takes"
            language="jsx"
            codeOnly
            code={`<Box before={{ content: 'empty' }} />                      // content: ''   (the default, spelled out)
<Box before={{ content: 'New' }} />                        // content: "New"  — text is quoted for you
<Box after={{ content: '"Step " counter(step)' }} />       // written as CSS, so a sequence works
<Box after={{ content: 'attr(data-suffix)' }} />           // attr(), counter(), url(), var()
<Box before={{ content: 'none' }} />                       // and off again`}
          />

          <Section id="badge" title="A badge is one prop">
            The tag below is a single <Mono>&lt;Button&gt;</Mono>: the count rides in a <Mono>data-*</Mono> attribute and <Mono>after</Mono>{' '}
            draws it, so there is no second element to position, no wrapper, and nothing to keep in sync.
          </Section>

          <Code
            id="badge-demo"
            label="after + attr()"
            language="jsx"
            code={`<Button
  props={{ 'data-count': 3 }}
  position="relative"
  after={{
    content: 'attr(data-count)',
    position: 'absolute',
    top: -2,
    right: -2,
    width: 5,
    height: 5,
    borderRadius: 5,
    bgColor: 'rose-500',
    color: 'white',
    fontSize: 11,
    display: 'grid',
    placeContent: 'center',
  }}
>
  Inbox
</Button>`}
          >
            <Flex gap={6} ai="center">
              <Button
                variant="secondary"
                props={{ 'data-count': 3 }}
                position="relative"
                after={{
                  content: 'attr(data-count)',
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 5,
                  height: 5,
                  borderRadius: 5,
                  bgColor: 'rose-500',
                  color: 'white',
                  fontSize: 11,
                  display: 'grid',
                  placeContent: 'center',
                }}
              >
                Inbox
              </Button>
            </Flex>
          </Code>

          <Section id="underline" title="An underline that grows, and only exists on hover">
            <Mono>before</Mono> nested inside <Mono>hover</Mono> is a pseudo-element that appears in that state — including the{' '}
            <Mono>content</Mono> it needs. Nested the other way round, <Mono>before: {`{ hover: … }`}</Mono>, it is the same one compound
            selector: <Mono>.x:hover::before</Mono> either way, and one class.
          </Section>

          <Code
            id="underline-demo"
            label="before + hover"
            language="jsx"
            code={`<Box
  tag="span"
  position="relative"
  before={{
    position: 'absolute',
    bottom: -1,
    left: 0,
    height: 0.5,
    width: 0,
    bgImage: 'gradient-primary',
    transitionDuration: 250,
  }}
  hover={{ before: { width: 'fit' } }}
>
  Hover this label
</Box>`}
          >
            <Box
              tag="span"
              display="inline-block"
              position="relative"
              fontSize={16}
              fontWeight={500}
              before={{
                position: 'absolute',
                bottom: -1,
                left: 0,
                height: 0.5,
                width: 0,
                bgImage: 'gradient-primary',
                transitionDuration: 250,
              }}
              hover={{ before: { width: 'fit' } }}
            >
              Hover this label
            </Box>
          </Code>

          <Section id="state" title="And it follows a state your own code sets">
            Everything that nests around a prop nests around a pseudo-element: a breakpoint, a theme, a group, and the <Mono>dataAttr</Mono>
            /<Mono>ariaAttr</Mono>/<Mono>has</Mono>/<Mono>not</Mono> variants. The element is appended to whatever they build, because CSS
            allows exactly one and it has to come last.
          </Section>

          <Code
            id="state-demo"
            label="dataAttr + after"
            language="jsx"
            context="declare const saved: boolean;declare const setSaved: (value: boolean) => void;"
            code={`<Button
  props={{ 'data-saved': saved ? 'yes' : 'no' }}
  onClick={() => setSaved(!saved)}
  dataAttr={{
    'saved=yes': { after: { content: ' ✓', color: 'emerald-500' } },
    'saved=no': { after: { content: ' •', color: 'slate-400' } },
  }}
>
  Save draft
</Button>`}
          >
            <Button
              variant="secondary"
              props={{ 'data-saved': saved ? 'yes' : 'no' }}
              onClick={() => setSaved(!saved)}
              dataAttr={{
                'saved=yes': { after: { content: ' ✓', color: 'emerald-500' } },
                'saved=no': { after: { content: ' •', color: 'slate-400' } },
              }}
            >
              Save draft
            </Button>
          </Code>

          <Section id="text" title="placeholder, selection, marker">
            The other six style something the browser already renders, so they take the properties CSS lets them and ignore the rest — a{' '}
            <Mono>::selection</Mono> is colours, not layout. On a <Mono>&lt;Textbox&gt;</Mono> the name <Mono>placeholder</Mono> means both
            things: a string is the attribute, an object is the styles. Want both, the text goes in <Mono>props</Mono>, where every
            attribute goes.
          </Section>

          <Code
            id="text-demo"
            label="placeholder, selection, marker"
            language="jsx"
            code={`<Textbox
  props={{ placeholder: 'Search projects…' }}
  placeholder={{ color: 'indigo-400', fontStyle: 'italic' }}
/>

<P selection={{ bgColor: 'indigo-500', color: 'white' }}>Select this sentence.</P>

<Ul marker={{ color: 'indigo-500', fontSize: 18 }}>
  <Li>One</Li>
  <Li>Two</Li>
</Ul>`}
          >
            <Flex d="column" gap={5}>
              <Textbox
                props={{ placeholder: 'Search projects…' }}
                placeholder={{ color: 'indigo-400', fontStyle: 'italic' }}
                width="fit"
                maxWidth={80}
              />
              <P fontSize={15} selection={{ bgColor: 'indigo-500', color: 'white' }}>
                Select this sentence to see <Mono>::selection</Mono> restyled.
              </P>
              <Ul pl={6} fontSize={15} marker={{ color: 'indigo-500', fontSize: 18 }}>
                <Li>One</Li>
                <Li>Two</Li>
              </Ul>
            </Flex>
          </Code>

          <Section id="one" title="One per selector, and the element goes last">
            CSS allows a single pseudo-element in a compound selector, at the end. That is a slot rather than a list here, so nesting one
            inside another is a type error, and a merged component style that manages it anyway is dropped instead of emitting{' '}
            <Mono>::before::after</Mono>, which matches nothing. It is also why the element lands on the <em>target</em> of a group
            selector: <Mono>.card:hover .x::before</Mono>, never <Mono>.card:hover::before .x</Mono>.
          </Section>

          <Code
            id="one-code"
            label="Where it lands"
            language="css"
            codeOnly
            check={false}
            code={`/* hover={{ before: { opacity: 1 } }} */
.x:hover::before { opacity: 1 }

/* md={{ dataAttr: { 'state=open': { after: { opacity: 1 } } } }} */
@media (min-width: 768px) { .y[data-state="open"]::after { opacity: 1 } }

/* hoverGroup={{ card: { before: { opacity: 1 } } }} — the state is the card's, the element is ours */
.card:hover .z::before { opacity: 1 }`}
          />

          <Section id="safety" title="Text is quoted, and a value that cannot be is refused">
            <Mono>content</Mono> is the one prop whose value is text a caller wrote, and text becomes rule text. So a plain string is quoted
            and escaped (a quote, a backslash, a newline), a value written as CSS is scanned instead — every quote closed, every parenthesis
            balanced, no <Mono>;</Mono>, <Mono>{`}`}</Mono> or <Mono>@</Mono> outside a string — and one that fails produces no rule and no
            class name, exactly like an unmatched prop value.
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
  { id: 'concept', label: 'What they are' },
  { id: 'content', label: 'content' },
  { id: 'badge', label: 'A badge' },
  { id: 'underline', label: 'An underline' },
  { id: 'state', label: 'Following a state' },
  { id: 'text', label: 'placeholder, selection, marker' },
  { id: 'one', label: 'One per selector' },
  { id: 'safety', label: 'Quoting and refusal' },
];
