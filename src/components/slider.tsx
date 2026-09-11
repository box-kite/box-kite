import { FunctionComponent, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import { ComponentsAndVariants } from '../types';
import { isRtl } from '../utils/dom/domUtils';
import SliderUtils, { SliderOrientation, SliderScale } from '../utils/slider/sliderUtils';

export type { SliderOrientation };

/** What a slider takes and reports: one number, or one per thumb. The shape it is given is the shape it gives back. */
export type SliderValue = number | number[];

/** Why the value changed. A drag and the arrow keys want different things from a consumer — a live preview against a request. */
export type SliderReason = 'pointer' | 'keyboard';

/** Which thumb an event belongs to, read off the element rather than closed over, so one handler serves every thumb. */
const INDEX_ATTRIBUTE = 'data-index';

type SliderBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'onChange' | 'disabled'>;

export interface SliderProps<
  TKey extends keyof ComponentsAndVariants = 'slider',
  TValue extends SliderValue = number,
> extends SliderBoxProps<TKey> {
  /** Controlled value. A number is one thumb and an array is one per entry; leave it out and the widget owns it. */
  value?: TValue;
  /** What it starts at, and what decides how many thumbs there are. Default `min`. */
  defaultValue?: TValue;
  /** Fires on every step of a drag and every arrow key, in the shape the value was given in. */
  onValueChange?: ChangeHandler<TValue, SliderReason>;
  /** Fires once when the interaction ends — the place for a request the live value is too noisy for. */
  onValueCommit?: ChangeHandler<TValue, SliderReason>;
  /** The bottom of the range. Default `0`. */
  min?: number;
  /** The top of the range. Default `100`. */
  max?: number;
  /** The grid every value lands on. Default `1`; `0` is a continuous slider. */
  step?: number;
  /** What Page Up and Page Down move by. Default ten steps. */
  largeStep?: number;
  /** Which way the thumbs run. Default `horizontal`, whose arrows follow the reading order. */
  orientation?: SliderOrientation;
  /** Not adjustable, by pointer or by key. It is `aria-disabled`, so the thumb keeps its place in the tab order and stays readable. */
  disabled?: boolean;
  /** What the slider is called. On one thumb it names the thumb; on several it names the group around them. */
  label?: string;
  /** The same, naming an element that already says it. */
  labelledBy?: string;
  /** One name per thumb — "Minimum", "Maximum". A range wants them: `label` names the group, not the thumbs. */
  thumbLabels?: readonly string[];
  /** The value as it should be read out, when the number alone is not it: a currency, a date, a rating. */
  format?: (value: number) => string;
  /** What the value submits under. One hidden input per thumb, so a range posts two values of that name. */
  name?: string;
}

/** The scale, assembled once so the model is handed one object rather than three loose numbers. */
function scaleOf(min: number, max: number, step: number): SliderScale {
  return { min, max, step };
}

/** Where a thumb or the filled part of the track sits, as the inline style the reason below explains. */
function offset(percentage: string, vertical: boolean): React.CSSProperties {
  return vertical ? { insetBlockEnd: percentage } : { insetInlineStart: percentage };
}

/** The filled part: from the track's start to the only thumb, or between the outermost two. */
function fillStyle(values: readonly number[], scale: SliderScale, vertical: boolean): React.CSSProperties {
  const low = values.length > 1 ? Math.min(...values) : scale.min;
  const high = Math.max(...values);
  const start = SliderUtils.percent(low, scale.min, scale.max);
  const size = `${Math.round((SliderUtils.percent(high, scale.min, scale.max) - start) * 100) / 100}%`;

  return vertical
    ? { insetBlockEnd: `${Math.round(start * 100) / 100}%`, blockSize: size }
    : { insetInlineStart: `${Math.round(start * 100) / 100}%`, inlineSize: size };
}

/**
 * A value chosen by dragging a thumb along a track.
 * Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/slider/ and .../slider-multithumb/
 *
 * ```tsx
 * <Slider label="Volume" defaultValue={40} onValueChange={(value) => setVolume(value)} />
 * <Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} />
 * ```
 *
 * **A number in is a number out.** `defaultValue={40}` makes a one-thumb slider whose `onValueChange`
 * hands back a `number`; `defaultValue={[20, 80]}` makes a range whose handler takes a `number[]`. The
 * number of thumbs is the value's own shape, so there is no second prop saying which kind this is.
 *
 * **This is not `<input type="range">`, and that is the one place the platform loses.** A range input
 * cannot hold two thumbs, and its track and thumb are vendor pseudo-elements (`::-webkit-slider-thumb`)
 * that no typed prop can reach — so a styled one is a rewrite of the parts, at which point the native
 * element is only the keyboard. `name` still submits: a hidden input per thumb, so a form posts the
 * value whether or not JavaScript ran the drag.
 *
 * **The position is an inline style, deliberately.** Everything a slider paints is a shared class except
 * where its thumbs are — that is a per-frame value, and a class for it would be a rule per frame of a
 * drag, never freed. It is the exception `useAnchorPosition`'s anchor name and the travelling tab
 * indicator already take, and the reason a `ProgressRing` can round its fraction into a class where this
 * cannot: nobody drags a ring.
 *
 * **It mirrors for free.** The fill and the thumbs are placed with `inset-inline-start`, so a
 * right-to-left page draws the minimum on the right with no second stylesheet. The half that is not free
 * is the keyboard, which is why the sideways arrows swap and Up and Down never do.
 *
 * **A press travels; a nudge does not.** A press on the track is the one move the eye has to follow, so
 * the thumb animates the whole way. Every other move — a drag, an arrow key, a held arrow — is the
 * `tracking` variant instead: 60ms `ease-out` on both the thumb and the fill, which must both carry it
 * or they come apart (#144). Short rather than *off*, because off is exact and steps — a 1-in-100 slider
 * moves 3.2px at a time on a 320px track. **Eased out rather than linear or eased**: a repeat restarts
 * the transition every 33ms, so only its first half is ever seen, and on this curve that half is the
 * straight part — it glides while the key is held and still decelerates on the last transition, the one
 * allowed to finish. Measured against linear, which rode **1.4 steps** behind the value and stopped at
 * full speed, this rides 0.9 behind and lands at 0.6 of cruising (#146).
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/slider/
 * @a11y Each thumb is a `role="slider"` carrying `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and
 * `aria-orientation`; `format` writes `aria-valuetext` for a value a bare number does not read as.
 * @a11y A thumb has to be named, so `label` names the one on a single slider — and on a range it names
 * the `role="group"` around the thumbs, where `thumbLabels` names them one at a time.
 * @a11y `disabled` is `aria-disabled` rather than the attribute: a slider a reader cannot reach is a
 * value they cannot read, and a div takes no `disabled` anyway.
 * @keyboard Tab — Every thumb is its own tab stop, so a range is two of them.
 * @keyboard Right / Up — One step towards the maximum. In a right-to-left page Left is the increase, and
 * Up never changes: the block axis has no reading order.
 * @keyboard Left / Down — One step towards the minimum.
 * @keyboard PageUp / PageDown — `largeStep`, ten steps unless it says otherwise.
 * @keyboard Home / End — The minimum and the maximum themselves, on or off the step grid.
 */
function SliderImpl<TKey extends keyof ComponentsAndVariants = 'slider', TValue extends SliderValue = number>(
  props: SliderProps<TKey, TValue>,
) {
  const {
    value,
    defaultValue,
    onValueChange,
    onValueCommit,
    min = 0,
    max = 100,
    step = 1,
    largeStep = step * 10,
    orientation = 'horizontal',
    disabled = false,
    label,
    labelledBy,
    thumbLabels,
    format,
    name,
    props: tagProps,
    ...restProps
  } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // Which thumb the pointer took hold of, and whether a key is still down — neither is anything the
  // markup shows, so neither is state.
  const draggingRef = useRef<number | null>(null);
  const keyingRef = useRef(false);

  // Whether the value is *being* moved rather than having moved — the one interaction fact the markup
  // does show, because a thumb under a pointer must not animate and a thumb sent somewhere must.
  const [tracking, setTracking] = useState(false);

  const [current, setCurrent] = useControllableState<TValue, SliderReason>({
    value,
    defaultValue: defaultValue ?? (min as TValue),
    onChange: onValueChange,
  });

  const scale = scaleOf(min, max, step);
  const vertical = orientation === 'vertical';
  const values = SliderUtils.thumbs(current);
  const latest = useLatest(current);
  const commitHandler = useEventCallback(onValueCommit);

  /** One place a change goes through, so a move that changed nothing is not a render and not a callback. */
  const apply = useEventCallback((next: readonly number[], details: ChangeDetails<SliderReason>) => {
    setCurrent((held) => (SliderUtils.same(SliderUtils.thumbs(held), next) ? held : SliderUtils.shaped(held, next)), details);
  });

  /** The value under a pointer, measured against the track rather than the root: the root is the hit area, the track is the scale. */
  const valueUnder = (event: React.PointerEvent): number | undefined => {
    const track = trackRef.current;
    if (!track) return undefined;

    const fraction = SliderUtils.valueAt(track.getBoundingClientRect(), event.clientX, event.clientY, orientation, isRtl(track));

    return min + fraction * (max - min);
  };

  const thumbAt = (index: number): HTMLElement | undefined => {
    return rootRef.current?.querySelectorAll<HTMLElement>('[role="slider"]')[index];
  };

  const handlePointerDown = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || event.defaultPrevented) return;

    const target = valueUnder(event);
    if (target === undefined) return;

    const held = SliderUtils.thumbs(latest.current);
    const index = SliderUtils.nearest(held, target);
    draggingRef.current = index;
    // The browser moves focus as the *default action* of a press, after every handler — so a press on
    // the track took the focus straight back off the thumb below, measured in Chrome 152. Cancelling it
    // is also what stops a drag selecting the label beside the slider.
    event.preventDefault();
    // Capture on the root, so a pointer that leaves the widget mid-drag still reports to it.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    // The thumb takes focus the way a native control does, which is also what puts the keyboard on the
    // thumb the pointer just chose.
    thumbAt(index)?.focus();
    apply(SliderUtils.move(held, index, target, scale), { reason: 'pointer', event });
  });

  const handlePointerMove = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const index = draggingRef.current;
    if (index === null) return;

    const target = valueUnder(event);
    if (target === undefined) return;

    // Here rather than on the press: a press is a jump to somewhere and travels, and it is the first
    // move that means the thumb has to be under the pointer instead.
    setTracking(true);
    apply(SliderUtils.move(SliderUtils.thumbs(latest.current), index, target, scale), { reason: 'pointer', event });
  });

  const handlePointerUp = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current === null) return;

    draggingRef.current = null;
    setTracking(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    commitHandler(latest.current, { reason: 'pointer', event });
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.defaultPrevented) return;

    const thumb = (event.target as HTMLElement | null)?.closest<HTMLElement>('[role="slider"]');
    const index = Number(thumb?.getAttribute(INDEX_ATTRIBUTE) ?? -1);
    if (!thumb || index < 0) return;

    const move = SliderUtils.moveFor(event.key, isRtl(thumb));
    if (!move) return;

    // Arrows scroll whatever the slider is in, and Home and End scroll the page.
    event.preventDefault();
    keyingRef.current = true;
    // An arrow is a nudge, not a jump, so it never takes the press travel: 250ms spent on 3.2px read
    // as lag, and a held arrow began with it (#146).
    setTracking(true);

    const held = SliderUtils.thumbs(latest.current);
    apply(SliderUtils.move(held, index, SliderUtils.moved(held[index], move, scale, largeStep), scale), { reason: 'keyboard', event });
  });

  // Once at the end of a burst rather than once per repeat: a key held down is one adjustment.
  const handleKeyUp = useEventCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!keyingRef.current) return;

    keyingRef.current = false;
    setTracking(false);
    commitHandler(latest.current, { reason: 'keyboard', event });
  });

  const range = values.length > 1;

  return (
    <Box
      ref={rootRef}
      component={'slider' as TKey}
      {...(restProps as SliderBoxProps<TKey>)}
      variant={[restProps.variant, { vertical, disabled }] as never}
      props={{
        // A group only where there is something to group: one thumb is named by itself.
        role: range ? 'group' : undefined,
        'aria-label': range ? label : undefined,
        'aria-labelledby': range ? labelledBy : undefined,
        ...tagProps,
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
      }}
    >
      <Box ref={trackRef} component="slider.track" variant={{ vertical }}>
        <Box component="slider.fill" variant={{ vertical, tracking }} style={fillStyle(values, scale, vertical)} />
      </Box>
      {values.map((thumb, index) => (
        <Box
          key={index}
          component="slider.thumb"
          variant={{ vertical, disabled, tracking }}
          style={offset(SliderUtils.percentage(thumb, min, max), vertical)}
          props={{
            role: 'slider',
            tabIndex: disabled ? -1 : 0,
            'aria-valuemin': min,
            'aria-valuemax': max,
            'aria-valuenow': thumb,
            'aria-valuetext': format?.(thumb),
            'aria-orientation': orientation,
            'aria-label': thumbLabels?.[index] ?? (range ? undefined : label),
            'aria-labelledby': thumbLabels?.[index] ? undefined : range ? undefined : labelledBy,
            'aria-disabled': disabled || undefined,
            [INDEX_ATTRIBUTE]: index,
          }}
        />
      ))}
      {/* A bare input on purpose: it is never painted, so a class on it would be CSS nothing can see. */}
      {name !== undefined && values.map((thumb, index) => <input key={index} type="hidden" name={name} value={thumb} readOnly />)}
    </Box>
  );
}

const Slider = SliderImpl;
(Slider as FunctionComponent).displayName = 'Slider';

export default Slider;
