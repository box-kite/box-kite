import { Wrench } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, H3 } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { boxMembers } from './box';

export default function BoxFunctionsPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Wrench}
        title="Box functions"
        description="Everything Box carries that is not a prop: add props of your own, name a set of styles, register keyframes, sample a spring, switch themes and configure the engine — with the smallest real example of each."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={12}>
          <Section id="surface" title="The whole surface">
            <Flex d="column" gap={5}>
              <Box>
                Ten names, and you will use two of them. <Mono>Box.components()</Mono> is how a design system is written here, and{' '}
                <Mono>Box.extend()</Mono> is how the prop set grows. The other eight are for the day you need them.
              </Box>
              <Box overflowX="auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <HeadCell>Name</HeadCell>
                      <HeadCell>What it is for</HeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {boxMembers.map((member) => (
                      <TableRow key={member.id}>
                        <Cell whiteSpace="nowrap" css={{ verticalAlign: 'top' }}>
                          <Box
                            tag="a"
                            display="inline"
                            props={{ href: `#${member.id}` }}
                            hover={{ textDecoration: 'underline' }}
                            theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
                          >
                            <Mono>{member.name}</Mono>
                          </Box>
                        </Cell>
                        <Cell css={{ verticalAlign: 'top' }}>{member.summary}</Cell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Box fontSize={14} lineHeight={24}>
                Everything is registered on one engine, shared by the whole app, so these are called once at module scope — not in a
                component, not in an effect. Register before the first render and nothing has to be re-emitted.
              </Box>
            </Flex>
          </Section>

          <Member id="components" more={{ label: 'Theme Setup', to: '/theme-setup' }}>
            <Box>
              A named set of styles with variants, named parts and inheritance. An element wears it with{' '}
              <Mono>component=&quot;card&quot;</Mono>, and props written on that element still win — a default is a starting point, not a
              lock. It is how every pre-built component here is styled, so restyling <Mono>button</Mono> or <Mono>datagrid</Mono> is the
              same call.
            </Box>

            <Code
              label="Register a card, and two variants of it"
              language="jsx"
              code={`// boxExtends.ts
import Box from '@box-kite/react';

export const components = Box.components({
  card: {
    styles: {
      p: 5,
      borderRadius: 3,
      b: 1,
      bgColor: 'white',
      borderColor: 'slate-200',
      theme: { dark: { bgColor: 'slate-800', borderColor: 'slate-700' } },
    },
    variants: {
      danger: { borderColor: 'rose-400', bgColor: 'rose-50' },
      flat: { b: 0, shadow: 'none' },
    },
    children: {
      title: { styles: { fontSize: 16, fontWeight: 600, mb: 2 } },
    },
  },
});`}
              codeOnly
            />

            <Code
              label="Wear it"
              language="jsx"
              check={false}
              code={`<Box component="card" variant="danger" p={6}>
  <Box component="card.title">Payment failed</Box>
  We could not charge the card on file.
</Box>`}
              codeOnly
            />

            <Callout title="A name is not a type until you say so">
              <Mono>variant=&quot;danger&quot;</Mono> is a type error until a <Mono>declare module</Mono> hands TypeScript what you
              registered — the names exist at runtime only. One file, written once, and every later <Mono>Box.components()</Mono> call it
              exports from is picked up automatically.
            </Callout>

            <Code
              label="box.d.ts — the one file that teaches the names"
              language="jsx"
              check={false}
              code={`import '@box-kite/react';
import { ExtractComponentsAndVariants } from '@box-kite/core/types';
import { components } from './boxExtends';

declare module '@box-kite/core/types' {
  namespace Augmented {
    interface ComponentsTypes extends ExtractComponentsAndVariants<typeof components> {}
  }
}`}
              codeOnly
            />
          </Member>

          <Member id="extend" more={{ label: 'Style Grouping', to: '/style-grouping' }}>
            <Box>
              Three arguments, and each one is a different kind of growth: <strong>variables</strong> declares CSS custom properties,{' '}
              <strong>new props</strong> adds props the registry does not have, and <strong>new values</strong> teaches a prop that already
              exists to accept one more. All three land in the same pipeline as the built-ins — typed, nestable, shared, server-rendered.
            </Box>

            <Code
              label="A brand colour, a prop of your own, and a new value on an existing prop"
              language="jsx"
              code={`// boxExtends.ts
import Box from '@box-kite/react';

export const { extendedProps, extendedPropTypes } = Box.extend(
  // 1. Variables: declared in :root the first time something uses one.
  { 'brand-500': '#4f46e5', 'grid-gutter': '1.5rem' },
  // 2. Props of your own.
  {
    columnRule: [
      {
        values: ['thin', 'thick'] as const,
        styleName: 'column-rule-width',
        valueFormat: (value: string) => (value === 'thin' ? '1px' : '4px'),
      },
    ],
  },
  // 3. More values on props that already exist.
  {
    bgColor: [{ values: ['brand-500'] as const, styleName: 'background-color', valueFormat: (value, getVariable) => getVariable(value) }],
  },
);`}
              codeOnly
            />

            <Code
              label="Use them like any other prop"
              language="jsx"
              check={false}
              code={`<Box bgColor="brand-500" columnRule="thick" hover={{ bgColor: 'brand-500/80' }} md={{ columnRule: 'thin' }} />`}
              codeOnly
            />

            <Callout title="A variable is a value, not a second system">
              A token registered here is accepted wherever the palette is, opacity modifier included — <Mono>&quot;brand-500/80&quot;</Mono>{' '}
              is a <Mono>color-mix</Mono> over the variable, so it stays themeable. The types need the same <Mono>declare module</Mono> the
              components do, with <Mono>ExtractBoxStyles&lt;typeof extendedProps&gt;</Mono> for your new props and{' '}
              <Mono>ExtractBoxStyles&lt;typeof extendedPropTypes&gt;</Mono> for the new values.
            </Callout>
          </Member>

          <Member id="keyframes" more={{ label: 'Animation', to: '/animation' }}>
            <Box>
              An <Mono>@keyframes</Mono> sequence whose steps are Box props rather than CSS — so a step is written in the same scale, tokens
              and all. Registering costs nothing: the engine writes a sequence the first time a rule names it.
            </Box>

            <Code
              label="Register it, then name it"
              language="jsx"
              code={`Box.keyframes({
  slideIn: {
    from: { opacity: 0, translateY: 4 },
    to: { opacity: 1, translateY: 0 },
  },
});`}
              codeOnly
            />

            <Code
              label="On an element"
              language="jsx"
              check={false}
              code={`<Box animationName="slideIn" animationDuration={300} animationFillMode="both" />`}
              codeOnly
            />
          </Member>

          <Member id="spring" more={{ label: 'Animation', to: '/animation' }}>
            <Box>
              Spring physics sampled into a <Mono>linear()</Mono> curve and a settling time — the two halves the timing-function and
              duration props already take. There is no runtime: the spring is a value, so it shares a class like any other and costs nothing
              per frame.
            </Box>

            <Code
              label="A spring of your own — the curve on one prop, the settling time on the other"
              language="jsx"
              code={`const bouncy = Box.spring({ stiffness: 220, damping: 12 });

<Box transitionTimingFunction={bouncy.easing} transitionDuration={bouncy.duration} hover={{ scale: 1.05 }} />;`}
              codeOnly
            />

            <Code
              label="Two of the four named ones — hover either"
              language="jsx"
              code={`<Box transitionTimingFunction="spring-bouncy" transitionDuration="spring-bouncy" hover={{ scale: 1.08 }}>
  Hover: spring-bouncy
</Box>
<Box transitionTimingFunction="spring-gentle" transitionDuration="spring-gentle" hover={{ scale: 1.08 }}>
  Hover: spring-gentle
</Box>`}
            >
              <Flex gap={4} flexWrap="wrap">
                <Box
                  p={4}
                  borderRadius={2}
                  bgColor="indigo-600"
                  color="white"
                  fontSize={13}
                  cursor="default"
                  transitionTimingFunction="spring-bouncy"
                  transitionDuration="spring-bouncy"
                  hover={{ scale: 1.08 }}
                >
                  Hover: spring-bouncy
                </Box>
                <Box
                  p={4}
                  borderRadius={2}
                  bgColor="slate-600"
                  color="white"
                  fontSize={13}
                  cursor="default"
                  transitionTimingFunction="spring-gentle"
                  transitionDuration="spring-gentle"
                  hover={{ scale: 1.08 }}
                >
                  Hover: spring-gentle
                </Box>
              </Flex>
            </Code>

            <Callout title="Four are already named">
              <Mono>spring</Mono>, <Mono>spring-gentle</Mono>, <Mono>spring-bouncy</Mono> and <Mono>spring-snappy</Mono> are values on the
              timing-function and duration props, so the common case needs no call at all — and their durations are multiples of{' '}
              <Mono>--transitionTime</Mono>, which reduced motion sets to zero.
            </Callout>
          </Member>

          <Member id="theme" more={{ label: 'Theme Setup', to: '/theme-setup' }}>
            <Box>
              The provider. It reads <Mono>prefers-color-scheme</Mono>, follows it live, persists an explicit choice, and writes the theme
              class and <Mono>data-theme</Mono> onto <Mono>&lt;html&gt;</Mono> (<Mono>use=&quot;global&quot;</Mono>) or onto a wrapper of
              its own (<Mono>use=&quot;local&quot;</Mono>, the default). Switching costs no re-render — it is one class moving on an
              ancestor.
            </Box>

            <Code
              label="Once, at the root"
              language="jsx"
              check={false}
              code={`<Box.Theme use="global" storageKey="theme" globalStyles={{ colorScheme: 'light dark' }}>
  <App />
</Box.Theme>`}
              codeOnly
            />

            <Callout title="A theme name is any identifier">
              <Mono>light</Mono> and <Mono>dark</Mono> are only the two you get for free. A{' '}
              <Mono>theme=&#123;&#123; midnight: … &#125;&#125;</Mono> block on any element works the moment a provider above it is called{' '}
              <Mono>midnight</Mono>, and a nested provider owns its own subtree outright.
            </Callout>
          </Member>

          <Member id="usetheme" more={{ label: 'Theme Setup', to: '/theme-setup' }}>
            <Box>
              Read what the nearest provider settled on, and set it. Passing <Mono>null</Mono> clears the stored choice and hands control
              back to the operating system.
            </Box>

            <Code
              label="A theme toggle"
              language="jsx"
              code={`function ThemeToggle() {
  const [theme, setTheme] = Box.useTheme();

  return <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'}</Button>;
}`}
              codeOnly
            />
          </Member>

          <Member id="configure" more={{ label: 'Server Components', to: '/server-components' }}>
            <Box>
              How the engine names classes, where it writes rules, and what the base class transitions. The defaults suit a browser and a
              Node server alike, so most apps never call it — reach for it to make class names reproducible across processes, or to turn the
              base transition off.
            </Box>

            <Code
              label="Before the first render, once"
              language="jsx"
              code={`Box.configure({
  // 'hashed' (default), 'readable' for tests, or 'stable' — content-hashed, so two processes agree.
  classNames: 'stable',
  // 'cssom' | 'textContent' | 'string' | 'element'. Defaults to the environment.
  sink: 'cssom',
  // What every Box transitions by default — a transition group, or false to declare nothing at all.
  transition: 'colors',
});`}
              codeOnly
            />

            <Callout title="It re-emits everything">
              Changing the sink or the base transition after rules have been written drops the class-name cache and writes them all again,
              which is why this belongs at module scope and not in a component.
            </Callout>
          </Member>

          <Member id="getvariablevalue">
            <Box>
              The <Mono>var(--…)</Mono> reference behind a palette token, declaring it in <Mono>:root</Mono> the first time it is asked for.
              For handing a themed colour to something that takes a plain string — a canvas, a chart library, an SVG attribute somebody else
              renders.
            </Box>

            <Code
              label="A token as a string"
              language="jsx"
              code={`const stroke = Box.getVariableValue('sky-500'); // 'var(--sky-500)'`}
              codeOnly
            />

            <Callout title="For markup you do render, vars is the prop">
              <Mono>vars=&#123;&#123; &apos;color-revenue&apos;: &apos;sky-500&apos; &#125;&#125;</Mono> declares{' '}
              <Mono>--color-revenue</Mono> on an element and everything inside it, so it nests in a theme and a breakpoint like any other
              prop. Reach for <Mono>getVariableValue</Mono> only when a string is genuinely what is wanted.
            </Callout>
          </Member>

          <Member id="useclassnames">
            <Box>
              Box props as a <Mono>className</Mono>, for an element Box cannot render: a router&rsquo;s <Mono>NavLink</Mono>, a{' '}
              <Mono>motion.div</Mono>, a component from another library that takes a class and nothing else. All the nesting works — hover,
              breakpoints, themes — because it is the same resolution Box does.
            </Box>

            <Code
              label="Styling somebody else's component"
              language="jsx"
              code={`import { useClassNames } from '@box-kite/react';

function Crumb({ to, children }: { to: string; children: React.ReactNode }) {
  const { className, styles } = useClassNames({ color: 'sky-600', hover: { color: 'sky-400' } });

  return (
    <>
      {styles}
      <NavLink to={to} className={className}>
        {children}
      </NavLink>
    </>
  );
}`}
              context={`declare const NavLink: (props: { to: string; className?: string; children?: React.ReactNode }) => React.ReactNode;`}
              codeOnly
            />

            <Callout title="Render styles either way">
              <Mono>styles</Mono> is defined in element mode only, where the CSS travels as <Mono>&lt;style&gt;</Mono> elements React
              hoists. Everywhere else it is <Mono>undefined</Mono> and rendering it costs nothing — so that line is what to write in both.
            </Callout>
          </Member>

          <Member id="usevisibility">
            <Box>
              Open/closed state that closes itself: an outside press, Escape, and optionally a scroll or a resize. The ref goes on the
              element that counts as <em>inside</em>.
            </Box>

            <Code
              label="A panel that dismisses itself"
              language="jsx"
              code={`const [isVisible, setVisible, ref] = useVisibility<HTMLDivElement>({ hideOnScroll: true });

<Box ref={ref}>
  <Button onClick={() => setVisible(!isVisible)}>Filters</Button>
  {isVisible && <Box p={4}>…</Box>}
</Box>;`}
              context={`import { useVisibility } from '@box-kite/react';`}
              codeOnly
            />

            <Callout title="For a real layer, reach past it">
              A dismissable panel that also needs focus return, layering or the top layer is <Mono>Popover</Mono>, and the primitive under
              it is <Mono>useDismiss</Mono> from <Mono>@box-kite/react/a11y</Mono>. <Mono>useVisibility</Mono> is the small case: a
              disclosure that owns nothing else.
            </Callout>
          </Member>
        </Flex>
      </Reveal>
    </Box>
  );
}

/** One member's section, titled from the shared list so the page and the table above cannot drift apart. */
function Member({ id, more, children }: { id: string; more?: { label: string; to: string }; children: ReactNode }) {
  const member = boxMembers.find((entry) => entry.id === id)!;

  return (
    <Box id={id}>
      <H2 fontSize={22} fontWeight={600} mb={2} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {member.name}
      </H2>
      <Box mb={5} fontSize={14}>
        <Mono whiteSpace="normal" theme={{ dark: { color: 'violet-300' }, light: { color: 'violet-700' } }}>
          {member.signature}
        </Mono>
      </Box>
      <Flex d="column" gap={5} fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
        {more && (
          <Box fontSize={14}>
            In depth:{' '}
            <SiteLink
              to={more.to}
              display="inline"
              textDecoration="underline"
              theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
            >
              {more.label}
            </SiteLink>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

/** The one thing about a member that is not in its example — usually the trap. */
function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex
      d="column"
      gap={2}
      p={4}
      borderRadius={2}
      bs={3}
      borderColor="amber-400"
      theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'amber-50' } }}
    >
      <H3 fontSize={14} fontWeight={600} theme={{ dark: { color: 'amber-300' }, light: { color: 'amber-800' } }}>
        {title}
      </H3>
      <Box fontSize={14} lineHeight={24} theme={{ dark: { color: 'slate-300' }, light: { color: 'amber-900' } }}>
        {children}
      </Box>
    </Flex>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={22} fontWeight={600} mb={5} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'surface', label: 'The whole surface' },
  { label: 'Extending', section: true as const },
  { id: 'components', label: 'Box.components()' },
  { id: 'extend', label: 'Box.extend()' },
  { label: 'Motion', section: true as const },
  { id: 'keyframes', label: 'Box.keyframes()' },
  { id: 'spring', label: 'Box.spring()' },
  { label: 'Theme', section: true as const },
  { id: 'theme', label: 'Box.Theme' },
  { id: 'usetheme', label: 'Box.useTheme()' },
  { label: 'The engine', section: true as const },
  { id: 'configure', label: 'Box.configure()' },
  { id: 'getvariablevalue', label: 'Box.getVariableValue()' },
  { label: 'Hooks', section: true as const },
  { id: 'useclassnames', label: 'useClassNames()' },
  { id: 'usevisibility', label: 'useVisibility()' },
];
