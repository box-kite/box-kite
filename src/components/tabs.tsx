import { createContext, FunctionComponent, useContext, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import { useIsomorphicLayoutEffect } from '../react/effects';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import AnimationUtils from '../utils/animation/animationUtils';
import { isRtl } from '../utils/dom/domUtils';
import TabsUtils, { TabsBounds, TabsOrientation } from '../utils/tabs/tabsUtils';

export type { TabsOrientation };

/** Why the selection changed — a press on a tab, or the keyboard. */
export type TabsReason = 'click' | 'keyboard';

/**
 * When a tab becomes the selected one. `automatic` is APG's default and what a reader expects: moving to a
 * tab shows its panel. `manual` moves focus alone and waits for Enter or Space — which is what a panel too
 * expensive to render on the way past needs.
 */
export type TabsActivation = 'automatic' | 'manual';

/**
 * Which indicator marks the selected tab. `static` is the tab's own border, which needs no JavaScript
 * and is what a prerendered page paints. `sliding` is one element for the whole list that travels
 * between tabs — measured, so the static one stays until the widget has run.
 */
export type TabsIndicator = 'static' | 'sliding';

interface TabsContextValue {
  identifier: string;
  value: string | undefined;
  orientation: TabsOrientation;
  activation: TabsActivation;
  loop: boolean;
  keepMounted: boolean;
  indicator: TabsIndicator;
  /** Whether the travelling indicator is measured and on screen — until it is, each tab draws its own. */
  indicatorLive: boolean;
  setIndicatorLive(live: boolean): void;
  /** Which tab is in the tab sequence: the last focused, else the selected, else the first the list found. */
  tabStop: string | undefined;
  setTabStop(value: string): void;
  select(value: string, details: ChangeDetails<TabsReason>): void;
  tabId(value: string): string;
  panelId(value: string): string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

// `selected` and `disabled` shadow pseudo-class nesting keys, and `open` is one too — the component owns
// these states and writes the attributes those keys select on, so a prop of the same name would be two
// answers to one question.
type TabsBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'onChange'>;

export interface TabsProps<TKey extends keyof ComponentsAndVariants = 'tabs'> extends TabsBoxProps<TKey> {
  /** The tabs and their panels: a `Tabs.List` of `Tabs.Tab`, then one `Tabs.Panel` per tab. */
  children?: React.ReactNode;
  /** Controlled selection. Leave it out and the widget owns it. */
  value?: string;
  /** Which tab starts selected. Left out, nothing is selected and no panel is shown until one is chosen. */
  defaultValue?: string;
  /** Fires with the newly selected tab and why it changed — `'click'` or `'keyboard'`. */
  onValueChange?: ChangeHandler<string | undefined, TabsReason>;
  /** Which way the tabs run. Horizontal is the reading axis, so its arrows mirror in a right-to-left page. */
  orientation?: TabsOrientation;
  /** Whether moving to a tab selects it. Default `'automatic'`, which is what APG asks for. */
  activation?: TabsActivation;
  /** Whether the arrows wrap around at the ends. Default `true`. */
  loop?: boolean;
  /**
   * Which indicator marks the selected tab: the tab's own border (`'static'`, the default) or one
   * element travelling between them (`'sliding'`), which animates because it is the same element.
   */
  indicator?: TabsIndicator;
  /**
   * Render every panel rather than only the selected one, hiding the rest. What a panel holding a
   * half-filled form needs, since an unmounted panel loses its state.
   */
  keepMounted?: boolean;
}

export interface TabsListProps<TKey extends keyof ComponentsAndVariants = 'tabs.list'> extends BoxProps<'div', TKey> {
  /** The tabs. */
  children?: React.ReactNode;
  /** The list's accessible name. A tablist has none of its own, and one page can hold several. */
  label?: string;
  /** Names the list after an element already on the page, instead of `label`. */
  labelledBy?: string;
}

/** Every Box prop, on the `<button>` that is one tab. */
export interface TabsTabProps<TKey extends keyof ComponentsAndVariants = 'tabs.tab'> extends Omit<BoxProps<'button', TKey>, 'disabled'> {
  /** Which panel this tab shows, and what the widget reports when it is chosen. */
  value: string;
  /** The tab's label. */
  children?: React.ReactNode;
  /**
   * Not selectable, and stepped over by the arrows — unlike a disabled `Menu.Item`, which APG asks stay
   * reachable. Selection follows focus here, so a tab focus could reach and selection could not would
   * leave the widget with no state to be in.
   */
  disabled?: boolean;
}

export interface TabsPanelsProps<TKey extends keyof ComponentsAndVariants = 'tabs.panels'> extends BoxProps<'div', TKey> {
  /** The panels. */
  children?: React.ReactNode;
}

export interface TabsPanelProps<TKey extends keyof ComponentsAndVariants = 'tabs.panel'> extends BoxProps<'div', TKey> {
  /** The tab this panel belongs to. */
  value: string;
  /** The panel's content. */
  children?: React.ReactNode;
}

interface TabsType {
  <TKey extends keyof ComponentsAndVariants = 'tabs'>(props: TabsProps<TKey>): React.ReactNode;
  List: <TKey extends keyof ComponentsAndVariants = 'tabs.list'>(props: TabsListProps<TKey>) => React.ReactNode;
  Tab: <TKey extends keyof ComponentsAndVariants = 'tabs.tab'>(props: TabsTabProps<TKey>) => React.ReactNode;
  Panels: <TKey extends keyof ComponentsAndVariants = 'tabs.panels'>(props: TabsPanelsProps<TKey>) => React.ReactNode;
  Panel: <TKey extends keyof ComponentsAndVariants = 'tabs.panel'>(props: TabsPanelProps<TKey>) => React.ReactNode;
  displayName?: string;
}

/** The context, or a clear failure — every part is meaningless outside a `Tabs`. */
function useTabs(part: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${part}> has to be rendered inside a <Tabs>.`);

  return context;
}

/**
 * The APG tabs pattern: one list of tabs over one panel at a time.
 * Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * ```tsx
 * <Tabs defaultValue="overview">
 *   <Tabs.List label="Project">
 *     <Tabs.Tab value="overview">Overview</Tabs.Tab>
 *     <Tabs.Tab value="activity">Activity</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="overview">Who is on it, and what is left.</Tabs.Panel>
 *   <Tabs.Panel value="activity">What changed this week.</Tabs.Panel>
 * </Tabs>
 * ```
 *
 * **Selection follows focus**, which is APG's default: an arrow key moves to a tab and shows its panel in
 * one keystroke. `activation="manual"` splits the two, for a panel too expensive to render on the way
 * past — focus moves, and Enter or Space chooses.
 *
 * **Only the selected panel is rendered.** An unmounted panel costs nothing and gets an entrance for free
 * (`startingStyle` runs on the mount), but it also loses whatever state it held — `keepMounted` renders
 * them all and hides the rest, which is what a panel holding a half-filled form wants. A hidden panel is
 * `display: none` declared here rather than left to the UA's `[hidden]` rule, because every Box carries
 * `display: block` and any author rule outranks that one.
 *
 * **The tabs are read off the DOM**, not out of a registry, so a tab a consumer wrapped, rendered from a
 * list or put behind a condition is in the order it was written and navigates like any other.
 *
 * **Two things move, and both are opt-in.** `indicator="sliding"` replaces each tab's own border with one
 * element for the whole list, which animates between tabs because it is the same element — measured, so
 * the static border stays until the widget has run and a page with no JavaScript keeps an indicator.
 * Wrapping the panels in a `Tabs.Panels` gives that container the height of the panel on screen, so a
 * switch between panels of different heights is a transition rather than a jump. Both ride
 * `--transitionTime`, which `prefers-reduced-motion` zeroes with no opt-out.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 * @a11y `role="tablist"` on the list, named by its own `label` — a page can hold several, and a tablist
 * has no name of its own.
 * @a11y `role="tab"` with `aria-selected` on each tab, and `aria-controls` naming the panel it shows —
 * written only while that panel is mounted, since a dangling reference names nothing.
 * @a11y `role="tabpanel"` on the panel, `aria-labelledby` its tab, and `tabindex="0"` so the content is
 * reachable from the keyboard whether or not anything inside it is focusable.
 * @a11y `aria-orientation` follows `orientation`, and the arrows follow the reading order: in a
 * right-to-left page ArrowLeft is the *next* tab.
 * @a11y The travelling indicator is `aria-hidden`: it says what `aria-selected` already says, and it
 * keeps a `Highlight` fill in a forced-colors mode, so it is decoration in every mode that has colour.
 * @keyboard Tab — Enters the list once, landing on the selected tab, and again leaves it for the panel.
 * @keyboard Right / Left — The next and previous tab in a horizontal list, wrapping at the ends and
 * stepping over disabled tabs. Mirrored in a right-to-left page.
 * @keyboard Down / Up — The same in a vertical list. The off-axis pair is left to the page, so a
 * horizontal list does not eat a scroll.
 * @keyboard Home / End — The first and last tab.
 * @keyboard Enter, Space — Chooses the focused tab. Only `activation="manual"` needs them; automatic
 * activation has already chosen it.
 */
function TabsImpl<TKey extends keyof ComponentsAndVariants = 'tabs'>(props: TabsProps<TKey>) {
  const {
    children,
    value,
    defaultValue,
    onValueChange,
    orientation = 'horizontal',
    activation = 'automatic',
    loop = true,
    keepMounted = false,
    indicator = 'static',
    props: tagProps,
    ...restProps
  } = props;

  const identifier = useIdentifier('tabs');
  const [selected, setSelected] = useControllableState<string | undefined, TabsReason>({ value, defaultValue, onChange: onValueChange });
  const [stop, setStop] = useState<string>();
  // Set by the list once it has measured and read by every tab, so it lives here: a context change
  // reaches children that the list re-rendering on its own never would.
  const [indicatorLive, setIndicatorLive] = useState(false);

  // The tab sequence follows the selection: a panel showing while a different tab is the way in would
  // send Tab to the wrong place. Manual activation moves focus without selecting, so `stop` leads there.
  useIsomorphicLayoutEffect(() => {
    if (selected !== undefined) setStop(selected);
  }, [selected]);

  const context = useMemo<TabsContextValue>(
    () => ({
      identifier,
      value: selected,
      orientation,
      activation,
      loop,
      keepMounted,
      indicator,
      indicatorLive,
      setIndicatorLive,
      tabStop: stop ?? selected,
      setTabStop: setStop,
      // `useControllableState`'s setter is already stable, and it drops a change resolving to the value
      // on screen — so a second press on the selected tab reports nothing.
      select: setSelected,
      tabId: (forValue) => `${identifier}-tab-${TabsUtils.token(forValue)}`,
      panelId: (forValue) => `${identifier}-panel-${TabsUtils.token(forValue)}`,
    }),
    [identifier, selected, orientation, activation, loop, keepMounted, indicator, indicatorLive, stop, setSelected],
  );

  return (
    <TabsContext.Provider value={context}>
      <Box
        component={'tabs' as TKey}
        {...(restProps as TabsBoxProps<TKey>)}
        variant={[restProps.variant, { vertical: orientation === 'vertical' }] as never}
        props={tagProps}
      >
        {children}
      </Box>
    </TabsContext.Provider>
  );
}

/** The tabs themselves, and the keyboard: it sits on the list because roving tabindex puts one tab in the tab sequence. */
function TabsList<TKey extends keyof ComponentsAndVariants = 'tabs.list'>(props: TabsListProps<TKey>) {
  const { children, label, labelledBy, props: tagProps, ...restProps } = props;
  const { value: selected, orientation, activation, loop, indicator, tabStop, setTabStop, setIndicatorLive, select } = useTabs('Tabs.List');
  const listRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<TabsBounds>();
  const sliding = indicator === 'sliding';

  // Where the travelling indicator has to be. Re-measured on a reflow as well as on a selection change:
  // a label that wraps or a font that arrives moves a tab without the widget hearing about it.
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!sliding || !list) return;

    const measure = () => {
      const tab = TabsUtils.selectedTab(list);
      const next = tab && TabsUtils.bounds(list, tab, orientation);

      setBounds((current) => (TabsUtils.sameBounds(current, next) ? current : next));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    // Every tab as well as the list: one of them growing moves all the ones after it.
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of TabsUtils.tabs(list)) observer.observe(tab);

    return () => observer.disconnect();
  }, [sliding, orientation, selected]);

  // A zero-length measurement is a list nothing has laid out yet — one inside a closed panel, or one
  // still waiting on a font. There is no bar worth drawing until there is a tab with a size.
  const travelling = sliding && bounds && bounds.size > 0 ? bounds : undefined;

  // A tab stops drawing its own indicator only once this one is really on screen, so a page rendered
  // before its JavaScript — every prerendered one — still underlines the selected tab.
  useIsomorphicLayoutEffect(() => {
    setIndicatorLive(travelling !== undefined);
  }, [travelling, setIndicatorLive]);

  // Nothing selected and nothing focused yet, so no tab is in the tab sequence: the first enabled one
  // becomes it, which only the DOM knows the order of.
  useIsomorphicLayoutEffect(() => {
    if (tabStop !== undefined) return;

    const first = TabsUtils.edge(TabsUtils.tabs(listRef.current), 1);
    const value = first && TabsUtils.valueOf(first);

    if (value !== undefined) setTabStop(value);
  }, [tabStop, setTabStop]);

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    const list = listRef.current;
    if (!list || event.defaultPrevented || !TabsUtils.owns(list, event.target)) return;

    const tabs = TabsUtils.tabs(list);
    const from = TabsUtils.indexOf(tabs, event.target);
    if (from === -1) return;

    if (activation === 'manual' && (event.key === 'Enter' || event.key === ' ')) {
      const value = TabsUtils.valueOf(tabs[from]);
      if (value === undefined) return;

      // Ahead of the click the browser synthesizes from this key on a `<button>`, so the reason stays
      // `keyboard` rather than arriving a second time as a press.
      event.preventDefault();
      select(value, { reason: 'keyboard', event });

      return;
    }

    const move = TabsUtils.moveFor(event.key, orientation, isRtl(list));
    if (!move) return;

    const target = TabsUtils.target(tabs, from, move, loop);
    if (!target) return;

    // Home and End scroll the page, and an arrow scrolls a tablist that overflows.
    event.preventDefault();
    target.focus();

    const value = TabsUtils.valueOf(target);
    if (activation === 'automatic' && value !== undefined) select(value, { reason: 'keyboard', event });
  });

  return (
    <Box
      ref={listRef}
      component={'tabs.list' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={[restProps.variant, { vertical: orientation === 'vertical', sliding }] as never}
      props={{
        role: 'tablist',
        'aria-label': label,
        'aria-labelledby': labelledBy,
        'aria-orientation': orientation,
        ...tagProps,
        onKeyDown: handleKeyDown,
      }}
    >
      {children}
      {travelling && (
        <Box
          tag="span"
          component="tabs.indicator"
          variant={{ vertical: orientation === 'vertical' }}
          // A measured pixel is per instance, so it is an inline style rather than a class — the reason
          // `useAnchorPosition` writes one too: a class would be a rule per position, never freed.
          style={
            orientation === 'vertical'
              ? { top: `${travelling.start}px`, height: `${travelling.size}px` }
              : { left: `${travelling.start}px`, width: `${travelling.size}px` }
          }
          props={{ 'aria-hidden': true }}
        />
      )}
    </Box>
  );
}

TabsList.displayName = 'Tabs.List';

/** One tab: a real `<button>`, so Enter and Space reach it the way the platform means them to. */
function TabsTab<TKey extends keyof ComponentsAndVariants = 'tabs.tab'>(props: TabsTabProps<TKey>) {
  const { value, children, disabled, props: tagProps, ...restProps } = props;
  const { value: selected, orientation, keepMounted, indicatorLive, tabStop, setTabStop, select, tabId, panelId } = useTabs('Tabs.Tab');

  const isSelected = selected === value;
  const handleClick = useEventCallback((event: React.MouseEvent) => select(value, { reason: 'click', event }));
  const handleFocus = useEventCallback(() => setTabStop(value));

  return (
    <Box
      tag="button"
      component={'tabs.tab' as TKey}
      {...(restProps as BoxProps<'button', TKey>)}
      // The indicator turns with the list, so the tab needs the orientation too — without it a vertical
      // list draws column tabs still wearing an underline. `underline` is the indicator the tab draws
      // itself, which is every list until a travelling one has measured its way onto the screen.
      variant={[restProps.variant, { vertical: orientation === 'vertical', underline: !indicatorLive }] as never}
      // Box's own prop, not an attribute in `props`: it is the one that also styles the state.
      disabled={disabled}
      id={tabId(value)}
      props={{
        type: 'button',
        role: 'tab',
        'aria-selected': isSelected,
        // Only while the panel is mounted: a reference to an element that is not there names nothing.
        'aria-controls': isSelected || keepMounted ? panelId(value) : undefined,
        // The roving tabindex — exactly one tab in the tab sequence, and Tab lands on the selected one.
        tabIndex: tabStop === value ? 0 : -1,
        'data-value': value,
        ...tagProps,
        onClick: handleClick,
        onFocus: handleFocus,
      }}
    >
      {children}
    </Box>
  );
}

TabsTab.displayName = 'Tabs.Tab';

/**
 * The panels' container, and the only optional part: it takes the height of the panel on screen, so a
 * switch between panels of different heights is a transition rather than a jump. Panels work as plain
 * siblings of the list without it.
 */
function TabsPanels<TKey extends keyof ComponentsAndVariants = 'tabs.panels'>(props: TabsPanelsProps<TKey>) {
  const { children, props: tagProps, ...restProps } = props;
  const { value } = useTabs('Tabs.Panels');
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [resizing, setResizing] = useState(false);

  const measure = useEventCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const panel = TabsUtils.visiblePanel(container);
    // `offsetHeight` rather than a rectangle: an integer, and free of the entrance transform. Nothing is
    // clipped at rest, so the half pixel a rectangle would carry buys nothing.
    const next = panel?.offsetHeight;
    if (next === height) return;

    // A first measurement has nothing to travel from, and neither has a height going back to `auto` with
    // no panel on screen: `auto` does not interpolate either way, so there is nothing to clip for.
    if (height !== undefined && next !== undefined) setResizing(true);
    setHeight(next);
  });

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    // The panel, never the container: the container's height is what this writes, so watching it is the
    // loop. A selection change brings a different element, which is what this effect re-runs for.
    const panel = TabsUtils.visiblePanel(container);
    if (!panel) return;

    const observer = new ResizeObserver(measure);
    observer.observe(panel);

    return () => observer.disconnect();
  }, [value, measure]);

  // The clip lasts as long as the element's own CSS says the travel does — `0` under
  // `prefers-reduced-motion`, the same measured wait `<Presence>` takes and for the same reason:
  // `transitionend` fires once per property, with no way to know how many are coming.
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !resizing) return;

    const timer = setTimeout(
      () => setResizing(false),
      AnimationUtils.activeDuration(getComputedStyle(container)) + AnimationUtils.SETTLE_FRAME,
    );

    return () => clearTimeout(timer);
  }, [resizing, height]);

  return (
    <Box
      ref={containerRef}
      component={'tabs.panels' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={[restProps.variant, { resizing }] as never}
      // The measured height, with the consumer's own style over it — the same per-instance exception
      // the indicator takes, for the same reason.
      style={{ height: height === undefined ? undefined : `${height}px`, ...restProps.style }}
      props={tagProps}
    >
      {children}
    </Box>
  );
}

TabsPanels.displayName = 'Tabs.Panels';

/** One panel. Rendered only while its tab is selected, unless the widget was told to keep them all. */
function TabsPanel<TKey extends keyof ComponentsAndVariants = 'tabs.panel'>(props: TabsPanelProps<TKey>) {
  const { value, children, props: tagProps, ...restProps } = props;
  const { value: selected, keepMounted, tabId, panelId } = useTabs('Tabs.Panel');

  const isSelected = selected === value;
  if (!isSelected && !keepMounted) return null;

  return (
    <Box
      component={'tabs.panel' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={[restProps.variant, { hidden: !isSelected }] as never}
      id={panelId(value)}
      props={{
        role: 'tabpanel',
        'aria-labelledby': tabId(value),
        hidden: isSelected ? undefined : true,
        // APG puts the panel in the tab sequence: Tab out of the list reaches the content whether or not
        // anything inside it is focusable.
        tabIndex: 0,
        ...tagProps,
      }}
    >
      {children}
    </Box>
  );
}

TabsPanel.displayName = 'Tabs.Panel';

const Tabs = TabsImpl as TabsType;
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panels = TabsPanels;
Tabs.Panel = TabsPanel;
(Tabs as FunctionComponent).displayName = 'Tabs';

export default Tabs;
