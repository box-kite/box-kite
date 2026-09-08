import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps, BoxTagProps } from '../box';
import { OmitTagProps } from '../react/boxProps';
import { ComponentsAndVariants } from '../types';
import ObjectUtils from '../utils/object/objectUtils';

const tagProps = ['type', 'onClick'] as const;
type TagPropsType = (typeof tagProps)[number];

type ButtonProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'button', TKey>, 'tag' | 'props'>;
type ButtonTagProps = OmitTagProps<BoxTagProps<'button'>, TagPropsType>;

type ButtonType = Required<React.ComponentProps<'button'>>['type'];

interface Props<TKey extends keyof ComponentsAndVariants> extends ButtonProps<TKey> {
  /** Attributes for the `<button>` itself — `disabled`, `aria-label`, `form`, `value`. */
  props?: ButtonTagProps;
  /** `button` unless you say otherwise. Inside a form a `<button>` with no type submits it. */
  type?: ButtonType;
  /** Fires on a click, and on Enter or Space, which the browser turns into one. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

/**
 * A real `<button>` with the `button` component style on it — the variants are `primary` (the default),
 * `secondary` and `ghost`, and every Box prop styles it on top of them.
 *
 * @a11y A native `<button>`, so the role, the tab stop, Enter and Space, and the disabled state are the
 * platform's. What names it is its own text; an icon-only button needs `props={{ 'aria-label': … }}`.
 * @a11y `disabled` in `props` removes it from the tab order, which also silences it — for a control
 * that has to stay reachable and explain itself, `aria-disabled` with a handler that does nothing.
 * @keyboard Tab — Focuses the button; Tab again leaves it.
 * @keyboard Enter / Space — Activates it. The browser fires a real click, so `onClick` is all a button
 * needs to be operable from the keyboard.
 */
function ButtonImpl<TKey extends keyof ComponentsAndVariants>(props: Props<TKey>, ref: Ref<HTMLButtonElement>) {
  const newProps = ObjectUtils.buildProps(props, tagProps);

  return <Box ref={ref} tag="button" component={'button' as TKey} {...newProps} />;
}

const Button = forwardRef(ButtonImpl);
Button.displayName = 'Button';

export default Button as <TKey extends keyof ComponentsAndVariants = 'button'>(
  props: Props<TKey> & RefAttributes<HTMLButtonElement>,
) => React.ReactNode;
