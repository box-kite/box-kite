import { ClassNameType } from '../../core';
import ComboboxUtils, { ComboboxRowDef } from '../../utils/combobox/comboboxUtils';
import Flex from '../flex';
import { Path, Svg } from '../svg';

export interface ComboboxChipsProps<TRow> {
  selection: TRow[];
  def: ComboboxRowDef<TRow>;
  /** Custom chip content. The label is still the accessible name of its remove button. */
  display?: (row: TRow) => React.ReactNode;
  /** The remove button's accessible name, given the row's label. */
  removeLabel: (label: string) => string;
  onRemove: (row: TRow, event: React.MouseEvent) => void;
  disabled?: boolean;
  variant: ClassNameType;
}

/**
 * The selection, in front of the field, one chip each. The remove buttons are deliberately **not** tab
 * stops: a control holding twenty selections would otherwise cost twenty presses to Tab past. Removal
 * from the keyboard is Backspace on an empty field and toggling the row in the listbox, so the function
 * is reachable without them — and each button still carries a name, so it can be found and pressed by
 * anyone reading the control rather than tabbing through it.
 */
export default function ComboboxChips<TRow>(props: ComboboxChipsProps<TRow>) {
  const { selection, def, display, removeLabel, onRemove, disabled, variant } = props;

  return (
    <>
      {selection.map((row) => {
        const label = ComboboxUtils.labelOf(def, row);

        return (
          <Flex key={ComboboxUtils.keyOf(def, row)} component="combobox.chip" variant={variant as never} ai="center" gap={1}>
            {display?.(row) ?? label}
            {!disabled && (
              <Flex
                tag="button"
                component="combobox.remove"
                variant={variant as never}
                ai="center"
                jc="center"
                props={{
                  type: 'button',
                  tabIndex: -1,
                  'aria-label': removeLabel(label),
                  // Keeps focus in the field: a press that moved it would send the next keystroke nowhere.
                  onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
                  onClick: (event: React.MouseEvent) => {
                    event.stopPropagation();
                    onRemove(row, event);
                  },
                }}
              >
                <Svg viewBox="0 0 24 24" width="0.625rem" props={{ fill: 'none' }}>
                  <Path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
                </Svg>
              </Flex>
            )}
          </Flex>
        );
      })}
    </>
  );
}
