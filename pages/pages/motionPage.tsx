import { Loader2, Wand2 } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { flushSync } from 'react-dom';
import Box from '../../src/box';
import Button from '../../src/components/button';
import { Sparkline } from '../../src/components/chart';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2, P } from '../../src/components/semantics';
import Slider from '../../src/components/slider';
import { Circle, Path, Svg } from '../../src/components/svg';
import Springs from '../../src/core/springs';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { curvePath, DialKey, dials, demos, springPresets } from './motion';

// Registered at module scope, the way `Box.extend()` is: a sequence reaches the stylesheet only when a
// rule names it, and then once for the whole page.
Box.keyframes({
  'motion-reveal': {
    from: { opacity: 0, translateY: 5 },
    to: { opacity: 1, translateY: 0 },
  },
  'motion-progress': {
    from: { scale: 0 },
    to: { scale: 1 },
  },
  'motion-draw': {
    from: { strokeDashoffset: 320 },
    to: { strokeDashoffset: 0 },
  },
});

const TRAIL = [4, 9, 7, 14, 11, 19, 16, 24, 21, 30, 27, 36];

export default function MotionPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Wand2}
        title="Motion showcase"
        description="Six pieces of motion, each one a prop. Every effect below is run by the browser — there is no animation library here, and nothing on this page measures a layout or ticks a frame."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={12}>
          <Presets />
          <SpringPlayground />
          <EntryExit />
          <ScrollDriven />
          <ViewTransitions />
          <PathDrawing />
        </Flex>
      </Reveal>
    </Box>
  );
}

function Presets() {
  return (
    <Demo id="presets">
      <P>
        <Mono>animation</Mono> takes one of four names, and their <Mono>@keyframes</Mono> come with the engine — written into the stylesheet
        the first time something asks for one, so the three you did not use cost nothing. Each preset's duration is a multiple of{' '}
        <Mono>--transitionTime</Mono>, the variable the base stylesheet zeroes under <Mono>prefers-reduced-motion</Mono>, so all four stop
        themselves for a reader who asked for less motion. There is no opt-in to forget.
      </P>

      <Code id="presets-demo" label="spin, pulse, bounce, ping" language="jsx">
        <Flex gap={10} ai="center" jc="center" flexWrap="wrap" py={6}>
          <Icon size={10} color="sky-500" animation="spin">
            <Loader2 />
          </Icon>
          <Box width={14} height={14} borderRadius={3} bgColor="violet-500" animation="pulse" />
          <Box width={14} height={14} borderRadius={7} bgColor="emerald-500" animation="bounce" />
          <Box width={14} height={14} borderRadius={7} bgColor="rose-500" animation="ping" />
        </Flex>
      </Code>
    </Demo>
  );
}

