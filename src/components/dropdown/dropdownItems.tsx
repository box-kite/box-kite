import { FunctionComponent, Ref, useCallback, useState } from 'react';
import Box from '../../box';
import { BoxStyleProps } from '../../types';
import { AnchorSide } from '../../utils/anchor/anchorUtils';
import Overlay from '../overlay';
import { PresenceHandle } from '../presence';
import { DropdownRow, useDropdownContext } from './dropdownContext';
import DropdownRowRenderer from './dropdownRowRenderer';

interface Props<TVal> {
  /** Which way the popup is going, from the `<Presence>` that owns its mount. */
  presence: PresenceHandle;
  /** Every row the listbox shows, already in keyboard order. */
  rows: DropdownRow<TVal>[];
  emptyItem?: React.ReactElement;
  /** The shell the popup hangs off: a button in select-only mode, the field's wrapper otherwise. */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** The layer element — what the dismissal hook treats as *inside* the popup. */
  popupRef: Ref<HTMLDivElement>;
  /** `aria-controls` on the trigger names this. */
  listboxId: string;
  /** What names the listbox: the dropdown's own label when it has one, else its trigger. */
  labelledBy: string;
  itemsProps?: BoxStyleProps;
}

/** The popup the trigger controls: a `listbox` while it has options, a status message when it does not. */
function rolesFor(hasOptions: boolean, multiple: boolean, labelledBy: string): Record<string, unknown> {
  if (!hasOptions) {
    // A listbox owns options. With none left — a search that matched nothing — the popup holds one
    // message instead, and a message is announced rather than offered as something to choose.
    return { role: 'status' };
  }

  return {
    role: 'listbox',
    'aria-labelledby': labelledBy,
    // Only when it is true: `false` is the default, and saying it on every single-select listbox
    // is noise in the accessibility tree.
    ...(multiple ? { 'aria-multiselectable': true } : {}),
  };
}

export default function DropdownItems<TVal>(props: Props<TVal>) {
  const { presence, rows, emptyItem, triggerRef, popupRef, listboxId, labelledBy, itemsProps } = props;
  const { present, ref: contentRef, props: presenceProps } = presence;
  const { multiple, variant } = useDropdownContext<TVal>();

  // Which way it went, from the browser rather than from a guess about the viewport: the popup asks
  // for the space under the trigger and `position-try-fallbacks` moves it above when there is none.
  // It arrives too late for the entrance (see the component's `startingStyle`) and in good time for
  // the exit, which is what `closedUp` is.
  const [openUp, setOpenUp] = useState(false);
  const handleSideChange = useCallback((side: AnchorSide) => setOpenUp(side === 'top'), []);

  return (
    <Overlay ref={popupRef} anchor={triggerRef} side="bottom" align="start" offset={0.5} onSideChange={handleSideChange}>
      <Box
        ref={contentRef}
        component="dropdown.items"
        {...itemsProps}
        variant={[variant, { closed: !present && !openUp, closedUp: !present && openUp }] as never}
        id={listboxId}
        props={{ ...rolesFor(rows.length > 0, multiple, labelledBy), ...presenceProps }}
      >
        {rows.map((row, index) => (
          <DropdownRowRenderer<TVal> key={rowKey(row, index)} row={row} index={index} />
        ))}

        {rows.length === 0 && emptyItem && (
          <Box component="dropdown.emptyItem" variant={variant as never} {...(emptyItem as React.ReactElement<object>).props} />
        )}
      </Box>
    </Overlay>
  );
}

function rowKey<TVal>(row: DropdownRow<TVal>, index: number): React.Key {
  return row.kind === 'item' ? (row.element.props.value as React.Key) : `${row.kind}-${index}`;
}

(DropdownItems as FunctionComponent).displayName = 'DropdownItems';
