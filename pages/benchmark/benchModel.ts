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
  { id: 'sort', label: 'Sort', what: 'Press the last-name header and sort every row by it.', kind: 'latency' },
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

/**
 * The flick the blank-space pass uses, which is not the one the scroll scenario times. Ten thousand
 * pixels a second is the top of what a hard flick reaches — three hundred rows of them, five rows
 * between one frame and the next at 60 fps. A speed rather than a step a frame, because the hole a
 * reader sees is the travel during the grid's own lag: a display running faster than 60 Hz hands the
 * grid more chances to catch up over the same pixels, and that is a real advantage rather than a
 * lenient instrument.
 */
export const FLICK_VELOCITY = 10000;
export const FLICK_MS = 1000;

/**
 * Where down the scroller each frame is hit-tested. The bottom half, because that is where a downward
 * fling's hole opens — and the half no grid's sticky header sits in, so a probe needs to know nothing
 * about the one it is looking at beyond what a row looks like.
 */
const PROBE_POINTS = [0.5, 0.7, 0.85, 0.98];

export interface ScenarioResult {
  scenario: ScenarioId;
  /**
   * Why this grid was not driven through the scenario — the tier cannot do it, so there is no number.
   * Every other field is absent when this one is present: a zero here would read as "instant".
   */
  unavailable?: string;
  /** The run the table prints: median latency, or median frame time for the scroll. */
  ms?: number;
  min?: number;
  max?: number;
  /** Frames per second over the scripted scroll. */
  fps?: number;
  /**
   * What one frame of the scroll cost the grid — from the frame callback to the task after the paint,
   * the same instrument the other four scenarios use. It is the figure to compare between grids: a
   * frame *interval* is quantized to the display, so a grid that misses one by a millisecond reports
   * the next whole interval and reads as twice as slow as it is.
   */
  workMs?: number;
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
  blockingMs?: number;
  /**
   * The percentage of frames of a hard flick that painted a hole — a point inside the body with no row
   * under it. Measured on its own pass at `FLICK_VELOCITY`, because it is a question about what the
   * grid renders around the viewport rather than about what a frame cost.
   */
  blankFrames?: number;
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
  /** What the blank-space probe hit-tests for: a CSS selector a painted body row, or a cell of one, matches. */
  rowSelector: string;
}

