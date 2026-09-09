import { Loader2, Sparkles } from 'lucide-react';
import { ReactNode, useState } from 'react';
import presenceApi from '../../api/components/presence.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Presence from '../../src/components/presence';
import { H2 } from '../../src/components/semantics';
import { Line, Path, Svg } from '../../src/components/svg';
import Springs from '../../src/core/springs';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

// Registered once, at module scope, the way `Box.extend()` is: registration is free — a sequence
// reaches the stylesheet only when a rule names it, and then exactly once.
Box.keyframes({
  'docs-slide-in': {
    from: { opacity: 0, translateY: 3 },
    to: { opacity: 1, translateY: 0 },
  },
  'docs-draw': {
    from: { width: 0 },
    to: { width: 'fit' },
  },
});

export default function AnimationPage() {
  useTableOfContents(sidebarLinks);
  const [runId, setRunId] = useState(0);
  const [sprung, setSprung] = useState(false);
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);

  return (
    <Box>
      <PageHeader
        icon={Sparkles}
        title="Animation"
        description="Keyframes, presets and transitions as props — including the durations that stop on their own when the reader asked for less motion."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="presets" title="Four presets, no registration">
            <Mono>animation</Mono> takes one of four names — the ones Tailwind ships, because everybody already knows what they do. Their{' '}
            <Mono>@keyframes</Mono> come with the engine and are written into the stylesheet the first time something asks for one, so an
            unused preset costs nothing at all.
          </Section>

          <Code id="presets-demo" label="Presets" language="jsx">
            <Flex gap={8} ai="center" flexWrap="wrap">
              <Icon size={7} color="sky-500" animation="spin">
                <Loader2 />
              </Icon>
              <Box width={10} height={10} borderRadius={2} bgColor="violet-500" animation="pulse" />
              <Box width={10} height={10} borderRadius={5} bgColor="emerald-500" animation="bounce" />
              <Box width={10} height={10} borderRadius={5} bgColor="rose-500" animation="ping" />
            </Flex>
          </Code>

          <Section id="reduced-motion" title="A preset already knows about reduced motion">
            Every preset's duration is a multiple of <Mono>--transitionTime</Mono>, the variable the base stylesheet zeroes under{' '}
            <Mono>prefers-reduced-motion</Mono> — so the four above stop on their own, with no opt-in and no media query of yours. The
            moment you name a duration in milliseconds you have left that default behind, which is the honest trade: the number you wrote
            wins, and saying when to stop is now your job.
          </Section>

          <Code id="reduced-motion-demo" label="Opting out by name" language="jsx" codeOnly>
            <Box
              animationName="docs-slide-in"
              animationDuration={600}
              animationTimingFunction="ease-out"
              motionReduce={{ animationName: 'none' }}
            />
          </Code>

          <Section id="keyframes" title="Box.keyframes(): the steps are Box props">
            A sequence is declared where component styles are, and its stops hold props rather than CSS — the same ÷4 spacing scale, the
            same colour tokens, the same composed longhands. Register it once at module scope; the name is what <Mono>animationName</Mono>{' '}
            refers to.
          </Section>

          <Code
            id="keyframes-demo"
            label="A sequence of your own"
            language="jsx"
            code={`Box.keyframes({
  'slide-in': {
    from: { opacity: 0, translateY: 3 },
    to: { opacity: 1, translateY: 0 },
  },
});

<Box animationName="slide-in" animationDuration={450} animationTimingFunction="ease-out" />`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Flex key={runId} gap={3}>
                {[0, 1, 2].map((index) => (
                  <Box
                    key={index}
                    width={16}
                    height={16}
                    borderRadius={2}
                    bgImage="gradient-primary"
                    animationName="docs-slide-in"
                    animationDuration={450}
                    animationDelay={index * 120}
                    animationTimingFunction="ease-out"
                    animationFillMode="backwards"
                  />
                ))}
              </Flex>
              <Button variant="secondary" onClick={() => setRunId((id) => id + 1)}>
                Play again
              </Button>
            </Flex>
          </Code>

          <Section id="longhands" title="One prop per animation property">
            <Mono>animationName</Mono>, <Mono>animationDuration</Mono>, <Mono>animationDelay</Mono>, <Mono>animationIterationCount</Mono>,{' '}
            <Mono>animationDirection</Mono>, <Mono>animationFillMode</Mono>, <Mono>animationPlayState</Mono> and{' '}
            <Mono>animationTimingFunction</Mono> — declared after <Mono>animation</Mono>, so a longhand overrides whatever a preset chose.
            Times are milliseconds, like every other time in this library. The stagger above is three Boxes and one{' '}
            <Mono>animationDelay</Mono>; each distinct value is one shared class, so a hundred staggered rows generate a hundred one-line
            rules and nothing else.
          </Section>

          <Code id="playstate-demo" label="animationPlayState" language="jsx">
            <Flex
              gap={4}
              ai="center"
              p={4}
              borderRadius={2}
              theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'slate-50' } }}
              className="docs-marquee"
            >
              <Icon size={6} color="amber-500" animation="spin" hoverGroup={{ 'docs-marquee': { animationPlayState: 'paused' } }}>
                <Loader2 />
              </Icon>
              <Box fontSize={14}>Hover to pause</Box>
            </Flex>
          </Code>

          <Section id="transitions" title="Transitions: what changes, and how long it takes">
            Every Box transitions <Mono>all</Mono> its properties over <Mono>--transitionTime</Mono> already, which is why a{' '}
            <Mono>hover</Mono> colour fades without being asked. <Mono>transition</Mono> narrows that to a group — <Mono>colors</Mono>,{' '}
            <Mono>opacity</Mono>, <Mono>shadow</Mono>, <Mono>transform</Mono>, <Mono>size</Mono>, <Mono>filter</Mono> — and{' '}
            <Mono>transitionDuration</Mono>, <Mono>transitionDelay</Mono> and <Mono>transitionTimingFunction</Mono> say the rest. An easing
            can be a keyword or a curve: <Mono>cubic-bezier()</Mono>, <Mono>steps()</Mono> and <Mono>linear()</Mono> are values, and a typo
            in one of them emits no rule rather than a broken declaration.
          </Section>

          <Code id="transition-demo" label="Transition groups" language="jsx">
            <Flex gap={4} flexWrap="wrap">
              <Box
                px={5}
                py={3}
                borderRadius={2}
                fontSize={14}
                cursor="pointer"
                bgColor="slate-200"
                transition="colors"
                transitionDuration={300}
                hover={{ bgColor: 'indigo-500', color: 'white' }}
                theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' } }}
              >
                colours only
              </Box>
              <Box
                px={5}
                py={3}
                borderRadius={2}
                fontSize={14}
                cursor="pointer"
                bgColor="slate-200"
                transition="transform"
                transitionDuration={300}
                transitionTimingFunction="cubic-bezier(0.34, 1.56, 0.64, 1)"
                hover={{ scale: 1.08 }}
                theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' } }}
              >
                transform, overshooting
              </Box>
            </Flex>
          </Code>

          <Section id="springs" title="Springs, sampled into a curve">
            A spring is physics, and CSS cannot do physics — but it can follow a curve, so the four presets are a damped oscillator sampled
            once into a <Mono>linear()</Mono> curve, which is a value like any other. <Mono>spring</Mono>, <Mono>spring-gentle</Mono>,{' '}
            <Mono>spring-bouncy</Mono> and <Mono>spring-snappy</Mono> are values on <Mono>transitionTimingFunction</Mono> and{' '}
            <Mono>animationTimingFunction</Mono>; the same four names are values on <Mono>transitionDuration</Mono> and{' '}
            <Mono>animationDuration</Mono>, because a spring is a curve <em>and</em> the time it takes to settle. Name both and the physics
            is what the numbers say.
          </Section>

          <Code
            id="springs-curves"
            label="The four curves"
            language="jsx"
            code={`// Both halves of a spring come from the same name.
<Box transition="transform" transitionTimingFunction="spring-bouncy" transitionDuration="spring-bouncy" hover={{ scale: 1.1 }} />`}
          >
            <Flex gap={6} flexWrap="wrap">
              {Springs.presetNames.map((name) => (
                <SpringCurve key={name} name={name} />
              ))}
            </Flex>
          </Code>

          <Code
            id="springs-demo"
            label="Same distance, four springs"
            language="jsx"
            context="declare const sprung: boolean;"
            code={`<Box
  width={8}
  height={8}
  bgImage="gradient-primary"
  transition="transform"
  transitionTimingFunction="spring-snappy"
  transitionDuration="spring-snappy"
  translateX={sprung ? 40 : 0}
/>`}
          >
            <Flex d="column" gap={4}>
              {Springs.presetNames.map((name) => (
                <Flex key={name} ai="center" gap={4}>
                  <Box width={32} fontSize={12} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                    {name}
                  </Box>
                  <Box
                    width={8}
                    height={8}
                    borderRadius={2}
                    bgImage="gradient-primary"
                    transition="transform"
                    transitionTimingFunction={name}
                    transitionDuration={name}
                    translateX={sprung ? 40 : 0}
                  />
                </Flex>
              ))}
              <Button variant="secondary" onClick={() => setSprung((moved) => !moved)}>
                {sprung ? 'Send them back' : 'Let them go'}
              </Button>
            </Flex>
          </Code>

          <Section id="springs-honest" title="What a sampled spring is not">
            The curve is fixed once it is a string, which is the honest limit: a real spring carries its velocity into whatever interrupts
            it, and this one restarts. Reverse a transition halfway and the shape plays back rather than continuing from where it was — good
            enough for a hover, a panel or a toggle, not for a drag. That is <Mono>framer-motion</Mono>'s job, and it composes with Box
            styling perfectly well. The other limit is browser support: <Mono>linear()</Mono> is missing in about one browser in eight, so
            every curve this library writes carries an <Mono>ease-out</Mono> declaration underneath it — the older browser keeps that one,
            and the animation still happens.
          </Section>

          <Code
            id="springs-custom"
            label="A spring of your own"
            language="jsx"
            codeOnly
            code={`// Stiffness, damping, mass and an initial velocity — sampled once, at module scope.
const wobble = Box.spring({ stiffness: 120, damping: 8 });

<Box transition="transform" transitionTimingFunction={wobble.easing} transitionDuration={wobble.duration} hover={{ translateY: -2 }} />`}
          />

          <Section id="transforms" title="The transform props compose">
            <Mono>translateX</Mono>, <Mono>translateY</Mono>, <Mono>rotate</Mono> and <Mono>scale</Mono> are the CSS longhands rather than
            one <Mono>transform</Mono> declaration, so setting several of them means several of them happen. The two translate axes used to
            write the same property and one silently won; each now sets its own custom property and both compose into one{' '}
            <Mono>translate</Mono> — which still transitions, because <Mono>var()</Mono> is substituted before the browser compares the two
            states. The exception worth knowing: <Mono>flip</Mono> and <Mono>scale</Mono> both write <Mono>scale</Mono>, so use one or the
            other.
          </Section>

          <Code id="transforms-demo" label="Two axes and a rotation" language="jsx">
            <Flex gap={6} p={6} flexWrap="wrap">
              <Box
                width={16}
                height={16}
                borderRadius={2}
                bgColor="sky-500"
                cursor="pointer"
                hover={{ translateX: 3, translateY: -3, rotate: 45 }}
              />
              <Box width={16} height={16} borderRadius={2} bgColor="violet-500" cursor="pointer" hover={{ scale: 1.25, rotate: -45 }} />
            </Flex>
          </Code>

          <Section id="entrances" title="An entrance is a prop, not a lifecycle">
            <Mono>startingStyle</Mono> holds the values a property starts from the first time the element is styled — which, for something
            React has just mounted, is the moment it appears. It nests the way a breakpoint does and takes plain props, and since every Box
            already transitions, that is the entire entrance: no state, no effect, no library, nothing to unmount. It compiles to{' '}
            <Mono>@starting-style</Mono>, one rule shared by every element that starts from the same place, and a browser that has never
            heard of the at-rule drops that one rule and shows the element finished.
          </Section>

          <Code
            id="entrances-demo"
            label="startingStyle"
            language="jsx"
            context="declare const shown: boolean;"
            code={`{shown && (
  <Box
    width={16}
    height={16}
    bgImage="gradient-primary"
    startingStyle={{ opacity: 0, translateY: 2, scale: 0.96 }}
    transitionDuration={280}
  />
)}`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Flex gap={4} height={20} ai="center">
                {shown &&
                  [0, 1, 2].map((index) => (
                    <Box
                      key={index}
                      width={16}
                      height={16}
                      borderRadius={2}
                      bgImage="gradient-primary"
                      startingStyle={{ opacity: 0, translateY: 2, scale: 0.96 }}
                      transitionDuration={280}
                      transitionDelay={index * 90}
                    />
                  ))}
              </Flex>
              <Button variant="secondary" onClick={() => setShown((on) => !on)}>
                {shown ? 'Unmount them' : 'Mount them'}
              </Button>
            </Flex>
          </Code>

          <Section id="discrete" title="Both directions, without unmounting">
            An entrance is easy because the element is new; an exit is hard because React removes the node the instant it stops rendering
            it. The platform's own answer is <Mono>transitionBehavior="allow-discrete"</Mono>: it lets <Mono>display</Mono> transition,
            flipping to <Mono>none</Mono> at the <em>end</em> rather than the start, so an element that is hidden rather than unmounted
            animates out as well as in — and <Mono>startingStyle</Mono> applies again every time it comes back from{' '}
            <Mono>display: none</Mono>. When the node really does have to leave the tree, holding it long enough to animate is a React
            problem rather than a CSS one, and <Mono>&lt;Presence&gt;</Mono> below is the answer to that half.
          </Section>

          <Code
            id="discrete-demo"
            label="transitionBehavior"
            language="jsx"
            context="declare const open: boolean;"
            code={`<Box
  display={open ? 'block' : 'none'}
  opacity={open ? 1 : 0}
  transitionBehavior="allow-discrete"
  startingStyle={{ opacity: 0, translateY: -2 }}
  transitionDuration={260}
/>`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Box height={20}>
                <Box
                  display={open ? 'block' : 'none'}
                  opacity={open ? 1 : 0}
                  translateY={open ? 0 : -2}
                  transitionBehavior="allow-discrete"
                  startingStyle={{ opacity: 0, translateY: -2 }}
                  transitionDuration={260}
                  px={5}
                  py={3}
                  borderRadius={2}
                  fontSize={14}
                  bgImage="gradient-primary"
                  color="white"
                >
                  hidden, not unmounted
                </Box>
              </Box>
              <Button variant="secondary" onClick={() => setOpen((on) => !on)}>
                {open ? 'Hide' : 'Show'}
              </Button>
            </Flex>
          </Code>

          <Section id="presence" title="Unmounting, but not yet">
            Hiding is not always an option: a list row, a toast, a route. <Mono>&lt;Presence&gt;</Mono> keeps rendering its child with{' '}
            <Mono>present: false</Mono> until the child's own CSS says the transition is over, and only then lets React remove it — so the
            exit is written as ordinary props on ordinary state. It reads the element's computed <Mono>transition-duration</Mono> rather
            than listening for <Mono>transitionend</Mono>, which fires once per property with no way to know how many are coming; the useful
            consequence is that a reader on <Mono>prefers-reduced-motion</Mono> measures zero and the node leaves in the same commit, with
            nothing to configure. <Mono>Tooltip</Mono>, the <Mono>Dropdown</Mono> popup and the DataGrid's column menu are all built on it,
            so every layer in the library already animates both ways.
          </Section>

          <Code
            id="presence-demo"
            label="Presence"
            language="jsx"
            context="declare const shown: boolean;"
            code={`<Presence present={shown}>
  {({ present, ref, props }) => (
    <Box
      ref={ref}
      props={props}
      opacity={present ? 1 : 0}
      translateY={present ? 0 : -2}
      startingStyle={{ opacity: 0, translateY: -2 }}
      transitionDuration={320}
    />
  )}
</Presence>`}
          >
            <Flex d="column" gap={4} ai="flex-start">
              <Box height={20}>
                <Presence present={leaving}>
                  {({ present, ref, props }) => (
                    <Box
                      ref={ref}
                      props={props}
                      opacity={present ? 1 : 0}
                      translateY={present ? 0 : -2}
                      scale={present ? 1 : 0.96}
                      startingStyle={{ opacity: 0, translateY: -2, scale: 0.96 }}
                      transitionDuration={320}
                      px={5}
                      py={3}
                      borderRadius={2}
                      fontSize={14}
                      bgImage="gradient-primary"
                      color="white"
                    >
                      unmounted, once it has finished
                    </Box>
                  )}
                </Presence>
              </Box>
              <Button variant="secondary" onClick={() => setLeaving((on) => !on)}>
                {leaving ? 'Remove it' : 'Add it'}
              </Button>
            </Flex>
          </Code>

          <Section id="sizes" title="Animating to a height nobody measured">
            <Mono>height: auto</Mono> has never been animatable, which is why every accordion on the web measures its own content in
            JavaScript. <Mono>interpolateSize="allow-keywords"</Mono> opts a subtree into interpolating the size keywords —{' '}
            <Mono>auto</Mono>, <Mono>min-content</Mono>, <Mono>fit-content</Mono> — and it inherits, so it belongs on the container and
            every size inside it becomes animatable at once. Chromium-only for now, and the degradation is the behaviour you have today: the
            panel snaps open.
          </Section>

          <Code
            id="sizes-demo"
            label="interpolateSize"
            language="jsx"
            context="declare const expanded: boolean;"
            code={`<Box interpolateSize="allow-keywords">
  <Box height={expanded ? 'auto' : 0} overflow="hidden" transition="size" transitionDuration={300}>
    <Box p={4}>Content nobody had to measure.</Box>
  </Box>
</Box>`}
          >
            <Flex d="column" gap={4} ai="flex-start" interpolateSize="allow-keywords">
              <Button variant="secondary" onClick={() => setExpanded((on) => !on)}>
                {expanded ? 'Collapse' : 'Expand'}
              </Button>
              <Box
                height={expanded ? 'auto' : 0}
                overflow="hidden"
                transition="size"
                transitionDuration={300}
                transitionTimingFunction="ease-in-out"
                borderRadius={2}
                width="fit"
                theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'slate-50' } }}
              >
                <Box p={4} fontSize={14} lineHeight={22}>
                  No measuring, no <Mono>scrollHeight</Mono>, no ref: the panel transitions <Mono>height</Mono> from <Mono>0</Mono> to{' '}
                  <Mono>auto</Mono> because the container said keywords may interpolate.
                </Box>
              </Box>
            </Flex>
          </Code>

          <Section id="drawing" title="A sequence can animate anything a prop can set">
            Because a stop is Box props, a sequence is not limited to the four properties an animation library would give you. This bar
            grows by animating <Mono>width</Mono> from <Mono>0</Mono> to <Mono>fit</Mono> — the size keywords work in a keyframe like they
            do anywhere else.
          </Section>

          <Code
            id="drawing-demo"
            label="Animating width"
            language="jsx"
            code={`Box.keyframes({ draw: { from: { width: 0 }, to: { width: 'fit' } } });

<Box height={2} borderRadius={1} bgImage="gradient-primary" animationName="draw" animationDuration={900} />`}
          >
            <Box width="1/2">
              <Box
                key={runId}
                height={2}
                borderRadius={1}
                bgImage="gradient-primary"
                animationName="docs-draw"
                animationDuration={900}
                animationTimingFunction="ease-in-out"
              />
            </Box>
          </Code>

          <Section id="server" title="On a server, and in a Server Component">
            A sequence is part of the stylesheet, not of a component's markup, so it travels the way every other rule does:{' '}
            <Mono>getStyles()</Mono> returns it for static output, and in element mode it rides the base <Mono>&lt;style&gt;</Mono> element
            every Box carries — which means a Server Component can animate with no client JavaScript anywhere in the page. The loading bar
            in this site's DataGrid is exactly that: <Mono>animationName</Mono> in the grid's component styles, and a sweep that starts
            before hydration.
          </Section>

          <Section id="off" title="Turning the default off">
            <Mono>transition: all</Mono> on every Box is a default, not a law. An engine can be told to narrow it to one group, or to
            declare nothing at all and leave transitions entirely to the props — useful in an app that owns its own motion system.
          </Section>

          <Code
            id="off-demo"
            label="Configuring the base transition"
            language="jsx"
            codeOnly
            code={`// Before the first render — the base block is written once.
Box.configure({ transition: 'colors' });

// Or nothing at all:
Box.configure({ transition: false });`}
          />
          <ApiReference api={presenceApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

/** One preset's curve, drawn from the points the CSS gets: time across, progress up, the target dashed. */
function SpringCurve({ name }: { name: Springs.PresetName }) {
  const { easing, duration } = Springs.preset(name);
  const points = easing.slice('linear('.length, -1).split(',').map(Number);
  const d = points
    .map((value, index) => `${index ? 'L' : 'M'}${(2 + (index / (points.length - 1)) * 96).toFixed(1)},${(88 - value * 60).toFixed(1)}`)
    .join(' ');

  return (
    <Flex d="column" gap={2}>
      <Svg viewBox="0 0 100 100" width={132} height={132} label={`The ${name} curve`}>
        <Line x1={2} y1={28} x2={98} y2={28} stroke="slate-400" strokeWidth={0.6} strokeDasharray="3 3" />
        <Line x1={2} y1={88} x2={98} y2={88} stroke="slate-400" strokeWidth={0.6} />
        <Path d={d} fill="none" stroke="sky-500" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Box fontSize={12} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {name} · {duration}ms
      </Box>
    </Flex>
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
  { id: 'presets', label: 'Four presets' },
  { id: 'reduced-motion', label: 'Reduced motion' },
  { id: 'keyframes', label: 'Box.keyframes()' },
  { id: 'longhands', label: 'One prop per property' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'springs', label: 'Springs' },
  { id: 'springs-honest', label: 'What a spring is not' },
  { id: 'transforms', label: 'Composing transforms' },
  { id: 'entrances', label: 'startingStyle' },
  { id: 'discrete', label: 'Both directions' },
  { id: 'presence', label: 'Presence' },
  { id: 'sizes', label: 'height: auto' },
  { id: 'drawing', label: 'Animating any prop' },
  { id: 'server', label: 'On a server' },
  { id: 'off', label: 'Turning it off' },
  ...apiSections(presenceApi),
];
