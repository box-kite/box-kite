import type { BoxStyles } from '../../types';

/** Where one step of a sequence sits: the two keywords, or a percentage of the way through. */
export type KeyframeStop = 'from' | 'to' | `${number}%`;

/** One `@keyframes` sequence: its stops, each holding Box props rather than CSS. */
export type KeyframeStops = Partial<Record<KeyframeStop, BoxStyles>>;

/** What `Box.keyframes()` takes: sequences by name, the names `animationName` then refers to. */
export type Keyframes = Record<string, KeyframeStops>;

export interface KeyframesRegistry {
  /** Add sequences. A name already registered is replaced, and re-emitted if it was already used. */
  register(keyframes: Keyframes): void;
  /** Mark the names a rule just referenced, so the ones this registry knows reach the stylesheet. */
  use(names: readonly string[]): void;
  hasPending(): boolean;
  /** The sequences waiting to be written, as `[name, stops]`, and they are no longer waiting after. */
  drainPending(): [string, KeyframeStops][];
  /** Forget what has been emitted — the registrations themselves are configuration and survive. */
  reset(): void;
}

/**
 * The four Tailwind presets, as the sequences the `animation` prop names. Their steps are Box props like
 * everything else here — which is why `bounce` moves on the percentage scale.
 */
const presetKeyframes: Keyframes = {
  spin: { to: { rotate: 360 } },
  pulse: { '50%': { opacity: 0.5 } },
  bounce: {
    from: { translateY: '-1/4', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
    '50%': { translateY: 0, animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    to: { translateY: '-1/4', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
  },
  ping: { '75%': { scale: 2, opacity: 0 }, to: { scale: 2, opacity: 0 } },
};

/** A bar crossing its track and starting over: what a component draws when it has no figure to draw. */
const sweep: KeyframeStops = { from: { translateX: '-1/1' }, to: { translateX: '250%' } };

/** Two names for it, so neither component's CSS depends on the other's still being called that. */
const componentKeyframes: Keyframes = { 'rb-datagrid-loader': sweep, 'rb-progress-sweep': sweep };

const cssIdentifier = /^-?[_a-zA-Z][-_a-zA-Z0-9]*$/;

/**
 * The keyframes one engine knows. Registration is free and emission is lazy: nothing reaches the
 * stylesheet until a rule names it, which is what keeps four unused presets out of every page.
 */
export default function createKeyframesRegistry(): KeyframesRegistry {
  const registered = new Map<string, KeyframeStops>([...Object.entries(presetKeyframes), ...Object.entries(componentKeyframes)]);
  const pending = new Map<string, KeyframeStops>();
  const emitted = new Set<string>();

  return {
    register(keyframes) {
      for (const [name, stops] of Object.entries(keyframes)) {
        if (!cssIdentifier.test(name)) {
          console.warn(`[box-kite] Box.keyframes() skipped '${name}': a keyframes name has to be a CSS identifier.`);
          continue;
        }

        registered.set(name, stops);
        // A name redefined after something already used it has to be written again, or the page keeps
        // animating on the old sequence.
        if (emitted.delete(name)) pending.set(name, stops);
      }
    },

    use(names) {
      for (const name of names) {
        const stops = registered.get(name);
        // An unknown name is not an error: `@keyframes` may well live in a stylesheet this library never wrote.
        if (!stops || emitted.has(name)) continue;

        pending.set(name, stops);
      }
    },

    hasPending() {
      return pending.size > 0;
    },

    drainPending() {
      const drained = [...pending.entries()];
      pending.clear();
      drained.forEach(([name]) => emitted.add(name));

      return drained;
    },

    reset() {
      pending.clear();
      emitted.clear();
    },
  };
}
