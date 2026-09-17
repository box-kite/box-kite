import { Gauge, MonitorSmartphone, Ruler, ScanEye } from 'lucide-react';
import { ReactNode, memo, useCallback, useEffect, useRef, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import RadioGroup from '../../src/components/radioGroup';
import { H2 } from '../../src/components/semantics';
import { BenchRow, BENCH_COLUMN_COUNT, FILTER_COUNTRY, generateRows, GROUP_COLUMN } from '../benchmark/benchData';
import { BenchDriver, BenchRun, ScenarioId, nextPaint, runBenchmark, scenarios } from '../benchmark/benchModel';
import referenceResults from '../benchmark/benchResults';
import { BenchGridProps, ROW_HEIGHT, VISIBLE_ROWS } from '../benchmark/gridImpl';
import { boxKite } from '../benchmark/impls';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';

const rowChoices = [10000, 100000];
const runChoices = [1, 3, 5];

export default function BenchmarkPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Gauge}
        title="Benchmark"
        description="A hundred thousand rows by twenty columns, measured in your own browser: first render, scroll frames, filter, sort and grouped totals."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            Every grid claims to be fast. This page is the claim with an instrument attached: it generates{' '}
            {rowChoices[1].toLocaleString('en-US')} rows of {BENCH_COLUMN_COUNT} columns in your browser, drives the grid through five
            operations and reports what it measured — on your machine, in your browser, at your window size. The numbers below it are from
            one laptop and are here for scale; the button is the point.
          </Box>

          <Section id="run" title="Run it">
            <Runner />
          </Section>

          <Section id="results" title="What it measured here">
            <Box>
              Measured on {referenceResults.measuredAt} — {referenceResults.machine}, {referenceResults.browser}. A figure is the median of{' '}
              {referenceResults.runs[0]?.runs} runs, each starting from a grid that was mounted a moment earlier, so no operation is scored
              on what the one before it left behind.
            </Box>
            <Box mt={5}>
              {referenceResults.runs.map((run) => (
                <ResultTable key={run.impl} run={run} />
              ))}
            </Box>
            {referenceResults.note && (
              <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                {referenceResults.note}
              </Box>
            )}
          </Section>

          <Section id="method" title="How each number is taken">
            <Box>
              A measurement starts the moment the change is asked for and stops after the browser has painted it. The frame callback runs
              before the paint and a task posted from inside it runs after, so what is timed is React's render, the commit, style, layout
              and paint — not a DOM write with the expensive half still ahead of it. Every grid is driven through the same five state
              changes by the same code, and the rows are generated once and handed to all of them.
            </Box>
            <Box mt={5}>
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Operation</HeadCell>
                    <HeadCell>What the grid is asked to do</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scenarios.map((scenario) => (
                    <TableRow key={scenario.id}>
                      <Cell width={44} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                        {scenario.label}
                      </Cell>
                      <Cell>{scenario.what}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={5}>
              The filter is the <Mono>{FILTER_COUNTRY}</Mono> rows of a twenty-value country column, the sort is a press on the salary
              header, and the grouping is <Mono>{GROUP_COLUMN}</Mono> with a total on two money columns and a mean on a third, first level
              open — so the aggregates are computed over every row rather than over the dozen on screen. The grid is {VISIBLE_ROWS} rows
              tall at {ROW_HEIGHT}px a row, with all {BENCH_COLUMN_COUNT} columns rendered.
            </Box>
            <Box mt={5}>
              <Flex d="column" gap={3}>
                <Note icon={Ruler} title="Building the rows is charged to nobody">
                  A hundred thousand objects take longer to create than a grid takes to render them. The generator runs once, its time is
                  reported on its own, and no operation includes it.
                </Note>
                <Note icon={MonitorSmartphone} title="A slow frame is one that missed 60 fps">
                  The page samples an idle animation-frame loop first and takes the slower of that interval and 16.7 ms as the budget. A
                  frame inside 16.7 ms is smooth on any screen anybody owns, and a headless browser runs its animation loop several times
                  faster than a display does — so the idle interval on its own would score a perfectly smooth scroll as dropping most of it.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="limits" title="What it does not measure">
            <Box>
              A benchmark that only flatters the thing it measures is an advertisement. Four things this one leaves out, each of which could
              change the answer for a particular application.
            </Box>
            <Box mt={5}>
              <Flex d="column" gap={3}>
                <Note icon={ScanEye} title="A canvas grid wins the numbers a canvas grid is built for">
                  Glide Data Grid and the other canvas grids draw cells into a bitmap rather than creating elements, so their scroll cost is
                  close to flat however many columns are on screen and nothing here will beat them at it. What they pay for that is
                  everything a DOM makes free: text selection, find-in-page, a screen reader, a browser extension, a CSS rule, an element
                  inspector. This grid is a DOM grid and is measured as one.
                </Note>
                <Note icon={ScanEye} title="The scroll is scripted, not thrown by a finger">
                  The scroll scenario sets <Mono>scrollTop</Mono> on every animation frame, at a speed taken from the clock rather than a
                  fixed number of pixels — so a frame that took 100 ms to render lands 400 px further down, the way a real fling does. What
                  it exercises is the virtualization and the re-render, not the compositor path a wheel or a touch drag also takes.
                </Note>
                <Note icon={ScanEye} title="The rows are already in memory">
                  Nothing here crosses a network. A grid whose rows arrive from a server a block at a time is a different measurement, and
                  the thing that dominates it is the server.
                </Note>
                <Note icon={ScanEye} title="One machine, one browser, one window">
                  Every figure on this page moves with the hardware, the browser, the window size and whatever else the machine is doing.
                  That is why the run button is here rather than a table of numbers you have to take on trust.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="rerun" title="Rerunning it, and in CI">
            <Box>
              The page is the benchmark, so the harness is the same code either way: <Mono>npm run bench</Mono> builds the site, serves it,
              drives this page in headless Chrome and writes what it measured to <Mono>bench/results.json</Mono> — the file the table above
              reads.
            </Box>
            <Box mt={4}>
              <Code
                label="From a clone of the repository"
                language="shell"
                code={`npm run build:pages\nnpm run bench -- --runs 5\n\n# or against a server you are already running\nnpm run bench -- --url http://localhost:4173/benchmark/`}
              />
            </Box>
            <Box mt={4}>
              The same command runs in CI against a budget file, so a change that makes the grid an order of magnitude slower fails the
              build rather than being noticed a release later. The budgets are sized for a shared CI runner, which is several times slower
              than any laptop — they catch a regression, not a drift.
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

/** The panel that owns the grid under test, the choices above it and the numbers underneath. */
function Runner() {
  const [rows, setRows] = useState(rowChoices[1]);
  const [runs, setRuns] = useState(3);
  const [stage, setStage] = useState<StageState>({ mounted: false, filtered: false, grouped: false, generation: 0 });
  const [status, setStatus] = useState<string | undefined>();
  const [result, setResult] = useState<BenchRun | undefined>();
  const [dataset, setDataset] = useState<Dataset | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const running = status !== undefined;

  const run = useCallback(
    async (options: { rows: number; runs: number }): Promise<BenchRun> => {
      setResult(undefined);
      setStatus('Generating rows…');
      // Let the label paint before a hundred thousand objects block the thread for a quarter of a second.
      await nextPaint();

      let rowData = dataset;

      if (rowData?.rows !== options.rows) {
        const start = performance.now();
        rowData = { rows: options.rows, data: generateRows(options.rows), ms: performance.now() - start };
        setDataset(rowData);
        await nextPaint();
      }

      const driver = makeDriver(setStage, containerRef, boxKite.scroller, boxKite.sort);

      const measured = await runBenchmark(driver, {
        rows: options.rows,
        columns: BENCH_COLUMN_COUNT,
        runs: options.runs,
        impl: boxKite.id,
        label: boxKite.label,
        version: boxKite.version,
        dataMs: rowData.ms,
        onProgress: (done, total, scenario) => setStatus(progressLabel(done, total, scenario)),
      });

      setResult(measured);
      setStatus(undefined);

      return measured;
    },
    [dataset],
  );

  // The headless driver behind `npm run bench` presses this button rather than reimplementing it, so a
  // rerun in CI measures the code a reader of this page measures.
  useEffect(() => {
    const target = window as BenchWindow;
    target.boxKiteBench = { run };

    return () => {
      delete target.boxKiteBench;
    };
  }, [run]);

  return (
    <Box>
      <Flex gap={8} flexWrap="wrap" ai="flex-end">
        <RadioGroup label="Rows" orientation="horizontal" value={String(rows)} onValueChange={(value) => setRows(Number(value))}>
          {rowChoices.map((choice) => (
            <RadioGroup.Item key={choice} value={String(choice)} label={choice.toLocaleString('en-US')} disabled={running} />
          ))}
        </RadioGroup>
        <RadioGroup label="Runs" orientation="horizontal" value={String(runs)} onValueChange={(value) => setRuns(Number(value))}>
          {runChoices.map((choice) => (
            <RadioGroup.Item key={choice} value={String(choice)} label={String(choice)} disabled={running} />
          ))}
        </RadioGroup>
        <Button onClick={() => void run({ rows, runs })} disabled={running}>
          {running ? 'Running…' : 'Run the benchmark'}
        </Button>
      </Flex>

      <Box mt={4} minHeight={6} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
        <Box props={{ role: 'status' }}>
          {status ??
            (result
              ? `Done — ${result.runs === 1 ? 'one run' : `${result.runs} runs`} of ${result.rows.toLocaleString('en-US')} rows.`
              : '')}
        </Box>
      </Box>

      {result && (
        <Box mt={5}>
          <ResultTable run={result} />
        </Box>
      )}

      {result && (
        <Box mt={6} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          The grid the run measured, still on the page — {result.rows.toLocaleString('en-US')} rows of {result.columns} columns. Scroll it.
        </Box>
      )}

      <Box mt={4} ref={containerRef}>
        {stage.mounted && dataset && <Stage key={stage.generation} data={dataset.data} filtered={stage.filtered} grouped={stage.grouped} />}
      </Box>
    </Box>
  );
}

/**
 * The grid under test, behind a `memo` so the status line above it can update between scenarios without
 * re-rendering a hundred thousand rows into the next measurement.
 */
const Stage = memo(function Stage(props: BenchGridProps) {
  return <boxKite.Grid {...props} />;
});

function ResultTable({ run }: { run: BenchRun }) {
  return (
    <Box>
      <Box mb={3} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
        <Mono>
          {run.label} {run.version}
        </Mono>{' '}
        · {run.rows.toLocaleString('en-US')} rows × {run.columns} columns · median of {run.runs} · rows built in {run.dataMs} ms · display
        frame {run.frameBaseline} ms
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <HeadCell>Operation</HeadCell>
            <HeadCell textAlign="end">Median</HeadCell>
            <HeadCell textAlign="end">Best</HeadCell>
            <HeadCell textAlign="end">Worst</HeadCell>
            <HeadCell textAlign="end">Blocking</HeadCell>
            <HeadCell>Notes</HeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {run.scenarios.map((scenario) => {
            const info = scenarios.find((s) => s.id === scenario.scenario);

            return (
              <TableRow key={scenario.scenario}>
                <Cell theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>{info?.label ?? scenario.scenario}</Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {scenario.ms} ms
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {scenario.min} ms
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {scenario.max} ms
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {scenario.blockingMs} ms
                </Cell>
                <Cell>
                  {scenario.fps !== undefined
                    ? `${scenario.fps} fps · worst frame ${scenario.worstFrame} ms · ${scenario.slowFrames}% of frames under 60 fps`
                    : ''}
                </Cell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

interface Dataset {
  rows: number;
  data: BenchRow[];
  /** How long the rows took to build. Reported on its own, never inside an operation's figure. */
  ms: number;
}

interface StageState {
  mounted: boolean;
  filtered: boolean;
  grouped: boolean;
  /** Bumped on every reset: it is the grid's `key`, so each operation starts on a grid with no history. */
  generation: number;
}

interface BenchWindow extends Window {
  boxKiteBench?: { run: (options: { rows: number; runs: number }) => Promise<BenchRun> };
}

/**
 * Turns the stage's state into the four calls the runner makes. A reset remounts rather than resetting,
 * because a sort lives inside the grid where no prop of ours can reach it.
 */
function makeDriver(
  setStage: (update: (state: StageState) => StageState) => void,
  container: { current: HTMLDivElement | null },
  scroller: (element: HTMLElement) => HTMLElement | null,
  sort: (element: HTMLElement) => void,
): BenchDriver {
  const fresh = (state: StageState): StageState => ({
    mounted: true,
    filtered: false,
    grouped: false,
    generation: state.generation + 1,
  });

  return {
    reset: async () => {
      setStage(fresh);
      await nextPaint();
    },
    unmount: async () => {
      setStage((state) => ({ ...state, mounted: false }));
      await nextPaint();
    },
    apply: (scenario) => {
      if (scenario === 'mount') setStage(fresh);
      else if (scenario === 'filter') setStage((state) => ({ ...state, filtered: true }));
      else if (scenario === 'group') setStage((state) => ({ ...state, grouped: true }));
      else if (scenario === 'sort' && container.current) sort(container.current);
    },
    scroller: () => (container.current ? scroller(container.current) : null),
  };
}

function progressLabel(done: number, total: number, scenario: ScenarioId): string {
  const info = scenarios.find((s) => s.id === scenario);

  return `${done} of ${total} — ${info?.label ?? scenario}…`;
}

const sidebarLinks = [
  { id: 'run', label: 'Run it' },
  { id: 'results', label: 'What it measured' },
  { id: 'method', label: 'How it is taken' },
  { id: 'limits', label: 'What it leaves out' },
  { id: 'rerun', label: 'Rerunning it' },
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

function Note({ icon: NoteIcon, title, children }: { icon: typeof Gauge; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-800' }, light: { bgColor: 'slate-50', borderColor: 'slate-200' } }}
    >
      <Box pt={0.5} theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }}>
        <NoteIcon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
          {title}
        </Box>
        <Box fontSize={14} lineHeight={24}>
          {children}
        </Box>
      </Box>
    </Flex>
  );
}
