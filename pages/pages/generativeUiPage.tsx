import { CircleSlash, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2, Li, Ul } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import SpecRenderer from '../../src/spec';
import { SpecIssue } from '../../src/utils/spec/specTypes';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { parsePartialJson } from '../utils/partialJson';
import { DEMOS, DEMO_CATALOG, DEMO_REGISTRY, REFUSED_SPEC, demoRegistry } from './generativeUi';

export default function GenerativeUiPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Sparkles}
        title="Generative UI"
        description="Your users ask; your app builds. The catalog says what a model may compose, the renderer renders what came back, and every decision in between stays the app's."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            label="Import"
            language="jsx"
            code={`import { catalog } from '@box-kite/react/catalog';
import SpecRenderer, { createSpecRegistry, specSchema } from '@box-kite/react/spec';`}
          />

          <Section id="demo" title="Ask for a dashboard, watch it arrive">
            <Box>
              Pick a prompt and press <strong>Generate</strong>. What comes back is a JSON tree of component names, props and{' '}
              <Mono>$data</Mono> paths, rendered here as real <Mono>DashboardGrid</Mono>, <Mono>Widget</Mono>, <Mono>Sparkline</Mono>,{' '}
              <Mono>Gauge</Mono> and <Mono>DataGrid</Mono> components — the same ones the rest of this site is built from.
            </Box>
            <Box mt={4}>
              <GenerativeDemo />
            </Box>
            <Box mt={4}>
              <Note icon={Play} title="Recorded here, live in the example app">
                This site is prerendered and served as static files, so there is no server to hold an API key: the three generations above
                are recordings, replayed a character at a time the way a stream delivers one. Everything else on this page is the real thing
                — this catalog, this registry, this renderer, and the same partial JSON an app gets from <Mono>streamObject</Mono>. The live
                route is in <Mono>examples/next-app</Mono>, below.
              </Note>
            </Box>
          </Section>

          <Section id="loop" title="Three calls, and the app owns all three">
            <Box>
              The catalog describes what may be built, the registry pairs each name with the component that renders it, and{' '}
              <Mono>specSchema()</Mono> turns the two into the constraint the model generates under — so the thing a model is held to and
              the thing that renders cannot disagree.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import { catalog } from '@box-kite/react/catalog';
import SpecRenderer, { createSpecRegistry, specSchema } from '@box-kite/react/spec';

// 1. What may be built: every component and every value its props take, as JSON Schema.
const allowed = catalog({
  include: ['DashboardGrid', 'Widget', 'Sparkline', 'Gauge', 'DataGrid'],
  styleProps: ['d', 'gap', 'p', 'color', 'width', 'height'],
});

// 2. What each name renders. A name this does not hold renders nothing at all.
const registry = createSpecRegistry({ catalog: allowed, components: { DashboardGrid, Widget, Sparkline, Gauge, DataGrid } });

// 3. The constraint the model generates under, out of the same rules the renderer enforces.
const schema = specSchema(registry, { bindings: true });`}
              />
            </Box>
            <Box mt={4}>
              <Code language="jsx" codeOnly code={`<SpecRenderer spec={spec} registry={registry} data={data} onIssues={setIssues} />`} />
            </Box>
          </Section>

          <Section id="stream" title="It arrives in pieces, and it renders in pieces">
            <Box>
              A structured-output stream delivers the same object with a few more characters of it each time, so the renderer is built to be
              handed half of one: a node whose <Mono>type</Mono> has not arrived yet renders nothing <em>and reports nothing</em> — it is a
              frame, not a fault — while a prop that is still half a string fails its own schema and is dropped until it is whole. Every
              node has an error boundary of its own, so a component that throws on props a model invented costs that node and nothing around
              it.
            </Box>
            <Box mt={4}>
              A stream is not <em>monotone</em>, though — a column's <Mono>align</Mono> passes through <Mono>"e"</Mono> on its way to{' '}
              <Mono>"end"</Mono>, and a value that fails its own schema takes the object it sits in with it — so a prop a component cannot
              do without can go missing for a frame. What a node has been shown with it is not stripped of: the renderer keeps the last
              value each node was given for such a prop, and a grid on screen stays there. On top of that, a heavy component is the app's to
              gate — the grid below is a placeholder until the spec has arrived, which is one line in the registry rather than anything the
              spec knows about.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                check={false}
                code={`const { partialObjectStream } = streamObject({
  model: anthropic('claude-sonnet-5'),
  schema: jsonSchema(specSchema(registry, { bindings: true })),
  prompt,
});

