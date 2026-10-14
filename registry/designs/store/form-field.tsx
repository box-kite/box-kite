'use client';
import { Label, Span } from '@box-kite/react/components/semantics';
import { type ReactNode, useId } from 'react';

/** What a field's control is handed: its `id`, and the two attributes that tie an error to it. */
export interface FieldControl {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export interface FormFieldProps {
  label: string;
  /** Shown under the control and read with it; the control is marked invalid while there is one. */
  error?: string;
  hint?: string;
  children: (control: FieldControl) => ReactNode;
}

/**
 * A label, a control and what is wrong with it. The control is a render prop so the field can hand it the
 * ids — a message the screen reader is not pointed at is a message only the sighted get.
 */
export default function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId();
  const note = `${id}-note`;
  const described = error || hint ? note : undefined;

  return (
    <Span display="flex" d="column" gap={1.5} minWidth={0}>
      <Label props={{ htmlFor: id }} fontSize={14} fontWeight={500}>
        {label}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': described })}
      {(error || hint) && (
        <Span id={note} fontSize={13} color={error ? 'red-700' : 'stone-600'} theme={{ dark: { color: error ? 'red-400' : 'stone-400' } }}>
          {error ?? hint}
        </Span>
      )}
    </Span>
  );
}
