import { createContext, FunctionComponent, useContext, useMemo, useRef } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import useIdentifier from '../react/identity/useIdentifier';
import { ComponentsAndVariants } from '../types';
import AccordionUtils from '../utils/accordion/accordionUtils';

/**
 * Why a panel opened or closed. One reason today — a press on the header, which is also what Enter and
 * Space on it produce — and the shape every other component in the library reports through.
 */
export type DisclosureReason = 'trigger';

/** Which heading the header sits in. It says where the section sits in the document outline, nothing more. */
export type AccordionLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

interface AccordionContextValue {
  open: readonly string[];
  level: AccordionLevel;
  toggle(value: string, details: ChangeDetails<DisclosureReason>): void;
}

interface AccordionItemContextValue {
  value: string;
  open: boolean;
  disabled: boolean;
  triggerId: string;
  panelId: string;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);
const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

// `onChange` is React's own on a `<div>`, and the accordion reports through `onValueChange` — the
// precedent `Tabs` set, so one component does not answer a change two ways.
type AccordionBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'onChange'>;

export interface AccordionProps<TKey extends keyof ComponentsAndVariants = 'accordion'> extends AccordionBoxProps<TKey> {
  /** The sections: one `Accordion.Item` each, holding an `Accordion.Trigger` and an `Accordion.Panel`. */
  children?: React.ReactNode;
  /** Controlled: the values of every panel standing open. Leave it out and the widget owns them. */
  value?: string[];
  /** Which panels start open. Left out, all of them are closed. */
  defaultValue?: string[];
  /** Fires with the panels now open, in the order they were opened. */
  onValueChange?: ChangeHandler<string[], DisclosureReason>;
  /** Whether several panels may stand open at once. Default `false`, so opening one closes the last. */
  multiple?: boolean;
  /** Whether Down and Up wrap around at the ends. Default `true`. */
  loop?: boolean;
  /**
   * Which heading each header sits in. Default `3`. It has to fit the page around it — a heading level
   * is the document's outline, and a screen reader navigates by it.
   */
  level?: AccordionLevel;
}

export interface AccordionItemProps<TKey extends keyof ComponentsAndVariants = 'accordion.item'> extends BoxProps<'div', TKey> {
  /** What this section stands for, and what the widget reports when it is open. */
  value: string;
  /** The header and the panel. */
  children?: React.ReactNode;
  /**
   * Not openable, and stepped over by Down and Up. It is the `disabled` attribute, so the browser has
   * already taken the header out of the tab sequence — arrows that still stopped there would be
   * reaching what Tab cannot.
   */
  disabled?: boolean;
}

/** Every Box prop, on the `<button>` inside the heading. */
export interface AccordionTriggerProps<TKey extends keyof ComponentsAndVariants = 'accordion.trigger'> extends Omit<
  BoxProps<'button', TKey>,
  'disabled'
> {
  /** The header's label. */
  children?: React.ReactNode;
  /** This header's heading level, when it differs from the one the accordion sets. */
  level?: AccordionLevel;
  /** Whether to draw the chevron. Turn it off to supply an affordance of your own. Default `true`. */
  arrow?: boolean;
}

export interface AccordionPanelProps<TKey extends keyof ComponentsAndVariants = 'accordion.panel'> extends BoxProps<'div', TKey> {
  /** The section's content. */
  children?: React.ReactNode;
}

interface AccordionType {
  <TKey extends keyof ComponentsAndVariants = 'accordion'>(props: AccordionProps<TKey>): React.ReactNode;
  Item: <TKey extends keyof ComponentsAndVariants = 'accordion.item'>(props: AccordionItemProps<TKey>) => React.ReactNode;
  Trigger: <TKey extends keyof ComponentsAndVariants = 'accordion.trigger'>(props: AccordionTriggerProps<TKey>) => React.ReactNode;
  Panel: <TKey extends keyof ComponentsAndVariants = 'accordion.panel'>(props: AccordionPanelProps<TKey>) => React.ReactNode;
  displayName?: string;
}

