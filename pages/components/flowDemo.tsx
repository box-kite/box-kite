import '@xyflow/react/dist/style.css';
import {
  Background,
  BaseEdge,
  Controls,
  Edge,
  EdgeProps,
  getSmoothStepPath,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import Box, { useClassNames } from '../../src/box';
import { FlowContainer, flowColorMode, flowEdgeStyles, flowNodeSelectedStyles, flowNodeStyles } from '../../src/components/flow';
import { Span } from '../../src/components/semantics';

/**
 * The /diagrams page's React Flow demo, a lazy chunk of its own: xyflow is ~55 KB gzipped, and no other page needs it.
 * Nothing here names a colour — the built-in nodes, the minimap and the controls read the container's variables.
 */

type StepData = { label: string; kind: string };

// A custom node: a Box, with the focus ring xyflow takes away and a selected state it marks with a class.
function StepNode({ data, selected }: NodeProps<Node<StepData, 'step'>>) {
  return (
    <Box
      {...flowNodeStyles}
      {...(selected ? flowNodeSelectedStyles : {})}
      px={4}
      py={3}
      borderRadius={2}
      b={1}
      minWidth={36}
      css={{ backgroundColor: 'var(--flow-panel)', borderColor: 'var(--flow-border)', color: 'var(--flow-text)' }}
    >
      <Handle type="target" position={Position.Left} />
      <Span display="block" fontSize={11} opacity={0.6} textTransform="uppercase">
        {data.kind}
      </Span>
      <Span display="block" fontSize={14} fontWeight={600}>
        {data.label}
      </Span>
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}

// A custom edge built on BaseEdge: xyflow paints the selected and focused stroke, the class widens it under Tab.
function StepEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label }: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const { className, styles } = useClassNames(flowEdgeStyles, { svg: true, base: false });

  return (
    <>
      {styles}
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        className={className}
        label={label}
        labelX={labelX}
        labelY={labelY}
        labelBgPadding={[4, 2]}
      />
    </>
  );
}

const nodeTypes = { step: StepNode };
const edgeTypes = { step: StepEdge };

const nodes: Node[] = [
  { id: 'start', type: 'input', position: { x: 0, y: 70 }, data: { label: 'Order placed' } },
  { id: 'check', type: 'step', position: { x: 190, y: 50 }, data: { label: 'Check stock', kind: 'Task' } },
  { id: 'pack', type: 'step', position: { x: 420, y: 0 }, data: { label: 'Pack', kind: 'Task' }, selected: true },
  { id: 'back', type: 'step', position: { x: 420, y: 120 }, data: { label: 'Back-order', kind: 'Task' } },
  { id: 'ship', type: 'output', position: { x: 640, y: 70 }, data: { label: 'Shipped' } },
];

const edges: Edge[] = [
  { id: 'e1', source: 'start', target: 'check', type: 'step' },
  { id: 'e2', source: 'check', target: 'pack', type: 'step', label: 'in stock', selected: true },
  { id: 'e3', source: 'check', target: 'back', type: 'step', label: 'missing' },
  { id: 'e4', source: 'pack', target: 'ship' },
  { id: 'e5', source: 'back', target: 'ship', animated: true },
];

export default function FlowDemo() {
  const [theme] = Box.useTheme();

  return (
    <FlowContainer
      height={90}
      borderRadius={3}
      b={1}
      borderColor="base-200"
      theme={{ dark: { borderColor: 'base-800' } }}
      css={{ overflow: 'clip' }}
    >
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={flowColorMode(theme)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </FlowContainer>
  );
}
