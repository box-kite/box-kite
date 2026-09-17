/**
 * What the benchmark measures and how. Framework-free on purpose: the page renders a grid and presses the
 * buttons, this decides what is timed, in what order and what the numbers mean — so the headless driver
 * that reruns it in CI measures the same thing as the reader who presses Run.
 */

/** The five things a grid is asked to do. */
export type ScenarioId = 'mount' | 'scroll' | 'filter' | 'sort' | 'group';

export interface ScenarioInfo {
  id: ScenarioId;
  label: string;
  /** One sentence on what the grid is asked to do, printed in the methodology table. */
  what: string;
  /** `latency` is one number in milliseconds; `frames` is a scripted scroll reported as frame times. */
  kind: 'latency' | 'frames';
}

export const scenarios: readonly ScenarioInfo[] = [
  {
    id: 'mount',
    label: 'First render',
    what: 'Mount the grid over rows that are already in memory, and paint the first screen of them.',
    kind: 'latency',
  },
  {
    id: 'scroll',
    label: 'Scroll',
    what: 'Fling the rows past at 4,000 pixels a second for two seconds, and report what each frame cost.',
    kind: 'frames',
  },
  {
    id: 'filter',
    label: 'Filter',
    what: 'Filter one text column down to about a twentieth of the rows.',
    kind: 'latency',
  },
  { id: 'sort', label: 'Sort', what: 'Press the salary header and sort every row by it.', kind: 'latency' },
  {
    id: 'group',
    label: 'Group + aggregate',
    what: 'Group by a twelve-value column and total two numeric columns under each group.',
    kind: 'latency',
  },
];

/**
 * How fast the scroll scenario flings the rows past, and for how long. Four thousand pixels a second is
 * a hard flick — a hundred and twenty-five rows of it — and the two seconds is wall-clock, so a grid that
 * stalls covers the same distance in fewer, longer frames rather than quietly scrolling less far.
 */
export const SCROLL_VELOCITY = 4000;
export const SCROLL_MS = 2000;
const CALIBRATION_FRAMES = 30;

export interface ScenarioResult {
  scenario: ScenarioId;
  /** The run the table prints: median latency, or median frame time for the scroll. */
  ms: number;
  min: number;
  max: number;
  /** Frames per second over the scripted scroll. */
  fps?: number;
  /** The slowest single frame of the scroll — the stutter a mean hides. */
  worstFrame?: number;
  /**
   * The percentage of frames that missed the budget: 60 fps, or this display's own interval where that
   * is slower. A frame inside 16.7 ms is smooth on any screen anybody has, and a headless browser drives
   * its animation loop far faster than one — so the idle interval alone would score every real display
   * as dropping nearly every frame.
   */
  slowFrames?: number;
  /** Total blocking time while the scenario ran: the part of every long task past 50 ms. */
  blockingMs: number;
}

export interface BenchRun {
  /** Which grid was measured. One run per implementation. */
  impl: string;
  label: string;
  version: string;
  rows: number;
  columns: number;
  runs: number;
  /** Milliseconds spent building the rows. Charged to nobody — every grid is handed the same array. */
  dataMs: number;
  /** This display's own frame interval, measured while nothing was happening. */
  frameBaseline: number;
  scenarios: ScenarioResult[];
}

/** A committed measurement: the runs, plus enough about the machine for the numbers to mean something. */
export interface BenchResults {
  measuredAt: string;
  machine: string;
  browser: string;
  note?: string;
  runs: BenchRun[];
}

/**
 * What the page has to be able to do for a grid to be measured. One implementation per library, so the
 * scenarios stay identical across them: every grid is driven through the same five state changes.
 */
export interface BenchDriver {
  /** Mount the grid with no filter, no sort and no grouping, and resolve once it is on screen. */
  reset: () => Promise<void>;
  /** Take the grid off the page, and resolve once it is gone. */
  unmount: () => Promise<void>;
  /** Make the change a scenario asks for. The paint that follows is what gets timed. */
  apply: (scenario: ScenarioId) => void;
  /** The element that scrolls, once the grid is mounted. */
  scroller: () => HTMLElement | null;
}

export interface BenchOptions {
  rows: number;
  columns: number;
  runs: number;
  impl: string;
  label: string;
  version: string;
  dataMs: number;
  onProgress?: (done: number, total: number, scenario: ScenarioId) => void;
}

/**
 * Resolves after the browser has painted whatever was just committed. The animation frame runs *before*
 * the paint and a task posted from inside it runs after, which is the cheapest instrument that includes
 * style, layout and paint rather than stopping at the DOM write.
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

/** A pause the browser can collect garbage in, so one scenario's leftovers are not the next one's score. */
export function idle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Milliseconds from the change to the paint that shows it. */
export async function timeToPaint(apply: () => void): Promise<number> {
  const start = performance.now();
  apply();
  await nextPaint();

  return performance.now() - start;
}

/** This display's frame interval, sampled while nothing is happening — 16.7 ms at 60 Hz, 8.3 at 120. */
export function measureFrameBaseline(frames = CALIBRATION_FRAMES): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let last = 0;

    const tick = (now: number): void => {
      if (last > 0) times.push(now - last);
      last = now;

      if (times.length < frames) requestAnimationFrame(tick);
      else resolve(median(times));
    };

    requestAnimationFrame(tick);
  });
}