function SpringPlayground() {
  const [tuning, setTuning] = useState<Record<DialKey, number>>({ stiffness: 180, damping: 20, mass: 1 });
  const [thrown, setThrown] = useState(false);
  const { easing, duration } = Springs.spring(tuning);

  return (
    <Demo id="springs">
      <P>
        A spring is normally a loop: a physics step every frame, on the main thread, for as long as the motion lasts.{' '}
        <Mono>Box.spring()</Mono> samples the same oscillator once into a <Mono>linear()</Mono> curve — which both timing-function props
        already take — so what reaches the browser is a value, and the browser runs it on the compositor. Drag the dials and throw the card:
        the curve under them is the one the CSS receives.
      </P>

      <Code
        id="springs-demo"
        label="Box.spring()"
        language="jsx"
        code={`const { easing, duration } = Box.spring({ stiffness: 180, damping: 20, mass: 1 });

<Box
  transition="transform"
  transitionTimingFunction={easing}
  transitionDuration={duration}
  translateX={thrown ? 44 : 0}
/>`}
      >
        <Flex d="column" gap={6}>
          <Flex gap={6} flexWrap="wrap" ai="flex-end">
            {dials.map((dial) => (
              <Flex key={dial.key} d="column" gap={2} width={40}>
                <Flex jc="space-between" fontSize={12} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                  <Box>{dial.label}</Box>
                  <Mono>{tuning[dial.key]}</Mono>
                </Flex>
                <Slider
                  label={dial.label}
                  min={dial.min}
                  max={dial.max}
                  step={dial.step}
                  value={tuning[dial.key]}
                  onValueChange={(value) => setTuning((previous) => ({ ...previous, [dial.key]: value }))}
                />
              </Flex>
            ))}
          </Flex>

          <Flex gap={6} ai="center" flexWrap="wrap">
            <Button variant="secondary" onClick={() => setThrown((on) => !on)}>
              Throw it
            </Button>
            <Box fontSize={12} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
              settles in <Mono>{duration}ms</Mono>
            </Box>
          </Flex>

          <Box overflow="hidden" borderRadius={2} p={3} theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-50' } }}>
            <Box
              width={12}
              height={12}
              borderRadius={2}
              bgImage="gradient-primary"
              transition="transform"
              transitionTimingFunction={easing}
              transitionDuration={duration}
              translateX={thrown ? 44 : 0}
            />
          </Box>

          <Flex gap={6} ai="center" flexWrap="wrap">
            <Curve easing={easing} caption={`${tuning.stiffness} · ${tuning.damping} · ${tuning.mass}`} />
            {springPresets.map((name) => (
              <Curve key={name} easing={Springs.preset(name).easing} caption={name} />
            ))}
          </Flex>
        </Flex>
      </Code>

      <Aside>
        The four curves on the right are sampled once, on first use, and kept — <Mono>transitionTimingFunction="spring-bouncy"</Mono> with{' '}
        <Mono>transitionDuration="spring-bouncy"</Mono> is the whole of it, and a spring is a curve <em>and</em> a settling time, which is
        why the name goes on both props. Because the curve is a value, two elements given the same spring share one class.
      </Aside>
    </Demo>
  );
}

function EntryExit() {
  const [open, setOpen] = useState(false);

  return (
    <Demo id="entry-exit">
      <P>
        <Mono>startingStyle</Mono> is what a just-mounted element starts <em>from</em>, and <Mono>transitionBehavior="allow-discrete"</Mono>{' '}
        is what flips <Mono>display</Mono> at the <em>end</em> of the transition rather than the beginning — so the panel below animates in
        and out without ever leaving the DOM, and without a library holding it open. <Mono>&lt;Dialog&gt;</Mono> and{' '}
        <Mono>&lt;Popover&gt;</Mono> are this same pair, already wired.
      </P>

      <Code
        id="entry-exit-demo"
        label="startingStyle + allow-discrete"
        language="jsx"
        context="declare const open: boolean;"
        code={`<Box
  display={open ? 'block' : 'none'}
  opacity={open ? 1 : 0}
  translateY={open ? 0 : -2}
  transition="all"
  transitionBehavior="allow-discrete"
  startingStyle={{ opacity: 0, translateY: -2 }}
>
  Both directions, one element.
</Box>`}
      >
        <Flex d="column" gap={4} ai="flex-start">
          <Button variant="secondary" onClick={() => setOpen((on) => !on)}>
            {open ? 'Hide it' : 'Show it'}
          </Button>
          <Box
            display={open ? 'block' : 'none'}
            opacity={open ? 1 : 0}
            translateY={open ? 0 : -2}
            transition="all"
            transitionBehavior="allow-discrete"
            startingStyle={{ opacity: 0, translateY: -2 }}
            px={5}
            py={4}
            borderRadius={2}
            fontSize={14}
            theme={{ dark: { bgColor: 'slate-800', color: 'slate-300' }, light: { bgColor: 'slate-50', color: 'slate-700' } }}
          >
            Both directions, one element, no unmount.
          </Box>
        </Flex>
      </Code>
    </Demo>
  );
}

