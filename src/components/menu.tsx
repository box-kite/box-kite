import { createContext, FunctionComponent, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import useAnchorPosition from '../react/anchor/useAnchorPosition';
import { useIsomorphicLayoutEffect } from '../react/effects';
import useIdentifier from '../react/identity/useIdentifier';
import usePopoverLayer, {
  PopoverLayer,
  PopoverReason,
  PopoverTrigger as LayerTrigger,
  PopoverTriggerAttributes as LayerTriggerAttributes,
} from '../react/popover/usePopoverLayer';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import { isEventInside, isRtl } from '../utils/dom/domUtils';
import TypeaheadUtils from '../utils/keyboard/typeaheadUtils';
import MenuUtils from '../utils/menu/menuUtils';
import Overlay from './overlay';

/**
 * Why the menu opened or closed. The four a layer always reports, plus the two only a menu has: `select`
 * is an item being chosen — the transition a consumer most often wants to tell apart — and `tab` is focus
 * leaving the menu, which APG asks should close it.
 */
export type MenuReason = PopoverReason | 'select' | 'tab';

/** The DOM attributes the trigger has to carry, `onKeyDown` included: the arrow keys open a menu too. */
export interface MenuTriggerAttributes extends LayerTriggerAttributes<'menu'> {
  onKeyDown(event: React.KeyboardEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper. The `ref` is what the
 * menu is anchored to, so it is not optional decoration.
 *
 * ```tsx
 * {(trigger) => <Button {...trigger}>Actions</Button>}          // a Box component
 * {(trigger) => <button ref={trigger.ref} {...trigger.props}>}  // a plain element
 * ```
 *
 * It must be a **button**: `popovertarget` is what the browser toggles on, and it only reads it off one.
 */
export interface MenuTrigger extends Omit<LayerTrigger<'menu'>, 'props'> {
  props: MenuTriggerAttributes;
}

// `open` and `flip` shadow a pseudo-class key and a CSS prop of the same name — the precedent `Tooltip`
// and `Popover` set. The component owns both states, and `:popover-open` is what styles this one.
type MenuBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'open' | 'flip'>;

/** What every layer in a menu is placed with — the menu itself and each of its submenus. */
interface PlacementProps {
  /**
   * Which side of the trigger the menu sits on — `top`/`bottom` are the block axis, `start`/`end` the
   * inline one, so a menu beside its trigger mirrors in a right-to-left page.
   */
  side?: AnchorSide;
  /** Which of the trigger's edges to line the menu up with along the other axis. */
  align?: AnchorAlign;
  /** The gap between trigger and menu, on the ÷4 spacing scale. */
  offset?: number;
  /** Whether a side with no room may be swapped for its opposite. Default `true`. */
  flip?: boolean;
}

export interface MenuProps<TKey extends keyof ComponentsAndVariants = 'menu'> extends MenuBoxProps<TKey> {
  /** The trigger, handed the ref and props that wire it to the menu. It has to be a button. */
  trigger: (trigger: MenuTrigger) => React.ReactNode;
  /** The items: `Menu.Item`, `Menu.CheckboxItem`, `Menu.RadioGroup`, `Menu.Group`, `Menu.Separator`, `Menu.Sub`. */
  children?: React.ReactNode;
  /** Controlled open state. Leave it out and the menu owns it. */
  open?: boolean;
  /** Whether it starts open, when the menu owns its own state. */
  defaultOpen?: boolean;
  /**
   * Fires with the new state and why it changed — `'select'`, `'trigger'`, `'escape'`, `'outside-pointer'`,
   * `'tab'` or `'imperative'`. A close cannot be refused: the browser has already done it by then.
   */
  onOpenChange?: ChangeHandler<boolean, MenuReason>;
  /** The menu's accessible name. Left out, it takes its trigger's, which is what APG asks for. */
  label?: string;
  /** Names the menu after an element already on the page, instead of `label`. */
  labelledBy?: string;
  /**
   * Which side of the trigger the menu sits on — `top`/`bottom` are the block axis, `start`/`end` the
   * inline one, so a menu beside its trigger mirrors in a right-to-left page. Default `'bottom'`.
   */
  side?: AnchorSide;
  /** Which of the trigger's edges to line the menu up with along the other axis. Default `'start'`. */
  align?: AnchorAlign;
  /** The gap between trigger and menu, on the ÷4 spacing scale. Default 1 — 4px. */
  offset?: number;
  /** Whether a side with no room may be swapped for its opposite. Default `true`. */
  flip?: boolean;
  /** Whether the menu is at least as wide as its trigger. Default `false` — a menu sizes to its content. */
  matchWidth?: boolean;
}

/** Every Box prop, on the `<button>` that is one item. */
export interface MenuItemProps<TKey extends keyof ComponentsAndVariants = 'menu.item'> extends Omit<
  BoxProps<'button', TKey>,
  'disabled' | 'children'
> {
  /** The item's content. */
  children?: React.ReactNode;
  /** The item was chosen — by a press, or by Enter or Space, which the browser turns into one. */
  onSelect?(event: React.MouseEvent): void;
  /**
   * Focusable, announced, and not activatable. `aria-disabled` rather than the `disabled` attribute,
   * because APG asks that a disabled item stay reachable: a keyboard user has to be able to find out it
   * is there at all.
   */
  disabled?: boolean;
  /** Whether choosing it closes the whole menu. Default `true`. */
  closeOnSelect?: boolean;
}

/** Every Box prop, on the `<button>` that is one checkbox item. */
export interface MenuCheckboxItemProps<TKey extends keyof ComponentsAndVariants = 'menu.item'> extends Omit<
  MenuItemProps<TKey>,
  'onSelect' | 'checked'
> {
  /** Controlled checked state. Leave it out and the item owns it. */
  checked?: boolean;
  /** Whether it starts checked, when the item owns its own state. */
  defaultChecked?: boolean;
  /** Fires with the new state, and the press behind it. */
  onCheckedChange?: ChangeHandler<boolean, 'select'>;
  /** Whether toggling it closes the menu. Default `false`, so several boxes can be ticked in one visit. */
  closeOnSelect?: boolean;
}

/** Every Box prop, on the `role="group"` holding a set of radio items. */
export interface MenuRadioGroupProps<TKey extends keyof ComponentsAndVariants = 'menu.group'> extends Omit<
  BoxProps<'div', TKey>,
  'children'
> {
  /** The radio items. */
  children?: React.ReactNode;
  /** The group's heading. It names the group, so a screen reader reads the items as a set. */
  label?: React.ReactNode;
  /** Controlled value — the `value` of whichever item is checked. */
  value?: string;
  /** The value checked to start with, when the group owns its own state. */
  defaultValue?: string;
  /** Fires with the value chosen, and the press behind it. */
  onValueChange?: ChangeHandler<string, 'select'>;
}

/** Every Box prop, on the `<button>` that is one radio item. */
export interface MenuRadioItemProps<TKey extends keyof ComponentsAndVariants = 'menu.item'> extends Omit<
  MenuItemProps<TKey>,
  'onSelect' | 'checked'
> {
  /** What this item stands for, compared against the group's `value`. */
  value: string;
  /** Whether choosing it closes the menu. Default `false`, the way a checkbox item behaves. */
  closeOnSelect?: boolean;
}

/** Every Box prop, on the `role="group"` around a titled section of the menu. */
export interface MenuGroupProps<TKey extends keyof ComponentsAndVariants = 'menu.group'> extends Omit<BoxProps<'div', TKey>, 'children'> {
  /** The items in the section. */
  children?: React.ReactNode;
  /**
   * The section's heading. It names the group rather than standing alone: a heading nothing is labelled by
   * is read as a stray line of text, which is why there is no separate label part.
   */
  label?: React.ReactNode;
}

/** Every Box prop, on the `role="separator"` between two sections. */
export type MenuSeparatorProps<TKey extends keyof ComponentsAndVariants = 'menu.separator'> = BoxProps<'div', TKey>;

export interface MenuSubProps<TKey extends keyof ComponentsAndVariants = 'menu'> extends MenuBoxProps<TKey> {
  /** The item's own content — what the submenu is called. */
  label: React.ReactNode;
  /** The submenu's items. */
  children?: React.ReactNode;
  /** Focusable, announced, and it opens nothing. `aria-disabled`, for the reason `Menu.Item` gives. */
  disabled?: boolean;
  /** Which side of its item the submenu sits on. Default `'end'` — beside it, on the side the text runs towards. */
  side?: AnchorSide;
  /** Which of the item's edges to line the submenu up with. Default `'start'`. */
  align?: AnchorAlign;
  /** The gap between item and submenu, on the ÷4 spacing scale. Default 0 — a submenu abuts its menu. */
  offset?: number;
  /** Whether a side with no room may be swapped for its opposite. Default `true`. */
  flip?: boolean;
  /** Attributes for the item that opens it — the submenu's own go in `props`. */
  itemProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

interface MenuContextValue {
  /**
   * Whether the panel this item sits in is open. A submenu cannot outlive the menu it hangs off, and the
   * platform hides a nested layer with its ancestor without telling React anything about it.
   */
  open: boolean;
  /** Close the whole menu, from any depth: an item was chosen, or Tab left it. */
  closeAll(details: ChangeDetails<MenuReason>): void;
  /**
   * A submenu says where its panel is, so that on the portal path a press inside it counts as a press
   * inside every menu it hangs off. On the platform path the popover nesting rules answer that already;
   * a portal moves the panel out of the DOM, where nothing does. Returns its own cleanup.
   */
  registerLayer(panel: HTMLElement): () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(name: string): MenuContextValue {
  const context = useContext(MenuContext);

  if (!context) throw new Error(`<${name}> must be rendered inside a <Menu>.`);

  return context;
}

/**
 * Where a menu's open submenus are, for the portal path's dismissal: a nested layer is portalled out of
 * the DOM it was declared in, so a press inside it has to be *named* as inside rather than found by
 * containment. `forward` passes the registration on up, so the outermost menu hears about a submenu three
 * levels down. Nothing on the platform path reads it — the popover nesting rules answer the same question.
 */
function useNestedLayers(forward?: (panel: HTMLElement) => () => void) {
  const [panels, setPanels] = useState<readonly HTMLElement[]>([]);

  const registerLayer = useCallback(
    (panel: HTMLElement) => {
      setPanels((current) => [...current, panel]);
      const release = forward?.(panel);

      return () => {
        setPanels((current) => current.filter((entry) => entry !== panel));
        release?.();
      };
    },
    [forward],
  );

  return { panels, registerLayer };
}

interface RadioContextValue {
  value?: string;
  select(value: string, event: React.MouseEvent): void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

/**
 * A menu button and its menu, on the platform's own Popover API: `<Menu>` is the button's menu, and every
 * `Menu.Sub` inside it is another popover nested in that one.
 *
 * ```tsx
 * <Menu trigger={(t) => <Button {...t}>Actions</Button>}>
 *   <Menu.Item onSelect={duplicate}>Duplicate</Menu.Item>
 *   <Menu.Item disabled>Move</Menu.Item>
 *   <Menu.Separator />
 *   <Menu.CheckboxItem checked={compact} onCheckedChange={setCompact}>Compact rows</Menu.CheckboxItem>
 *   <Menu.Sub label="Share">
 *     <Menu.Item onSelect={copyLink}>Copy link</Menu.Item>
 *   </Menu.Sub>
 * </Menu>
 * ```
 *
 * **What the platform owns**, measured in Chrome 152: the top layer, so the menu paints over every
 * stacking context and outside every clipped ancestor with no portal and no `z-index`; light dismiss, so
 * Escape and a press outside close it — Escape closing the innermost submenu first, one layer per press;
 * the toggle from the trigger, including the press that closes an open menu from its own button; and
 * focus return to whatever had focus before the menu opened. A submenu is a popover nested inside its
 * menu, so opening one leaves its parent open, and closing the menu closes every submenu with it.
 *
 * **What is written here** is the ARIA, the arrow keys, typeahead, and the focus the platform does not
 * move: into the first item on open, and back onto a submenu's own item when that submenu closes — the
 * platform returns focus for the outermost layer only.
 *
 * **The menu is always rendered**, and closed means `display: none`, which is what lets the browser own
 * show and hide; the exit is therefore a CSS transition rather than a `<Presence>`. A menu whose items are
 * expensive should be gated by the consumer: `{open && <Items />}`.
 *
 * **The menu keeps the side it chose when it opened**, since Chrome never re-evaluates
 * `position-try-fallbacks` for an element in the top layer (measured in 152) — so a menu left open while
 * the page scrolls does not flip. Every open picks the right side.
 *
 * Where the browser has no Popover API each layer is an `Overlay` — a portal — with `useDismiss` and
 * `useFocusReturn` supplying what the platform otherwise would.
 *
 * @a11y `role="menu"` on the panel, named by `label`, `labelledBy` or its trigger; `menuitem`,
 * `menuitemcheckbox` and `menuitemradio` on the items, with `aria-checked` on the last two, `role="group"`
 * around a titled section and `role="separator"` between them.
 * @a11y The trigger carries `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`; a submenu's item
 * carries the same three, which is what says it opens another menu.
 * @a11y A disabled item is `aria-disabled` and stays focusable, as APG asks — the `disabled` attribute
 * would take it out of the keyboard's reach and silence it.
 * @keyboard Enter / Space — On the trigger, opens the menu with the first item focused. On an item,
 * chooses it. On a submenu's item, opens the submenu.
 * @keyboard Down / Up — On the trigger, opens the menu at its first or last item. Inside, moves between
 * items and wraps at the ends.
 * @keyboard Home / End — The first or the last item.
 * @keyboard Right / Left — Opens the submenu of the item that has focus, and closes the submenu focus is
 * in — the other way round in a right-to-left menu, which is APG's rule and the reading order's.
 * @keyboard Escape — Closes the innermost menu and puts focus back on what opened it.
 * @keyboard Tab — Closes the menu and moves focus on, as APG asks.
 * @keyboard A printable character — Typeahead: jumps to the item whose text starts with what was typed,
 * and the same letter again cycles through the items starting with it.
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 */
function MenuImpl<TKey extends keyof ComponentsAndVariants = 'menu'>(props: MenuProps<TKey>) {
  const {
    trigger,
    children,
    open,
    defaultOpen = false,
    onOpenChange,
    label,
    labelledBy,
    side = 'bottom',
    align = 'start',
    offset = 1,
    flip = true,
    matchWidth = false,
    props: contentProps,
    ...restProps
  } = props;

  // Which end of the list the next open lands on: ArrowUp opens a menu at its *last* item (APG).
  const openTo = useRef<'first' | 'last'>('first');

  const handleOpened = useEventCallback((panel: HTMLElement) => {
    const items = MenuUtils.items(panel);
    const item = openTo.current === 'last' ? items[items.length - 1] : items[0];

    openTo.current = 'first';
    // The panel itself when there is nothing in it, so focus is at least inside the layer Escape closes.
    (item ?? panel).focus();
  });

  const { panels, registerLayer } = useNestedLayers();

  const layer = usePopoverLayer<'menu', MenuReason>({
    haspopup: 'menu',
    idPrefix: 'menu',
    id: restProps.id,
    open,
    defaultOpen,
    onOpenChange,
    onOpened: handleOpened,
    inside: panels,
  });

  const handleTriggerKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    openTo.current = event.key === 'ArrowUp' ? 'last' : 'first';

    // Already open — someone shift-tabbed back to the trigger — so this is a move into the menu rather
    // than an open, and no `toggle` event is coming to do it.
    if (layer.isOpen && layer.panelElement) handleOpened(layer.panelElement);
    else layer.setOpen(true, { reason: 'trigger', event });
  });

  const menuTrigger = useMemo<MenuTrigger>(
    () => ({ ref: layer.trigger.ref, props: { ...layer.trigger.props, onKeyDown: handleTriggerKeyDown } }),
    [handleTriggerKeyDown, layer.trigger],
  );

  const closeAll = useEventCallback((details: ChangeDetails<MenuReason>) => layer.setOpen(false, details));
  const context = useMemo<MenuContextValue>(
    () => ({ open: layer.isOpen, closeAll, registerLayer }),
    [closeAll, layer.isOpen, registerLayer],
  );

  return (
    <>
      {trigger(menuTrigger)}
      <MenuContext.Provider value={context}>
        <MenuPanel
          layer={layer}
          side={side}
          align={align}
          offset={offset}
          flip={flip}
          matchWidth={matchWidth}
          label={label}
          // APG names a menu after the button that opens it, and the layer hook is what makes the trigger
          // addressable: it writes an id onto it when the consumer has not given it one.
          labelledBy={labelledBy ?? (label ? undefined : layer.triggerId)}
          contentProps={contentProps}
          {...(restProps as MenuBoxProps<'menu'>)}
        >
          {children}
        </MenuPanel>
      </MenuContext.Provider>
    </>
  );
}

interface PanelProps extends MenuBoxProps<'menu'>, Required<PlacementProps> {
  layer: PopoverLayer<'menu', MenuReason>;
  matchWidth: boolean;
  label?: string;
  labelledBy?: string;
  contentProps?: Record<string, unknown>;
  /** A submenu: the arrow pointing back the way it came closes it. Absent on the menu itself. */
  closeSelf?(details: ChangeDetails<MenuReason>): void;
}

/**
 * One `role="menu"` panel and its keyboard, shared by the menu and every submenu. Every handler asks
 * `MenuUtils.owns` first: a submenu is declared *inside* its parent panel, so its keys and its pointer
 * both bubble through this one on their way out, and the panel they belong to is the one that answers.
 */
function MenuPanel(props: PanelProps) {
  const { layer, side, align, offset, flip, matchWidth, label, labelledBy, contentProps, closeSelf, children, ...boxProps } = props;
  const { platform, isOpen, id, triggerElement, setPanel } = layer;

  const context = useMenuContext('Menu');
  const buffer = useRef<TypeaheadUtils.Buffer>({ query: '', at: 0 });
  const position = useAnchorPosition({ side, align, offset, flip, matchWidth, anchor: triggerElement });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    const panel = event.currentTarget as HTMLElement;
    if (!MenuUtils.owns(panel, event.target)) return;

    const items = MenuUtils.items(panel);
    const from = items.indexOf(document.activeElement as HTMLElement);
    const focus = (item?: HTMLElement) => {
      if (!item) return;

      event.preventDefault();
      item.focus();
    };

    // The arrow that points back the way a submenu came out is the one that closes it, so which key it is
    // depends on the reading order. `Escape` is not here at all: it is the platform's, one layer a press.
    const back = isRtl(panel) ? 'ArrowRight' : 'ArrowLeft';

    switch (event.key) {
      case 'ArrowDown':
        return focus(MenuUtils.step(items, from, 1));
      case 'ArrowUp':
        return focus(MenuUtils.step(items, from, -1));
      case 'Home':
        return focus(items[0]);
      case 'End':
        return focus(items[items.length - 1]);
      case 'Tab':
        // Deliberately not prevented: APG asks that Tab close the menu *and* move focus on, and where it
        // goes is the browser's business.
        return context.closeAll({ reason: 'tab', event });
      case back:
        if (!closeSelf) return;

        event.preventDefault();
        return closeSelf({ reason: 'trigger', event });
    }

    if (TypeaheadUtils.isPrintable(event)) {
      const query = TypeaheadUtils.push(buffer.current, event.key, event.timeStamp);

      focus(MenuUtils.typeaheadTarget(items, query, from));
    }
  });

  // The highlight follows the pointer, because in a menu the highlight *is* focus: hovering an item and
  // then pressing ArrowDown has to carry on from the item under the pointer, and a submenu closes when
  // focus leaves the item that opened it.
  const handlePointerOver = useEventCallback((event: React.PointerEvent) => {
    const panel = event.currentTarget as HTMLElement;
    const item = (event.target as Element | null)?.closest<HTMLElement>(MenuUtils.ITEM_SELECTOR);

    if (!item || !MenuUtils.owns(panel, item) || item === document.activeElement) return;

    item.focus();
  });

  const naming = { 'aria-label': label, 'aria-labelledby': labelledBy };
  const panelProps = {
    role: 'menu',
    ...naming,
    // Focusable by script, never by Tab: the panel is a container and its items are what focus moves
    // between. It is also where focus lands when a menu has no items at all.
    tabIndex: -1,
    onKeyDown: handleKeyDown,
    onPointerOver: handlePointerOver,
    ...contentProps,
  };

  if (!platform) {
    if (!isOpen) return null;

    return (
      <Overlay
        contentRef={setPanel}
        anchor={triggerElement}
        side={side}
        align={align}
        offset={offset}
        flip={flip}
        matchWidth={matchWidth}
        component="menu"
        {...boxProps}
        id={id}
        props={panelProps}
      >
        {children}
      </Overlay>
    );
  }

  return (
    <Box
      ref={setPanel}
      component="menu"
      {...boxProps}
      variant={[boxProps.variant, { topLayer: true }] as never}
      {...position.layerProps}
      id={id}
      props={{ popover: 'auto', ...panelProps }}
    >
      {children}
    </Box>
  );
}

/**
 * A submenu: an item that opens a menu of its own. The panel is declared beside its item, *inside* the
 * menu it belongs to, which is what makes it a nested popover — so opening it leaves the parent menu open
 * and a press inside it is a press inside the parent (measured in Chrome 152).
 *
 * @a11y The item carries `role="menuitem"`, `aria-haspopup="menu"` and `aria-expanded`, and the submenu is
 * named after it.
 * @keyboard Right / Enter / Space — Opens it and focuses its first item. Left in a right-to-left menu,
 * which is the reading order rather than the key.
 * @keyboard Left / Escape — Closes it and puts focus back on the item that opened it.
 */
function MenuSub<TKey extends keyof ComponentsAndVariants = 'menu'>(props: MenuSubProps<TKey>) {
  const {
    label,
    children,
    disabled,
    side = 'end',
    align = 'start',
    offset = 0,
    flip = true,
    itemProps,
    props: contentProps,
    ...restProps
  } = props;

  const parent = useMenuContext('Menu.Sub');
  const itemId = useIdentifier('menu-sub');

  const handleOpened = useEventCallback((panel: HTMLElement) => {
    const items = MenuUtils.items(panel);

    (items[0] ?? panel).focus();
  });

  // Focus goes back before the browser hides the panel, not after: the platform's own focus return covers
  // the outermost layer only and drops a nested one to `<body>` (measured), and moving it here rather
  // than from `toggle` means it never lands there at all. Skipped when the panel does not hold focus,
  // which is the hover case — the pointer has already moved on to another item.
  const handleClosing = useEventCallback((heldFocus: boolean, item: HTMLElement | null) => {
    if (heldFocus) item?.focus();
  });

  const { panels, registerLayer } = useNestedLayers(parent.registerLayer);

  const layer = usePopoverLayer<'menu', MenuReason>({
    haspopup: 'menu',
    idPrefix: 'menu-sub',
    id: restProps.id,
    onOpened: handleOpened,
    onClosing: handleClosing,
    inside: panels,
  });

  // What the menu around it needs to know while it is open, and only on the portal path — see the hook.
  useIsomorphicLayoutEffect(() => {
    if (!layer.isOpen || !layer.panelElement) return;

    return parent.registerLayer(layer.panelElement);
  }, [layer.isOpen, layer.panelElement, parent.registerLayer]);

  // A submenu cannot outlive the menu it hangs off. The platform hides a nested layer along with its
  // ancestor, which React hears about through `beforetoggle` — but the portal path has no such event, and
  // a controlled menu closed from outside never had one either.
  useIsomorphicLayoutEffect(() => {
    if (!parent.open) layer.setOpen(false, { reason: 'imperative' });
  }, [parent.open, layer.setOpen]);

  // Focus leaving both the item and the panel closes it: hovering another item of the parent menu focuses
  // that item, so one rule covers the pointer and the keyboard at once.
  useIsomorphicLayoutEffect(() => {
    if (!layer.isOpen) return;

    const controller = new AbortController();

    document.addEventListener(
      'focusin',
      (event) => {
        if (isEventInside(event, [layer.panelElement, layer.triggerElement])) return;

        layer.setOpen(false, { reason: 'imperative', event });
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, [layer.isOpen, layer.panelElement, layer.triggerElement, layer.setOpen]);

  const handleItemKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    const forward = isRtl(event.currentTarget as HTMLElement) ? 'ArrowLeft' : 'ArrowRight';
    if (disabled || event.key !== forward) return;

    event.preventDefault();
    layer.setOpen(true, { reason: 'trigger', event });
  });

  const handlePointerEnter = useEventCallback((event: React.PointerEvent) => {
    if (disabled) return;

    layer.setOpen(true, { reason: 'trigger', event });
  });

  const context = useMemo<MenuContextValue>(
    () => ({ open: layer.isOpen, closeAll: parent.closeAll, registerLayer }),
    [layer.isOpen, parent.closeAll, registerLayer],
  );

  return (
    <>
      <Box
        tag="button"
        ref={disabled ? undefined : layer.trigger.ref}
        component="menu.item"
        variant={{ sub: true }}
        id={itemId}
        props={{
          type: 'button',
          role: 'menuitem',
          tabIndex: -1,
          'aria-disabled': disabled || undefined,
          ...layer.trigger.props,
          ...itemProps,
          onKeyDown: handleItemKeyDown,
          onPointerEnter: handlePointerEnter,
        }}
      >
        {label}
        <Box component="menu.arrow" />
      </Box>
      {!disabled && (
        <MenuContext.Provider value={context}>
          <MenuPanel
            layer={layer}
            side={side}
            align={align}
            offset={offset}
            flip={flip}
            matchWidth={false}
            labelledBy={itemId}
            contentProps={contentProps}
            closeSelf={(details) => layer.setOpen(false, details)}
            {...(restProps as MenuBoxProps<'menu'>)}
          >
            {children}
          </MenuPanel>
        </MenuContext.Provider>
      )}
    </>
  );
}

/** One command in the menu. A `<button>`, so Enter and Space are the browser's. */
function MenuItem<TKey extends keyof ComponentsAndVariants = 'menu.item'>(props: MenuItemProps<TKey>) {
  const { onSelect, disabled, closeOnSelect = true, props: itemProps, children, ...boxProps } = props;
  const context = useMenuContext('Menu.Item');

  const handleClick = useEventCallback((event: React.MouseEvent) => {
    if (disabled) return;

    onSelect?.(event);
    if (closeOnSelect) context.closeAll({ reason: 'select', event });
  });

  return (
    <Box
      tag="button"
      component={'menu.item' as TKey}
      {...(boxProps as BoxProps<'button', TKey>)}
      props={{ type: 'button', role: 'menuitem', tabIndex: -1, 'aria-disabled': disabled || undefined, ...itemProps, onClick: handleClick }}
    >
      {children}
    </Box>
  );
}

/** An item that carries a state of its own: `role="menuitemcheckbox"` and a tick. */
function MenuCheckboxItem<TKey extends keyof ComponentsAndVariants = 'menu.item'>(props: MenuCheckboxItemProps<TKey>) {
  const {
    checked,
    defaultChecked = false,
    onCheckedChange,
    disabled,
    closeOnSelect = false,
    props: itemProps,
    children,
    ...boxProps
  } = props;
  const context = useMenuContext('Menu.CheckboxItem');
  const [isChecked, setChecked] = useControllableState<boolean, 'select'>({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  const handleClick = useEventCallback((event: React.MouseEvent) => {
    if (disabled) return;

    setChecked(!isChecked, { reason: 'select', event });
    if (closeOnSelect) context.closeAll({ reason: 'select', event });
  });

  return (
    <Box
      tag="button"
      component={'menu.item' as TKey}
      {...(boxProps as BoxProps<'button', TKey>)}
      props={{
        type: 'button',
        role: 'menuitemcheckbox',
        tabIndex: -1,
        'aria-checked': isChecked,
        'aria-disabled': disabled || undefined,
        ...itemProps,
        onClick: handleClick,
      }}
    >
      <Box component="menu.indicator">{isChecked && <Box component="menu.check" />}</Box>
      {children}
    </Box>
  );
}

/** A set of items of which one is chosen: `role="group"`, and `menuitemradio` inside it. */
function MenuRadioGroup<TKey extends keyof ComponentsAndVariants = 'menu.group'>(props: MenuRadioGroupProps<TKey>) {
  const { label, value, defaultValue = '', onValueChange, children, ...boxProps } = props;
  const [current, setValue] = useControllableState<string, 'select'>({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const select = useEventCallback((next: string, event: React.MouseEvent) => setValue(next, { reason: 'select', event }));
  const context = useMemo<RadioContextValue>(() => ({ value: current, select }), [current, select]);

  return (
    <RadioContext.Provider value={context}>
      <MenuGroup label={label} {...(boxProps as MenuGroupProps<TKey>)}>
        {children}
      </MenuGroup>
    </RadioContext.Provider>
  );
}

/** One of a radio group's choices. Checked when its `value` is the group's. */
function MenuRadioItem<TKey extends keyof ComponentsAndVariants = 'menu.item'>(props: MenuRadioItemProps<TKey>) {
  const { value, disabled, closeOnSelect = false, props: itemProps, children, ...boxProps } = props;
  const context = useMenuContext('Menu.RadioItem');
  const radio = useContext(RadioContext);

  if (!radio) throw new Error('<Menu.RadioItem> must be rendered inside a <Menu.RadioGroup>.');

  const checked = radio.value === value;

  const handleClick = useEventCallback((event: React.MouseEvent) => {
    if (disabled) return;

    radio.select(value, event);
    if (closeOnSelect) context.closeAll({ reason: 'select', event });
  });

  return (
    <Box
      tag="button"
      component={'menu.item' as TKey}
      {...(boxProps as BoxProps<'button', TKey>)}
      props={{
        type: 'button',
        role: 'menuitemradio',
        tabIndex: -1,
        'aria-checked': checked,
        'aria-disabled': disabled || undefined,
        ...itemProps,
        onClick: handleClick,
      }}
    >
      <Box component="menu.indicator">{checked && <Box component="menu.dot" />}</Box>
      {children}
    </Box>
  );
}

/**
 * A titled section. The heading names the group through `aria-labelledby`, so the items inside are read
 * as a set rather than as a run of unrelated commands.
 */
function MenuGroup<TKey extends keyof ComponentsAndVariants = 'menu.group'>(props: MenuGroupProps<TKey>) {
  const { label, props: groupProps, children, ...boxProps } = props;
  const labelId = useIdentifier('menu-group');

  return (
    <Box
      component={'menu.group' as TKey}
      {...(boxProps as BoxProps<'div', TKey>)}
      props={{ role: 'group', 'aria-labelledby': label ? labelId : undefined, ...groupProps }}
    >
      {/* `presentation`, because a `role="menu"` owns items, groups and separators — and nothing else. */}
      {label && (
        <Box component="menu.label" id={labelId} props={{ role: 'presentation' }}>
          {label}
        </Box>
      )}
      {children}
    </Box>
  );
}

/** The line between two sections. `role="separator"`, which a menu is allowed to own. */
function MenuSeparator<TKey extends keyof ComponentsAndVariants = 'menu.separator'>(props: MenuSeparatorProps<TKey>) {
  const { props: separatorProps, ...boxProps } = props;

  return (
    <Box component={'menu.separator' as TKey} {...(boxProps as BoxProps<'div', TKey>)} props={{ role: 'separator', ...separatorProps }} />
  );
}

(MenuItem as FunctionComponent).displayName = 'Menu.Item';
(MenuCheckboxItem as FunctionComponent).displayName = 'Menu.CheckboxItem';
(MenuRadioGroup as FunctionComponent).displayName = 'Menu.RadioGroup';
(MenuRadioItem as FunctionComponent).displayName = 'Menu.RadioItem';
(MenuGroup as FunctionComponent).displayName = 'Menu.Group';
(MenuSeparator as FunctionComponent).displayName = 'Menu.Separator';
(MenuSub as FunctionComponent).displayName = 'Menu.Sub';

const Menu = Object.assign(MenuImpl, {
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Group: MenuGroup,
  Separator: MenuSeparator,
  Sub: MenuSub,
});

(MenuImpl as FunctionComponent).displayName = 'Menu';

export default Menu;
