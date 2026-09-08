import { forwardRef, Ref, RefAttributes } from 'react';
import { BoxProps, BoxTagProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import { OmitTagProps } from '../react/boxProps';
import { ComponentsAndVariants } from '../types';
import Checkbox from './checkbox';

type SwitchProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'input', TKey>, 'tag' | 'props' | 'indeterminate'>;

interface Props<TKey extends keyof ComponentsAndVariants> extends SwitchProps<TKey> {
  /** What the switch submits under. Needed for a form; a controlled switch can do without one. */
  name?: string;
  /** Attributes for the `<input>` itself. `type` is the component's, and `role` is already `switch`. */
  props?: OmitTagProps<BoxTagProps<'input'>, 'type'>;
  /** Fires on every keystroke or click. On a checkbox this is the same moment as `onChange`. */
  onInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Fires when the switch is toggled. `e.target.checked` is the new state. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** The value the form submits when it is on. Defaults to `"on"`, as HTML does. */
  value?: string | number;
  /** Focus it on mount. One per page at most — a stolen focus is a lost place in the document. */
  autoFocus?: boolean;
  /** Rendered and read, but not toggleable. Unlike `disabled` it stays in the tab order and submits. */
  readOnly?: boolean;
  /** The state it starts in when the switch is uncontrolled. Pass `checked` instead to control it. */
  defaultChecked?: boolean;
  /** The text beside the switch, rendered inside a label that wraps the input. */
  label?: React.ReactNode;
  /** Styles for the wrapping `<label>`: the row's layout, not the track's own appearance. */
  labelProps?: BoxProps<'label'>;
}

/**
 * The APG switch: an on/off control drawn as a track and a thumb.
 *
 * ```tsx
 * <Switch label="Email notifications" name="notify" defaultChecked />
 * ```
 *
 * Underneath is the `<input type="checkbox">` a `Checkbox` renders, with `role="switch"` over it: the role
 * is the whole difference to a screen reader ("on"/"off"), and the native input is what keeps focus,
 * Space, the disabled state and form submission working. A switch built from a `<div>` submits nothing.
 *
 * The platform supplies everything but Enter, which APG lists as optional and a checkbox ignores (inside
 * a form it submits instead). This toggles and stops the submission, which is what a user who pressed
 * Enter *on the switch* meant. There is no mixed state, so `indeterminate` is not accepted.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/switch/
 * @a11y A real `<input type="checkbox">` under `role="switch"`, so focus, the disabled state and form
 * submission are the platform's rather than this component's.
 * @a11y `aria-checked` is the input's own checked state — there is no second element to keep in step with
 * it, and no mixed state to get wrong.
 * @a11y `label` renders the `<label>` wrapping the input, which is what names it. The track and the thumb
 * are one element and its `::before`, so nothing decorative reaches the accessibility tree.
 * @keyboard Tab — Focuses the switch. It is one tab stop, like any other control.
 * @keyboard Space — Toggles it. The platform supplies this one.
 * @keyboard Enter — Toggles it too, and does not submit the surrounding form. APG lists Enter as
 * optional, and a bare checkbox ignores it.
 */
function SwitchImpl<TKey extends keyof ComponentsAndVariants>(props: Props<TKey>, ref: Ref<HTMLInputElement>) {
  const { props: tagProps, ...restProps } = props;
  const consumerKeyDown = useEventCallback(tagProps?.onKeyDown);

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    consumerKeyDown(event);
    if (event.key !== 'Enter' || event.defaultPrevented) return;

    event.preventDefault();
    event.currentTarget.click();
  });

  return (
    <Checkbox
      ref={ref}
      component={'switch' as TKey}
      {...(restProps as SwitchProps<TKey>)}
      props={{ ...tagProps, role: 'switch', onKeyDown: handleKeyDown }}
    />
  );
}

const Switch = forwardRef(SwitchImpl);
Switch.displayName = 'Switch';

export default Switch as <TKey extends keyof ComponentsAndVariants = 'switch'>(
  props: Props<TKey> & RefAttributes<HTMLInputElement>,
) => React.ReactNode;