/**
 * Flings `element` past at a fixed speed for `duration` milliseconds and reports how long each frame took.
 * The step is taken from the clock rather than being a fixed number of pixels, which is what a real fling
 * does: a frame that took 100 ms to render is 400 px further down the list, not 400 px behind it.
 */
export function scrollFrames(element: HTMLElement, velocity = SCROLL_VELOCITY, duration = SCROLL_MS): Promise<number[]> {
  return new Promise((resolve) => {
    const intervals: number[] = [];
    let start = 0;
    let last = 0;
    let top = 0;

    const tick = (now: number): void => {
      if (last > 0) {
        intervals.push(now - last);
        top += (velocity * (now - last)) / 1000;
        if (top + element.clientHeight >= element.scrollHeight) top = 0;
        element.scrollTop = top;
      } else {
        start = now;
      }

      last = now;

      if (now - start < duration) requestAnimationFrame(tick);
      else resolve(intervals);
    };

    requestAnimationFrame(tick);
  });
}

/**
 * Total blocking time while the callback runs: everything past 50 ms of each long task, which is the part
 * a click would have waited for. Zero where the browser has no long-task observer rather than absent, so
 * the column reads the same everywhere.
 */
export async function withBlocking<T>(run: () => Promise<T>): Promise<[T, number]> {
  let blocking = 0;
  let observer: PerformanceObserver | undefined;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) blocking += Math.max(0, entry.duration - 50);
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch {
    observer = undefined;
  }

  const value = await run();
  // The observer's queue is delivered on a task of its own, so the last long task is still in flight here.
  await idle(0);
  observer?.disconnect();

  return [value, Math.round(blocking)];
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** The value `p` of the way through the sorted samples — `percentile(x, 95)` is the p95. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));

  return sorted[index];
}

/** One millisecond figure, rounded the way the table prints it: a tenth under 100 ms, whole numbers above. */
export function round(ms: number): number {
  return ms < 100 ? Math.round(ms * 10) / 10 : Math.round(ms);
}

/**
 * Runs every scenario `runs` times against one grid and reports the median of each. Each scenario starts
 * from the same baseline — a freshly mounted, unsorted, unfiltered grid — so sorting is never measured over
 * a filtered table, and a run is never scored on what the run before it left behind.
 */
export async function runBenchmark(driver: BenchDriver, options: BenchOptions): Promise<BenchRun> {
  const { runs, onProgress } = options;
  const samples = new Map<ScenarioId, number[]>(scenarios.map((s) => [s.id, []]));
  const scrollSamples: number[] = [];
  const blocking = new Map<ScenarioId, number[]>(scenarios.map((s) => [s.id, []]));

  await driver.reset();
  const frameBaseline = await measureFrameBaseline();
  await driver.unmount();

  const total = runs * scenarios.length;
  let done = 0;

  for (let run = 0; run < runs; run++) {
    for (const scenario of scenarios) {
      onProgress?.(done, total, scenario.id);

      if (scenario.id === 'mount') await driver.unmount();
      else await driver.reset();

      await idle(60);

      const [measured, blocked] = await withBlocking(async () => {
        if (scenario.id !== 'scroll') return [await timeToPaint(() => driver.apply(scenario.id))];

        const element = driver.scroller();

        return element ? scrollFrames(element) : [];
      });

      if (scenario.id === 'scroll') scrollSamples.push(...measured);
      else samples.get(scenario.id)!.push(measured[0]);

      blocking.get(scenario.id)!.push(blocked);
      done++;
    }
  }

  // Left mounted rather than taken away: the grid that was just measured is the most convincing thing
  // on the page, and a reader who has waited for a run should be able to scroll it.
  await driver.reset();
  onProgress?.(total, total, 'mount');

  return {
    impl: options.impl,
    label: options.label,
    version: options.version,
    rows: options.rows,
    columns: options.columns,
    runs,
    dataMs: round(options.dataMs),
    frameBaseline: round(frameBaseline),
    scenarios: scenarios.map((scenario) => result(scenario, samples, scrollSamples, blocking, frameBaseline)),
  };
}

function result(
  scenario: ScenarioInfo,
  samples: Map<ScenarioId, number[]>,
  scrollSamples: number[],
  blocking: Map<ScenarioId, number[]>,
  frameBaseline: number,
): ScenarioResult {
  const blockingMs = Math.round(median(blocking.get(scenario.id)!));

  if (scenario.kind === 'frames') {
    const budget = Math.max(frameBaseline, 1000 / 60);
    const slow = scrollSamples.filter((interval) => interval > budget).length;

    return {
      scenario: scenario.id,
      ms: round(median(scrollSamples)),
      min: round(Math.min(...scrollSamples)),
      max: round(Math.max(...scrollSamples)),
      fps: Math.round(1000 / Math.max(median(scrollSamples), 0.001)),
      worstFrame: round(percentile(scrollSamples, 99)),
      slowFrames: Math.round((slow / Math.max(scrollSamples.length, 1)) * 100),
      blockingMs,
    };
  }

  const values = samples.get(scenario.id)!;

  return {
    scenario: scenario.id,
    ms: round(median(values)),
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
    blockingMs,
  };
}
