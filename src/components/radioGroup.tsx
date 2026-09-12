import { createContext, Ref, RefAttributes, useContext, useMemo, useRef } from 'react';
import { BoxProps, BoxTagProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import Flex from './flex';
import RadioButton from './radioButton';
import { Span } from './semantics';

/** Why the selection changed — `onValueChange` gets this alongside the event that did it. */
export type RadioGroupReason = 'click' | 'keyboard';

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  select(value: string, event: React.SyntheticEvent): void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

type RadioGroupBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'tag' | 'onChange' | 'children'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends RadioGroupBoxProps<TKey> {
  /** The group's name, rendered above it and used as the group's accessible name. */
  label?: React.ReactNode;
  /** The `name` every radio in the group submits under. Generated when left out. */
  name?: string;
  /** Controlled selection. Leave it out and the group owns it. */
  value?: string;
  /** The option chosen to begin with, when the group owns its value. */
  defaultValue?: string;
  /** Fires with the new value and why it changed — `'click'` or `'keyboard'`. A group can also hold
   * nothing, so the value is `string | undefined`. */
  onValueChange?: ChangeHandler<string | undefined, RadioGroupReason>;
  /**
   * The same callback under its old name. Both fire, so either one can be passed.
   * @deprecated `onValueChange` is what every other component reports a value change under, and a group
   * is not an `<input>` — this spelling still works and means the same thing.
   */
  onChange?: ChangeHandler<string | undefined, RadioGroupReason>;
  /** Which way the radios stack. Both arrow pairs navigate either way, as APG specifies. */
  orientation?: 'vertical' | 'horizontal';
  /** The options: `RadioGroup.Item` elements, or anything else the group should hold. */
  children?: React.ReactNode;
}

interface ItemProps extends Omit<BoxProps<'input', 'radioButton'>, 'tag' | 'props' | 'onChange' | 'checked'> {
  /** What this radio submits, and what the group reports when it is chosen. */
  value: string;
  /** Only for an item rendered outside a group — inside one, the group supplies the name. */
  name?: string;
  /** The text beside the radio, rendered inside a label that wraps the input. */
  label?: React.ReactNode;
  /** Styles for the wrapping `<label>`: the row's layout, not the radio's own appearance. */
  labelProps?: BoxProps<'label'>;
  /** Attributes for the `<input>` itself. `type`, `name` and `checked` are the group's. */
  props?: BoxTagProps<'input'>;
  /** The `<input>` element, for a caller that has to focus or measure this option. */
  ref?: Ref<HTMLInputElement>;
}

interface RadioGroupType {
  <TKey extends keyof ComponentsAndVariants = never>(props: Props<TKey>): React.ReactNode;
  Item: (props: ItemProps & RefAttributes<HTMLInputElement>) => React.ReactNode;
  displayName?: string;
}

/** The radios in a group, in the order the user meets them, skipping the ones they cannot reach. */
function radiosIn(group: HTMLElement | null): HTMLInputElement[] {
  const all = group?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [];

  return [...all].filter((radio) => !radio.disabled);
}

/** Which way an arrow key moves, or 0 for a key that is not one. */
function directionOf(key: string): number {
  if (key === 'ArrowDown' || key === 'ArrowRight') return 1;
  if (key === 'ArrowUp' || key === 'ArrowLeft') return -1;

  return 0;
}

/**
 * The APG radio group: one label over a set of radios, the arrow keys moving between them and choosing
 * as they go. Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *
 * ```tsx
 * <RadioGroup label="Plan" defaultValue="free" onValueChange={(plan) => setPlan(plan)}>
 *   <RadioGroup.Item value="free" label="Free" />
 * </RadioGroup>
 * ```
 *
 * The group owns `role="radiogroup"` named by its own label (radios with nothing over them are unrelated
 * controls to a screen reader), the shared `name`, the value and the arrow keys. It deliberately does
 * *not* own the tab order: a native radio set is already one tab stop with the platform's own roving
 * tabindex, which a `tabIndex` of ours would fight. The browser implements the arrows too, so the handler
 * calls `preventDefault` and activates with a real click, as the browser does. `RadioGroup.Item` is a
 * `RadioButton` wired to the group; a plain one nested inside keeps its own `name` and `checked`.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 * @a11y `role="radiogroup"`, named by its own `label` through `aria-labelledby` — radios with nothing
 * over them are unrelated controls to a screen reader.
 * @a11y `aria-orientation` follows `orientation`, and every item shares one generated `name`, so the
 * set submits as one field.
 * @a11y The tab order is deliberately the platform's: a native radio set is already one tab stop with a
 * roving tabindex, which a `tabIndex` of ours would fight.
 * @keyboard Tab — Enters the group once, landing on the chosen option — or on the first, when none is
 * chosen. Tab again leaves the group entirely.
 * @keyboard Down / Right — The next option, choosing it as focus arrives, wrapping to the first.
 * @keyboard Up / Left — The previous option, the same way, wrapping to the last.
 * @keyboard Space — Chooses the focused option. The platform supplies this one.
 */
function RadioGroupImpl<TKey extends keyof ComponentsAndVariants = never>(props: Props<TKey>) {
  const {
    label,
    name,
    value,
    defaultValue,
    onValueChange,
    onChange,
    orientation = 'vertical',
    children,
    props: tagProps,
    ...restProps
  } = props;

  const identifier = useIdentifier('radiogroup');
  const groupRef = useRef<HTMLDivElement>(null);
  // What the *next* change was caused by, read by an item's `onChange`. The group activates a
  // radio with a real click, so by the time the change arrives the keystroke behind it is gone.
  const source = useRef<RadioGroupReason>('click');

  // Both names reach the same handler, so a caller mid-migration can pass either and neither is dropped.
  const report: ChangeHandler<string | undefined, RadioGroupReason> = useEventCallback((next, details) => {
    onValueChange?.(next, details);
    onChange?.(next, details);
  });

  const [selected, setSelected] = useControllableState<string | undefined, RadioGroupReason>({
    value,
    defaultValue,
    onChange: report,
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    const direction = directionOf(event.key);
    if (direction === 0 || event.defaultPrevented) return;

    const radios = radiosIn(groupRef.current);
    const current = radios.indexOf(document.activeElement as HTMLInputElement);
    if (current === -1) return;

    // The browser moves focus between same-name radios itself. Letting both run moves it twice.
    event.preventDefault();

    const next = radios[(current + direction + radios.length) % radios.length];
    if (next === radios[current]) return;

    source.current = 'keyboard';
    next.focus();
    // A click, not an assignment to `checked`: it is what tells React, an uncontrolled radio and a
    // surrounding form all at once, and it is what the browser does for this keystroke natively.
    next.click();
    source.current = 'click';
  });

  const labelId = `${identifier}-label`;
  const hasLabel = label !== undefined && label !== null;

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name: name ?? identifier,
      value: selected,
      select: (itemValue, event) => setSelected(itemValue, { reason: source.current, event }),
    }),
    [identifier, name, selected, setSelected],
  );

  return (
    <RadioGroupContext.Provider value={context}>
      <Flex
        ref={groupRef}
        d={orientation === 'horizontal' ? 'row' : 'column'}
        gap={2}
        {...(restProps as BoxProps<'div'>)}
        props={{ role: 'radiogroup', 'aria-labelledby': hasLabel ? labelId : undefined, ...tagProps, onKeyDown: handleKeyDown }}
      >
        {hasLabel && <Span id={labelId}>{label}</Span>}
        {children}
      </Flex>
    </RadioGroupContext.Provider>
  );
}

/**
 * A radio that reads its group: the shared `name`, whether it is selected, and what to report when it is
 * chosen. Outside a `RadioGroup` it is a plain `RadioButton`.
 */
function RadioGroupItem(props: ItemProps) {
  const group = useContext(RadioGroupContext);
  const { value, ...restProps } = props;
  const handleChange = useEventCallback((event: React.ChangeEvent<HTMLInputElement>) => group?.select(value, event));

  if (!group) return <RadioButton value={value} {...restProps} />;

  return <RadioButton name={group.name} value={value} checked={group.value === value} onChange={handleChange} {...restProps} />;
}

RadioGroupItem.displayName = 'RadioGroup.Item';

const RadioGroup = RadioGroupImpl as RadioGroupType;
RadioGroup.Item = RadioGroupItem;
RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
