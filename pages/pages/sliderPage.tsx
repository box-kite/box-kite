import { Gauge, Keyboard, Languages, MousePointer2, Rows3, Ruler, SlidersHorizontal, Waves, Zap } from 'lucide-react';
import { ReactNode, useState } from 'react';
import sliderApi from '../../api/components/slider.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Slider from '../../src/components/slider';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function SliderPage() {
  useTableOfContents(sidebarLinks);

  const [volume, setVolume] = useState(40);
  const [price, setPrice] = useState<number[]>([20, 80]);
  const [committed, setCommitted] = useState(40);

  return (
    <Box>
      <PageHeader
        icon={SlidersHorizontal}
        title="Slider"
        description="APG's slider and its multi-thumb sibling: a number in is a number out, the thumbs are placed by logical properties, and the only thing that is not a shared class is where they are."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Slider from '@box-kite/react/components/slider';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Slider label="Volume" defaultValue={40} onValueChange={(value) => setVolume(value)} />`}
          >
            <Box py={6} maxWidth={80}>
              <Slider label="Volume" value={volume} onValueChange={setVolume} />
              <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                <Mono>{String(volume)}</Mono>
              </Box>
            </Box>
          </Code>

          <Section id="shape" title="A number in is a number out">
            <Box>
              The number of thumbs is the value's own shape, so there is no second prop saying which kind of slider this is.{' '}
              <Mono>defaultValue={'{40}'}</Mono> is one thumb whose <Mono>onValueChange</Mono> hands back a <Mono>number</Mono>;{' '}
              <Mono>defaultValue={'{[20, 80]}'}</Mono> is a range whose handler takes a <Mono>number[]</Mono>. TypeScript infers which from
              the value you wrote, so neither one needs narrowing at the call site.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} format={(value) => \`\${value} lei\`} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Slider
                    label="Price"
                    value={price}
                    onValueChange={setPrice}
                    thumbLabels={['Lowest', 'Highest']}
                    format={(value) => `${value} lei`}
                  />
                  <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                    <Mono>{price.join(' – ')}</Mono>
                  </Box>
                </Box>
              </Code>
            </Box>
            <Box mt={4}>
              A thumb may meet the one beside it and never pass it: crossing would renumber the thumbs under the focus that is on one of
              them. Three thumbs and more work the same way — each is held between its neighbours, and the fill spans the outermost two.
            </Box>
          </Section>

          <Section id="platform" title="Why this is not an input">
            <Box>
              Every other control in this library is a real form element with a role over it — a <Mono>Switch</Mono> is a checkbox, a{' '}
              <Mono>RadioGroup</Mono> is a set of radios. A slider is the one place the platform loses.{' '}
              <Mono>&lt;input type="range"&gt;</Mono> cannot hold two thumbs, and its track and thumb are vendor pseudo-elements —{' '}
              <Mono>::-webkit-slider-thumb</Mono>, <Mono>::-moz-range-track</Mono> — that no typed prop can reach. Styling one is a rewrite
              of every part, at which point the native element is only supplying the keyboard.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Zap} title="The form still works">
                  <Mono>name</Mono> renders a hidden input per thumb, so a range posts two values under that name and a plain{' '}
                  <Mono>FormData</Mono> reads them. That is the half of the native element worth keeping.
                </Note>
                <Note icon={Keyboard} title="And the keyboard is APG's, not the browser's">
                  Both arrow pairs on both orientations, <Mono>PageUp</Mono>/<Mono>PageDown</Mono> for <Mono>largeStep</Mono>, and{' '}
                  <Mono>Home</Mono>/<Mono>End</Mono> on the ends themselves — on the step grid or off it, the way a range input reaches its
                  own maximum.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="inline" title="The position is an inline style, deliberately">
            <Box>
              Everything a slider paints is a shared class except where its thumbs are. That one value is per frame of a drag, and a class
              for it would be a rule per frame — written into the stylesheet and never freed. So it is an inline{' '}
              <Mono>inset-inline-start</Mono>, which is the exception <Mono>useAnchorPosition</Mono>'s anchor name and the travelling tab
              indicator already take.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Gauge} title="A ring can round its fraction into a class; a slider cannot">
                  <Mono>ProgressRing</Mono> rounds to half a percent and pays nothing, because nobody drags a ring. Round a thumb that far
                  and a wide track visibly stair-steps under the pointer.
                </Note>
                <Note icon={Rows3} title="Everything else is still a class">
                  The track, the fill's colour, the thumb, the focus ring, the forced-colors fallback and both themes are shared rules — one
                  set for every slider on the page, however many there are.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="travel" title="A press travels, and a nudge does not">
            <Box>
              A press on the track is the one move the eye has to follow, so the thumb animates the whole way. Every other move — a drag, an
              arrow key, a held arrow — takes a short 60ms <em>linear</em> travel on both the thumb and the fill instead, so they keep up
              and stay locked together.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Ruler} title="Short rather than off, because off steps">
                  A value on a grid can only ever be at its grid positions, so a slider of 1 in 100 moves <Mono>3.2px</Mono> at a time on a
                  320px track — exact, and visibly steppy. 60ms interpolates between the steps, for 4.4px of average lag.
                </Note>
                <Note icon={Waves} title="Linear rather than eased, or it throbs">
                  An eased travel restarted thirty times a second replays its slow-in on every repeat, so a held arrow pulses instead of
                  gliding. The speed inside each step swings <Mono>2.9×</Mono> eased and <Mono>1.15×</Mono> linear, and the thumb wobbles
                  0.12px around an even glide where ease wobbles 0.19px.
                </Note>
                <Note icon={MousePointer2} title="Both parts, or neither">
                  Every Box carries a 250ms <Mono>all</Mono> transition, so a fill left with the default eased towards a thumb that had
                  already arrived — up to 59px behind it mid-drag, and still moving for ~190ms after the pointer stopped.
                </Note>
                <Note icon={Keyboard} title="An arrow is a nudge, not a jump">
                  One tap used to spend the full 250ms travel crossing <Mono>3.2px</Mono>, which is the lag it read as — and holding the key
                  began with it, before the repeats arrived. Every arrow is short now, held or not: a tap arrives in 60ms.
                </Note>
              </Flex>
            </Box>
            <Box mt={4}>
              The real dial is <Mono>step</Mono>: it is what a slider can be smoother than, and <Mono>step={'{0}'}</Mono> is continuous, so
              the thumb follows the pointer with nothing to interpolate. The smoothing is one variant, <Mono>tracking</Mono>, on{' '}
              <Mono>slider.fill</Mono> and <Mono>slider.thumb</Mono> — a style tree of your own can lengthen it or take it off.
            </Box>
          </Section>
          <Section id="rtl" title="It mirrors for free">
            <Box>
              The fill and the thumbs are placed with <Mono>inset-inline-start</Mono> and centred with a logical margin, so a right-to-left
              page draws the minimum on the right with nothing declared twice and no re-render. The half that is not free is the keyboard:
              the sideways arrows swap, because <Mono>ArrowLeft</Mono> is the increase when the maximum is on the left, and{' '}
              <Mono>ArrowUp</Mono> never swaps, because the block axis has no reading order.
            </Box>
            <Box mt={4}>
              <Note icon={Languages} title="The direction is the element's own">
                It is read off the resolved <Mono>direction</Mono> when a sideways arrow arrives, so a slider inside a{' '}
                <Mono>dir="auto"</Mono> subtree behaves the way it looks.
              </Note>
            </Box>
          </Section>

          <Section id="orientation" title="Vertical">
            <Box>
              A vertical slider counts up from its bottom edge, whatever the reading order — the block axis has no start to mirror. Give it
              a height; the default is <Mono>10rem</Mono>.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Slider label="Bitrate" orientation="vertical" defaultValue={60} height={40} />`}>
                <Flex py={6} gap={8} jc="center">
                  <Slider label="Bitrate" orientation="vertical" defaultValue={60} />
                  <Slider label="Gain" orientation="vertical" defaultValue={25} step={5} />
                  <Slider label="Mix" orientation="vertical" defaultValue={80} disabled />
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="commit" title="Change and commit">
            <Box>
              <Mono>onValueChange</Mono> fires on every step of a drag, which is what a live preview wants and what a network request does
              not. <Mono>onValueCommit</Mono> fires once, when the pointer is let go or the key comes back up — the place for the request.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Slider label="Quality" defaultValue={40} onValueChange={setPreview} onValueCommit={(value) => save(value)} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Slider label="Quality" defaultValue={40} onValueCommit={(value) => setCommitted(value)} />
                  <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                    committed: <Mono>{String(committed)}</Mono>
                  </Box>
                </Box>
              </Code>
            </Box>
            <Box mt={4}>
              Both report why: <Mono>{"{ reason: 'pointer' }"}</Mono> or <Mono>{"{ reason: 'keyboard' }"}</Mono>, beside the event that
              caused it.
            </Box>
          </Section>

          <Section id="steps" title="Steps and ranges">
            <Box>
              <Mono>step</Mono> is the grid every value lands on, counted from <Mono>min</Mono> rather than from zero, and{' '}
              <Mono>step={'{0}'}</Mono> is a continuous slider. <Mono>Home</Mono> and <Mono>End</Mono> go to the ends themselves even when
              those are off the grid.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Slider label="Rating" min={1} max={5} step={1} defaultValue={3} format={(value) => \`\${value} of 5\`} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Slider label="Rating" min={1} max={5} step={1} defaultValue={3} format={(value) => `${value} of 5`} />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="naming" title="Naming a thumb">
            <Box>
              A <Mono>role="slider"</Mono> has to have a name — a value nobody can attach to anything is not readable. On one thumb{' '}
              <Mono>label</Mono> names the thumb. On a range it names the <Mono>role="group"</Mono> around the thumbs, and{' '}
              <Mono>thumbLabels</Mono> names them one at a time: "Lowest" and "Highest" are what a reader hears before the number.
            </Box>
            <Box mt={4}>
              Where the number alone does not read as the value, <Mono>format</Mono> writes <Mono>aria-valuetext</Mono> — a currency, a
              date, a rating out of five.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Four parts, each a key in <Mono>Box.components()</Mono>: <Mono>slider</Mono>, <Mono>slider.track</Mono>,{' '}
              <Mono>slider.fill</Mono> and <Mono>slider.thumb</Mono>. The root takes Box props directly, and every part carries the{' '}
              <Mono>vertical</Mono> variant, because a widget whose track turned its axis while its thumb kept the old one is a bug this
              library has already shipped once.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`Box.components({
  slider: {
    children: {
      fill: { styles: { bgGradient: { linear: 'r', colors: ['sky-400', 'indigo-500'] } } },
      thumb: { styles: { borderColor: 'sky-500', width: 5, height: 5, ms: -2.5 } },
    },
  },
});`}
              />
            </Box>
          </Section>

          <ApiReference api={sliderApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'shape', label: 'A number in, a number out' },
  { id: 'platform', label: 'Why not an input' },
  { id: 'inline', label: 'The position is inline' },
  { id: 'travel', label: 'A press travels, a nudge does not' },
  { id: 'rtl', label: 'It mirrors for free' },
  { id: 'orientation', label: 'Vertical' },
  { id: 'commit', label: 'Change and commit' },
  { id: 'steps', label: 'Steps and ranges' },
  { id: 'naming', label: 'Naming a thumb' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(sliderApi),
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
