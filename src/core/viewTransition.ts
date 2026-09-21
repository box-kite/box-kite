import { documentOrNull, matchMedia } from '../utils/environment/environmentUtils';

/**
 * Same-document view transitions: the browser takes a screenshot of the page, runs the update, takes
 * another, and cross-fades between them — so a change that was a jump becomes a transition with nothing
 * animated by hand. What moves is decided in CSS by `viewTransitionName`, which is a prop.
 *
 * This is the ~40 lines around `document.startViewTransition` that a caller would otherwise write every
 * time: the feature detection, the reduced-motion decision, and a handle with the same three promises
 * whether or not the browser has the API — so `await Box.viewTransition(update).finished` is one code
 * path rather than two.
 */

/** What `document.startViewTransition` returns, declared here so the entry compiles against any `lib.dom`. */
interface DomViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

type StartViewTransition = (update: ViewTransitionUpdate | { update: ViewTransitionUpdate; types?: string[] }) => DomViewTransition;

/** The DOM change to transition between. A promise is awaited before the second screenshot is taken. */
export type ViewTransitionUpdate = () => void | Promise<void>;

export interface ViewTransitionOptions {
  /**
   * What to do when the reader asked for reduced motion. `'skip'` (the default) runs the update with no
   * transition at all — a view transition is a whole-page cross-fade, which is exactly the motion the
   * preference is about. `'play'` transitions anyway, for a change that is unreadable without one.
   */
  reducedMotion?: 'skip' | 'play';
  /**
   * The transition's types, which CSS selects on with `:active-view-transition-type(name)` — how one
   * page has a different transition going forward than back. Ignored where the browser has no types.
   */
  types?: string[];
}

/**
 * A started transition, or the same shape with nothing to wait for. `finished` resolving is the only
 * promise worth branching on: `ready` rejects when the transition is skipped, which is not an error.
 */
export interface ViewTransitionHandle {
  /** Resolves once the pseudo-element tree is built and the animations are about to run. */
  ready: Promise<void>;
  /** Resolves once the transition has finished, or immediately when there was none. */
  finished: Promise<void>;
  /** Resolves once `update` has run and the new state is in the DOM. */
  updateCallbackDone: Promise<void>;
  /** Cut the animation short and jump to the end state. A no-op where there is no transition. */
  skip(): void;
  /** Whether the browser actually ran a transition — false when it has no API, or reduced motion skipped it. */
  transitioned: boolean;
}

function settled(update: ViewTransitionUpdate): ViewTransitionHandle {
  // The update still has to run: a browser without the API is a browser that shows the new state at once.
  const done = Promise.resolve(update()).then(() => undefined);

  return { ready: done, finished: done, updateCallbackDone: done, skip: () => {}, transitioned: false };
}

/** Whether the reader asked for less motion. Read per call rather than cached, so a change mid-session is seen. */
function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Run `update` inside a view transition where the browser has one, and plainly where it has not.
 *
 * ```js
 * Box.viewTransition(() => setTheme('dark'));
 * ```
 *
 * **In React the update has to be flushed**, because `startViewTransition` screenshots the page the
 * moment the callback returns and a `setState` has not rendered by then — the transition captures the
 * old state twice and nothing appears to move. Wrap it: `Box.viewTransition(() => flushSync(() => setTheme('dark')))`.
 * `<Box.Theme viewTransition>` does exactly that, which is why a theme switch needs none of this.
 */
export default function startViewTransition(update: ViewTransitionUpdate, options: ViewTransitionOptions = {}): ViewTransitionHandle {
  const { reducedMotion = 'skip', types } = options;

  const start = (documentOrNull() as { startViewTransition?: StartViewTransition } | null)?.startViewTransition;
  if (typeof start !== 'function') return settled(update);
  if (reducedMotion === 'skip' && prefersReducedMotion()) return settled(update);

  // The object form is what carries `types`, and the browsers that shipped the API before types treat
  // that object as the callback and throw — so a failed call is retried as the form they do have.
  let transition: DomViewTransition;
  try {
    transition = types?.length ? start.call(document, { update, types }) : start.call(document, update);
  } catch {
    transition = start.call(document, update);
  }

  return {
    ready: transition.ready,
    finished: transition.finished,
    updateCallbackDone: transition.updateCallbackDone,
    skip: () => transition.skipTransition(),
    transitioned: true,
  };
}
