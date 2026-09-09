import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps, BoxTagProps } from '../box';
import { OmitTagProps } from '../react/boxProps';
import LabelledControl from '../react/forms/labelledControl';
import { ComponentsAndVariants } from '../types';
import ObjectUtils from '../utils/object/objectUtils';

const tagProps = ['name', 'onInput', 'onChange', 'value', 'autoFocus', 'readOnly', 'defaultChecked'] as const;
type TagPropsType = (typeof tagProps)[number];

type RadioButtonProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'input', TKey>, 'tag' | 'props'>;
type RadioButtonTagProps = OmitTagProps<BoxTagProps<'input'>, TagPropsType | 'type'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends RadioButtonProps<TKey> {
  /** The name the radios of one set share — it is what makes them one choice rather than several. */
  name?: string;
  /** Attributes for the `<input>` itself. `type` is the component's. */
  props?: RadioButtonTagProps;
  /** Fires on every click or keystroke. On a radio this is the same moment as `onChange`. */
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Fires when this radio becomes the chosen one. A radio never fires it on being cleared. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** What the set submits when this option is the chosen one. */
  value?: string | number;
  /** Focus it on mount. One per page at most — a stolen focus is a lost place in the document. */
  autoFocus?: boolean;
  /** Rendered and read, but not selectable. Unlike `disabled` it stays in the tab order and submits. */
  readOnly?: boolean;
  /** Makes this the chosen option to begin with, when the set is uncontrolled. */
  defaultChecked?: boolean;
  /** The text beside the radio, rendered inside a `<label>` that wraps the input. */
  label?: React.ReactNode;
  /** Styles for the wrapping `<label>`: the row's layout, not the radio's own appearance. */
  labelProps?: BoxProps<'label'>;
}

/**
 * One radio button — a real `<input type="radio">`, so the platform supplies the checked state, the
 * shared-`name` grouping and form submission. A radio alone is not a pattern (APG's radio group is a set
 * with one label and arrow keys — that is `RadioGroup`). It reads no context and calls no hook, which is
 * what lets a Server Component render it with no client boundary.
 *
 * @a11y A real `<input type="radio">`, so the checked state, the roving tab stop across a `name` and form
 * submission are the platform's rather than this component's.
 * @a11y `label` renders the `<label>` wrapping the input, which is what names this option. What names the
 * *set* is a `RadioGroup`, or a `<fieldset>` with a legend of your own.
 * @keyboard Tab — Enters the set once, landing on the chosen option — or on the first, when none is
 * chosen. Tab again leaves the set entirely.
 * @keyboard Down / Up, Right / Left — The next or previous radio of the same `name`, choosing it as focus
 * arrives, wrapping at both ends. The browser supplies this, so it works with no `RadioGroup`.
 * @keyboard Space — Chooses the focused radio.
 */
function RadioButtonImpl<TKey extends keyof ComponentsAndVariants>(props: Props<TKey>, ref: Ref<HTMLInputElement>) {
  const { label, labelProps, ...controlProps } = props;
  const newProps = ObjectUtils.buildProps(controlProps, tagProps, { type: 'radio' });

  return (
    <LabelledControl label={label} labelProps={labelProps}>
      <Box ref={ref} tag="input" component={'radioButton' as TKey} {...newProps} />
    </LabelledControl>
  );
}

const RadioButton = forwardRef(RadioButtonImpl);
RadioButton.displayName = 'RadioButton';

export default RadioButton as <TKey extends keyof ComponentsAndVariants = 'radioButton'>(
  props: Props<TKey> & RefAttributes<HTMLInputElement>,
) => React.ReactNode;
