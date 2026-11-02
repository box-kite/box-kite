import { Ref, RefAttributes, useCallback, useRef } from 'react';
import { BoxProps, useBoxElement } from '../box';
import boxComponent from '../react/boxComponent';
import { OmitTagProps } from '../react/boxProps';
import { useInteractionReporter } from '../react/interactions/interactions';
import { assignRef } from '../utils/dom/domUtils';
import FormUtils from '../utils/form/formUtils';

type BoxTagProps = Required<BoxProps<'form'>>['props'];

type FormTagProps = OmitTagProps<BoxTagProps, 'onSubmit'>;

interface Props<T> extends Omit<BoxProps<'form'>, 'props' | 'tag'> {
  props?: FormTagProps;
  onSubmit: (obj: T, e: React.ChangeEvent<HTMLFormElement>) => void;
}

function FormImpl<T>(props: Props<T>, ref: Ref<HTMLFormElement>) {
  const { onSubmit, props: allTagProps, ...boxProps } = props;
  const formRef = useRef<HTMLFormElement | null>(null);
  const report = useInteractionReporter('form');
  // Typed out of `props` like every Box's, but a JavaScript caller can still put one there.
  const { ref: tagRef, ...tagProps } = (allTagProps ?? {}) as FormTagProps & { ref?: Ref<HTMLFormElement> };

  // One ref for the element: the form reads its own node, and a caller's `ref` (either spelling) gets it too, rather
  // than one replacing the other and every submit reading `null`.
  const setRefs = useCallback(
    (element: HTMLFormElement | null) => {
      formRef.current = element;
      assignRef(ref, element);
      assignRef(tagRef, element);
    },
    [ref, tagRef],
  );

  const formSubmitHandler = useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      e.preventDefault();

      const obj = FormUtils.getFormEntries(formRef.current ?? e.currentTarget);

      onSubmit(obj as T, e);
      // The names a form sent, never what was typed into them: a password must not reach an analytics call.
      report('submit', Object.keys(obj), { reason: 'submit', event: e });
    },
    [onSubmit, report],
  );

  return useBoxElement({ tag: 'form', ...boxProps, props: { ...tagProps, onSubmit: formSubmitHandler } } as BoxProps<'form'>, setRefs);
}

const Form = boxComponent(FormImpl, 'Form');

export default Form as <T>(props: Props<T> & RefAttributes<HTMLFormElement>) => React.ReactNode;
