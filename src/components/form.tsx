import { useCallback, useRef } from 'react';
import Box, { BoxProps } from '../box';
import { OmitTagProps } from '../react/boxProps';
import FormUtils from '../utils/form/formUtils';

type BoxTagProps = Required<BoxProps<'form'>>['props'];

type FormTagProps = OmitTagProps<BoxTagProps, 'onSubmit' | 'ref'>;

interface Props<T> extends Omit<BoxProps<'form'>, 'props' | 'tag'> {
  props?: FormTagProps;
  onSubmit: (obj: T, e: React.ChangeEvent<HTMLFormElement>) => void;
}

export default function Form<T>(props: Props<T>) {
  const { onSubmit, props: tagProps, ...boxProps } = props;
  const formRef = useRef(null);

  const formSubmitHandler = useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      e.preventDefault();

      const obj = FormUtils.getFormEntries(formRef.current!);

      onSubmit(obj as T, e);
    },
    [onSubmit],
  );

  // `ref` is not one of Box's tag props — Box owns that name — but the element takes one, and the form
  // needs its own node to read entries from. A caller's own `ref` still reaches Box through `props`.
  const newTagProps = { ...tagProps, onSubmit: formSubmitHandler, ref: formRef } as unknown as BoxTagProps;

  return <Box tag="form" {...boxProps} props={newTagProps} />;
}

(Form as React.FunctionComponent).displayName = 'Form';
