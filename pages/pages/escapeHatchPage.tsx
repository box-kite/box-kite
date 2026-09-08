import { DoorOpen } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

const clampedText =
  'A closed typed set is the feature: a value that typechecks works, a token cannot drift, and every element writing the same value shares one class. The cost is the property nobody has typed yet, and line-clamp is the classic — three declarations, one of them vendor-prefixed, for a paragraph that stops after two lines and picks up an ellipsis. It used to be an inline style or nothing.';

export default function EscapeHatchPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={DoorOpen}
        title="Escape Hatch"
        description="The 5% the typed set does not cover, without an inline style: css takes a style object and compiles it into a class like every other prop — shared, nestable, rendered on a server."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="concept" title="A class, not a style attribute">
            Every prop on this site is a closed typed set, and that is the feature: a value that typechecks works, and a token cannot drift.
            The cost is the property nobody has typed yet — <Mono>mix-blend-mode</Mono>, <Mono>scroll-snap-type</Mono>, a vendor prefix —
            and the usual way out, <Mono>style=&#123;&#123; &#125;&#125;</Mono>, gives up everything else at once: no sharing, no{' '}
            <Mono>hover</Mono>, no breakpoint, no theme, and a byte of inline CSS on every element. <Mono>css</Mono> is the same style
            object handed to the engine instead. It becomes a rule, the rule gets a class, and the class is shared by every element writing
            the same object.
          </Section>

          <Code
            id="blend-demo"
            label="A property with no prop"
            language="jsx"
            code={`<Flex ai="center">
  <Box width={24} height={24} borderRadius={12} bgColor="sky-400" />
  <Box width={24} height={24} borderRadius={12} bgColor="rose-400" translateX={-8} css={{ mixBlendMode: 'multiply' }} />
</Flex>`}
          >
            <Flex ai="center" p={4}>
              <Box width={24} height={24} borderRadius={12} bgColor="sky-400" />
              <Box width={24} height={24} borderRadius={12} bgColor="rose-400" translateX={-8} css={{ mixBlendMode: 'multiply' }} />
            </Flex>
          </Code>

          <Section id="nesting" title="It nests wherever a prop does">
            The object is a prop value like any other, so it goes inside <Mono>hover</Mono>, a breakpoint, a theme, a <Mono>dataAttr</Mono>,
            a pseudo-element or <Mono>startingStyle</Mono> — and each nesting compiles to its own rule with the same selector every typed
            prop would get. A blend that multiplies on a light surface has to screen on a dark one; the theme decides, not a re-render.
          </Section>

          <Code
            id="theme-demo"
            label="One blend mode per theme"
            language="jsx"
            code={`<Flex ai="center">
  <Box width={24} height={24} borderRadius={12} bgColor="amber-400" />
  <Box
    width={24}
    height={24}
    borderRadius={12}
    bgColor="violet-500"
    translateX={-8}
    theme={{ light: { css: { mixBlendMode: 'multiply' } }, dark: { css: { mixBlendMode: 'screen' } } }}
  />
</Flex>`}
          >
            <Flex ai="center" p={4}>
              <Box width={24} height={24} borderRadius={12} bgColor="amber-400" />
              <Box
                width={24}
                height={24}
                borderRadius={12}
                bgColor="violet-500"
                translateX={-8}
                theme={{ light: { css: { mixBlendMode: 'multiply' } }, dark: { css: { mixBlendMode: 'screen' } } }}
              />
            </Flex>
          </Code>

          <Code
            id="clamp-demo"
            label="Line clamp: three declarations, one of them prefixed — and a hover that lets it go"
            language="jsx"
            context={`declare const clampedText: string;`}
            code={`<Box
  maxWidth={96}
  overflow="hidden"
  css={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
  hover={{ css: { WebkitLineClamp: 'none' } }}
>
  {clampedText}
</Box>`}
          >
            <Box
              maxWidth={96}
              overflow="hidden"
              fontSize={14}
              lineHeight={22}
              cursor="default"
              css={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
              hover={{ css: { WebkitLineClamp: 'none' } }}
            >
              {clampedText}
            </Box>
          </Code>

          <Section id="grammar" title="Names are typed, values are CSS">
            Property names are camelCase, the way React spells them, and they come from <Mono>csstype</Mono> — so a misspelt property is a
            compile error and every name autocompletes. <Mono>WebkitLineClamp</Mono> becomes <Mono>-webkit-line-clamp</Mono>,{' '}
            <Mono>msOverflowStyle</Mono> becomes <Mono>-ms-overflow-style</Mono>, and a name already hyphenated, or a <Mono>--custom</Mono>{' '}
            one, is written as it stands. Values are CSS written out as they stand — a number too, which is why <Mono>width: 100</Mono> is a
            type error (that would be <Mono>width:100</Mono>, which is not CSS) while <Mono>zIndex</Mono>, <Mono>opacity</Mono>,{' '}
            <Mono>flexGrow</Mono> and <Mono>lineHeight</Mono> take theirs. The one thing resolved for you is a colour token:{' '}
            <Mono>outlineColor: 'sky-500'</Mono> is <Mono>var(--sky-500)</Mono> and <Mono>'rose-400/60'</Mono> is the mix, the same rule a{' '}
            <Mono>vars</Mono> value follows, so the hatch stays themed.
          </Section>

          <Code
            id="grammar-code"
            label="The value grammar"
            language="jsx"
            codeOnly
            code={`<Box
  css={{
    outlineColor: 'sky-500', // a token resolves: outline-color: var(--sky-500)
    textDecorationColor: 'rose-400/60', // and takes the opacity modifier
    zIndex: 3, // a unitless property takes a number
    scrollSnapType: 'x mandatory', // everything else is written as it stands
    WebkitLineClamp: 2, // a vendor prefix by React's spelling
    '--rows': 3, // a custom property, though vars is the prop for those
  }}
/>
// width: 100 is a type error — a length wants its unit written out, as '100px'.`}
          />

          <Section id="order" title="It is sorted last">
            The registry declares <Mono>css</Mono> after every other prop, so its rule sorts after every typed prop's at the same
            specificity. On one element, the hatch wins the property both name — it is the override, and the cascade says so rather than the
            order you wrote the props in.
          </Section>

          <Code
            id="order-css"
            label="The generated order"
            language="css"
            codeOnly
            code={`/* <Box p={4} css={{ padding: '3px 7px' }} /> */
.p-4 { padding: 1rem }
.css-padding-3px_7px { padding: 3px 7px } /* after every typed prop's rule, whatever the prop order */`}
          />

          <Section id="governance" title="The three ways out, in order">
            <Bullet>
              <strong>A typed prop</strong>, if one exists. <Mono>/tailwind-parity</Mono> lists every family against the props that cover
              it; most of what feels missing is a spelling away.
            </Bullet>
            <Bullet>
              <strong>
                <Mono>Box.extend()</Mono>
              </strong>{' '}
              for a property you will use more than once: five lines, and afterwards it is indistinguishable from a built-in — typed,
              nested, shared, server-rendered.
            </Bullet>
            <Bullet>
              <strong>
                <Mono>css</Mono>
              </strong>{' '}
              for the one-off. It is the 5%, and it is meant to stay that: an ESLint rule that flags or forbids it per team policy is
              planned, and until it ships the audit is one line.
            </Bullet>
          </Section>

          <Code id="audit" label="Where the hatch is used" language="shell" codeOnly code={`grep -rn "css={{" src`} />

          <Section id="limits" title="What it will not do">
            <Bullet>
              <strong>Write a selector.</strong> A key is a property name, never <Mono>&amp;:hover</Mono> or <Mono>&gt; *</Mono>; the
              nesting keys — <Mono>hover</Mono>, <Mono>dataAttr</Mono>, <Mono>has</Mono>, <Mono>group</Mono>, <Mono>nth</Mono> — are how a
              rule gets a selector, and they wrap <Mono>css</Mono> like any prop.
            </Bullet>
            <Bullet>
              <strong>Let a value end the rule.</strong> A value carrying <Mono>;</Mono> or a brace, or a name that is not a property name,
              is dropped — that entry only, not the object. A data URI's <Mono>;</Mono> is written <Mono>%3B</Mono>.
            </Bullet>
            <Bullet>
              <strong>Format a number.</strong> The dividers belong to the typed props; here <Mono>0</Mono> is the only number a length
              takes, and a unitless property takes what you wrote.
            </Bullet>
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

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Flex gap={2} mb={2}>
      <Box flexShrink={0} width={1.5} height={1.5} mt={2.5} borderRadius={1} bgColor="indigo-500" />
      <Box>{children}</Box>
    </Flex>
  );
}

const sidebarLinks = [
  { id: 'concept', label: 'A class, not a style' },
  { id: 'nesting', label: 'It nests' },
  { id: 'grammar', label: 'Names and values' },
  { id: 'order', label: 'Sorted last' },
  { id: 'governance', label: 'The three ways out' },
  { id: 'limits', label: 'What it will not do' },
];
