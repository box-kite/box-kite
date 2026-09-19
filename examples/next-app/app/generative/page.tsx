'use client';
import { useObject } from '@ai-sdk/react';
import Box from '@box-kite/react';
import { specSchema } from '@box-kite/react/catalog';
import Button from '@box-kite/react/components/button';
import { Gauge, MiniDonut, ProgressRing, Sparkline } from '@box-kite/react/components/chart';
import DashboardGrid, { Widget } from '@box-kite/react/components/dashboard';
import DataGrid from '@box-kite/react/components/dataGrid';
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';
import type { SpecIssue } from '@box-kite/react/spec';
import { jsonSchema } from 'ai';
import { useState } from 'react';
import '../elementMode';
import { ALLOWED, DATA } from './allowed';

/**
 * The client half: a prompt, a stream of partial objects, and `<SpecRenderer>` over whatever has arrived.
 * `useObject` repairs the partial JSON; the renderer is built to be handed half a spec, so each frame
 * renders what is whole and reports nothing about what is not.
 */
const REGISTRY = createSpecRegistry({
  catalog: ALLOWED,
  components: { DashboardGrid, Widget, DataGrid, Sparkline, ProgressRing, Gauge, MiniDonut, Flex },
});

// The same constraint the route generates under. `useObject` needs one to type what it hands back,
// and building it from the catalog is what keeps the two ends of the call describing one thing.
const SCHEMA = jsonSchema<unknown>(specSchema(ALLOWED, { bindings: true }) as never);

export default function GenerativePage() {
  const [prompt, setPrompt] = useState('Show me how sales are going: revenue, conversion, fulfilment, and the orders behind them.');
  const [issues, setIssues] = useState<SpecIssue[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const { object, submit, isLoading } = useObject({
    api: '/api/generative',
    schema: SCHEMA,
    onError: (error) => setFailure(error.message),
  });

  const generate = () => {
    setFailure(null);
    setIssues([]);
    submit({ prompt });
  };

  return (
    <Flex d="column" gap={6} maxWidth={240} mx="auto">
      <Box>
        <H2 fontSize={18} fontWeight={600}>
          Ask for a dashboard
        </H2>
        <P mt={2} fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
          The model composes the tree; this app owns the components, the data and every refusal.
        </P>
      </Box>

      <Flex gap={3} ai="center" flexWrap="wrap">
        <Textbox
          flex1
          minWidth={80}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          props={{ 'aria-label': 'What the dashboard should show' }}
        />
        <Button onClick={generate} disabled={isLoading}>
          {isLoading ? 'Generating…' : 'Generate'}
        </Button>
      </Flex>

      {failure ? (
        <Box p={4} borderRadius={2} b={1} borderColor="amber-500" fontSize={14}>
          {failure}
        </Box>
      ) : null}

      <Box p={4} borderRadius={3} b={1} borderColor="slate-200" theme={{ dark: { borderColor: 'slate-800' } }}>
        <SpecRenderer spec={object} registry={REGISTRY} data={DATA} onIssues={setIssues} />
      </Box>

      {issues.length ? (
        <Box fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
          {issues.length} thing(s) refused: {issues.map((issue) => `${issue.code} at ${issue.path || 'root'}`).join(', ')}
        </Box>
      ) : null}
    </Flex>
  );
}
