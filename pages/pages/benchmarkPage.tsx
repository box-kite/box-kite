import { Gauge, MonitorSmartphone, Ruler, ScanEye } from 'lucide-react';
import { ComponentType, ReactNode, memo, useCallback, useEffect, useRef, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import RadioGroup from '../../src/components/radioGroup';
import { H2, Link } from '../../src/components/semantics';
import { BenchRow, BENCH_COLUMN_COUNT, FILTER_COUNTRY, generateRows, GROUP_COLUMN } from '../benchmark/benchData';
import {
  BenchDriver,
  BenchRun,
  FLICK_VELOCITY,
  ScenarioId,
  ScenarioInfo,
  ScenarioResult,
  nextPaint,
  runBenchmark,
  scenarios,
} from '../benchmark/benchModel';
import referenceResults from '../benchmark/benchResults';
import { BenchGridProps, GridImpl, ROW_HEIGHT, VISIBLE_ROWS } from '../benchmark/gridImpl';
import impls, { DEFAULT_IMPL } from '../benchmark/impls';
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
            operations and reports what it measured — on your machine, in your browser, at your window size. Tick another library and it
            drives that one through the same five, one after the other. The numbers below are from one laptop and are here for scale; the
            button is the point.
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
              <Results runs={referenceResults.runs} />
            </Box>
            {referenceResults.note && (
              <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                {referenceResults.note}
              </Box>
            )}
            <Box mt={5}>
              <Note icon={Ruler} title="The fling is inside a frame, and the work inside it is still the gap">
                First render, filter and sort are in the same class as AG Grid's and MUI X's, the grouping is the quickest of the four and
                only two of them can group at all. The fling was the one this grid was behind on — twenty milliseconds of work a frame
                against AG Grid's 2.6 — because it rendered fifty-eight rows around an eighteen-row viewport where those two render about
                half that. It keeps twelve rows ahead of the scroll and four behind it now, thirty-six in all, and the frame is inside a
                sixtieth of a second with none of a hard flick blank. What is left is the work inside that frame, which is still several
                times theirs: published rather than left out, and the number being worked on.
              </Note>
            </Box>
          </Section>

          <Section id="tiers" title="What each grid is allowed to do">
            <Box>
              Three of the four are MIT-licensed and free, and two of them still cannot run all five operations — not because they are slow
              at them, but because the feature is in a tier that is not free. A missing number below is that, and it is the comparison worth
              having: the fastest grouping is the one you are allowed to use.
            </Box>
            <Box mt={5}>
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Grid</HeadCell>
                    <HeadCell>The tier measured</HeadCell>
                    <HeadCell>What it cannot run here</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {impls.map((info) => (
                    <TableRow key={info.id}>
                      <Cell theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                        <Link props={{ href: info.href, target: '_blank', rel: 'noreferrer' }}>{info.label}</Link>
                      </Cell>
                      <Cell>{info.tier}</Cell>
                      <Cell>
                        {Object.entries(info.unavailable ?? {})
                          .map(([id, reason]) => `${scenarios.find((scenario) => scenario.id === id)?.label ?? id} (${reason})`)
                          .join(', ') || 'Nothing — it runs all five'}
                      </Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={5}>
              <Flex d="column" gap={3}>
                <Note icon={ScanEye} title="The free MUI grid paginates, so there is no fling to measure">
                  <Mono>DataGrid</Mono> forces <Mono>pagination</Mono> on and caps a page at a hundred rows — both are in the package, not
                  in the documentation — so the grid never holds more than a hundred of the hundred thousand rows at once. It sorts and
                  filters all of them, which is what the other two numbers measure; scrolling past the first page is a paid tier, so there
                  is a reason in that cell rather than a frame time for a hundred rows.
                </Note>
                <Note icon={ScanEye} title="Grouping is the paid feature in both of the big grids">
                  AG Grid Community ships no row-grouping module at all, and MUI X puts row grouping and aggregation in Premium. Neither can
                  be driven through the grouping scenario, so neither is given a number for it. Box Kite and a hand-written TanStack table
                  both group and total a hundred thousand rows for nothing.
                </Note>
                <Note icon={ScanEye} title="The TanStack column is a baseline, not a product">
                  TanStack Table is free and does every one of the five, and the grid around it is yours to write: the virtualized body, the
                  header presses, the group rows and the aggregates on this page are about a hundred and fifty lines in this repository,
                  with no pinned columns, no keyboard, no editing and no accessibility. That is the trade the number is there to price.
                </Note>
              </Flex>
            </Box>
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
              The filter is the <Mono>{FILTER_COUNTRY}</Mono> rows of a twenty-value country column, the sort is a press on the last-name
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
                <Note icon={MonitorSmartphone} title="A frame interval is quantized, so the scroll is compared on work">
                  Frames arrive on the display's own clock, so a grid that needs 9 ms on a 130 Hz screen misses the 7.7 ms interval and
                  waits for the next one: it reports 15 ms and reads as twice as slow as a grid that needed 7 ms, when the difference
                  between them is two milliseconds. The comparison therefore prints what one frame <em>cost</em> — the same
                  change-to-after-the-paint measurement the other four operations use — and the frames per second beside it, which is what
                  the display allowed. The grid's own table keeps both.
                </Note>
                <Note icon={ScanEye} title="A grid that renders nothing is the fastest grid on the page">
                  A frame time says what the rendering cost, never whether there was anything to render — and a grid that renders nothing is
                  the fastest grid on the page. So a pass of its own flicks the rows past at {FLICK_VELOCITY.toLocaleString('en-US')} pixels
                  a second — the top of what a hard flick reaches, five rows between one frame and the next at 60 fps — and hit-tests four
                  points down the grid at the start of every frame, against the scroll position that frame is about to paint. The share of
                  frames that found a hole is printed beside the scroll, and a window that renders too few rows ahead of itself shows up
                  there and in no other number on this page.
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
                <Note icon={ScanEye} title="Two of the four render only the columns on screen">
                  Every grid here is left at its own defaults apart from the geometry — the same twenty columns at the same widths, 32px
                  rows, a 40px header — and AG Grid and MUI X virtualize columns by default where Box Kite and the TanStack baseline render
                  all twenty. On a page narrower than the table that is roughly a third of the cells, and it is a real advantage of theirs
                  rather than a thumb on the scale: what a default does is what a reader gets.
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
  const [picked, setPicked] = useState<readonly string[]>([DEFAULT_IMPL]);
  const [stage, setStage] = useState<StageState>({ mounted: false, filtered: false, grouped: false, generation: 0 });
  const [status, setStatus] = useState<string | undefined>();
  const [results, setResults] = useState<BenchRun[] | undefined>();
  const [dataset, setDataset] = useState<Dataset | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const running = status !== undefined;

  const run = useCallback(
    async (options: { rows: number; runs: number; impls?: readonly string[] }): Promise<BenchRun[]> => {
      // In the order asked for rather than the registry's: measuring the same four the other way
      // round is how a run says whether the machine drifted under it.
      const chosen = (options.impls ?? [DEFAULT_IMPL]).flatMap((id) => impls.filter((info) => info.id === id));

      setResults(undefined);
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

      const measured: BenchRun[] = [];

      for (const info of chosen) {
        setStatus(`Loading ${info.label}…`);
        // Fetched here rather than imported: a reader who measures one grid downloads one grid.
        const impl = await info.load();
        const driver = makeDriver(setStage, containerRef, impl);

        measured.push(
          await runBenchmark(driver, {
            rows: options.rows,
            columns: BENCH_COLUMN_COUNT,
            runs: options.runs,
            impl: impl.id,
            label: impl.label,
            version: impl.version,
            dataMs: rowData.ms,
            unavailable: info.unavailable,
            onProgress: (done, total, scenario) => setStatus(progressLabel(info.label, done, total, scenario)),
          }),
        );

        // Published as each grid finishes: a four-grid run takes minutes, and a reader watching one
        // should not have to wait for the last of them to see the first.
        setResults([...measured]);
      }

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
        <Button onClick={() => void run({ rows, runs, impls: picked })} disabled={running}>
          {running ? 'Running…' : 'Run the benchmark'}
        </Button>
      </Flex>

      <Box mt={5} props={{ role: 'group', 'aria-label': 'Grids' }}>
        <Box fontSize={13} fontWeight={600} mb={2} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
          Grids — each one is downloaded when you pick it, and measured one after another
        </Box>
        <Flex gap={6} flexWrap="wrap">
          {impls.map((info) => (
            <Checkbox
              key={info.id}
              label={info.label}
              checked={picked.includes(info.id)}
              // The last one ticked stays ticked: a run with nothing to measure is a button that
              // does nothing and says nothing about why.
              disabled={running || (picked.length === 1 && picked.includes(info.id))}
              onChange={(event) =>
                setPicked((current) =>
                  event.target.checked
                    ? impls.filter((one) => one.id === info.id || current.includes(one.id)).map((one) => one.id)
                    : current.filter((id) => id !== info.id),
                )
              }
            />
          ))}
        </Flex>
      </Box>

      <Box mt={4} minHeight={6} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
        <Box props={{ role: 'status' }}>{status ?? doneLabel(results)}</Box>
      </Box>

      {results && results.length > 0 && (
        <Box mt={5}>
          <Results runs={results} />
        </Box>
      )}

      {results && results.length > 0 && stage.impl && (
        <Box mt={6} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          {stage.impl.label}, still on the page with the rows the run measured — {rows.toLocaleString('en-US')} of them,{' '}
          {BENCH_COLUMN_COUNT} columns. Scroll it.
        </Box>
      )}

      <Box mt={4} ref={containerRef}>
        {stage.mounted && stage.impl && dataset && (
          <Stage
            key={`${stage.impl.id}-${stage.generation}`}
            Grid={stage.impl.Grid}
            data={dataset.data}
            filtered={stage.filtered}
            grouped={stage.grouped}
          />
        )}
      </Box>
    </Box>
  );
}

/**
 * The grid under test, behind a `memo` so the status line above it can update between scenarios without
 * re-rendering a hundred thousand rows into the next measurement.
 */
const Stage = memo(function Stage({ Grid, ...props }: BenchGridProps & { Grid: ComponentType<BenchGridProps> }) {
  return <Grid {...props} />;
});

/** Every grid that has finished: the comparison first where there is one, then each grid's own detail. */
function Results({ runs }: { runs: BenchRun[] }) {
  return (
    <Flex d="column" gap={7}>
      {runs.length > 1 && <ComparisonTable runs={runs} />}
      {runs.map((run) => (
        <ResultTable key={run.impl} run={run} />
      ))}
    </Flex>
  );
}

/** One row per operation, one column per grid — the table the comparison is actually about. */
function ComparisonTable({ runs }: { runs: BenchRun[] }) {
  return (
    <Box>
      <Box mb={3} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
        <Mono>{runs.map((run) => `${run.label} ${run.version}`).join(' · ')}</Mono> · {runs[0].rows.toLocaleString('en-US')} rows ×{' '}
        {runs[0].columns} columns · median of {runs[0].runs} · lower is better. The scroll is what one frame cost the grid, with the frames
        a second the display allowed beside it.
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <HeadCell>Operation</HeadCell>
            {runs.map((run) => (
              <HeadCell key={run.impl} textAlign="end">
                {run.label}
              </HeadCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {scenarios.map((scenario) => (
            <TableRow key={scenario.id}>
              <Cell theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>{scenario.label}</Cell>
              {runs.map((run) => (
                <Cell key={run.impl} textAlign="end" textWrap="nowrap">
                  {figure(
                    run.scenarios.find((result) => result.scenario === scenario.id),
                    scenario,
                  )}
                </Cell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/** What one cell of the comparison says: the number, or the reason there is not one. */
function figure(result: ScenarioResult | undefined, scenario: ScenarioInfo): string {
  if (!result) return '';
  if (result.unavailable) return result.unavailable;
  if (result.ms === undefined) return '';

  // The scroll compares on *work*, not on the interval: the interval is what the display allowed.
  return scenario.kind === 'frames' ? `${result.workMs} ms · ${result.fps} fps` : `${result.ms} ms`;
}

function doneLabel(runs: BenchRun[] | undefined): string {
  if (!runs || runs.length === 0) return '';
  const first = runs[0];
  const what = runs.length === 1 ? first.label : `${runs.length} grids`;

  return `Done — ${what}, ${first.runs === 1 ? 'one run' : `${first.runs} runs`} of ${first.rows.toLocaleString('en-US')} rows.`;
}

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
                  {ms(scenario.ms)}
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {ms(scenario.min)}
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {ms(scenario.max)}
                </Cell>
                <Cell textAlign="end" textWrap="nowrap">
                  {ms(scenario.blockingMs)}
                </Cell>
                <Cell>
                  {scenario.unavailable
                    ? `Not in this tier — ${scenario.unavailable}`
                    : scenario.fps !== undefined
                      ? `${scenario.workMs} ms of work a frame · ${scenario.fps} fps · worst frame ${scenario.worstFrame} ms · ${scenario.slowFrames}% under 60 fps · ${scenario.blankFrames ?? 0}% of a hard flick blank`
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
  /** The grid on the stage, which changes as a run moves from one library to the next. */
  impl?: GridImpl;
  mounted: boolean;
  filtered: boolean;
  grouped: boolean;
  /** Bumped on every reset: it is the grid's `key`, so each operation starts on a grid with no history. */
  generation: number;
}

interface BenchWindow extends Window {
  boxKiteBench?: { run: (options: { rows: number; runs: number; impls?: readonly string[] }) => Promise<BenchRun[]> };
}

/** A millisecond figure, or nothing at all where the grid was never driven through the scenario. */
function ms(value: number | undefined): string {
  return value === undefined ? '—' : `${value} ms`;
}

/**
 * Turns the stage's state into the four calls the runner makes. A reset remounts rather than resetting,
 * because a sort lives inside the grid where no prop of ours can reach it.
 */
function makeDriver(
  setStage: (update: (state: StageState) => StageState) => void,
  container: { current: HTMLDivElement | null },
  impl: GridImpl,
): BenchDriver {
  const fresh = (state: StageState): StageState => ({
    impl,
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
      else if (scenario === 'sort' && container.current) impl.sort(container.current);
    },
    scroller: () => (container.current ? impl.scroller(container.current) : null),
    rowSelector: impl.rowSelector,
  };
}

function progressLabel(label: string, done: number, total: number, scenario: ScenarioId): string {
  const info = scenarios.find((s) => s.id === scenario);

  return `${label} — ${done} of ${total}, ${info?.label ?? scenario}…`;
}

const sidebarLinks = [
  { id: 'run', label: 'Run it' },
  { id: 'results', label: 'What it measured' },
  { id: 'tiers', label: 'What each grid may do' },
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
