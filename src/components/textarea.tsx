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
  'value',
  'defaultValue',
  'rows',
  'cols',
  'autoFocus',
  'maxLength',
  'minLength',
  'readOnly',
] as const;
type TagPropsType = (typeof tagProps)[number];

type TextareaProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'textarea', TKey>, 'tag' | 'props' | 'placeholder'>;
type TextareaTagProps = OmitTagProps<BoxTagProps<'textarea'>, TagPropsType | 'type'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends TextareaProps<TKey> {
  /** What the field submits under, and what a `<label htmlFor>` of your own would point at. */
  name?: string;
  /** Attributes for the `<textarea>` itself — an `id`, an `aria-label`, `autoComplete`, `wrap`. */
  props?: TextareaTagProps;
  /** Fires on every keystroke. `onChange` is React's alias for the same event. */
  onInput?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Fires on every keystroke too — React's `onChange` is the DOM's `input`, not its `change`. */
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** A string is the attribute; an object is `::placeholder` styles. Neither one names the field. */
  placeholder?: PlaceholderProp;
  /** Controlled value. Pair it with `onChange`, or the field cannot be typed into. */
  value?: string;
  /** The value it starts with when the field owns its own state. */
  defaultValue?: string;
  /** How many lines tall it starts. `height` is the Box prop for the size it stays. */
  rows?: number;
  /** How many characters wide it starts — `width` is the prop to reach for instead. */
  cols?: number;
  /** Focus it on mount. One per page at most — a stolen focus is a lost place in the document. */
  autoFocus?: boolean;
  /** The most characters the field accepts. The browser both enforces and announces it. */
  maxLength?: number;
  /** The fewest characters that count as valid. Checked when the form is submitted. */
  minLength?: number;
  /** Editable to nobody, but still focusable, still read out and still submitted. */
  readOnly?: boolean;
  /** The form will not submit while it is empty, and a screen reader says so. */
  required?: boolean;
}

/**
 * A multi-line text field: a real `<textarea>`, styled by Box props. `rows` is how tall it starts,
 * `height` how tall it stays, and `fieldSizing="content"` lets it grow as it is typed into.
 *
 * @a11y Nothing here names the field. A `placeholder` is not a name — it disappears on the first
 * keystroke — so pair it with a `<label htmlFor>` of your own, or pass `props={{ 'aria-label': … }}`.
 * @a11y `maxLength` is announced as well as enforced, so a limit hit by a screen-reader user is not a
 * silent one.
 * @keyboard Tab — Focuses the field, and Tab again leaves it: Tab never inserts a tab character.
 * @keyboard Enter — Inserts a line break rather than submitting the form around it.
 */
function TextareaImpl<TKey extends keyof ComponentsAndVariants>(props: Props<TKey>, ref: Ref<HTMLTextAreaElement>) {
  const { placeholder, ...rest } = props;
  const { text, styles } = splitPlaceholder(placeholder);
  const newProps = ObjectUtils.buildProps(rest, tagProps, text === undefined ? undefined : { placeholder: text });

  return <Box ref={ref} tag="textarea" component={'textarea' as TKey} {...newProps} placeholder={styles} />;
}

const Textarea = forwardRef(TextareaImpl);
Textarea.displayName = 'Textarea';

export default Textarea as <TKey extends keyof ComponentsAndVariants = 'textarea'>(
  props: Props<TKey> & RefAttributes<HTMLTextAreaElement>,
) => React.ReactNode;
