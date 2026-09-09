import { Spline } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
// prettier-ignore
import { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Polyline, Rect, Stop, Svg, SvgText } from '../../src/components/svg';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function SvgPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Spline}
        title="SVG"
        description="Twenty-three SVG properties as typed props, and twenty components to put them on — paint, stroke, text and the SVG 2 geometry that lets a shape move with no JavaScript at all."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            id="paint"
            label="Paint"
            language="jsx"
            code={`<Svg viewBox="0 0 120 48" width="120px" fill="violet-500" stroke="violet-300" strokeWidth={2}>
  <Circle cx={24} cy={24} r={16} />
  <Rect x={52} y={8} width={32} height={32} fillOpacity={0.4} />
  <Circle cx={104} cy={24} r={16} fill="none" strokeWidth={4} strokeOpacity={0.5} />
</Svg>`}
          >
            <Svg
              viewBox="0 0 120 48"
              width="120px"
              theme={{ dark: { fill: 'violet-400', stroke: 'violet-200' }, light: { fill: 'violet-500', stroke: 'violet-700' } }}
              strokeWidth={2}
            >
              <Circle cx={24} cy={24} r={16} />
              <Rect x={52} y={8} width={32} height={32} fillOpacity={0.4} />
              <Circle cx={104} cy={24} r={16} fill="none" strokeWidth={4} strokeOpacity={0.5} />
            </Svg>
          </Code>

          <Section id="inheritance" title="Set them once, on the element above">
            <Box>
              Every paint and stroke property here except <Mono>vectorEffect</Mono> is an inherited one, so a value on the{' '}
              <Mono>&lt;svg&gt;</Mono> reaches every shape inside it — that is why the demo above sets <Mono>stroke</Mono> once rather than
              on all three shapes. A shape that wants something else states it, and wins for itself.
            </Box>
            <Box mt={4}>
              The one thing inheritance cannot beat is a <Mono>fill</Mono> or <Mono>stroke</Mono> <em>attribute</em> written on the shape
              itself: a presentation attribute on an element outranks a value inherited from its parent. Icon sets that hard-code{' '}
              <Mono>fill=&quot;currentColor&quot;</Mono> on each path are the common case — style those paths, not the wrapper.
            </Box>
          </Section>

          <Section id="units" title="The numbers are user units">
            <Box>
              <Mono>strokeWidth</Mono>, <Mono>strokeDasharray</Mono>, <Mono>strokeDashoffset</Mono> and <Mono>strokeMiterlimit</Mono> take
              the number and pass it straight through — <Mono>strokeWidth={'{2}'}</Mono> is <Mono>stroke-width: 2</Mono>. No divider is
              applied, because an SVG length is measured in the coordinate system the <Mono>viewBox</Mono> sets up, not in rem or in pixels.
              That is the same number you would have written in the attribute.
            </Box>
            <Box mt={4}>
              <Mono>fillOpacity</Mono> and <Mono>strokeOpacity</Mono> use the same 0–1 scale as <Mono>opacity</Mono>, in tenths.
            </Box>
          </Section>

          <Code
            id="dashes"
            label="Dashes"
            language="jsx"
            code={`<Svg viewBox="0 0 200 12" width="200px" stroke="emerald-500" strokeWidth={4} fill="none" strokeLinecap="round">
  <Line x1={4} y1={6} x2={196} y2={6} strokeDasharray={12} />
</Svg>`}
          >
            <Flex d="column" gap={4}>
              {dashPatterns.map(({ label, dasharray, linecap }) => (
                <Flex key={label} ai="center" gap={4}>
                  <Box width={28}>
                    <Mono>{label}</Mono>
                  </Box>
                  <Svg
                    viewBox="0 0 200 12"
                    width="200px"
                    height="12px"
                    fill="none"
                    strokeWidth={4}
                    strokeLinecap={linecap}
                    strokeDasharray={dasharray}
                    theme={{ dark: { stroke: 'emerald-400' }, light: { stroke: 'emerald-600' } }}
                  >
                    <Line x1={4} y1={6} x2={196} y2={6} />
                  </Svg>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Section id="dash-pattern" title="A pattern is a number or a string">
            <Box>
              <Mono>strokeDasharray={'{12}'}</Mono> is a 12-long dash and a 12-long gap. Anything else is the CSS value as a string —{' '}
              <Mono>&quot;12 4&quot;</Mono> for a long dash and a short gap, <Mono>&quot;1 8&quot;</Mono> with a round cap for a dotted
              line. The space survives the class name: it becomes an underscore there, so <Mono>strokeDasharray=&quot;12 4&quot;</Mono> is
              the class <Mono>strokeDasharray-12_4</Mono> and one rule.
            </Box>
          </Section>

          <Code
            id="drawing"
            label="Drawing a path on hover"
            language="jsx"
            code={`// The track is drawn once. The line over it starts pushed off its own dash and slides back on hover.
<Box position="relative" width={50} height={12}>
  <Svg viewBox="0 0 200 48" width="200px" fill="none" stroke="slate-200" strokeWidth={3} strokeLinecap="round">
    <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
  </Svg>
  <Svg
    viewBox="0 0 200 48"
    width="200px"
    position="absolute"
    inset={0}
    fill="none"
    stroke="violet-500"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeDasharray={320}
    strokeDashoffset={320}
    hover={{ strokeDashoffset: 0 }}
  >
    <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
  </Svg>
</Box>`}
          >
            <Flex d="column" gap={3}>
              <Box position="relative" width={50} height={12}>
                <Svg
                  viewBox="0 0 200 48"
                  width="200px"
                  height="48px"
                  fill="none"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  theme={{ dark: { stroke: 'slate-700' }, light: { stroke: 'slate-200' } }}
                >
                  <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
                </Svg>
                <Svg
                  viewBox="0 0 200 48"
                  width="200px"
                  height="48px"
                  position="absolute"
                  inset={0}
                  fill="none"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={320}
                  strokeDashoffset={320}
                  hover={{ strokeDashoffset: 0 }}
                  theme={{ dark: { stroke: 'violet-400' }, light: { stroke: 'violet-600' } }}
                >
                  <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
                </Svg>
              </Box>
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                Hover the line.
              </Box>
            </Flex>
          </Code>

          <Section id="motion" title="The transition is already there">
            <Box>
              Nothing in that example declares a transition. Every Box transitions on <Mono>--transitionTime</Mono>, and an{' '}
              <Mono>&lt;svg&gt;</Mono> and the shapes inside it transition on <Mono>--svgTransitionTime</Mono> — so moving{' '}
              <Mono>strokeDashoffset</Mono> under <Mono>hover</Mono> is the whole animation.
            </Box>
            <Box mt={4}>
              Which also means it stops when it should: a reader with <Mono>prefers-reduced-motion: reduce</Mono> gets both variables set to{' '}
              <Mono>0s</Mono>, and the line simply appears.
            </Box>
          </Section>

          <Code
            id="joins"
            label="Caps and joins"
            language="jsx"
            code={`<Svg viewBox="0 0 72 40" width="72px" fill="none" stroke="amber-500" strokeWidth={12} strokeLinejoin="round" strokeLinecap="round">
  <Path d="M10 32 L36 10 L62 32" />
</Svg>`}
          >
            <Flex gap={8} flexWrap="wrap">
              {joins.map(({ linejoin, linecap }) => (
                <Flex key={linejoin} d="column" gap={2} ai="center">
                  <Svg
                    viewBox="0 0 72 40"
                    width="72px"
                    height="40px"
                    fill="none"
                    strokeWidth={12}
                    strokeLinejoin={linejoin}
                    strokeLinecap={linecap}
                    theme={{ dark: { stroke: 'amber-400' }, light: { stroke: 'amber-500' } }}
                  >
                    <Path d="M10 32 L36 10 L62 32" />
                  </Svg>
                  <Mono>{linejoin}</Mono>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Code
            id="fill-rule"
            label="Fill rule"
            language="jsx"
            code={`<Svg viewBox="0 0 64 64" width="64px" fill="sky-500" fillRule="evenodd">
  <Path d="M32 4 L39 24 L60 24 L43 37 L50 58 L32 45 L14 58 L21 37 L4 24 L25 24 Z" />
</Svg>`}
          >
            <Flex gap={8}>
              {(['nonzero', 'evenodd'] as const).map((rule) => (
                <Flex key={rule} d="column" gap={2} ai="center">
                  <Svg
                    viewBox="0 0 64 64"
                    width="64px"
                    height="64px"
                    fillRule={rule}
                    theme={{ dark: { fill: 'sky-400' }, light: { fill: 'sky-600' } }}
                  >
                    <Path d="M32 4 L39 24 L60 24 L43 37 L50 58 L32 45 L14 58 L21 37 L4 24 L25 24 Z" />
                  </Svg>
                  <Mono>{rule}</Mono>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Code
            id="vector-effect"
            label="A stroke that ignores the scale"
            language="jsx"
            code={`<Svg viewBox="0 0 12 12" width="96px" fill="none" stroke="rose-500" strokeWidth={1} vectorEffect="non-scaling-stroke">
  <Path d="M1 11 L6 1 L11 11 Z" />
</Svg>`}
          >
            <Flex gap={8}>
              {([false, true] as const).map((nonScaling) => (
                <Flex key={String(nonScaling)} d="column" gap={2} ai="center">
                  <Svg
                    viewBox="0 0 12 12"
                    width="96px"
                    height="96px"
                    fill="none"
                    strokeWidth={1}
                    vectorEffect={nonScaling ? 'non-scaling-stroke' : 'none'}
                    theme={{ dark: { stroke: 'rose-400' }, light: { stroke: 'rose-600' } }}
                  >
                    <Path d="M1 11 L6 1 L11 11 Z" />
                  </Svg>
                  <Mono>{nonScaling ? 'non-scaling-stroke' : 'none'}</Mono>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Section id="not-inherited" title="vectorEffect is the exception">
            <Box>
              Both shapes above are drawn at <Mono>strokeWidth={'{1}'}</Mono> in a 12-unit <Mono>viewBox</Mono> blown up to 96 pixels, so
              the left one comes out eight units thick. <Mono>non-scaling-stroke</Mono> measures the stroke after the transform instead,
              which is what a chart redrawn at any width needs.
            </Box>
            <Box mt={4}>
              Alone among the paint and stroke properties, <Mono>vector-effect</Mono> is not inherited — a value on the{' '}
              <Mono>&lt;svg&gt;</Mono> would reach nothing. So this prop, and only this prop, writes a rule that names the element and its
              descendants: <Mono>.vectorEffect-non-scaling-stroke, .vectorEffect-non-scaling-stroke *</Mono>. Put it wherever it reads best.
            </Box>
          </Section>

          <Code
            id="paint-order"
            label="Outlined text"
            language="jsx"
            code={`<Svg viewBox="0 0 200 48" width="200px" fill="white" stroke="indigo-600" strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">
  <SvgText x={8} y={36} fontSize={36} fontWeight={700}>
    Box
  </SvgText>
</Svg>`}
          >
            <Flex gap={8} flexWrap="wrap">
              {(['normal', 'stroke'] as const).map((order) => (
                <Flex key={order} d="column" gap={2} ai="center">
                  <Svg
                    viewBox="0 0 120 48"
                    width="120px"
                    height="48px"
                    strokeWidth={6}
                    paintOrder={order}
                    strokeLinejoin="round"
                    theme={{ dark: { fill: 'white', stroke: 'indigo-500' }, light: { fill: 'white', stroke: 'indigo-600' } }}
                  >
                    <SvgText x={8} y={36} fontSize={36} fontWeight={700}>
                      Box
                    </SvgText>
                  </Svg>
                  <Mono>{order}</Mono>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Section id="geometry" title="A shape's own numbers are props too">
            <Box>
              SVG 2 made the geometry attributes real CSS properties, so <Mono>cx</Mono>, <Mono>cy</Mono>, <Mono>r</Mono>, <Mono>rx</Mono>,{' '}
              <Mono>ry</Mono>, <Mono>x</Mono> and <Mono>y</Mono> are Box props here. They are user units like every other SVG length on this
              page — <Mono>r={'{20}'}</Mono> is <Mono>r: 20</Mono> — and a percentage is of the viewport the <Mono>viewBox</Mono> describes.
            </Box>
            <Box mt={4}>
              Which one applies to which element is the SVG spec&apos;s answer, not this library&apos;s. <Mono>cx</Mono> and <Mono>cy</Mono>{' '}
              centre a <Mono>&lt;circle&gt;</Mono> or an <Mono>&lt;ellipse&gt;</Mono>; <Mono>r</Mono> is the circle&apos;s radius;{' '}
              <Mono>rx</Mono> and <Mono>ry</Mono> are the ellipse&apos;s two radii and a <Mono>&lt;rect&gt;</Mono>&apos;s corners;{' '}
              <Mono>x</Mono> and <Mono>y</Mono> position a <Mono>&lt;rect&gt;</Mono>, <Mono>&lt;image&gt;</Mono>, <Mono>&lt;use&gt;</Mono>,{' '}
              <Mono>&lt;foreignObject&gt;</Mono> or a nested <Mono>&lt;svg&gt;</Mono>. On an element with no such geometry the property is
              simply ignored, exactly as the attribute would be.
            </Box>
            <Box mt={4}>
              They are not inherited, and here that is the right behaviour rather than the problem it was for <Mono>vectorEffect</Mono> — a
              radius handed down to every shape below would be nonsense. Set them on the shape.
            </Box>
            <Box mt={4}>
              Two names are missing from the list, and they are the reason the elements have components of their own. A{' '}
              <Mono>&lt;rect&gt;</Mono>&apos;s <Mono>width</Mono> and <Mono>height</Mono> are CSS properties too, but those prop names were
              taken years ago by the layout scale, where <Mono>width={'{32}'}</Mono> means <Mono>8rem</Mono>. So <Mono>&lt;Rect&gt;</Mono>{' '}
              claims them back for itself:{' '}
              <Mono>
                &lt;Rect width={'{40}'} height={'{40}'} /&gt;
              </Mono>{' '}
              is forty user units square, written as an attribute the way SVG writes it.
            </Box>
          </Section>

          <Code
            id="geometry-demo"
            label="Geometry moves"
            language="jsx"
            code={`// Geometry is CSS, so it transitions. There is no JavaScript in this.
<Svg viewBox="0 0 160 56" width="160px" fill="violet-500">
  <Circle cx={28} cy={28} r={12} hover={{ r: 22 }} />
  <Circle cx={80} cy={28} r={12} hover={{ cy: 14, r: 8 }} />
  <Ellipse cx={132} cy={28} rx={20} ry={10} hover={{ rx: 10, ry: 20 }} />
</Svg>`}
          >
            <Flex d="column" gap={3}>
              <Svg viewBox="0 0 160 56" width="160px" height="56px" theme={{ dark: { fill: 'violet-400' }, light: { fill: 'violet-600' } }}>
                <Circle cx={28} cy={28} r={12} hover={{ r: 22 }} />
                <Circle cx={80} cy={28} r={12} hover={{ cy: 14, r: 8 }} />
                <Ellipse cx={132} cy={28} rx={20} ry={10} hover={{ rx: 10, ry: 20 }} />
              </Svg>
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                Hover each shape.
              </Box>
            </Flex>
          </Code>

          <Code
            id="rect"
            label="Corners and position"
            language="jsx"
            code={`<Svg viewBox="0 0 56 56" width="56px" fill="teal-500">
  <Rect width={40} height={40} x={8} y={8} rx={4} hover={{ rx: 20 }} />
</Svg>`}
          >
            <Flex gap={8} flexWrap="wrap">
              {rects.map(({ label, rx, hoverRx }) => (
                <Flex key={label} d="column" gap={2} ai="center">
                  <Svg viewBox="0 0 56 56" width="56px" height="56px" theme={{ dark: { fill: 'teal-400' }, light: { fill: 'teal-600' } }}>
                    <Rect width={40} height={40} x={8} y={8} rx={rx} hover={{ rx: hoverRx }} />
                  </Svg>
                  <Mono>{label}</Mono>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Section id="rect-size" title="rx is not borderRadius">
            <Box>
              The two read alike and mean different numbers. <Mono>borderRadius={'{8}'}</Mono> is on the spacing scale and comes out as{' '}
              <Mono>2rem</Mono>; <Mono>rx={'{8}'}</Mono> is eight user units inside the <Mono>viewBox</Mono>. A rect wants <Mono>rx</Mono>.
            </Box>
          </Section>

          <Code
            id="text-anchor"
            label="Anchoring a label"
            language="jsx"
            code={`<Svg viewBox="0 0 200 40" width="200px" fill="slate-700" textAnchor="middle">
  <SvgText x={100} y={22} fontSize={14}>
    the label
  </SvgText>
  <Line x1={100} y1={26} x2={100} y2={38} stroke="rose-400" strokeWidth={2} />
</Svg>`}
          >
            <Flex d="column" gap={4}>
              {(['start', 'middle', 'end'] as const).map((anchor) => (
                <Flex key={anchor} ai="center" gap={4}>
                  <Box width={20}>
                    <Mono>{anchor}</Mono>
                  </Box>
                  <Svg
                    viewBox="0 0 200 40"
                    width="200px"
                    height="40px"
                    textAnchor={anchor}
                    theme={{ dark: { fill: 'slate-300' }, light: { fill: 'slate-700' } }}
                  >
                    <SvgText x={100} y={22} fontSize={14}>
                      the label
                    </SvgText>
                    <Line
                      x1={100}
                      y1={26}
                      x2={100}
                      y2={38}
                      strokeWidth={2}
                      theme={{ dark: { stroke: 'rose-500' }, light: { stroke: 'rose-400' } }}
                    />
                  </Svg>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Section id="baseline" title="dominantBaseline is the vertical half">
            <Box>
              <Mono>textAnchor</Mono> decides which part of the text sits on its <Mono>x</Mono>; <Mono>dominantBaseline</Mono> decides which
              part sits on its <Mono>y</Mono>. <Mono>central</Mono> centres a number inside a gauge, <Mono>hanging</Mono> drops a label
              below an axis line, and <Mono>alphabetic</Mono> is where every browser starts.
            </Box>
            <Box mt={4}>
              This is the second property CSS does not inherit — <Mono>vectorEffect</Mono> was the first — so it gets the same treatment: a
              rule that names the element and its descendants. Set it on the <Mono>&lt;svg&gt;</Mono> and every label inside obeys.
            </Box>
            <Box mt={4}>
              Text size is the ordinary <Mono>fontSize</Mono> prop, divider 16 like everywhere else. Inside an <Mono>&lt;svg&gt;</Mono> a
              pixel <em>is</em> a user unit, so <Mono>fontSize={'{20}'}</Mono> is 20 units and scales with the <Mono>viewBox</Mono> along
              with the shapes.
            </Box>
          </Section>

          <Code
            id="baseline-demo"
            label="Baselines against a line"
            language="jsx"
            code={`<Svg viewBox="0 0 120 40" width="120px" fill="slate-700" dominantBaseline="central">
  <Line x1={0} y1={20} x2={120} y2={20} stroke="rose-400" strokeWidth={1} />
  <SvgText x={8} y={20} fontSize={14}>
    the label
  </SvgText>
</Svg>`}
          >
            <Flex d="column" gap={4}>
              {(['alphabetic', 'central', 'hanging'] as const).map((baseline) => (
                <Flex key={baseline} ai="center" gap={4}>
                  <Box width={22}>
                    <Mono>{baseline}</Mono>
                  </Box>
                  <Svg
                    viewBox="0 0 120 40"
                    width="120px"
                    height="40px"
                    dominantBaseline={baseline}
                    theme={{ dark: { fill: 'slate-300' }, light: { fill: 'slate-700' } }}
                  >
                    <Line
                      x1={0}
                      y1={20}
                      x2={120}
                      y2={20}
                      strokeWidth={1}
                      theme={{ dark: { stroke: 'rose-500' }, light: { stroke: 'rose-400' } }}
                    />
                    <SvgText x={8} y={20} fontSize={14}>
                      the label
                    </SvgText>
                  </Svg>
                </Flex>
              ))}
            </Flex>
          </Code>

          <Code
            id="gauge"
            label="A gauge, with no JavaScript"
            language="jsx"
            code={`// The ring is one dash as long as the circle's own circumference, pushed off the path and then
// pulled back. The number is placed at the centre point and centred on it by the two text props.
<Svg viewBox="0 0 96 96" width="96px" className="gauge" fill="none" strokeLinecap="round">
  <Circle cx={48} cy={48} r={38} stroke="slate-200" strokeWidth={10} />
  <Circle
    transform="rotate(-90 48 48)"
    cx={48}
    cy={48}
    r={38}
    stroke="indigo-600"
    strokeWidth={10}
    strokeDasharray={239}
    strokeDashoffset={239}
    hoverGroup={{ gauge: { strokeDashoffset: 60, r: 40 } }}
  />
  <SvgText x={48} y={48} textAnchor="middle" dominantBaseline="central" fontSize={20} fill="slate-700">
    75%
  </SvgText>
</Svg>`}
          >
            <Flex d="column" gap={3}>
              <Svg viewBox="0 0 96 96" width="96px" height="96px" className="gauge" fill="none" strokeLinecap="round">
                <Circle cx={48} cy={48} r={38} strokeWidth={10} theme={{ dark: { stroke: 'slate-800' }, light: { stroke: 'slate-200' } }} />
                <Circle
                  transform="rotate(-90 48 48)"
                  cx={48}
                  cy={48}
                  r={38}
                  strokeWidth={10}
                  strokeDasharray={239}
                  strokeDashoffset={239}
                  hoverGroup={{ gauge: { strokeDashoffset: 60, r: 40 } }}
                  theme={{ dark: { stroke: 'indigo-400' }, light: { stroke: 'indigo-600' } }}
                />
                <SvgText
                  x={48}
                  y={48}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  fontWeight={600}
                  theme={{ dark: { fill: 'slate-200' }, light: { fill: 'slate-700' } }}
                >
                  75%
                </SvgText>
              </Svg>
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                Hover the gauge.
              </Box>
            </Flex>
          </Code>

          <Section id="gauge-notes" title="What the gauge is made of">
            <Box>
              Four props and no state. <Mono>strokeDasharray={'{239}'}</Mono> makes the ring one dash as long as its own circumference — 2π
              × 38 is about 239 — and <Mono>strokeDashoffset={'{239}'}</Mono> pushes that dash entirely off the path, so nothing shows.
              Moving the offset to 60 leaves 179 of the 239 drawn, which is the three quarters the label claims.
            </Box>
            <Box mt={4}>
              <Mono>r</Mono> grows by two units at the same time, which is the geometry tier doing something the attribute cannot. The
              number in the middle sits at the centre point and is centred on it by <Mono>textAnchor</Mono> and{' '}
              <Mono>dominantBaseline</Mono> — that pair is the whole reason SVG text is awkward to place by hand.
            </Box>
            <Box mt={4}>
              One thing here is still an attribute, and <Mono>&lt;Circle&gt;</Mono> takes it as a prop of its own:{' '}
              <Mono>transform=&quot;rotate(-90 48 48)&quot;</Mono> starts the arc at twelve o&apos;clock. It is the SVG attribute rather
              than the <Mono>rotate</Mono> prop because it carries its own centre of rotation — CSS would turn the circle around the corner
              of the <Mono>viewBox</Mono> instead.
            </Box>
            <Box mt={4}>
              The transition is the one already on every shape inside an <Mono>&lt;svg&gt;</Mono>, so a reader with{' '}
              <Mono>prefers-reduced-motion: reduce</Mono> gets a gauge that is simply there, with no sweep.
            </Box>
          </Section>

          <Section id="elements" title="Every element is a component">
            <Box>
              <Mono>@box-kite/react/components/svg</Mono> is twenty components, one per element: <Mono>Svg</Mono>, <Mono>G</Mono>,{' '}
              <Mono>Defs</Mono>, <Mono>Path</Mono>, <Mono>Circle</Mono>, <Mono>Ellipse</Mono>, <Mono>Rect</Mono>, <Mono>Line</Mono>,{' '}
              <Mono>Polyline</Mono>, <Mono>Polygon</Mono>, <Mono>SvgText</Mono>, <Mono>TSpan</Mono>, <Mono>LinearGradient</Mono>,{' '}
              <Mono>RadialGradient</Mono>, <Mono>Stop</Mono>, <Mono>ClipPath</Mono>, <Mono>Mask</Mono>, <Mono>Use</Mono>,{' '}
              <Mono>SvgSymbol</Mono> and <Mono>Marker</Mono>. Each one is a Box, so every prop above works on it — and every demo on this
              page is built from them, without a single <Mono>tag</Mono>.
            </Box>
            <Box mt={4}>
              Two are not named after their element. <Mono>SvgText</Mono> is <Mono>&lt;text&gt;</Mono>, because one library cannot have a{' '}
              <Mono>Text</Mono> that means an SVG element and a <Mono>Text</Mono> that means a paragraph. <Mono>SvgSymbol</Mono> is{' '}
              <Mono>&lt;symbol&gt;</Mono>, because <Mono>Symbol</Mono> is a global that no module should quietly shadow.
            </Box>
          </Section>

          <Section id="collisions" title="Where a name means two things">
            <Box>
              An SVG attribute and a Box prop can be the same word, and the clash is silent — Chakra once turned a path&apos;s{' '}
              <Mono>d</Mono> into <Mono>display</Mono> this way. Here <Mono>d</Mono> is already the shorthand for <Mono>flexDirection</Mono>
              , a <Mono>&lt;rect&gt;</Mono>&apos;s <Mono>width</Mono> is the ÷4 layout scale, and a <Mono>&lt;text&gt;</Mono>&apos;s{' '}
              <Mono>x</Mono> is a CSS geometry property that does not apply to text at all. So each component settles those names for its
              own element: on <Mono>Path</Mono>, <Mono>d</Mono> is path data; on <Mono>Rect</Mono>, <Mono>width</Mono> is user units; on{' '}
              <Mono>SvgText</Mono>, <Mono>x</Mono> is the attribute. Everywhere else they keep their Box meaning.
            </Box>
            <Box mt={4}>
              One name can be answered twice, because the answer belongs to the element and not to the word. <Mono>cx</Mono> on a{' '}
              <Mono>Circle</Mono> is the CSS property, and transitions. <Mono>cx</Mono> on a <Mono>RadialGradient</Mono> is an attribute,
              because CSS geometry does not reach a gradient. Both are typed, and neither needs <Mono>props</Mono>.
            </Box>
            <Box mt={4}>
              <Mono>d</Mono> is still not a styling prop even though CSS defines one: Safari does not support it, and a path that silently
              refuses to draw is worse than an attribute that always does. A paint server, on the other hand, no longer needs{' '}
              <Mono>props</Mono> at all: <Mono>fill</Mono> and <Mono>stroke</Mono> take <Mono>url(#sky)</Mono> and{' '}
              <Mono>var(--chart-1)</Mono> beside the palette, and so does <Mono>clipPath</Mono> — see the illustration below.
            </Box>
            <Box mt={4}>
              <ElementTable />
            </Box>
          </Section>

          <Section id="naming" title="A drawing says whether it means anything">
            <Box>
              An <Mono>&lt;Svg&gt;</Mono> with no <Mono>label</Mono> is <Mono>aria-hidden</Mono>. Most SVG on a page is decoration sitting
              beside the words that already say it, and a screen reader should walk past it — which is what nothing at all fails to say.
              Give it a <Mono>label</Mono> and it becomes <Mono>role=&quot;img&quot;</Mono> with that name instead. State a role or an{' '}
              <Mono>aria-labelledby</Mono> of your own in <Mono>props</Mono> and the component steps out of the way entirely.
            </Box>
          </Section>

          <Code
            id="illustration"
            label="An illustration"
            language="jsx"
            code={`<Svg viewBox="0 0 200 120" width="100%" className="scene" label="A sun rising between two hills">
  <Defs>
    <LinearGradient id="sky" x1={0} y1={0} x2={0} y2={1}>
      <Stop offset="0%" stopColor="currentColor" color="indigo-500" />
      <Stop offset="100%" stopColor="currentColor" color="amber-200" />
    </LinearGradient>
    <ClipPath id="frame">
      <Rect width={200} height={120} rx={10} />
    </ClipPath>
  </Defs>
  <G clipPath="url(#frame)">
    <Rect width={200} height={120} fill="url(#sky)" />
    <Circle cx={64} cy={78} r={18} fill="amber-300" hoverGroup={{ scene: { cy: 44, r: 22 } }} />
    <Path d="M-10 120 L64 68 L138 120 Z" fill="emerald-800" />
    <Path d="M92 120 L156 56 L220 120 Z" fill="emerald-700" />
  </G>
</Svg>`}
          >
            <Flex d="column" gap={3}>
              <Box width={50}>
                <Svg viewBox="0 0 200 120" width="100%" height="120px" className="scene" label="A sun rising between two hills">
                  <Defs>
                    <LinearGradient id="sky" x1={0} y1={0} x2={0} y2={1}>
                      <Stop
                        offset="0%"
                        stopColor="currentColor"
                        theme={{ dark: { color: 'indigo-900' }, light: { color: 'indigo-500' } }}
                      />
                      <Stop
                        offset="100%"
                        stopColor="currentColor"
                        theme={{ dark: { color: 'amber-700' }, light: { color: 'amber-200' } }}
                      />
                    </LinearGradient>
                    <ClipPath id="frame">
                      <Rect width={200} height={120} rx={10} />
                    </ClipPath>
                  </Defs>
                  <G clipPath="url(#frame)">
                    <Rect width={200} height={120} fill="url(#sky)" />
                    <Circle
                      cx={64}
                      cy={78}
                      r={18}
                      hoverGroup={{ scene: { cy: 44, r: 22 } }}
                      theme={{ dark: { fill: 'amber-400' }, light: { fill: 'amber-300' } }}
                    />
                    <Path d="M-10 120 L64 68 L138 120 Z" theme={{ dark: { fill: 'emerald-950' }, light: { fill: 'emerald-800' } }} />
                    <Path d="M92 120 L156 56 L220 120 Z" theme={{ dark: { fill: 'emerald-900' }, light: { fill: 'emerald-700' } }} />
                  </G>
                </Svg>
              </Box>
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                Hover the picture — the sun is a <Mono>cy</Mono> and an <Mono>r</Mono>, and the gradient is two stops taking their colour
                from a Box prop.
              </Box>
            </Flex>
          </Code>

          <Section id="illustration-notes" title="What the illustration used to need props for">
            <Box>
              Two of these three were attributes until the chart primitives needed them to be values. The sky is{' '}
              <Mono>fill=&quot;url(#sky)&quot;</Mono> and the rounded frame is <Mono>clipPath=&quot;url(#frame)&quot;</Mono>: a reference to
              something the document defines is a paint value like any other now, so it can differ per theme, on <Mono>hover</Mono> and per
              breakpoint, which an attribute never could. The third is not a gap at all — a gradient stop paints itself with{' '}
              <Mono>stopColor=&quot;currentColor&quot;</Mono> so that the Box <Mono>color</Mono> prop, themed like everything else, is what
              actually decides it.
            </Box>
          </Section>

          <Code
            id="chart"
            label="A chart, by hand"
            language="jsx"
            context="declare const revenue: { month: string; value: number }[];"
            code={`// Six bars, an axis, a label under each, and a trend line that draws itself on hover.
<Svg viewBox="0 0 240 124" width="100%" className="chart" label="Revenue by month">
  <Line x1={8} y1={96} x2={232} y2={96} stroke="slate-300" strokeWidth={1} />
  {revenue.map(({ month, value }, index) => (
    <Rect key={month} x={16 + index * 36} y={96 - value} width={24} height={value} rx={3} fill="sky-600" hover={{ fill: 'sky-400' }} />
  ))}
  <Polyline
    points={revenue.map(({ value }, index) => \`\${28 + index * 36},\${96 - value}\`).join(' ')}
    fill="none"
    stroke="amber-400"
    strokeWidth={2}
    strokeLinecap="round"
    strokeDasharray={260}
    strokeDashoffset={260}
    hoverGroup={{ chart: { strokeDashoffset: 0 } }}
  />
  {revenue.map(({ month }, index) => (
    <SvgText key={month} x={28 + index * 36} y={112} textAnchor="middle" fontSize={11} fill="slate-500">
      {month}
    </SvgText>
  ))}
</Svg>`}
          >
            <Flex d="column" gap={3}>
              <Box width={60}>
                <Svg viewBox="0 0 240 124" width="100%" height="124px" className="chart" label="Revenue by month">
                  <Line
                    x1={8}
                    y1={96}
                    x2={232}
                    y2={96}
                    strokeWidth={1}
                    theme={{ dark: { stroke: 'slate-600' }, light: { stroke: 'slate-400' } }}
                  />
                  {revenue.map(({ month, value }, index) => (
                    <Rect
                      key={month}
                      x={16 + index * 36}
                      y={96 - value}
                      width={24}
                      height={value}
                      rx={3}
                      theme={{
                        dark: { fill: 'sky-500', hover: { fill: 'sky-300' } },
                        light: { fill: 'sky-600', hover: { fill: 'sky-400' } },
                      }}
                    />
                  ))}
                  <Polyline
                    points={revenue.map(({ value }, index) => `${28 + index * 36},${96 - value}`).join(' ')}
                    fill="none"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={260}
                    strokeDashoffset={260}
                    hoverGroup={{ chart: { strokeDashoffset: 0 } }}
                    theme={{ dark: { stroke: 'amber-300' }, light: { stroke: 'amber-500' } }}
                  />
                  {revenue.map(({ month }, index) => (
                    <SvgText
                      key={month}
                      x={28 + index * 36}
                      y={112}
                      textAnchor="middle"
                      fontSize={11}
                      theme={{ dark: { fill: 'slate-400' }, light: { fill: 'slate-500' } }}
                    >
                      {month}
                    </SvgText>
                  ))}
                </Svg>
              </Box>
              <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                Hover the chart for the trend line, and a bar for its colour.
              </Box>
            </Flex>
          </Code>

          <Section id="chart-notes" title="What the chart is, and is not">
            <Box>
              A bar is a <Mono>&lt;Rect&gt;</Mono> whose <Mono>y</Mono> is a CSS property and whose <Mono>height</Mono> is an attribute —
              the split this page has been describing, in one element. The axis is a <Mono>&lt;Line&gt;</Mono>, the months are{' '}
              <Mono>&lt;SvgText&gt;</Mono> centred with <Mono>textAnchor</Mono>, and the trend is a <Mono>&lt;Polyline&gt;</Mono> drawing
              itself with the dash trick from further up the page. Nothing here is a chart library, and there is no state.
            </Box>
            <Box mt={4}>
              What it is not is a chart <em>component</em> — no scales, no ticks, no tooltip, no responsiveness beyond what the{' '}
              <Mono>viewBox</Mono> gives for free. Those are the next step. What this page shows is that the primitives underneath them
              already exist.
            </Box>
          </Section>

          <Section id="reference" title="Every prop">
            <PropTable />
          </Section>

          <Section id="themes" title="Themes, pseudo-classes, breakpoints">
            <Box>
              These are ordinary Box props, so everything that nests around a Box prop nests around them. A stroke that changes with the
              theme, a fill that reacts to hover and a width that grows at a breakpoint are all one prop each.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Svg
  viewBox="0 0 24 24"
  fill="none"
  strokeWidth={2}
  theme={{ dark: { stroke: 'slate-300' }, light: { stroke: 'slate-700' } }}
  hover={{ strokeWidth: 3 }}
  md={{ strokeWidth: 1.5 }}
>
  <Path d="M4 12h16" />
</Svg>`}
              />
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'paint', label: 'Paint' },
  { id: 'inheritance', label: 'Inheritance' },
  { id: 'units', label: 'User units' },
  { id: 'dashes', label: 'Dashes' },
  { id: 'dash-pattern', label: 'Dash patterns' },
  { id: 'drawing', label: 'Drawing a path' },
  { id: 'motion', label: 'The transition' },
  { id: 'joins', label: 'Caps and joins' },
  { id: 'fill-rule', label: 'Fill rule' },
  { id: 'vector-effect', label: 'Non-scaling stroke' },
  { id: 'not-inherited', label: 'The one exception' },
  { id: 'paint-order', label: 'Outlined text' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'geometry-demo', label: 'Moving a shape' },
  { id: 'rect', label: 'Corners and position' },
  { id: 'text-anchor', label: 'Anchoring text' },
  { id: 'baseline-demo', label: 'Baselines' },
  { id: 'gauge', label: 'A gauge, no JS' },
  { id: 'elements', label: 'The elements' },
  { id: 'collisions', label: 'One name, two meanings' },
  { id: 'naming', label: 'Naming a drawing' },
  { id: 'illustration', label: 'An illustration' },
  { id: 'chart', label: 'A chart by hand' },
  { id: 'reference', label: 'Every prop' },
  { id: 'themes', label: 'Themes and states' },
] as const;

const dashPatterns: { label: string; dasharray: number | string; linecap: 'butt' | 'round' | 'square' }[] = [
  { label: '12', dasharray: 12, linecap: 'butt' },
  { label: '"12 4"', dasharray: '12 4', linecap: 'butt' },
  { label: '"1 8"', dasharray: '1 8', linecap: 'round' },
];

const rects: { label: string; rx: number; hoverRx: number }[] = [
  { label: 'rx={0}', rx: 0, hoverRx: 20 },
  { label: 'rx={4}', rx: 4, hoverRx: 20 },
  { label: 'rx={20}', rx: 20, hoverRx: 4 },
];

const joins: { linejoin: 'miter' | 'round' | 'bevel'; linecap: 'butt' | 'round' | 'square' }[] = [
  { linejoin: 'miter', linecap: 'butt' },
  { linejoin: 'round', linecap: 'round' },
  { linejoin: 'bevel', linecap: 'square' },
];

const props: { name: string; css: string; values: string }[] = [
  { name: 'fill', css: 'fill', values: 'any colour variable, or none' },
  { name: 'fillOpacity', css: 'fill-opacity', values: '0 – 1 in tenths' },
  { name: 'fillRule', css: 'fill-rule', values: 'nonzero, evenodd' },
  { name: 'stroke', css: 'stroke', values: 'any colour variable, or none' },
  { name: 'strokeOpacity', css: 'stroke-opacity', values: '0 – 1 in tenths' },
  { name: 'strokeWidth', css: 'stroke-width', values: 'a number, in user units' },
  { name: 'strokeLinecap', css: 'stroke-linecap', values: 'butt, round, square' },
  { name: 'strokeLinejoin', css: 'stroke-linejoin', values: 'miter, round, bevel' },
  { name: 'strokeMiterlimit', css: 'stroke-miterlimit', values: 'a number, 1 or greater' },
  { name: 'strokeDasharray', css: 'stroke-dasharray', values: 'a number, or the pattern as a string' },
  { name: 'strokeDashoffset', css: 'stroke-dashoffset', values: 'a number, or a percentage of the path length' },
  { name: 'paintOrder', css: 'paint-order', values: 'normal, fill, stroke, markers' },
  { name: 'vectorEffect', css: 'vector-effect', values: 'none, non-scaling-stroke' },
  { name: 'shapeRendering', css: 'shape-rendering', values: 'auto, optimizeSpeed, crispEdges, geometricPrecision' },
  { name: 'textAnchor', css: 'text-anchor', values: 'start, middle, end' },
  {
    name: 'dominantBaseline',
    css: 'dominant-baseline',
    values: 'auto, alphabetic, central, middle, hanging, text-top, text-bottom, ideographic, mathematical',
  },
  { name: 'cx', css: 'cx', values: 'a number in user units, or a percentage' },
  { name: 'cy', css: 'cy', values: 'a number in user units, or a percentage' },
  { name: 'r', css: 'r', values: 'a number in user units, or a percentage' },
  { name: 'rx', css: 'rx', values: 'a number, a percentage, or auto' },
  { name: 'ry', css: 'ry', values: 'a number, a percentage, or auto' },
  { name: 'x', css: 'x', values: 'a number in user units, or a percentage' },
  { name: 'y', css: 'y', values: 'a number in user units, or a percentage' },
];

const revenue: { month: string; value: number }[] = [
  { month: 'Jan', value: 38 },
  { month: 'Feb', value: 52 },
  { month: 'Mar', value: 46 },
  { month: 'Apr', value: 64 },
  { month: 'May', value: 58 },
  { month: 'Jun', value: 76 },
];

const elements: { name: string; element: string; attributes: string }[] = [
  { name: 'Svg', element: '<svg>', attributes: 'viewBox, preserveAspectRatio, width, height, label' },
  { name: 'G', element: '<g>', attributes: 'transform' },
  { name: 'Defs', element: '<defs>', attributes: '—' },
  { name: 'Path', element: '<path>', attributes: 'd, transform, pathLength' },
  { name: 'Circle', element: '<circle>', attributes: 'transform, pathLength' },
  { name: 'Ellipse', element: '<ellipse>', attributes: 'transform, pathLength' },
  { name: 'Rect', element: '<rect>', attributes: 'width, height, transform, pathLength' },
  { name: 'Line', element: '<line>', attributes: 'x1, y1, x2, y2, transform, pathLength' },
  { name: 'Polyline', element: '<polyline>', attributes: 'points, transform, pathLength' },
  { name: 'Polygon', element: '<polygon>', attributes: 'points, transform, pathLength' },
  { name: 'SvgText', element: '<text>', attributes: 'x, y, dx, dy, textLength, lengthAdjust, transform' },
  { name: 'TSpan', element: '<tspan>', attributes: 'x, y, dx, dy, textLength, lengthAdjust' },
  { name: 'LinearGradient', element: '<linearGradient>', attributes: 'x1, y1, x2, y2, gradientUnits, gradientTransform, spreadMethod' },
  { name: 'RadialGradient', element: '<radialGradient>', attributes: 'cx, cy, r, fx, fy, gradientUnits, gradientTransform, spreadMethod' },
  { name: 'Stop', element: '<stop>', attributes: 'offset, stopColor, stopOpacity' },
  { name: 'ClipPath', element: '<clipPath>', attributes: 'clipPathUnits, transform' },
  { name: 'Mask', element: '<mask>', attributes: 'maskUnits, maskContentUnits, x, y, width, height' },
  { name: 'Use', element: '<use>', attributes: 'href, width, height, transform' },
  { name: 'SvgSymbol', element: '<symbol>', attributes: 'viewBox, preserveAspectRatio, x, y, width, height' },
  { name: 'Marker', element: '<marker>', attributes: 'markerWidth, markerHeight, refX, refY, orient, markerUnits, viewBox' },
];

function ElementTable() {
  return (
    <Box overflow="auto">
      <Box tag="table" display="table" borderCollapse="collapse" width="fit">
        <Box tag="thead" display="table-header-group">
          <Box tag="tr" display="table-row">
            <HeadCell>Component</HeadCell>
            <HeadCell>Element</HeadCell>
            <HeadCell>Attributes it takes as props</HeadCell>
          </Box>
        </Box>
        <Box tag="tbody" display="table-row-group">
          {elements.map(({ name, element, attributes }) => (
            <Box tag="tr" display="table-row" key={name}>
              <Cell>
                <Mono>{name}</Mono>
              </Cell>
              <Cell>{element}</Cell>
              <Cell>{attributes}</Cell>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function PropTable() {
  return (
    <Box overflow="auto">
      <Box tag="table" display="table" borderCollapse="collapse" width="fit">
        <Box tag="thead" display="table-header-group">
          <Box tag="tr" display="table-row">
            <HeadCell>Prop</HeadCell>
            <HeadCell>CSS property</HeadCell>
            <HeadCell>Values</HeadCell>
          </Box>
        </Box>
        <Box tag="tbody" display="table-row-group">
          {props.map(({ name, css, values }) => (
            <Box tag="tr" display="table-row" key={name}>
              <Cell>
                <Mono>{name}</Mono>
              </Cell>
              <Cell>{css}</Cell>
              <Cell>{values}</Cell>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="th"
      display="table-cell"
      textAlign="left"
      fontSize={13}
      fontWeight={600}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-300', borderColor: 'slate-700' }, light: { color: 'slate-700', borderColor: 'slate-200' } }}
    >
      {children}
    </Box>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="td"
      display="table-cell"
      fontSize={14}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-400', borderColor: 'slate-800' }, light: { color: 'slate-600', borderColor: 'slate-100' } }}
    >
      {children}
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