export interface BenchOptions {
  rows: number;
  columns: number;
  runs: number;
  impl: string;
  label: string;
  version: string;
  dataMs: number;
  /** Scenarios this grid's tier cannot run, and the reason that goes where the number would be. */
  unavailable?: Partial<Record<ScenarioId, string>>;
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

/** What a scripted fling produces: the gap between frames, and what the grid spent inside each one. */
export interface ScrollSamples {
  /** Frame to frame, which is what the reader feels — and what the display quantizes. */
  intervals: number[];
  /** Frame callback to the task after that frame's paint: the grid's own cost, unquantized. */
  work: number[];
}

/**
 * Flings `element` past at a fixed speed for `duration` milliseconds and reports what each frame cost.
 * The step is taken from the clock rather than being a fixed number of pixels, which is what a real fling
 * does: a frame that took 100 ms to render is 400 px further down the list, not 400 px behind it.
 */
export function scrollFrames(element: HTMLElement, velocity = SCROLL_VELOCITY, duration = SCROLL_MS): Promise<ScrollSamples> {
  return new Promise((resolve) => {
    const intervals: number[] = [];
    const work: number[] = [];
    let start = 0;
    let last = 0;
    let top = 0;

    const tick = (now: number): void => {
      if (last > 0) {
        intervals.push(now - last);
        top += (velocity * (now - last)) / 1000;
        if (top + element.clientHeight >= element.scrollHeight) top = 0;
        element.scrollTop = top;
        // The task posted from inside the frame runs after its paint, so this is render, layout and
        // paint for that one frame — the same instrument the four latency scenarios use.
        setTimeout(() => work.push(performance.now() - now), 0);
      } else {
        start = now;
      }

      last = now;

      if (now - start < duration) requestAnimationFrame(tick);
      // A timer behind the last frame's own, so every sample is in before the fling reports.
      else setTimeout(() => resolve({ intervals, work }), 0);
    };

    requestAnimationFrame(tick);
  });
}

/** What a blank-space pass counted: frames flicked past, and how many of them painted a hole. */
export interface CoverageSamples {
  frames: number;
  blank: number;
}

/**
 * Flicks the element past at `velocity` and counts the frames that painted a hole. The hit test is taken
 * inside the frame callback and after the scroll is written, which is the DOM that frame goes on to paint:
 * the re-render answering this scroll arrives on a task after it.
 */
export async function flickCoverage(element: HTMLElement, selector: string, velocity = FLICK_VELOCITY, duration = FLICK_MS) {
  element.scrollTop = 0;
  // Hit testing is in the window's own coordinates, so a grid below the fold would report every frame
  // blank. Bringing it into view is also what a reader does before flinging it.
  element.scrollIntoView({ block: 'center' });
  await nextPaint();

  const box = element.getBoundingClientRect();
  const x = box.left + Math.min(40, box.width / 2);
  // Clamped to the window as well as to the grid: a point below the fold is not a hole, it is a point
  // `elementFromPoint` cannot see.
  const bottom = Math.min(box.bottom, window.innerHeight) - 2;
  const points = PROBE_POINTS.map((point) => box.top + (bottom - box.top) * point);

  // Every element at the point rather than the top one: a grid's own furniture — AG Grid's horizontal
  // scrollbar strip, which covers the last fifteen pixels of its viewport — is over the rows rather than
  // instead of them, and a probe that read only the topmost element scored that as a hole on every frame.
  const covered = (): boolean => points.every((y) => document.elementsFromPoint(x, y).some((element) => element.closest(selector)));

  // Loudly, for the reason the missing scroller is: a probe that matches nothing reports a grid with no
  // holes in it as having none, which is the answer it would give for a grid that is all hole.
  if (!covered()) throw new Error('The blank-space probe found no rows under a grid standing still.');

  return new Promise<CoverageSamples>((resolve) => {
    let start = 0;
    let last = 0;
    let top = 0;
    let frames = 0;
    let blank = 0;
    let wrapped = false;

    const tick = (now: number): void => {
      // What this frame is about to paint: the scroll position it was given before it began, and
      // whatever rows have been committed since. The wrap back to the top is a teleport rather than a
      // fling and no window covers one, so the frame it lands on is not counted.
      if (last > 0 && !wrapped) {
        frames++;
        if (!covered()) blank++;
      }

      if (last > 0) {
        top += (velocity * (now - last)) / 1000;
        wrapped = top + element.clientHeight >= element.scrollHeight;
        if (wrapped) top = 0;

        // From a task rather than from here: a browser scrolls *before* the frame it paints, so a grid
        // that reads the scroll event — which is most of them — would be told a frame late by a probe
        // that wrote it from inside the frame, and score a hole this instrument dug for it.
        setTimeout(() => (element.scrollTop = top), 0);
      } else {
        start = now;
      }

      last = now;

      if (now - start < duration) requestAnimationFrame(tick);
      else resolve({ frames, blank });
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
  const { runs, unavailable, onProgress } = options;
  const samples = new Map<ScenarioId, number[]>(scenarios.map((s) => [s.id, []]));
  const scroll: ScrollSamples = { intervals: [], work: [] };
  const blocking = new Map<ScenarioId, number[]>(scenarios.map((s) => [s.id, []]));
  // A tier that cannot group is not driven through the grouping scenario: a grid measured doing
  // something else is a number that invites exactly the comparison it cannot support.
  const measured = scenarios.filter((scenario) => !unavailable?.[scenario.id]);

  await driver.reset();
  const frameBaseline = await measureFrameBaseline();
  await driver.unmount();

  const total = runs * measured.length;
  let done = 0;

  for (let run = 0; run < runs; run++) {
    for (const scenario of measured) {
      onProgress?.(done, total, scenario.id);

      if (scenario.id === 'mount') await driver.unmount();
      else await driver.reset();

      await idle(60);

      const [measured, blocked] = await withBlocking<number | ScrollSamples>(async () => {
        if (scenario.id !== 'scroll') return timeToPaint(() => driver.apply(scenario.id));

        const element = driver.scroller();
        // Loudly, because the alternative is a median of no samples: a zero-millisecond frame, which
        // reads as the fastest grid on the page rather than as a selector that stopped matching.
        if (!element) throw new Error(`${options.label}: the scroll scenario found nothing to scroll.`);

        return scrollFrames(element);
      });

      if (typeof measured === 'number') samples.get(scenario.id)!.push(measured);
      else {
        scroll.intervals.push(...measured.intervals);
        scroll.work.push(...measured.work);
      }

      blocking.get(scenario.id)!.push(blocked);
      done++;
    }
  }

  // Asked once, on a grid that is doing nothing else: blank space is a question about what the window
  // covers rather than about what a frame cost, so it is never measured inside a timed one.
  const coverage = measured.some((scenario) => scenario.id === 'scroll') ? await flick(driver) : undefined;

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
    scenarios: scenarios.map((scenario) =>
      unavailable?.[scenario.id]
        ? { scenario: scenario.id, unavailable: unavailable[scenario.id] }
        : result(scenario, samples, scroll, blocking, frameBaseline, coverage),
    ),
  };
}

/** The blank-space pass on a freshly mounted grid, which is the state every scenario starts from. */
async function flick(driver: BenchDriver): Promise<CoverageSamples> {
  await driver.reset();
  await idle(60);

  const element = driver.scroller();
  if (!element) throw new Error('The blank-space pass found nothing to scroll.');

  return flickCoverage(element, driver.rowSelector);
}

function result(
  scenario: ScenarioInfo,
  samples: Map<ScenarioId, number[]>,
  scroll: ScrollSamples,
  blocking: Map<ScenarioId, number[]>,
  frameBaseline: number,
  coverage: CoverageSamples | undefined,
): ScenarioResult {
  const blockingMs = Math.round(median(blocking.get(scenario.id)!));

  if (scenario.kind === 'frames') {
    const { intervals, work } = scroll;
    const budget = Math.max(frameBaseline, 1000 / 60);
    const slow = intervals.filter((interval) => interval > budget).length;

    return {
      scenario: scenario.id,
      ms: round(median(intervals)),
      min: round(Math.min(...intervals)),
      max: round(Math.max(...intervals)),
      fps: Math.round(1000 / Math.max(median(intervals), 0.001)),
      workMs: round(median(work)),
      worstFrame: round(percentile(intervals, 99)),
      slowFrames: Math.round((slow / Math.max(intervals.length, 1)) * 100),
      blankFrames: coverage ? Math.round((coverage.blank / Math.max(coverage.frames, 1)) * 100) : undefined,
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
