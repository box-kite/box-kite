import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import Box from '../../../box';
import DotsIcon from '../../../icons/dotsIcon';
import GroupingIcon from '../../../icons/groupingIcon';
import PinIcon from '../../../icons/pinIcon';
import SortIcon from '../../../icons/sortIcon';
import useDismiss from '../../../react/a11y/useDismiss';
import useFocusReturn from '../../../react/a11y/useFocusReturn';
import useRovingFocus from '../../../react/a11y/useRovingFocus';
import { useIsomorphicLayoutEffect } from '../../../react/effects';
import useIdentifier from '../../../react/identity/useIdentifier';
import { isBrowser } from '../../../utils/environment/environmentUtils';
import Button from '../../button';
import Flex from '../../flex';
import Overlay from '../../overlay';
import Presence from '../../presence';
import { Span } from '../../semantics';
import ColumnModel from '../models/columnModel';

interface MenuItem {
  key: string;
  /** Left of the label. A separator is drawn instead when the item opens a new section. */
  icon?: React.ReactNode;
  label: React.ReactNode;
  /** Plain text for the menu's typeahead — an icon and a `<Box>` are not searchable. */
  text: string;
  run: () => void;
  startsSection?: boolean;
}

interface Props<TRow> {
  column: ColumnModel<TRow>;
}

/**
 * Which screen side a pin lands on depends on the reading order, so both names are rendered and
 * `:dir()` picks one — no measurement and no state. The name that loses is `display: none`, which
 * takes it out of the item's accessible name as well as out of the picture.
 */
function PinLabel(props: { side: 'start' | 'end' }) {
  const ltr = props.side === 'start' ? 'Left' : 'Right';
  const rtl = props.side === 'start' ? 'Right' : 'Left';

  return (
    <>
      <Span rtl={{ display: 'none' }}>Pin {ltr}</Span>
      <Span ltr={{ display: 'none' }}>Pin {rtl}</Span>
    </>
  );
}

/**
 * The column's menu — APG's menu button, on top of `Overlay`. The items are data rather than JSX because
 * the pattern needs them as a list: `useRovingFocus` numbers them for the arrows and the typeahead, and
 * which exist changes with the column's state. Sections are a rendering detail on top of that list.
 */