/** The DOM attributes a collapsible's trigger has to carry. */
export interface CollapsibleTriggerAttributes {
  id: string;
  type: 'button';
  'aria-expanded': boolean;
  'aria-controls': string;
  onClick(event: React.MouseEvent): void;
}

/**
 * What the trigger has to carry: spread it onto the control itself, not a wrapper.
 *
 * ```tsx
 * {(trigger) => <Button {...trigger}>Details</Button>}
 * {(trigger) => <button {...trigger.props}>Details</button>}
 * ```
 */
export interface CollapsibleTrigger {
  props: CollapsibleTriggerAttributes;
}

export interface CollapsibleProps<TKey extends keyof ComponentsAndVariants = 'collapsible'> extends Omit<BoxProps<'div', TKey>, 'open'> {
  /** The content the trigger reveals. */
  children?: React.ReactNode;
  /** The control that opens it, handed the props that wire it to the panel. It has to be a button. */
  trigger: (trigger: CollapsibleTrigger) => React.ReactNode;
  /** Controlled open state. Leave it out and the widget owns it. */
  open?: boolean;
  /** Whether it starts open. Default `false`. */
  defaultOpen?: boolean;
  /** Fires with the new state and why it changed. */
  onOpenChange?: ChangeHandler<boolean, DisclosureReason>;
}

/** The context, or a clear failure — every part is meaningless outside an `Accordion`. */
function useAccordion(part: string): AccordionContextValue {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`<${part}> has to be rendered inside an <Accordion>.`);

  return context;
}

/** The same for the item: a header and a panel are paired by the item they are written in. */
function useAccordionItem(part: string): AccordionItemContextValue {
  const context = useContext(AccordionItemContext);
  if (!context) throw new Error(`<${part}> has to be rendered inside an <Accordion.Item>.`);

  return context;
}

/**
 * A set of sections, each opened by its own header.
 * Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 *
 * ```tsx
 * <Accordion defaultValue={['shipping']}>
 *   <Accordion.Item value="shipping">
 *     <Accordion.Trigger>Shipping</Accordion.Trigger>
 *     <Accordion.Panel>Two to four working days.</Accordion.Panel>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 *
 * **The height animation is a class, not a measurement.** The panel sits in a one-row grid whose track
 * runs `1fr` to `0fr`, so there is no `ResizeObserver`, no measured pixel and no custom property written
 * per instance: a hundred items share one rule, content that grows while the panel is open grows with
 * it, and a page opens and closes before its JavaScript arrives. It rides `--transitionTime`, which
 * `prefers-reduced-motion` zeroes with no opt-out.
 *
 * **A closed panel is still rendered**, hidden with `visibility` rather than unmounted — which is what
 * keeps a half-filled form in it and what gives the exit something to animate from. Gate children too
 * expensive to render closed yourself, with `{open ? … : null}` inside the panel.
 *
 * **One panel at a time**, unless `multiple` says otherwise. Closing the open one is always allowed, so
 * an accordion can stand with everything shut and needs no second prop to say so.
 *
 * **The headers are read off the DOM**, not out of a registry, so a header a consumer wrapped, rendered
 * from a list or put behind a condition navigates like any other, and an accordion inside a panel
 * belongs to itself.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 * @a11y Each header is a `<button aria-expanded>` inside a heading — `level` says which, and it has to
 * fit the outline of the page around it.
 * @a11y `aria-controls` on the header names its panel, which is always in the DOM, so the reference
 * cannot dangle.
 * @a11y The panel is a `role="region"` named by its header. Pass `props={{ role: undefined }}` on a long
 * accordion: past half a dozen panels the landmarks are noise, which is APG's own caveat.
 * @a11y The chevron is `aria-hidden`: it says what `aria-expanded` already says.
 * @keyboard Tab — Every header is in the tab sequence, and so is anything inside an open panel. An
 * accordion is not a composite widget, so nothing here is a roving tabindex.
 * @keyboard Enter, Space — Opens the header's panel, or closes it.
 * @keyboard Down / Up — The next and previous header, wrapping at the ends and stepping over disabled
 * ones. They do nothing inside a panel, so a textarea in one keeps its own arrows.
 * @keyboard Home / End — The first and last header.
 */
