import { useCallback, useRef } from 'react';
import Box from '../../../box';
import CloseIcon from '../../../icons/closeIcon';
import Button from '../../button';
import Dialog, { DialogTrigger } from '../../dialog';
import Flex from '../../flex';
import GridModel from '../models/gridModel';
import DataGridListLayout from './dataGridListLayout';

/** How far a sheet is pulled down before letting go closes it, in px. */
const DISMISS_DISTANCE = 80;

interface Props<TRow> {
  grid: GridModel<TRow>;
  open: boolean;
  /** The trigger was pressed. */
  onOpen?: () => void;
  onClose: () => void;
  title: React.ReactNode;
  /** The button that opens it, so focus goes back there when it closes. */
  trigger?: (trigger: DialogTrigger) => React.ReactNode;
  /** Controls in the header between the title and the close button — the record view's pager. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** The record view: as tall as a long row needs. */
  tall?: boolean;
  /** Handlers for the scrolling body — the record view's swipe. */
  bodyProps?: React.HTMLAttributes<HTMLDivElement>;
  bodyRef?: React.Ref<HTMLDivElement>;
  /** Keys anywhere in the sheet — the record view's pager. */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  children: React.ReactNode;
}

/**
 * A bottom sheet: a modal `<dialog>` docked to the bottom edge, which brings the top layer, the backdrop,
 * Escape, focus containment and focus return with it. The header is a handle — pulled down far enough, the
 * sheet closes, the way a sheet on a phone does.
 */
export default function DataGridListSheet<TRow>(props: Props<TRow>) {
  const { grid, open, onOpen, onClose, title, trigger, actions, footer, tall, bodyProps, bodyRef, onKeyDown, children } = props;
  const name = grid.componentName;
  const line = `${name}.list.sheet.line`;
  const drag = useRef<{ id: number; y: number; dy: number; dialog: HTMLDialogElement } | null>(null);

  // The pull writes `translate` straight onto the element: it moves every frame of a drag, and a class per
  // frame would be a rule per frame — the exception the slider's thumb takes, for the same reason.
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    const dialog = (event.currentTarget as HTMLElement).closest('dialog');
    if (event.button !== 0 || !dialog || (event.target as HTMLElement).closest('button')) return;

    drag.current = { id: event.pointerId, y: event.clientY, dy: 0, dialog };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;

    const { dialog } = state;
    state.dy = Math.max(0, event.clientY - state.y);
    dialog.style.transition = 'none';
    dialog.style.translate = `0 ${state.dy}px`;
  }, []);

  const onPointerUp = useCallback(() => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;

    const { dialog } = state;
    dialog.style.transition = '';
    dialog.style.translate = '';
    if (state.dy > DISMISS_DISTANCE) onClose();
  }, [onClose]);

  return (
    <Dialog
      component={`${name}.list.sheet` as never}
      display="flex"
      d="column"
      // The record view takes the height a long row needs, up to the screen's, so it reads in one sheet.
      css={tall ? { minHeight: 'min(32rem, calc(100dvh - 2rem))' } : undefined}
      open={open}
      onOpenChange={(next) => (next ? onOpen?.() : onClose())}
      trigger={trigger}
      props={{ onKeyDown }}
    >
      <Flex
        d="column"
        flexShrink={0}
        css={{ touchAction: 'none' }}
        props={{ onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }}
      >
        <Box
          width={9}
          height={1.25}
          mt={2}
          mx="auto"
          borderRadius={999}
          bgColor="gray-300"
          theme={{ dark: { bgColor: 'gray-600' } }}
          props={{ 'aria-hidden': true }}
        />
        <Flex component={`${line}` as never} ai="center" gap={2} ps={4} pe={2} py={2} bb={1}>
          <Dialog.Title flex1 minWidth={0} m={0} fontSize={17} fontWeight={600} lineHeight={24} {...DataGridListLayout.TRUNCATE}>
            {title}
          </Dialog.Title>
          {actions}
          <Button
            type="button"
            component={`${name}.list.sheet.button` as never}
            {...DataGridListLayout.ICON_BUTTON}
            onClick={onClose}
            props={{ 'aria-label': grid.localeText.close }}
          >
            <CloseIcon />
          </Button>
        </Flex>
      </Flex>
      <Box
        ref={bodyRef}
        flex1
        overflowY="auto"
        px={4}
        py={2}
        css={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
        props={bodyProps}
      >
        {children}
      </Box>
      {footer && (
        <Flex component={line as never} gap={3} flexShrink={0} px={4} pt={3} pb={4} bt={1}>
          {footer}
        </Flex>
      )}
    </Dialog>
  );
}

(DataGridListSheet as React.FunctionComponent).displayName = 'DataGridListSheet';
