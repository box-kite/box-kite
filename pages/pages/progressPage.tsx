import { CircleDashed, LoaderCircle, Rows3, Server } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import progressApi from '../../api/components/progress.json';
import Box from '../../src/box';
import { ProgressRing } from '../../src/components/chart';
import Flex from '../../src/components/flex';
import Progress from '../../src/components/progress';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function ProgressPage() {
  useTableOfContents(sidebarLinks);

  const value = useRollingValue();

  return (
    <Box>
      <PageHeader
        icon={LoaderCircle}
        title="Progress"
        description="How far a task has got: role=progressbar with the value it really has, an indeterminate bar that reports none at all, and no JavaScript on the server path."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Progress from '@box-kite/react/components/progress';" />

          <Code id="usage" label="Usage" language="jsx" code={`<Progress label="Upload" value={62} />`}>
            <Box py={6} maxWidth={80}>
              <Progress label="Upload" value={62} />
            </Box>
          </Code>

          <Section id="indeterminate" title="No value is a state, not a zero">
            <Box>
              Leave <Mono>value</Mono> out and the bar is indeterminate: <Mono>aria-valuenow</Mono> is left off entirely rather than written
              as <Mono>0</Mono>, because the one thing a reader must not be told is a position nobody measured. The bar sweeps instead.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Progress label="Preparing" />`}>
                <Box py={6} maxWidth={80}>
                  <Progress label="Preparing" />
                </Box>
              </Code>
            </Box>
            <Box mt={4}>
              The sweep names its duration in milliseconds, so it sits outside the <Mono>--transitionTime</Mono> that{' '}
              <Mono>prefers-reduced-motion</Mono> zeroes and stops itself instead — a full-width bar at reduced opacity, which still reads
              as "working" without anything moving.
            </Box>
          </Section>

          <Section id="live" title="A value that moves">
            <Box>
              The fill is the one thing here that transitions, and it is the width, so a value arriving in steps still travels between them.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Progress label="Download" value={value} max={100} format={(value) => \`\${value} per cent\`} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Progress label="Download" value={value} format={(percent) => `${percent} per cent`} />
                  <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                    <Mono>{String(value)}</Mono>
                  </Box>
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="inline" title="The fill is an inline style, and everything else is a class">
            <Box>
              A percentage that moves with a download would be a rule per frame if it went into a class name — so the width is an inline{' '}
              <Mono>inline-size</Mono>, the exception <Mono>Slider</Mono> explains at length, and the track, the colours, both themes and
              the forced-colors fallback are shared rules.
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={CircleDashed} title="Where the value is data rather than an animation, use a ring">
                  <Mono>ProgressRing</Mono> from <Mono>components/chart</Mono> rounds its fraction to half a percent and puts it in a class,
                  which costs nothing and shares between every ring on the page. A dashboard of a hundred figures wants that one.
                </Note>
                <Note icon={Server} title="It renders on a server">
                  No state, no effect, no measurement — so a page paints a real figure before any JavaScript arrives, the way{' '}
                  <Mono>Flex</Mono> and <Mono>Button</Mono> do.
                </Note>
              </Flex>
            </Box>
            <Box mt={4}>
              <Flex py={2} gap={8} ai="center">
                <ProgressRing value={0.62} width="4rem" height="4rem" label="The same figure as a ring" />
                <Box maxWidth={80} width="fit">
                  <Progress label="The same figure as a bar" value={62} />
                </Box>
              </Flex>
            </Box>
          </Section>

          <Section id="range" title="Its own range">
            <Box>
              <Mono>min</Mono> and <Mono>max</Mono> are what "full" means, so a count of files needs no arithmetic at the call site.{' '}
              <Mono>format</Mono> writes <Mono>aria-valuetext</Mono> for a value the bare number does not read as.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Progress label="Files" min={0} max={8} value={3} format={(value) => \`\${value} of 8 files\`} />`}
              >
                <Box py={6} maxWidth={80}>
                  <Progress label="Files" min={0} max={8} value={3} format={(files) => `${files} of 8 files`} />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="naming" title="Naming it">
            <Box>
              A progress bar has to be named: a percentage nobody can attach to anything is not information. <Mono>label</Mono> writes{' '}
              <Mono>aria-label</Mono> and <Mono>labelledBy</Mono> points at the heading or the text that already says it.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Two parts: <Mono>progress</Mono>, which is the track and carries the role, and <Mono>progress.fill</Mono>, whose{' '}
              <Mono>indeterminate</Mono> variant is the sweep. The root takes Box props directly, so the height and the radius are props on
              the element.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Progress label="Upload" value={62} height={1} borderRadius={0} />

Box.components({
  progress: { children: { fill: { styles: { bgColor: 'emerald-500' } } } },
});`}
              >
                <Box py={6} maxWidth={80}>
                  <Progress label="A thinner one" value={62} height={1} borderRadius={0} />
                </Box>
              </Code>
            </Box>
          </Section>

          <ApiReference api={progressApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

/** A value that keeps moving, so the transition on the fill is visible on the page rather than described. */
function useRollingValue() {
  const [value, setValue] = useState(20);

  useEffect(() => {
    const timer = setInterval(() => setValue((current) => (current >= 100 ? 0 : current + 20)), 1200);

    return () => clearInterval(timer);
  }, []);

  return value;
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'indeterminate', label: 'No value is a state' },
  { id: 'live', label: 'A value that moves' },
  { id: 'inline', label: 'The fill is inline' },
  { id: 'range', label: 'Its own range' },
  { id: 'naming', label: 'Naming it' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(progressApi),
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