function AccordionImpl<TKey extends keyof ComponentsAndVariants = 'accordion'>(props: AccordionProps<TKey>) {
  const { children, value, defaultValue, onValueChange, multiple = false, loop = true, level = 3, props: tagProps, ...restProps } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useControllableState<string[], DisclosureReason>({
    value,
    defaultValue: defaultValue ?? [],
    onChange: onValueChange,
  });

  const toggle = useEventCallback((forValue: string, details: ChangeDetails<DisclosureReason>) => {
    setOpen((current) => AccordionUtils.toggle(current, forValue, multiple), details);
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent) => {
    const root = rootRef.current;
    if (!root || event.defaultPrevented || !AccordionUtils.owns(root, event.target)) return;

    const triggers = AccordionUtils.triggers(root);
    // Focus is inside a panel rather than on a header: the arrows are the content's, not the widget's.
    const from = AccordionUtils.indexOf(triggers, event.target);
    if (from === -1) return;

    const move = AccordionUtils.moveFor(event.key);
    if (!move) return;

    const target = AccordionUtils.target(triggers, from, move, loop);
    if (!target) return;

    // Home and End scroll the page, and an arrow scrolls whatever the accordion is in.
    event.preventDefault();
    target.focus();
  });

  const context = useMemo<AccordionContextValue>(() => ({ open, level, toggle }), [open, level, toggle]);

  return (
    <AccordionContext.Provider value={context}>
      <Box
        ref={rootRef}
        component={'accordion' as TKey}
        {...(restProps as AccordionBoxProps<TKey>)}
        props={{ [AccordionUtils.ROOT_ATTRIBUTE]: '', ...tagProps, onKeyDown: handleKeyDown }}
      >
        {children}
      </Box>
    </AccordionContext.Provider>
  );
}

/** One section. It owns the pair of ids its header and its panel are wired together by. */
function AccordionItem<TKey extends keyof ComponentsAndVariants = 'accordion.item'>(props: AccordionItemProps<TKey>) {
  const { value, children, disabled = false, props: tagProps, ...restProps } = props;
  const { open } = useAccordion('Accordion.Item');
  const identifier = useIdentifier('accordion');

  const isOpen = open.includes(value);
  const context = useMemo<AccordionItemContextValue>(
    () => ({ value, open: isOpen, disabled, triggerId: `${identifier}-trigger`, panelId: `${identifier}-panel` }),
    [value, isOpen, disabled, identifier],
  );

  return (
    <AccordionItemContext.Provider value={context}>
      <Box component={'accordion.item' as TKey} {...(restProps as BoxProps<'div', TKey>)} props={tagProps}>
        {children}
      </Box>
    </AccordionItemContext.Provider>
  );
}

AccordionItem.displayName = 'Accordion.Item';