export default function DataGridHeaderCellContextMenu<TRow>(props: Props<TRow>) {
  const { column } = props;
  const { grid, isEndAligned, header, key } = column;
  const hc = column.headerCell;
  const columnName = header ?? key;

  const identifier = useIdentifier('datagrid-column-menu');
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  // The menu has never been opened during a server render, so which side it would open to is a
  // question with no answer there — and `window` is not a thing that exists to ask (bug #85).
  const openLeft = useMemo(() => isBrowser() && tooltipPosition.left > window.innerWidth / 2, [tooltipPosition.left]);

  const positionStart = isEndAligned ? 2 : undefined;
  const positionEnd = isEndAligned ? undefined : column.pin === 'END' ? 2.5 : 4;

  const items = useMemo(() => {
    const iconSlot = (children: React.ReactNode) => (
      <Span component={`${grid.componentName}.header.cell.contextMenu.tooltip.item.icon` as never}>{children}</Span>
    );
    const sortIcon = (rotate?: 0 | 180) => iconSlot(<SortIcon width="100%" fill="currentColor" rotate={rotate} />);
    const pinIcon = (rotate: 0 | -90, rtlRotate: 0 | -90) =>
      iconSlot(<PinIcon width="100%" fill="currentColor" rotate={rotate} rtl={{ rotate: rtlRotate }} />);
    const groupIcon = iconSlot(<GroupingIcon width="100%" fill="currentColor" />);
    // Items with no icon keep the label aligned with the ones that have one.
    const noIcon = <Box width={4} />;

    const sections: (MenuItem | false)[][] = [
      [
        hc.canSortAsc && {
          key: 'sort-asc',
          icon: sortIcon(),
          label: 'Sort Ascending',
          text: 'Sort Ascending',
          run: () => column.sortColumn('ASC'),
        },
        hc.canSortDesc && {
          key: 'sort-desc',
          icon: sortIcon(180),
          label: 'Sort Descending',
          text: 'Sort Descending',
          run: () => column.sortColumn('DESC'),
        },
        hc.canClearSort && {
          key: 'sort-clear',
          icon: noIcon,
          label: 'Clear Sort',
          text: 'Clear Sort',
          run: () => column.sortColumn(undefined),
        },
      ],
      [
        hc.canPinStart && {
          key: 'pin-start',
          icon: pinIcon(0, -90),
          label: <PinLabel side="start" />,
          // The typeahead needs one string, and the physical name of the start is the left in the
          // reading order most of these grids are in.
          text: 'Pin Left',
          run: () => column.pinColumn('START'),
        },
        hc.canPinEnd && {
          key: 'pin-end',
          icon: pinIcon(-90, 0),
          label: <PinLabel side="end" />,
          text: 'Pin Right',
          run: () => column.pinColumn('END'),
        },
        hc.canUnpin && { key: 'unpin', icon: noIcon, label: 'Unpin', text: 'Unpin', run: () => column.pinColumn() },
      ],
      [
        hc.canGroupBy && {
          key: 'group',
          icon: groupIcon,
          label: <Box textWrap="nowrap">Group by {columnName}</Box>,
          text: `Group by ${columnName}`,
          run: column.toggleGrouping,
        },
        hc.canUnGroupAll && {
          key: 'ungroup',
          icon: groupIcon,
          label: <Box textWrap="nowrap">Un-Group All</Box>,
          text: 'Un-Group All',
          run: grid.unGroupAll,
        },
      ],
    ];

    return sections
      .map((section) => section.filter((item): item is MenuItem => item !== false))
      .filter((section) => section.length > 0)
      .flatMap((section, sectionIndex) => section.map((item, index) => ({ ...item, startsSection: sectionIndex > 0 && index === 0 })));
  }, [column, columnName, grid, hc]);

  const close = useCallback((restoreFocus = true) => {
    pendingFocus.current = false;
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const roving = useRovingFocus({
    count: items.length,
    // A menu wraps at its ends — the one place APG asks for looping where the grid pattern forbids
    // it. Typeahead is the menu's, and the trigger holds no keystrokes of its own.
    textOf: (index) => items[index]?.text ?? '',
    onSelect: (index) => {
      items[index]?.run();
      close();
    },
  });

  useDismiss({
    enabled: isOpen,
    // The trigger counts as inside: a press on an open menu's own button has to reach its toggle
    // rather than be read as a press outside and dismissed and reopened in one gesture.
    inside: [triggerRef, popupRef],
    onDismiss: () => close(),
  });

  useFocusReturn({ enabled: isOpen, returnTo: triggerRef });

  const setActiveIndex = roving.setActiveIndex;
  const activeItem = roving.activeItem;
  const open = useCallback(() => {
    // APG: opening a menu puts focus on its first item. Reset first — the menu that opens next may
    // be a different column's, and the list it holds may be a different length.
    setActiveIndex(0, { reason: 'programmatic' });
    pendingFocus.current = true;
    setOpen(true);
  }, [setActiveIndex]);

  useIsomorphicLayoutEffect(() => {
    if (!pendingFocus.current) return;

    // Not `[isOpen]`: `Overlay` measures where it sits before it renders anything into the portal,
    // so on the commit that opens the menu there is no item to focus yet. Waiting for one to
    // appear is what makes this run on every render instead.
    const item = activeItem();
    if (!item) return;

    pendingFocus.current = false;
    item.focus();
  });

  return (
    <Flex position="absolute" insetStart={positionStart} insetEnd={positionEnd} top="1/2" translateY={-3} ai="center">
      <Button
        ref={triggerRef}
        component={`${grid.componentName}.header.cell.contextMenu` as never}
        onClick={() => (isOpen ? close(false) : open())}
        variant={hc.contextMenuButtonVariant as never}
        type="button"
        props={{
          // Three dots name nothing. The column does, and there is one of these per column.
          'aria-label': `Column options for ${columnName}`,
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? identifier : undefined,
        }}
      >
        <Span component={`${grid.componentName}.header.cell.contextMenu.icon` as never}>
          <DotsIcon fill="currentColor" />
        </Span>
        <Presence present={isOpen}>
          {(presence) => (
            <Overlay
              component={`${grid.componentName}.header.cell.contextMenu.tooltip` as never}
              variant={{ closed: !presence.present } as never}
              onPositionChange={setTooltipPosition}
              ref={popupRef}
              contentRef={presence.ref}
              adjustTranslateX={openLeft ? '-100%' : '-21px'}
              adjustTranslateY="16px"
              id={identifier}
              props={{ role: 'menu', 'aria-label': `Column options for ${columnName}`, onKeyDown: roving.onKeyDown, ...presence.props }}
            >
              {items.map((item, index) => {
                const { ref, tabIndex, onFocus } = roving.itemProps(index);

                return (
                  <Fragment key={item.key}>
                    {item.startsSection && (
                      <Box
                        bb={1}
                        my={2}
                        borderColor="gray-300"
                        component={`${grid.componentName}.header.cell.contextMenu.tooltip.item.separator` as never}
                      />
                    )}
                    <Button
                      component={`${grid.componentName}.header.cell.contextMenu.tooltip.item` as never}
                      ref={ref}
                      type="button"
                      onClick={(event) => {
                        // The popup is portalled out of the DOM but not out of the React tree, so a
                        // click in it still reaches the trigger's own toggle on the way up.
                        event.stopPropagation();
                        item.run();
                        close();
                      }}
                      props={{ role: 'menuitem', tabIndex, onFocus }}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  </Fragment>
                );
              })}
            </Overlay>
          )}
        </Presence>
      </Button>
    </Flex>
  );
}

(DataGridHeaderCellContextMenu as React.FunctionComponent).displayName = 'DataGridHeaderCellContextMenu';
