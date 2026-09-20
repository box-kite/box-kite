import { Blocks, CircleCheck, Workflow } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, Li, Ul } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';

/** One row of the state table: what a runtime calls it, and which card it lands on here. */
const STATES: [string, string, string][] = [
  ['AI SDK 6/7', 'input-streaming · input-available · output-available · output-error', 'ToolCallCard'],
  ['AI SDK 6/7', 'approval-requested · approval-responded', 'ApprovalCard'],
  ['assistant-ui', 'running · complete · incomplete', 'ToolCallCard'],
  ['assistant-ui', 'requires-action', 'ApprovalCard'],
  ['CopilotKit', 'inProgress · executing · complete', 'ToolCallCard'],
  ['CopilotKit', 'executing, holding a respond', 'ApprovalCard'],
  ['AG-UI', 'TOOL_CALL_START · _ARGS · _END · _RESULT', 'ToolCallCard'],
  ['AG-UI', 'INTERRUPT', 'ApprovalCard'],
];

const VERIFIED: [string, string][] = [
  ['toGenerativeUi emits their GenerativeUISpec', '@assistant-ui/core'],
  ['fromGenerativeUi reads their GenerativeUINode', '@assistant-ui/core'],
  ['every ToolCallMessagePartStatus maps to a card', '@assistant-ui/core'],
  ['a2uiCatalog is a document createCatalog accepts', '@copilotkit/a2ui-renderer'],
  ['a surface generated against it renders here', 'the fold, end to end'],
  ['the catalog validates a spec written against it', '@json-render/react'],
];