/** The header: a real `<button>` in a heading, which is the pair APG asks for. */
function AccordionTrigger<TKey extends keyof ComponentsAndVariants = 'accordion.trigger'>(props: AccordionTriggerProps<TKey>) {
  const { children, level, arrow = true, props: tagProps, ...restProps } = props;
  const { level: accordionLevel, toggle } = useAccordion('Accordion.Trigger');
  const { value, open, disabled, triggerId, panelId } = useAccordionItem('Accordion.Trigger');

  const handleClick = useEventCallback((event: React.MouseEvent) => toggle(value, { reason: 'trigger', event }));

  return (
    // The one place `tag` is right rather than a shortcut: the element *is* the level, and picking one
    // of six components at runtime would import all six to render one.
    <Box tag={HEADINGS[(level ?? accordionLevel) - 1]} component="accordion.heading">
      <Box
        tag="button"
        component={'accordion.trigger' as TKey}
        {...(restProps as BoxProps<'button', TKey>)}
        // Box's own prop, not an attribute in `props`: it is the one that also styles the state.
        disabled={disabled}
        id={triggerId}
        props={{
          type: 'button',
          'aria-expanded': open,
          // The panel is never unmounted, so this reference is always to something that is there.
          'aria-controls': panelId,
          [AccordionUtils.TRIGGER_ATTRIBUTE]: '',
          ...tagProps,
          onClick: handleClick,
        }}
      >
        {children}
        {arrow && <Box tag="span" component="accordion.arrow" variant={{ open }} props={{ 'aria-hidden': true }} />}
      </Box>
    </Box>
  );
}

AccordionTrigger.displayName = 'Accordion.Trigger';

/** The section's content, in the grid that gives it its height. */
function AccordionPanel<TKey extends keyof ComponentsAndVariants = 'accordion.panel'>(props: AccordionPanelProps<TKey>) {
  const { children, props: tagProps, ...restProps } = props;
  const { open, triggerId, panelId } = useAccordionItem('Accordion.Panel');

  return (
    // The clip is the component's: it is a mechanism, and anything a consumer put on it — a padding, a
    // border — would keep the track from ever reaching zero.
    <Box component="accordion.clip" variant={{ closed: !open }}>
      <Box
        component={'accordion.panel' as TKey}
        {...(restProps as BoxProps<'div', TKey>)}
        id={panelId}
        props={{ role: 'region', 'aria-labelledby': triggerId, ...tagProps }}
      >
        {children}
      </Box>
    </Box>
  );
}

AccordionPanel.displayName = 'Accordion.Panel';

/**
 * One disclosure: a trigger, and the content it reveals.
 *
 * ```tsx
 * <Collapsible trigger={(trigger) => <Button {...trigger}>What is in the box?</Button>}>
 *   <P>A kite.</P>
 * </Collapsible>
 * ```
 *
 * The same one-row grid an `Accordion` panel opens in, with no heading, no group and no arrow keys — a
 * lone button needs none of them. Reach for it for a "show more", a filter drawer or a sidebar section;
 * reach for `Accordion` when several sections know about each other.
 *
 * @a11y The trigger carries `aria-expanded` and `aria-controls`; the content has no role of its own,
 * because a region wants a name and a trigger is not a heading. Use an `Accordion` where the sections
 * are document structure.
 */
function Collapsible<TKey extends keyof ComponentsAndVariants = 'collapsible'>(props: CollapsibleProps<TKey>) {
  const { children, trigger, open, defaultOpen = false, onOpenChange, props: tagProps, ...restProps } = props;

  const identifier = useIdentifier('collapsible');
  const triggerId = `${identifier}-trigger`;
  const panelId = `${identifier}-panel`;
  const [isOpen, setOpen] = useControllableState<boolean, DisclosureReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const handleClick = useEventCallback((event: React.MouseEvent) => setOpen((current) => !current, { reason: 'trigger', event }));
  const bag = useMemo<CollapsibleTrigger>(
    () => ({ props: { id: triggerId, type: 'button', 'aria-expanded': isOpen, 'aria-controls': panelId, onClick: handleClick } }),
    [triggerId, panelId, isOpen, handleClick],
  );

  return (
    <Box component={'collapsible' as TKey} {...(restProps as BoxProps<'div', TKey>)} props={tagProps}>
      {trigger(bag)}
      <Box component="collapsible.clip" variant={{ closed: !isOpen }}>
        <Box component="collapsible.panel" id={panelId}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

(Collapsible as FunctionComponent).displayName = 'Collapsible';

export { Collapsible };

const Accordion = AccordionImpl as AccordionType;
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Panel = AccordionPanel;
(Accordion as FunctionComponent).displayName = 'Accordion';

export default Accordion;