function ScrollDriven() {
  return (
    <Demo id="scroll">
      <P>
        <Mono>animationTimeline</Mono> takes an animation's progress off a scroll position instead of a clock: <Mono>scroll()</Mono> is the
        nearest scrollport's progress, <Mono>view()</Mono> this element's own pass across it. The bar at the top of the panel and the four
        cards below it are one declaration each — no <Mono>IntersectionObserver</Mono>, no scroll listener, no{' '}
        <Mono>requestAnimationFrame</Mono> and no state. Scroll inside the panel.
      </P>

      <Code
        id="scroll-demo"
        label="scroll() and view()"
        language="jsx"
        code={`Box.keyframes({
  progress: { from: { scale: 0 }, to: { scale: 1 } },
  reveal: { from: { opacity: 0, translateY: 5 }, to: { opacity: 1, translateY: 0 } },
});

<Box height={64} overflow="auto">
  <Box position="sticky" top={0} height={1} bgColor="sky-500" css={{ transformOrigin: 'left' }}
    animationName="progress" animationTimeline="scroll()" animationFillMode="both"
    motionReduce={{ animation: 'none' }} />

  <Box animationName="reveal" animationTimeline="view()" animationRange="entry 0% entry 60%"
    animationFillMode="both" motionReduce={{ animation: 'none' }}>
    <Sparkline data={trail} variant="area" />
  </Box>
</Box>`}
      >
        <Box
          height={64}
          overflow="auto"
          borderRadius={2}
          b={1}
          theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}
        >
          <Box
            position="sticky"
            top={0}
            height={1}
            bgColor="sky-500"
            zIndex={1}
            css={{ transformOrigin: 'left' }}
            animationName="motion-progress"
            animationTimeline="scroll()"
            animationFillMode="both"
            motionReduce={{ animation: 'none' }}
          />
          <Flex d="column" gap={5} p={5}>
            {['Revenue', 'Sessions', 'Conversion', 'Retention'].map((label) => (
              <Flex
                key={label}
                d="column"
                gap={2}
                p={4}
                borderRadius={2}
                theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-50' } }}
                animationName="motion-reveal"
                animationTimeline="view()"
                animationRange="entry 0% entry 60%"
                animationFillMode="both"
                motionReduce={{ animation: 'none' }}
              >
                <Box fontSize={13} fontWeight={600} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
                  {label}
                </Box>
                <Sparkline data={TRAIL} variant="area" height="2.5rem" color="sky-500" />
              </Flex>
            ))}
            <Box height={40} />
          </Flex>
        </Box>
      </Code>

      <Aside>
        This is the one kind of motion here that does <strong>not</strong> stop itself under <Mono>prefers-reduced-motion</Mono>: a
        scroll-driven animation has no duration, so the variable that zeroes every other one cannot reach it.{' '}
        <Mono>motionReduce=&#123;&#123; animation: 'none' &#125;&#125;</Mono> is on every element above, and it is not optional. Where the
        browser has no timelines the <em>declaration</em> is dropped rather than the animation, so end the sequence where the element
        belongs and the degradation is "already arrived".
      </Aside>
    </Demo>
  );
}

function ViewTransitions() {
  const [wide, setWide] = useState(false);

  return (
    <Demo id="view-transitions">
      <P>
        A view transition screenshots the page, runs your update, screenshots again and animates between the two. Nothing below declares a
        transition: the card carries a <Mono>viewTransitionName</Mono>, and that is enough for the browser to move it from where it was to
        where it is. The alternative is FLIP — measure both layouts, compute the difference, animate it back — which is the code this prop
        replaces.
      </P>

      <Code
        id="view-transitions-demo"
        label="Box.viewTransition()"
        language="jsx"
        context="declare function setWide(value: boolean | ((previous: boolean) => boolean)): void;"
        code={`// flushSync is the point: the browser screenshots the page the moment the
// callback returns, and a setState has not rendered by then.
<Button onClick={() => Box.viewTransition(() => flushSync(() => setWide((on) => !on)))}>
  Rearrange
</Button>

<Box viewTransitionName="showcase-card" width={wide ? '2/3' : '1/3'} />`}
      >
        <Flex d="column" gap={4} ai="flex-start">
          <Button variant="secondary" onClick={() => Box.viewTransition(() => flushSync(() => setWide((on) => !on)))}>
            Rearrange
          </Button>
          <Flex width="fit" gap={3} jc={wide ? 'flex-end' : 'flex-start'}>
            <Box
              viewTransitionName="showcase-card"
              width={wide ? '2/3' : '1/3'}
              px={5}
              py={4}
              borderRadius={2}
              fontSize={13}
              color="white"
              bgImage="gradient-primary"
            >
              No transition written
            </Box>
          </Flex>
        </Flex>
      </Code>

      <Aside>
        A name has to be unique in the document while the transition runs, so the prop is for the handful a layout has. Reduced motion{' '}
        <strong>skips</strong> the transition and still applies the update — a whole-page cross-fade being exactly the motion the preference
        is about. This site's own theme toggle is <Mono>&lt;Box.Theme viewTransition&gt;</Mono>, which is this call with the{' '}
        <Mono>flushSync</Mono> already inside it.
      </Aside>
    </Demo>
  );
}

