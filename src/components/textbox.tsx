import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps, BoxTagProps } from '../box';
import { OmitTagProps } from '../react/boxProps';
import splitPlaceholder, { PlaceholderProp } from '../react/forms/placeholderProp';
import { ComponentsAndVariants } from '../types';
import ObjectUtils from '../utils/object/objectUtils';

const tagProps = [
  'name',
  'onInput',
  'onChange',
  'type',
  'step',
  'defaultValue',
  'autoFocus',
  'readOnly',
  'required',
  'value',
  'pattern',
] as const;
type TagPropsType = (typeof tagProps)[number];

type TextareaProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'input', TKey>, 'tag' | 'props' | 'placeholder'>;
type TextboxTagProps = OmitTagProps<BoxTagProps<'input'>, TagPropsType>;

type TextboxType =
  'date' | 'datetime-local' | 'email' | 'hidden' | 'month' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'time' | 'url' | 'week';

interface Props<TKey extends keyof ComponentsAndVariants> extends TextareaProps<TKey> {
  /** What the field submits under, and what a `<label htmlFor>` of your own would point at. */
  name?: string;
  /** Attributes for the `<input>` itself — an `id`, an `aria-label`, `inputMode`, `autoComplete`. */
  props?: TextboxTagProps;
  /** Fires on every keystroke. `onChange` is React's alias for the same event. */
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Fires on every keystroke too — React's `onChange` is the DOM's `input`, not its `change`. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Which text input this is. It decides the validation, the mobile keyboard and the spinner. */
  type?: TextboxType;
  /** A string is the attribute; an object is `::placeholder` styles. Neither one names the field. */
  placeholder?: PlaceholderProp;
  /** Controlled value. Pair it with `onChange`, or the field cannot be typed into. */
  value?: string | number;
  /** The value it starts with when the field owns its own state. */
  defaultValue?: string | number;
  /** A regular expression the value has to match for the form to be valid. */
  pattern?: string;
  /** Focus it on mount. One per page at most — a stolen focus is a lost place in the document. */
  autoFocus?: boolean;
  /** Editable to nobody, but still focusable, still read out and still submitted. */
  readOnly?: boolean;
  /** How far a `number` field's spinner and arrow keys move. */
  step?: number | string;
}

/**
 * A single-line text field: a real `<input>`, styled by Box props, whose `type` decides its validation,
 * its mobile keyboard and its spinner.
 *
 * @a11y Nothing here names the field. A `placeholder` is not a name — it disappears on the first
 * keystroke — so pair it with a `<label htmlFor>` of your own, or pass `props={{ 'aria-label': … }}`.
 * @a11y `required`, `pattern` and `type` are the platform's own validation, which is announced and
 * translated for free where a check of ours would be neither.
 * @keyboard Tab — Focuses the field, and Tab again leaves it. Nothing else is intercepted: the caret
 * keys, selection, undo and the clipboard stay the platform's.
 */
function TextboxImpl<TKey extends keyof ComponentsAndVariants>(props: Props<TKey>, ref: Ref<HTMLInputElement>) {
  const { placeholder, ...rest } = props;
  const { text, styles } = splitPlaceholder(placeholder);
  const newProps = ObjectUtils.buildProps(rest, tagProps, text === undefined ? undefined : { placeholder: text });

  return <Box ref={ref} tag="input" component={'textbox' as TKey} {...newProps} placeholder={styles} />;
}

const Textbox = forwardRef(TextboxImpl);
Textbox.displayName = 'Textbox';

export default Textbox as <TKey extends keyof ComponentsAndVariants = 'textbox'>(
  props: Props<TKey> & RefAttributes<HTMLInputElement>,
) => React.ReactNode;
