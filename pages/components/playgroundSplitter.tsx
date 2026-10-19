import { KeyboardEvent, PointerEvent, RefObject } from 'react';
import Box from '../../src/box';
import { DEFAULT_LAYOUT, SPLIT_MAX, SPLIT_MIN, SPLIT_STEP, splitAt } from '../site/playgroundLayout';

interface Props {
  split: number;
  onSplitChange: (split: number) => void;
  /** The workbench being divided, which the pointer's position is measured against. */
  container: RefObject<HTMLElement | null>;
  /** The pane whose size this sets — APG's window splitter names it. */
  controls: string;
}

/** APG's window splitter between the editor row and the panes below it: drag it, or focus it and use the arrows. */
export default function PlaygroundSplitter({ split, onSplitChange, container, controls }: Props) {
  function moveHandler(event: PointerEvent<HTMLDivElement>) {
    const rect = container.current?.getBoundingClientRect();
    if (!rect || !event.currentTarget.hasPointerCapture(event.pointerId)) return;

    onSplitChange(splitAt(event.clientY, rect.top, rect.height));
  }

  function keyHandler(event: KeyboardEvent<HTMLDivElement>) {
    const next = {
      ArrowUp: split - SPLIT_STEP,
      ArrowDown: split + SPLIT_STEP,
      Home: SPLIT_MIN,
      End: SPLIT_MAX,
      Enter: DEFAULT_LAYOUT.split,
    }[event.key];
    if (next === undefined) return;

    event.preventDefault();
    onSplitChange(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, next)));
  }

  return (
    <Box
      display="none"
      lg={{ display: 'flex' }}
      d="column"
      jc="center"
      flexShrink={0}
      height={2}
      my={-1}
      zIndex={1}
      cursor="row-resize"
      outlineStyle="none"
      transition="colors"
      color="transparent"
      hover={{ color: 'accent-400' }}
      focusVisible={{ color: 'accent-500' }}
      // A touch on the handle is a drag, not a scroll of the page under it.
      css={{ touchAction: 'none' }}
      props={{
        role: 'separator',
        tabIndex: 0,
        title: 'Drag to resize — double-click to reset',
        'aria-label': 'Resize the editor',
        'aria-orientation': 'horizontal',
        'aria-controls': controls,
        'aria-valuenow': split,
        'aria-valuemin': SPLIT_MIN,
        'aria-valuemax': SPLIT_MAX,
        onPointerDown: (event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
        },
        onPointerMove: moveHandler,
        onDoubleClick: () => onSplitChange(DEFAULT_LAYOUT.split),
        onKeyDown: keyHandler,
      }}
    >
      <Box height={0.5} width="fit" bgColor="currentColor" />
    </Box>
  );
}
