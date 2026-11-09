import { Workflow } from 'lucide-react';
import { lazy, ReactNode, Suspense } from 'react';
import flowContainerApi from '../../api/components/flowcontainer.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { FlowContainer } from '../../src/components/flow';
import { H2 } from '../../src/components/semantics';
import { Path, Rect, Svg } from '../../src/components/svg';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

// xyflow is ~55 KB gzipped: the one demo that needs it is a chunk of its own, so only a reader of this page downloads it.
const FlowDemo = lazy(() => import('../components/flowDemo'));

export default function DiagramsPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Workflow}
        title="Diagrams"
        description="A React Flow canvas in the page's theme, with no colour written anywhere: one container declares the variables xyflow reads, from the palette, in both themes."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="what" title="React Flow, in the page's theme">
            Box Kite is not a diagram library — the canvas stays React Flow's. What it adds is the part every app writes by hand: a dark
            mode, one selection colour, one edge grey, and a visible keyboard focus on the nodes you draw yourself. React Flow already reads
            about thirty CSS variables for its background, edges, handles, minimap and controls; <Mono>FlowContainer</Mono> is a Box that
            declares them from palette tokens, so the canvas below names no colour and switches with the theme in the header. Import React
            Flow's own stylesheet once, as its docs say: the container sets only the variables that stylesheet reads.
          </Section>

          <Code
            id="canvas"
            label="A React Flow canvas themed by the page"
            language="jsx"
            code={`import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import { FlowContainer, flowColorMode } from '@box-kite/react/components/flow';

function Canvas() {
  const [theme] = Box.useTheme();

  return (
    <FlowContainer height={90}>
      <ReactFlow defaultNodes={nodes} defaultEdges={edges} nodeTypes={nodeTypes} colorMode={flowColorMode(theme)} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </FlowContainer>
  );
}`}
          >
            <Suspense fallback={<Box height={90} />}>
              <FlowDemo />
            </Suspense>
          </Code>

          <Section id="roles" title="Eight roles, not thirty variables">
            Every <Mono>--xy-*</Mono> variable the container declares reads one of eight roles: <Mono>surface</Mono> (the canvas),{' '}
            <Mono>panel</Mono> (nodes, minimap, controls), <Mono>text</Mono>, <Mono>border</Mono>, <Mono>grid</Mono> (the background
            pattern), <Mono>edge</Mono>, <Mono>selection</Mono> (a selected edge, the connection line, the selection box, the resizer and
            your nodes' focus) and <Mono>handle</Mono>. The defaults are drawn in <Mono>base</Mono> and <Mono>accent</Mono>, so{' '}
            <Mono>Box.palette()</Mono> recolours a canvas with the rest of the page. <Mono>tokens</Mono> repaints a role — one token for
            both themes, or a pair — and a single variable is plain <Mono>vars</Mono>, because the container is a Box. A prop on{' '}
            <Mono>&lt;MiniMap&gt;</Mono> or <Mono>&lt;Background&gt;</Mono> still wins: that is the app speaking.
          </Section>

          <Code
            id="tokens"
            label="Repaint a role — a custom node reads the same roles"
            language="jsx"
            code={`<FlowContainer tokens={{ selection: 'emerald-500', surface: { light: 'base-50', dark: 'base-950' } }} p={4} borderRadius={3} css={{ backgroundColor: 'var(--flow-surface)' }}>
  <Svg viewBox="0 0 100 24" width="100%" height="4rem" label="Two steps joined by an edge, the second selected">
    <Path d="M34 12H66" stroke="var(--flow-edge)" strokeWidth={1} />
    <Rect x={4} y={4} width={30} height={16} rx={2} fill="var(--flow-panel)" stroke="var(--flow-border)" />
    <Rect x={66} y={4} width={30} height={16} rx={2} fill="var(--flow-panel)" stroke="var(--flow-selection)" />
  </Svg>
</FlowContainer>`}
          >
            <FlowContainer
              tokens={{ selection: 'emerald-500', surface: { light: 'base-50', dark: 'base-950' } }}
              p={4}
              borderRadius={3}
              css={{ backgroundColor: 'var(--flow-surface)' }}
            >
              <Svg viewBox="0 0 100 24" width="100%" height="4rem" label="Two steps joined by an edge, the second selected">
                <Path d="M34 12H66" stroke="var(--flow-edge)" strokeWidth={1} />
                <Rect x={4} y={4} width={30} height={16} rx={2} fill="var(--flow-panel)" stroke="var(--flow-border)" />
                <Rect x={66} y={4} width={30} height={16} rx={2} fill="var(--flow-panel)" stroke="var(--flow-selection)" />
              </Svg>
            </FlowContainer>
          </Code>

          <Section id="color-mode" title="colorMode follows the page">
            React Flow's <Mono>colorMode="dark"</Mono> puts a <Mono>dark</Mono> class on its root, and Box Kite's themes treat that class as
            a theme root — so the two have to agree. Pass <Mono>colorMode={'{flowColorMode(theme)}'}</Mono> with the theme from{' '}
            <Mono>Box.useTheme()</Mono> and they always do. A canvas in a different theme from the page sits in{' '}
            <Mono>&lt;Box.Theme use="local"&gt;</Mono>, which marks a boundary with <Mono>data-theme</Mono>. Never set{' '}
            <Mono>colorMode="light"</Mono> under a dark page: <Mono>light</Mono> is no boundary, so the page's dark rules still reach into
            the canvas and the two themes mix.
          </Section>

          <Code
            id="nodes"
            label="A custom node with a visible focus and a selected state"
            language="jsx"
            code={`import { Handle, NodeProps, Position } from '@xyflow/react';
import { flowNodeSelectedStyles, flowNodeStyles } from '@box-kite/react/components/flow';

function StepNode({ data, selected }: NodeProps) {
  return (
    <Box
      {...flowNodeStyles}
      {...(selected ? flowNodeSelectedStyles : {})}
      px={4}
      py={3}
      borderRadius={2}
      b={1}
      css={{ backgroundColor: 'var(--flow-panel)', borderColor: 'var(--flow-border)', color: 'var(--flow-text)' }}
    >
      <Handle type="target" position={Position.Left} />
      {String(data.label)}
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}`}
          />

          <Section id="focus" title="Focus and selection on your own nodes">
            xyflow removes the focus outline from every node and edge and gives a replacement only to its four built-in node types, so a
            custom node is invisible to a keyboard user. <Mono>flowNodeStyles</Mono> puts an outline on your node while xyflow's wrapper has{' '}
            <Mono>:focus-visible</Mono> — a <Mono>group</Mono> keyed on <Mono>react-flow__node</Mono> — and{' '}
            <Mono>flowNodeSelectedStyles</Mono> is the selected state, which xyflow marks with a class and hands your node as the{' '}
            <Mono>selected</Mono> prop. Both are outlines rather than shadows, so they survive forced colours, and their colour is the
            container's <Mono>selection</Mono> role. A custom edge built on <Mono>BaseEdge</Mono> is painted by xyflow's own selected rule;{' '}
            <Mono>flowEdgeStyles</Mono> widens it under Tab.
          </Section>

          <Code
            id="edges"
            label="A custom edge, wider under Tab"
            language="jsx"
            code={`import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { useClassNames } from '@box-kite/react';
import { flowEdgeStyles } from '@box-kite/react/components/flow';

function StepEdge(props: EdgeProps) {
  const [path] = getSmoothStepPath(props);
  const { className, styles } = useClassNames(flowEdgeStyles, { svg: true, base: false });

  return (
    <>
      {styles}
      <BaseEdge path={path} markerEnd={props.markerEnd} className={className} />
    </>
  );
}`}
          />

          <Section id="foreign" title="Classing React Flow's own elements">
            <Mono>useClassNames</Mono> puts Box props on an element Box does not render, and by default its class carries Box's reset:{' '}
            <Mono>margin: 0</Mono>, <Mono>display: block</Mono> and the base transition. On <Mono>&lt;ReactFlow&gt;</Mono>,{' '}
            <Mono>&lt;MiniMap&gt;</Mono> or a <Mono>BaseEdge</Mono> that undoes React Flow's own panel margin and transitions, so pass{' '}
            <Mono>{'{ base: false }'}</Mono> and only your props are added.
          </Section>

          <Section id="motion" title="A canvas that moves every frame">
            Every Box transitions over a quarter of a second, which is right for a button and wrong for a node dragged under the pointer: a
            Box given a new position or size every frame trails behind it. Name the transition on what moves (
            <Mono>transition="colors"</Mono>), or give the container <Mono>motion="static"</Mono>, which zeroes every Box transition inside
            the canvas — layers' entrances included, which is why it is opt-in.
          </Section>

          <ApiReference api={flowContainerApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'base-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'what', label: 'React Flow, themed' },
  { id: 'canvas', label: 'The canvas' },
  { id: 'roles', label: 'Eight roles' },
  { id: 'tokens', label: 'Repainting a role' },
  { id: 'color-mode', label: 'colorMode' },
  { id: 'nodes', label: 'A custom node' },
  { id: 'focus', label: 'Focus and selection' },
  { id: 'edges', label: 'A custom edge' },
  { id: 'foreign', label: "React Flow's elements" },
  { id: 'motion', label: 'Moving every frame' },
  ...apiSections(flowContainerApi),
];