for await (const partial of partialObjectStream) setSpec(partial);`}
              />
            </Box>
          </Section>

          <Section id="data" title="The model says where to look; the app says what is there">
            <Box>
              A generated tree carries styling, not values: <Mono>{'{ "$data": "orders" }'}</Mono> is a path into whatever the app passed as{' '}
              <Mono>data</Mono>, <Mono>$item</Mono> and <Mono>$index</Mono> read from a <Mono>repeat</Mono>, and a reference is resolved{' '}
              <strong>before</strong> the prop is validated — so what the host supplied is what is judged, rather than the spelling of the
              path. It is a path, never an expression: there is no <Mono>eval</Mono> anywhere in the renderer.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                check={false}
                code={`{
  "type": "Widget",
  "props": { "id": "orders", "name": "Orders" },
  "slots": { "title": ["Recent orders"] },
  "children": [
    {
      "type": "DataGrid",
      "props": {
        "data": { "$data": "orders" },
        "def": { "rowKey": "id", "columns": [{ "key": "customer", "header": "Customer" }] }
      }
    }
  ]
}`}
              />
            </Box>
          </Section>

          <Section id="guardrails" title="What it may not do">
            <Box>
              The demo below is the same dashboard asking for four things it may not have: a colour outside the palette, a component nobody
              registered, an action on a component that declares no events, and a path into data that is not there. Each one is refused on
              its own and reported to <Mono>onIssues</Mono> with the path it happened at — and the rest of the tree renders around it,
              because a generated UI that goes blank over one bad prop is a generated UI nobody ships. The ring is refused twice over, which
              is the case worth watching: its path resolves to nothing, so the value it cannot do without never arrives — and a component is
              never handed a prop it needs, so the ring renders nothing rather than throwing.
            </Box>
            <Box mt={4}>
              <RefusedDemo />
            </Box>
          </Section>

          <Section id="tokens" title="A colour is a token, so the theme is not the model's">
            <Box>
              The only colours a spec can name are the ones the catalog lists, and a token is a variable rather than a value — so the
              dashboard above flips with the two buttons above it, and it would flip with your app's own theme in exactly the same way. A
              model that writes <Mono>indigo-500</Mono> has not chosen what indigo looks like in dark mode; it has chosen a name your theme
              already answers. <Mono>#ff00ff</Mono> matches no token, so it is dropped rather than painted.
            </Box>
          </Section>

          <Section id="live" title="Against a real model">
            <Box>
              The model call is a server call, so the constraint has to be reachable from a server: <Mono>specSchema()</Mono> is exported
              from <Mono>@box-kite/react/catalog</Mono> as well as from <Mono>/spec</Mono>, and that entry renders nothing and carries no{' '}
              <Mono>use client</Mono> banner. The whole route is this:
            </Box>
            <Box mt={4}>
              <Code
                label="app/api/generative/route.ts"
                language="jsx"
                codeOnly
                check={false}
                code={`import { anthropic } from '@ai-sdk/anthropic';
import { catalog, specSchema } from '@box-kite/react/catalog';
import { jsonSchema, streamObject } from 'ai';