export default function InteropPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Workflow}
        title="Ecosystem interop"
        description="Four agentic runtimes describe the same two things — a tool call and a tree of components — in words of their own. This is the mapping, verified against each one's published package."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            label="Import"
            language="jsx"
            code={`import { toolPart, applyToolEvent } from '@box-kite/react/interop';
import { a2uiApply, a2uiSurface, a2uiToSpec, a2uiCatalog } from '@box-kite/react/interop';
import { fromGenerativeUi, toGenerativeUi } from '@box-kite/react/interop';`}
          />

          <Section id="states" title="One vocabulary for where a tool call is">
            <Box>
              <Mono>toolPart(part)</Mono> reads a part from AI SDK, assistant-ui or CopilotKit and answers in this library&rsquo;s words, so
              the same two components draw a turn whichever runtime produced it. The split worth knowing is that{' '}
              <strong>a decision is not a stage a call passes through</strong> — it is a question somebody answers, which is why two
              components cover what AI SDK reports as six states.
            </Box>
            <Box mt={4} overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell>Runtime</HeadCell>
                    <HeadCell>What it reports</HeadCell>
                    <HeadCell>Where it lands</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {STATES.map(([runtime, reported, card]) => (
                    <TableRow key={`${runtime}-${card}`}>
                      <Cell whiteSpace="nowrap">{runtime}</Cell>
                      <Cell>
                        <Mono>{reported}</Mono>
                      </Cell>
                      <Cell whiteSpace="nowrap">
                        <Mono>{card}</Mono>
                      </Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={4}>
              <strong>AG-UI is the odd one out, and it is worth knowing why:</strong> it reports events rather than parts, so its cards need
              a fold instead of a mapping. <Mono>applyToolEvent(parts, event)</Mono> is that fold — one call per event, oldest first, keyed
              by <Mono>toolCallId</Mono>.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import { ApprovalCard, ToolCallCard } from '@box-kite/react/components/agent';
import { toolPart } from '@box-kite/react/interop';

function Part({ part, respond }: { part: unknown; respond: (approved: boolean) => void }) {
  const mapped = toolPart(part);

  if (!mapped) return null;
  if (mapped.kind === 'approval') {
    return <ApprovalCard title="Refund order 4182" onDecisionChange={(d) => respond(d === 'approved')} />;
  }

  return <ToolCallCard name="searchOrders" status={mapped.status} input={mapped.input} output={mapped.output} />;
}`}
              />
            </Box>
          </Section>

          <Section id="a2ui" title="A2UI: a flat list of components, as a tree">
            <Box>
              A2UI is the protocol Google published and CopilotKit and Oracle converged on, and its wire shape is the only one here that is
              genuinely different: a <strong>flat adjacency list</strong> of components referring to each other by id, arriving one message
              at a time, with a data model of its own per surface. <Mono>a2uiApply</Mono> folds the stream; <Mono>a2uiToSpec</Mono> walks
              one surface into the tree <Mono>&lt;SpecRenderer&gt;</Mono> takes.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import { catalog } from '@box-kite/react/catalog';
import { a2uiApply, a2uiEmpty, a2uiSurface, a2uiToSpec } from '@box-kite/react/interop';
import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';

const allowed = catalog({ include: ['Flex', 'H2', 'P'] });
const registry = createSpecRegistry({ catalog: allowed, components: { Flex, H2, P } });

function Surface({ onMessage }: { onMessage: (fold: (message: unknown) => void) => void }) {
  const [state, setState] = useState(a2uiEmpty);

  // One message at a time, folded in as the transport delivers it.
  onMessage((message) => setState((current) => a2uiApply(current, message)));

  const surface = a2uiSurface(state);

  return <SpecRenderer spec={a2uiToSpec(surface, { catalog: allowed })} registry={registry} data={surface?.data} />;
}`}
              />
            </Box>
            <Box mt={4}>Three things the two models already agreed on, each a special case that did not have to be written:</Box>
            <Ul mt={2} pl={5} display="flex" d="column" gap={2}>
              <Li>
                <strong>Its data binding is already ours.</strong> <Mono>{`{ "path": "/user/email" }`}</Mono> is a JSON Pointer, and{' '}
                <Mono>$data</Mono> has taken one since it was written — so a binding is a rename rather than a parse.
              </Li>
              <Li>
                <strong>A template is a repeat.</strong> <Mono>{`children: { componentId, path }`}</Mono> is one node per item of an array,
                which is exactly what <Mono>repeat</Mono> means.
              </Li>
              <Li>
                <strong>A half-arrived surface is the ordinary case.</strong> An agent streams a leaf before the branch that holds it, so a
                component nothing reaches from the root is simply not rendered yet — and a cycle in the id graph is cut rather than walked.
              </Li>
            </Ul>
            <Box mt={4}>
              The other direction is <Mono>a2uiCatalog(catalog())</Mono>: the same components and the same values their props take, in the
              shape an adjacency list needs — a component carries its own <Mono>id</Mono>, its type is a property rather than the key above
              it, and its children are <strong>ids</strong> rather than nested nodes. Serve it at the <Mono>catalogId</Mono> you gave it,
              which is what an agent&rsquo;s <Mono>createSurface</Mono> names.
            </Box>
          </Section>

          <Section id="assistant-ui" title="assistant-ui: the same idea, arrived at twice">
            <Box>
              Its <Mono>GenerativeUISpec</Mono> and this library&rsquo;s <Mono>SpecNode</Mono> differ in three ways, and they are the whole
              adapter: the name is <Mono>component</Mono> rather than <Mono>type</Mono>, a child may be a bare string that renders as text,
              and their nodes carry no data binding, no repeat and no action channel — in their design those are the tool&rsquo;s job rather
              than the spec&rsquo;s. So <Mono>toGenerativeUi</Mono> <strong>reports what it could not carry</strong> rather than emitting a
              tree that renders half a view in silence.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`const { spec, losses } = toGenerativeUi(node);
// losses: [{ code: 'data-binding' | 'repeat' | 'event', path }]`}
              />
            </Box>
          </Section>

          <Section id="copilotkit" title="CopilotKit: two surfaces, opposite directions">
            <Box>
              Its A2UI renderer takes a catalog built from Zod schemas, and <Mono>z.fromJSONSchema</Mono> is the whole bridge — which is why{' '}
              <Mono>catalog()</Mono> emits JSON Schema at all. One trap, measured against zod 4.6:{' '}
              <strong>a $ref resolves against the document, not against the piece you lifted out of it</strong>, so converting a component
              on its own throws <Mono>Reference not found: #/$defs/color</Mono>. <Mono>a2uiComponentSchema(document, name)</Mono> is that
              component with the document&rsquo;s definitions attached.
            </Box>
            <Box mt={4}>
              Its actions go the other way: <Mono>render</Mono> is a call being shown and <Mono>renderAndWaitForResponse</Mono> is a
              question, whose <Mono>respond</Mono> is what <Mono>onDecisionChange</Mono> calls.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                check={false}
                code={`useCopilotAction({
  name: 'refundOrder',
  parameters: [{ name: 'orderId', type: 'number' }],
  renderAndWaitForResponse: ({ args, respond }) => (
    <ApprovalCard title={'Refund order ' + args.orderId} onDecisionChange={(d) => respond?.(d === 'approved')} />
  ),
});`}
              />
            </Box>
          </Section>

          <Section id="verified" title="Verified against the packages, not against a memory of them">
            <Box>
              Every runtime named here is a devDependency of the repository, and the adapters are checked against the published{' '}
              <Mono>.d.ts</Mono> and the published functions. A shape read off a blog post is a shape that has already moved.
            </Box>
            <Box mt={4} overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell>Claim</HeadCell>
                    <HeadCell>Checked against</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {VERIFIED.map(([claim, against]) => (
                    <TableRow key={claim}>
                      <Cell>
                        <Flex gap={2} ai="center">
                          <Flex theme={{ dark: { color: 'emerald-400' }, light: { color: 'emerald-600' } }}>
                            <CircleCheck size={15} />
                          </Flex>
                          {claim}
                        </Flex>
                      </Cell>
                      <Cell whiteSpace="nowrap">
                        <Mono>{against}</Mono>
                      </Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={4}>
              The two cases A2UI&rsquo;s own conformance suite keeps for a message processor — that an update lands on the surface it names
              and nowhere else, and that each surface owns its data model — are in the test suite in the vocabulary that suite uses.
            </Box>
          </Section>

          <Section id="dependency" title="What is deliberately not here">
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
              <Flex theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
                <Blocks size={16} />
              </Flex>
              <Box fontSize={14}>
                <Box fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                  A wrapper around somebody else&rsquo;s runtime
                </Box>
                This entry imports none of the four. An adapter that pulled one in would be choosing a runtime for the app, and the app has
                already chosen — so what ships is the half this library owns: the mapping, framework-free, engine-free, and importable from
                a route handler and a client alike.
              </Box>
            </Flex>
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
  { id: 'states', label: 'One vocabulary' },
  { id: 'a2ui', label: 'A2UI' },
  { id: 'assistant-ui', label: 'assistant-ui' },
  { id: 'copilotkit', label: 'CopilotKit' },
  { id: 'verified', label: 'Verified how' },
  { id: 'dependency', label: 'What is not here' },
];
