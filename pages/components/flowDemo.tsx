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
import { Ellipsis } from 'lucide-react';
import { LayerScope } from '../../src/a11y';
import Box, { useClassNames } from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { FlowContainer, flowColorMode, flowEdgeStyles, flowNodeSelectedStyles, flowNodeStyles } from '../../src/components/flow';
import Icon from '../../src/components/icon';
import Menu from '../../src/components/menu';
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
      <Flex ai="center" gap={2}>
        <Span display="block" fontSize={14} fontWeight={600}>
          {data.label}
        </Span>
        {/* The trigger sits in the node, so it opts out of the drag itself; the menu takes the scope's classes. */}
        <Menu
          label={`${data.label} actions`}
          trigger={(t) => (
            <Button ref={t.ref} variant="square" className="nodrag" props={{ ...t.props, 'aria-label': `${data.label} actions` }}>
              <Icon size={4}>
                <Ellipsis />
              </Icon>
            </Button>
          )}
        >
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </Menu>
      </Flex>
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
      {/* Every layer inside — the node menus here — carries React Flow's opt-outs, and its keys stay in it (bug #232). */}
      <LayerScope className="nodrag nowheel nokey" isolate={['key']}>
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
      </LayerScope>
    </FlowContainer>
  );
}