const allowed = catalog({
  include: ['DashboardGrid', 'Widget', 'Sparkline', 'ProgressRing', 'Gauge', 'DataGrid', 'Flex'],
  styleProps: ['d', 'gap', 'p', 'ai', 'jc', 'color', 'width', 'height'],
});

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const result = streamObject({
    model: anthropic('claude-sonnet-5'),
    schema: jsonSchema(specSchema(allowed, { bindings: true })),
    system: 'Lay out a dashboard. Bind every value with { "$data": "<path>" } — never write one.',
    prompt,
  });

  return result.toTextStreamResponse();
}`}
              />
            </Box>
            <Box mt={4}>
              The client half is <Mono>{'<SpecRenderer>'}</Mono> over whatever the stream has delivered so far, and the data the app was
              always going to pass. It is in <Mono>examples/next-app</Mono> in the repository, built and smoke-tested on every commit;
              without an <Mono>ANTHROPIC_API_KEY</Mono> the route answers 503 and the page says so, which is also what CI checks.
            </Box>
          </Section>

          <Section id="trust" title="The trust boundary">
            <Box>
              The model composes the UI. It never executes code and never reaches data the app did not hand it, and that is a property of
              the renderer rather than of the prompt:
            </Box>
            <Box mt={4}>
              <Ul d="column" gap={3} p={0} listStyle="none">
                {[
                  'A component name it did not register renders nothing at all — the registry is an allow-list, not a filter.',
                  'A prop its component’s schema refuses is dropped, and the node renders with the rest of its props.',
                  'The only prop that can become a function is one the catalog lists as an event, and what an action means is the app’s.',
                  'A value is a path into the data prop: a path, never an expression, and there is no eval and no dangerouslySetInnerHTML anywhere in the renderer.',
                  'HTML attributes are left out of the catalog, so a generated link has nowhere to put an href until the app opens one up — with the grammar it opens it up with.',
                  'maxNodes and maxDepth end a runaway tree, and everything refused is reported rather than swallowed.',
                ].map((line) => (
                  <Li key={line} display="flex" gap={2}>
                    <Box theme={{ dark: { color: 'emerald-400' }, light: { color: 'emerald-600' } }} pt={0.5}>
                      <ShieldCheck size={15} />
                    </Box>
                    <Box>{line}</Box>
                  </Li>
                ))}
              </Ul>
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

/** How fast the recording is replayed. About two and a half seconds for a dashboard, which is a real one's pace. */
const CHARS_PER_MS = 1.6;

/** What a grid looks like while its columns are still being written. Chrome, and none of the churn. */
function GridPlaceholder() {
  return (
    <Flex d="column" gap={2} height="fit" p={1} props={{ 'aria-hidden': true }}>
      {[0, 1, 2, 3, 4].map((row) => (
        <Box
          key={row}
          height={row === 0 ? 5 : 4}
          borderRadius={1}
          animation="pulse"
          animationDelay={row * 80}
          theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-200' } }}
        />
      ))}
    </Flex>
  );
}

/**
 * The same allow-list with one name pointed somewhere else: while the spec is arriving, `DataGrid`
 * renders a placeholder. A grid is the one component here whose props keep changing *shape* — a column
 * at a time, each one passing through values its own schema refuses — and watching it rebuild itself is
 * not what a reader came for. That decision belongs to the app, and the registry is where the app makes
 * it. The placeholder takes the grid's schema with its `required` dropped, so it stands in from the
 * frame the node first exists rather than from the frame `def` is first whole.
 */
const STREAMING_REGISTRY = demoRegistry({
  DataGrid: { component: GridPlaceholder, props: { ...DEMO_CATALOG.components.DataGrid.props, required: undefined }, slots: [] },
});

/**
 * The demo: a prompt, a recorded generation replayed a character at a time, and `<SpecRenderer>` over
 * whatever has arrived. The spec text is the state — everything else is derived from it, the way it is
 * in an app reading a stream.
 */
function GenerativeDemo() {
  const [index, setIndex] = useState(0);
  const [delivered, setDelivered] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const [panelTheme, setPanelTheme] = useState<'light' | 'dark' | null>(null);
  const [issues, setIssues] = useState<SpecIssue[]>([]);
  const demo = DEMOS[index];
  const streaming = delivered !== null;
  const text = delivered === null ? demo.spec : demo.spec.slice(0, delivered);
  const spec = useMemo(() => parsePartialJson(text), [text]);

  useEffect(() => {
    if (!run) return;

    const started = performance.now();
    let frame = requestAnimationFrame(function step() {
      const next = Math.round((performance.now() - started) * CHARS_PER_MS);

      setDelivered(next >= demo.spec.length ? null : next);
      if (next < demo.spec.length) frame = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frame);
  }, [run, demo.spec.length]);

  const generate = (next = index) => {
    setIndex(next);
    setIssues([]);
    // A replay is motion for its own sake, so a reader who asked for less gets the answer instead.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setDelivered(null);

    setDelivered(0);
    setRun((count) => count + 1);
  };

  const dashboard = (
    <SpecRenderer
      spec={spec}
      registry={streaming ? STREAMING_REGISTRY : DEMO_REGISTRY}
      data={demo.data}
      onIssues={setIssues}
      onAction={() => undefined}
    />
  );

  return (
    <Flex d="column" gap={4}>
      <Flex gap={2} flexWrap="wrap">
        {DEMOS.map((option, position) => (
          <Button
            key={option.id}
            variant={position === index ? 'primary' : 'secondary'}
            fontSize={13}
            onClick={() => generate(position)}
            props={{ 'aria-pressed': position === index }}
          >
            {PROMPT_LABELS[option.id]}
          </Button>
        ))}
      </Flex>

      <Flex gap={2} ai="center" flexWrap="wrap">
        <Textbox flex1 value={demo.prompt} readOnly fontSize={14} props={{ 'aria-label': 'The prompt this generation answered' }} />
        <Button onClick={() => generate()} disabled={streaming}>
          {streaming ? 'Generating…' : 'Generate'}
        </Button>
      </Flex>

      <Flex gap={3} ai="center" jc="space-between" flexWrap="wrap" fontSize={13}>
        <Box theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          {streaming
            ? `${Math.round((text.length / demo.spec.length) * 100)}% of the object delivered`
            : `${demo.spec.length} characters, ${issues.length === 0 ? 'nothing refused' : `${issues.length} refused`}`}
        </Box>
        <Flex gap={2} ai="center">
          <Box theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>Panel theme</Box>
          {(['light', 'dark'] as const).map((option) => (
            <Button
              key={option}
              variant={panelTheme === option ? 'primary' : 'secondary'}
              fontSize={12}
              py={1}
              onClick={() => setPanelTheme(panelTheme === option ? null : option)}
            >
              {option === 'light' ? 'Light' : 'Dark'}
            </Button>
          ))}
        </Flex>
      </Flex>

      <Box
        p={4}
        borderRadius={3}
        b={1}
        theme={{
          dark: { bgColor: 'slate-950', borderColor: 'slate-800' },
          light: { bgColor: 'slate-50', borderColor: 'slate-200' },
        }}
      >
        {panelTheme ? (
          <Box.Theme use="local" theme={panelTheme}>
            <Box p={3} borderRadius={2} theme={{ dark: { bgColor: 'slate-950' }, light: { bgColor: 'white' } }}>
              {dashboard}
            </Box>
          </Box.Theme>
        ) : (
          dashboard
        )}
      </Box>
    </Flex>
  );
}

/** What each recording is called in the picker — the prompt itself is in the field below it. */
const PROMPT_LABELS: Record<string, string> = {
  sales: 'A sales dashboard',
  support: 'A support dashboard',
  trend: 'One chart, big',
};

/** The same dashboard asking for four things it may not have, and what came back about each of them. */
function RefusedDemo() {
  const [issues, setIssues] = useState<SpecIssue[]>([]);

  return (
    <Flex d="column" gap={4}>
      <Box
        p={4}
        borderRadius={3}
        b={1}
        theme={{
          dark: { bgColor: 'slate-950', borderColor: 'slate-800' },
          light: { bgColor: 'slate-50', borderColor: 'slate-200' },
        }}
      >
        <SpecRenderer spec={REFUSED_SPEC} registry={DEMO_REGISTRY} data={DEMOS[0].data} onIssues={setIssues} />
      </Box>

      <Flex d="column" gap={2} props={{ role: 'list', 'aria-label': 'What the renderer refused' }}>
        {issues.map((issue) => (
          <Flex
            key={`${issue.code}-${issue.path}`}
            props={{ role: 'listitem' }}
            gap={3}
            ai="start"
            p={3}
            borderRadius={2}
            b={1}
            fontSize={13}
            theme={{
              dark: { bgColor: 'rose-950/40', borderColor: 'rose-900' },
              light: { bgColor: 'rose-50', borderColor: 'rose-200' },
            }}
          >
            <Box theme={{ dark: { color: 'rose-400' }, light: { color: 'rose-600' } }} pt={0.5}>
              <CircleSlash size={15} />
            </Box>
            <Box>
              <Flex gap={2} ai="center" flexWrap="wrap" mb={1}>
                <Box fontWeight={600} theme={{ dark: { color: 'rose-300' }, light: { color: 'rose-700' } }}>
                  {issue.code}
                </Box>
                <Mono>{issue.path || 'root'}</Mono>
              </Flex>
              <Box theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>{issue.message}</Box>
            </Box>
          </Flex>
        ))}
      </Flex>
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

function Note({ icon: Icon, title, children }: { icon: typeof Play; title: string; children: ReactNode }) {
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

const sidebarLinks = [
  { id: 'demo', label: 'Ask for a dashboard' },
  { id: 'loop', label: 'Three calls' },
  { id: 'stream', label: 'It arrives in pieces' },
  { id: 'data', label: 'Where to look' },
  { id: 'guardrails', label: 'What it may not do' },
  { id: 'tokens', label: 'A colour is a token' },
  { id: 'live', label: 'Against a real model' },
  { id: 'trust', label: 'The trust boundary' },
];
