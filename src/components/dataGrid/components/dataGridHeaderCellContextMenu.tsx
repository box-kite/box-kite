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
function PinLabel(props: { side: 'start' | 'end'; left: string; right: string }) {
  const { side, left, right } = props;

  return (
    <>
      <Span rtl={{ display: 'none' }}>{side === 'start' ? left : right}</Span>
      <Span ltr={{ display: 'none' }}>{side === 'start' ? right : left}</Span>
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
  const columnName = String(header ?? key);
  const text = grid.localeText;

  const identifier = useIdentifier('datagrid-column-menu');
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  // 12px from the edge whichever side it is on, which is what centres it in a column at its 48px minimum.
  const positionStart = isEndAligned ? 3 : undefined;
  const positionEnd = isEndAligned ? undefined : 3;

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
          label: text.sortAscending,
          text: text.sortAscending,
          run: () => column.sortColumn('ASC'),
        },
        hc.canSortDesc && {
          key: 'sort-desc',
          icon: sortIcon(180),
          label: text.sortDescending,
          text: text.sortDescending,
          run: () => column.sortColumn('DESC'),
        },
        hc.canClearSort && {
          key: 'sort-clear',
          icon: noIcon,
          label: text.clearSort,
          text: text.clearSort,
          run: () => column.sortColumn(undefined),
        },
      ],
      [
        hc.canPinStart && {
          key: 'pin-start',
          icon: pinIcon(0, -90),
          label: <PinLabel side="start" left={text.pinLeft} right={text.pinRight} />,
          // The typeahead needs one string, and the physical name of the start is the left in the
          // reading order most of these grids are in.
          text: text.pinLeft,
          run: () => column.pinColumn('START'),
        },
        hc.canPinEnd && {
          key: 'pin-end',
          icon: pinIcon(-90, 0),
          label: <PinLabel side="end" left={text.pinLeft} right={text.pinRight} />,
          text: text.pinRight,
          run: () => column.pinColumn('END'),
        },
        hc.canUnpin && { key: 'unpin', icon: noIcon, label: text.unpin, text: text.unpin, run: () => column.pinColumn() },
      ],
      [
        hc.canGroupBy && {
          key: 'group',
          icon: groupIcon,
          label: <Box textWrap="nowrap">{text.groupBy(columnName)}</Box>,
          text: text.groupBy(columnName),
          run: column.toggleGrouping,
        },
        hc.canUnGroupAll && {
          key: 'ungroup',
          icon: groupIcon,
          label: <Box textWrap="nowrap">{text.ungroupAll}</Box>,
          text: text.ungroupAll,
          run: grid.unGroupAll,
        },
      ],
    ];

    return sections
      .map((section) => section.filter((item): item is MenuItem => item !== false))
      .filter((section) => section.length > 0)
      .flatMap((section, sectionIndex) => section.map((item, index) => ({ ...item, startsSection: sectionIndex > 0 && index === 0 })));
  }, [column, columnName, grid, hc, text]);

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

    // Not `[isOpen]`: `Overlay` settles where it sits before it renders any of its content, so on the
    // commit that opens the menu there is no item to focus yet. Waiting for one to appear is what
    // makes this run on every render instead.
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
          tabIndex: -1,
          // Three dots name nothing. The column does, and there is one of these per column.
          'aria-label': text.columnOptions(columnName),
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? identifier : undefined,
        }}
      >
        <Span component={`${grid.componentName}.header.cell.contextMenu.icon` as never}>
          <DotsIcon fill="currentColor" />
        </Span>
      </Button>
      <Presence present={isOpen}>
        {(presence) => (
          <Overlay
            component={`${grid.componentName}.header.cell.contextMenu.tooltip` as never}
            variant={{ closed: !presence.present } as never}
            ref={popupRef}
            contentRef={presence.ref}
            anchor={triggerRef}
            // Below the button, hanging back across the column it belongs to — which screen side that
            // is depends on the reading order. It is the alignment that can run off the page here, not
            // the side, and the browser mirrors it near the inline start where the old heuristic guessed.
            side="bottom"
            align="end"
            matchWidth={false}
            id={identifier}
            props={{ role: 'menu', 'aria-label': text.columnOptions(columnName), onKeyDown: roving.onKeyDown, ...presence.props }}
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
                      // The menu is a sibling of its trigger rather than a child of it, so this no
                      // longer has a toggle to stop — it keeps a press on an item off the header cell
                      // the whole menu sits in.
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
    </Flex>
  );
}

(DataGridHeaderCellContextMenu as React.FunctionComponent).displayName = 'DataGridHeaderCellContextMenu';