function PathDrawing() {
  const [runId, setRunId] = useState(0);

  return (
    <Demo id="drawing">
      <P>
        A keyframe's steps are Box props, so a sequence can animate anything a prop can set — including the SVG lengths. A path draws itself
        by animating <Mono>strokeDashoffset</Mono> from its own <Mono>strokeDasharray</Mono> down to zero: one dash longer than the line,
        slid out of the way. Nothing calls <Mono>getTotalLength()</Mono> — a dash with room to spare covers any path shorter than it, which
        is why the ring beside it takes the very same two numbers.
      </P>

      <Code
        id="drawing-demo"
        label="Drawing a path"
        language="jsx"
        code={`Box.keyframes({ draw: { from: { strokeDashoffset: 320 }, to: { strokeDashoffset: 0 } } });

<Path d="M4,44 C24,44 28,8 48,8 …" fill="none" stroke="sky-500" strokeWidth={3}
  strokeDasharray={320} animationName="draw" animationDuration={1600}
  animationTimingFunction="ease-in-out" animationFillMode="both" />`}
      >
        <Flex d="column" gap={4} ai="flex-start">
          <Flex key={runId} gap={8} ai="center" flexWrap="wrap">
            <Svg viewBox="0 0 120 56" width={240} height={112} label="A line drawing itself">
              <Path
                d="M4,44 C24,44 28,8 48,8 C68,8 72,48 92,48 C104,48 110,28 116,20"
                fill="none"
                stroke="sky-500"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={320}
                animationName="motion-draw"
                animationDuration={1600}
                animationTimingFunction="ease-in-out"
                animationFillMode="both"
              />
            </Svg>
            <Svg viewBox="0 0 56 56" width={112} height={112} label="A ring drawing itself">
              <Circle
                cx={28}
                cy={28}
                r={22}
                fill="none"
                stroke="violet-500"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={320}
                rotate={-90}
                css={{ transformOrigin: 'center' }}
                animationName="motion-draw"
                animationDuration={1600}
                animationTimingFunction="ease-in-out"
                animationFillMode="both"
              />
            </Svg>
          </Flex>
          <Button variant="secondary" onClick={() => setRunId((id) => id + 1)}>
            Draw again
          </Button>
        </Flex>
      </Code>
    </Demo>
  );
}

/** One preset's curve, drawn from the points the CSS gets: time across, progress up, the target dashed. */
function Curve({ easing, caption }: { easing: string; caption: string }) {
  return (
    <Flex d="column" gap={1} ai="center">
      <Svg viewBox="0 0 100 100" width={76} height={76} label={`The ${caption} curve`}>
        <Path d="M2,28 L98,28" fill="none" stroke="slate-400" strokeWidth={0.8} strokeDasharray="3 3" />
        <Path d={curvePath(easing)} fill="none" stroke="sky-500" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {caption}
      </Box>
    </Flex>
  );
}

/** A demo: its heading, the prose and the code, plus the line saying what it is not running. */
function Demo({ id, children }: { id: string; children: ReactNode }) {
  const demo = demos.find((entry) => entry.id === id)!;

  return (
    <Flex id={id} d="column" gap={4}>
      <Box>
        <H2 fontSize={22} fontWeight={600} mb={2} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          {demo.title}
        </H2>
        <Box fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
          Instead of {demo.instead}.
        </Box>
      </Box>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Flex>
  );
}

/** The honest half of a demo — the limit, the caveat, the thing that bites. */
function Aside({ children }: { children: ReactNode }) {
  return (
    <Box
      ps={5}
      bs={2}
      fontSize={14}
      lineHeight={24}
      theme={{
        dark: { borderColor: 'slate-700', color: 'slate-400' },
        light: { borderColor: 'slate-200', color: 'slate-600' },
      }}
    >
      {children}
    </Box>
  );
}

const sidebarLinks = demos.map((demo) => ({ id: demo.id, label: demo.label }));
