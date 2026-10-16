import { Ref, RefAttributes } from 'react';
import { BoxProps, BoxTagProps, useBoxElement } from '../box';
import { classNames, mergeDeep } from '../core';
import boxComponent from '../react/boxComponent';
import { ExtractElementFromTag } from '../react/reactTypes';
import { BoxComponentStyles, ComponentsAndVariants } from '../types';
import { Path, Svg } from './svg';

/** How an item's spacing is set: `md` by default, `sm` for a dense list, `lg` for one with room to breathe. */
export type ListItemSize = 'sm' | 'md' | 'lg';

/** How many lines a text part runs to: `1` ends in an ellipsis, `2` and `3` are clamped. Unset, it wraps. */
export type ListLines = 1 | 2 | 3;

/** Which heading a group's label is. It says where the group sits in the page's outline, nothing more. */
export type ListGroupLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

// The geometry is each part's default props rather than its node in the style tree: the tree ships in every
// engine entry, this file only where a list is drawn. A prop on the part still beats any of it.
const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;

const ITEM: BoxComponentStyles = {
  position: 'relative',
  display: 'flex',
  ai: 'center',
  gap: 3,
  px: 4,
  py: 3,
  minHeight: 14,
  css: { borderRadius: 'var(--list-item-radius, 0)' },
  // The line above every item but the first: a pseudo-element, so `--list-divider-inset` can start it at the text.
  before: { position: 'absolute', top: 0, insetEnd: 0, css: { insetInlineStart: 'var(--list-divider-inset, 0px)', height: '1px' } },
  // The frame a `separated` list draws round each item, which a border would take from the item's own props.
  after: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    css: { border: 'var(--list-item-frame, none)', borderRadius: 'inherit' },
  },
  nth: { first: { before: { display: 'none' } } },
};
const ITEM_SIZES: Record<ListItemSize, BoxComponentStyles> = {
  sm: { gap: 2, py: 2, minHeight: 11 },
  md: {},
  lg: { gap: 4, py: 4, minHeight: 18 },
};

const MEDIA: BoxComponentStyles = { display: 'flex', ai: 'center', jc: 'center', flexShrink: 0 };
const MEDIA_SHAPES: Record<string, BoxComponentStyles> = {
  icon: { width: 10, height: 10, borderRadius: 2 },
  avatar: { width: 10, height: 10, borderRadius: 999, overflow: 'hidden', fontSize: 14, fontWeight: 600 },
  image: { width: 16, height: 16, borderRadius: 2, overflow: 'hidden' },
};

const ROW: BoxComponentStyles = { display: 'flex', ai: 'baseline', jc: 'space-between', gap: 2, minWidth: 0 };
const ROW_WRAP: BoxComponentStyles = { flexWrap: 'wrap', jc: 'start', rowGap: 1 };
const SECONDARY: BoxComponentStyles = { fontSize: 14, lineHeight: 20 };

const TEXT: Record<'list.title' | 'list.description' | 'list.overline', BoxComponentStyles> = {
  'list.title': { display: 'block', minWidth: 0, fontSize: 16, lineHeight: 22, fontWeight: 500 },
  'list.description': { display: 'block', minWidth: 0, fontSize: 14, lineHeight: 20 },
  'list.overline': { display: 'block', minWidth: 0, fontSize: 12, lineHeight: 16, fontWeight: 500 },
};

// The action's `::after` covers the item, so the whole item presses while the name a reader hears is the title alone.
// It inherits the clamp of the title it is written in.
const ACTION: BoxComponentStyles = {
  color: 'currentColor',
  textDecoration: 'none',
  cursor: 'pointer',
  css: {
    display: 'inherit',
    font: 'inherit',
    textAlign: 'inherit',
    overflow: 'inherit',
    textOverflow: 'inherit',
    WebkitLineClamp: 'inherit',
    WebkitBoxOrient: 'inherit',
  },
  after: { position: 'absolute', inset: 0, css: { borderRadius: 'var(--list-item-radius, 0)' } },
};

const LINES: Record<ListLines, BoxComponentStyles> = {
  1: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  2: { overflow: 'hidden', css: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 } },
  3: { overflow: 'hidden', css: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 } },
};

const PARTS = {
  content: { display: 'flex', d: 'column', gap: 0.5, flex1: true, minWidth: 0 },
  meta: { flexShrink: 0, fontSize: 13, lineHeight: 18, whiteSpace: 'nowrap', css: TABULAR },
  end: { display: 'flex', d: 'column', ai: 'end', gap: 0.5, flexShrink: 0, maxWidth: '1/2', textAlign: 'end', css: TABULAR },
  // Above the action that covers the item, so a control here takes its own presses.
  actions: { display: 'flex', ai: 'center', gap: 1, flexShrink: 0, position: 'relative', zIndex: 1 },
  // As many labelled values to a line as fit at 8rem each — two on a phone.
  fields: {
    display: 'grid',
    columnGap: 4,
    rowGap: 2,
    mt: 1,
    css: { gridTemplateColumns: 'repeat(auto-fill, minmax(min(8rem, 100%), 1fr))' },
  },
} satisfies Record<string, BoxComponentStyles>;

/** The style objects a default and a prop both write into, merged rather than replaced — a clamp is in `css`, a divider in `before`. */
const NESTED = ['css', 'before', 'after', 'nth'] as const;

/** A part's defaults under the props it was given. */
function withDefaults<T extends object>(defaults: BoxComponentStyles, props: T): T {
  const merged: Record<string, unknown> = { ...defaults, ...props };
  const base = defaults as Record<string, object | undefined>;
  for (const key of NESTED) {
    const own = (props as Record<string, object | undefined>)[key];
    if (base[key] && own) merged[key] = mergeDeep(base[key], own);
  }

  return merged as T;
}

type Part<TTag extends keyof React.JSX.IntrinsicElements, TKey extends keyof ComponentsAndVariants> = BoxProps<TTag, TKey> &
  RefAttributes<ExtractElementFromTag<TTag>>;

export interface ListProps<TKey extends keyof ComponentsAndVariants = 'list'> extends Omit<BoxProps<'ul', TKey>, 'tag'> {
  /** The items: `List.Item`s, and `List.Group`s for sections. */
  children?: React.ReactNode;
  /** `ol` when the order means something — steps, a ranking. Default `ul`. */
  tag?: 'ul' | 'ol';
}

export interface ListItemProps<TKey extends keyof ComponentsAndVariants = 'list.item'> extends BoxProps<'li', TKey> {
  /** The item's parts: `List.Media`, `List.Content`, `List.End`, `List.Actions` — or anything at all, in one row. */
  children?: React.ReactNode;
  /** The item's spacing. Default `md`, at least 56px tall; `sm` is 44px, still a finger's width; `lg` is 72px. */
  size?: ListItemSize;
  /** Lets the item's parts wrap onto a second line when they do not fit, instead of squeezing. */
  wrap?: boolean;
  /** Tints the item as chosen. The state a reader hears belongs on the control that chose it — a checkbox, `aria-pressed`. */
  selected?: boolean;
  /** Ends the item with a chevron: pressing it goes somewhere with more. Decoration, so `aria-hidden`. */
  chevron?: boolean;
}

/** A slot or a plain part: every Box prop, and what goes in it. `List.Media` takes `variant` `icon`, `avatar` or `image`. */
export interface ListPartProps<TKey extends keyof ComponentsAndVariants = never> extends BoxProps<'div', TKey> {
  /** What goes in it. */
  children?: React.ReactNode;
}

export interface ListRowProps<TKey extends keyof ComponentsAndVariants = never> extends BoxProps<'div', TKey> {
  /** What sits side by side: a title and its time, a status and a count. The first takes the room, the last sits at the end. */
  children?: React.ReactNode;
  /** Lets the row's parts wrap onto a new line — a set of tags — instead of pushing the last to the end. */
  wrap?: boolean;
  /** The quieter line under the main one: smaller and muted. */
  secondary?: boolean;
}

export interface ListTextProps<TKey extends keyof ComponentsAndVariants = never> extends BoxProps<'span', TKey> {
  /** The text. */
  children?: React.ReactNode;
  /** How many lines it runs to before it stops: `1` ends in an ellipsis, `2` and `3` are clamped. Unset, it wraps. */
  lines?: ListLines;
}

/** A `List.Title`: the item's name, and where its `List.Action` goes. */
export type ListTitleProps<TKey extends keyof ComponentsAndVariants = never> = ListTextProps<TKey>;

/** A `List.Description`: muted supporting text under the title. */
export type ListDescriptionProps<TKey extends keyof ComponentsAndVariants = never> = ListTextProps<TKey>;

/** A `List.Overline`: a small line above the title — an id, a date, a category. */
export type ListOverlineProps<TKey extends keyof ComponentsAndVariants = never> = ListTextProps<TKey>;

/** A button's attributes, plus the two that turn the action into a link or a label. */
export type ListActionTagProps = BoxTagProps<'button'> &
  Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download' | 'hrefLang' | 'referrerPolicy'> &
  Pick<React.LabelHTMLAttributes<HTMLLabelElement>, 'htmlFor'>;

export interface ListActionProps<TKey extends keyof ComponentsAndVariants = 'list.action'> extends Omit<
  BoxProps<'button', TKey>,
  'props' | 'tag'
> {
  /** What the action is called: the item's title, and nothing else, since it is the name a reader hears. */
  children?: React.ReactNode;
  /** The element's attributes. An `href` makes it an `<a>`, an `htmlFor` a `<label>`; neither, a `<button type="button">`. */
  props?: ListActionTagProps;
  /** The element, when what `props` holds does not already say: `a` with no `href` is a placeholder link. */
  tag?: 'button' | 'a' | 'label';
  /** Fires on a press anywhere on the item — and on Enter, and on Space for a button. */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface ListFieldProps<TKey extends keyof ComponentsAndVariants = never> extends BoxProps<'div', TKey> {
  /** What the value is: the `<dt>`. */
  label: React.ReactNode;
  /** The value: the `<dd>`. */
  children?: React.ReactNode;
}

export interface ListGroupProps<TKey extends keyof ComponentsAndVariants = never> extends BoxProps<'li', TKey> {
  /** What the items have in common: "Today", "A", "Unread". */
  label: React.ReactNode;
  /** The group's items. */
  children?: React.ReactNode;
  /** Makes the label a heading of this level, so a screen reader can jump between groups. Unset, it is plain text. */
  level?: ListGroupLevel;
  /** Keeps the label at the top of the screen while its items scroll under it, until the next group's pushes it off. */
  sticky?: boolean;
}

/**
 * A list of things to read and pick from — messages, orders, people, settings.
 *
 * ```tsx
 * <List>
 *   <List.Item chevron>
 *     <List.Media variant="avatar">AL</List.Media>
 *     <List.Content>
 *       <List.Row>
 *         <List.Title lines={1}>
 *           <List.Action props={{ href: '/inbox/42' }}>Ada Lovelace</List.Action>
 *         </List.Title>
 *         <List.Meta>9:41</List.Meta>
 *       </List.Row>
 *       <List.Description lines={2}>The engine might compose elaborate pieces of music.</List.Description>
 *     </List.Content>
 *   </List.Item>
 * </List>
 * ```
 *
 * **An item is a flex row of three slots** — `List.Media` leading, `List.Content` taking the room, `List.End`
 * trailing — and the content is a column of `List.Row`s: the main row with the title and its time, a
 * `secondary` one under it. Any part may be left out, and an item can be a bare row of anything.
 *
 * **One action covers the whole item.** `List.Action` goes in the title and its `::after` stretches over the
 * item, so the whole row presses while the name a reader hears is the title alone. It is an `<a>` with an
 * `href`, a `<label>` with an `htmlFor` (the row ticks its checkbox) and a `<button>` otherwise. A control of
 * its own — a switch, a menu — goes in `List.Actions`, which sits above it.
 *
 * **The look is the list's**: dividers by default, `variant="plain"`, `"card"` (one framed block) or
 * `"separated"` (a frame round each item). It reaches the items as custom properties, since a list renders on
 * a server and has no context to pass — `--list-divider`, `--list-divider-inset`, `--list-item-frame`,
 * `--list-item-radius` and `--list-sticky-top` are all yours to set with `vars`.
 *
 * @a11y A `<ul role="list">`: the role is spelled out because Safari drops a list's semantics once its items
 * lose their markers. `tag="ol"` makes it an ordered one.
 * @a11y `List.Action`'s name is its own text, not the whole item's — a reader hears "Ada Lovelace, link",
 * not every value in the row.
 * @a11y A list is not a composite widget: every action is its own tab stop and the arrow keys stay the
 * page's. For arrow-key selection among options, that is a listbox — `Combobox` or `Select`.
 * @keyboard Tab — Each item's action, then each control in its `List.Actions`.
 * @keyboard Enter — Follows the action's link or presses its button; Space presses a button.
 */
function ListImpl<TKey extends keyof ComponentsAndVariants = 'list'>(props: ListProps<TKey>, ref: Ref<HTMLUListElement>) {
  const { props: tagProps, ...restProps } = props;

  return useBoxElement<'ul'>({ tag: 'ul', component: 'list', ...restProps, props: { role: 'list', ...tagProps } } as never, ref);
}

/** One thing in the list: a flex row of its parts. */
function ListItem<TKey extends keyof ComponentsAndVariants = 'list.item'>(props: ListItemProps<TKey>, ref: Ref<HTMLLIElement>) {
  const { size = 'md', wrap = false, selected = false, chevron = false, variant, children, ...restProps } = props;

  return useBoxElement<'li'>(
    {
      tag: 'li',
      component: 'list.item',
      ...withDefaults({ ...ITEM, ...ITEM_SIZES[size], ...(wrap ? { flexWrap: 'wrap' } : {}) }, restProps),
      variant: [variant, { selected }],
      children: chevron ? (
        <>
          {children}
          <ListChevron />
        </>
      ) : (
        children
      ),
    } as never,
    ref,
  );
}

/** The chevron that ends a drill-in item, pointing along the reading order. */
function ListChevron() {
  return useBoxElement({
    tag: 'span',
    component: 'list.muted',
    display: 'flex',
    flexShrink: 0,
    alignSelf: 'center',
    rtl: { flip: 'xAxis' },
    props: { 'aria-hidden': true },
    children: (
      <Svg viewBox="0 0 16 16" width="1rem" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <Path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  } as never);
}

/** The leading slot: its shape is the size its `variant` names. */
function ListMediaImpl<TKey extends keyof ComponentsAndVariants = 'list.media'>(props: ListPartProps<TKey>, ref: Ref<HTMLDivElement>) {
  const shape = classNames(props.variant as never).find((name) => name in MEDIA_SHAPES);

  return useBoxElement({ component: 'list.media', ...MEDIA, ...(shape ? MEDIA_SHAPES[shape] : {}), ...props } as never, ref);
}

/** A row inside `List.Content`: its parts side by side, the last at the end. */
function ListRow<TKey extends keyof ComponentsAndVariants = never>(props: ListRowProps<TKey>, ref: Ref<HTMLDivElement>) {
  const { wrap = false, secondary = false, ...restProps } = props;

  return useBoxElement(
    {
      ...(secondary ? { component: 'list.muted', ...SECONDARY } : {}),
      ...ROW,
      ...(wrap ? ROW_WRAP : {}),
      ...restProps,
    } as never,
    ref,
  );
}

/** A text part that can stop after a number of lines. A `<span>` displayed as a block, so it may sit inside an `<a>` or a `<button>`. */
function textPart(part: keyof typeof TEXT, displayName: string) {
  const muted = part !== 'list.title';

  return boxComponent((props: ListTextProps, ref: Ref<HTMLSpanElement>) => {
    const { lines, ...restProps } = props;
    const defaults = lines ? withDefaults(TEXT[part], LINES[lines]) : TEXT[part];

    return useBoxElement<'span'>(
      { tag: 'span', ...(muted ? { component: 'list.muted' } : {}), ...withDefaults(defaults, restProps) } as never,
      ref,
    );
  }, displayName);
}

/** The item's one primary action, stretched over the whole item. */
function ListAction<TKey extends keyof ComponentsAndVariants = 'list.action'>(props: ListActionProps<TKey>, ref: Ref<HTMLButtonElement>) {
  const { props: tagProps, tag, onClick, ...restProps } = props;
  // The element follows from what it is given: somewhere to go is a link, a control to tick is its label.
  const element = tag ?? (tagProps?.href !== undefined ? 'a' : tagProps?.htmlFor !== undefined ? 'label' : 'button');

  return useBoxElement<'button'>(
    {
      tag: element,
      component: 'list.action',
      ...withDefaults(ACTION, restProps),
      props: { ...(element === 'button' ? { type: 'button' } : {}), 'data-list-action': '', ...tagProps, ...(onClick ? { onClick } : {}) },
    } as never,
    ref,
  );
}

/** A labelled value: a `<dt>` and a `<dd>` in a `<div>`, which is the one wrapper a `<dl>` allows. */
function ListField<TKey extends keyof ComponentsAndVariants = never>(props: ListFieldProps<TKey>, ref: Ref<HTMLDivElement>) {
  const { label, children, ...restProps } = props;

  return useBoxElement(
    {
      minWidth: 0,
      ...restProps,
      children: (
        <>
          <FieldLabel>{label}</FieldLabel>
          <FieldValue>{children}</FieldValue>
        </>
      ),
    } as never,
    ref,
  );
}

function FieldLabel({ children }: { children?: React.ReactNode }) {
  return useBoxElement({ tag: 'dt', component: 'list.muted', fontSize: 12, lineHeight: 16, children } as never);
}

function FieldValue({ children }: { children?: React.ReactNode }) {
  return useBoxElement({
    tag: 'dd',
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    css: { overflowWrap: 'anywhere', ...TABULAR },
    children,
  } as never);
}

/** A section of the list: its label, then its own `<ul>` of items. */
function ListGroup<TKey extends keyof ComponentsAndVariants = never>(props: ListGroupProps<TKey>, ref: Ref<HTMLLIElement>) {
  const { label, level, sticky = false, children, ...restProps } = props;

  return useBoxElement<'li'>(
    {
      tag: 'li',
      ...restProps,
      children: (
        <>
          <GroupLabel level={level} sticky={sticky}>
            {label}
          </GroupLabel>
          <GroupItems>{children}</GroupItems>
        </>
      ),
    } as never,
    ref,
  );
}

function GroupLabel({ level, sticky, children }: { level?: ListGroupLevel; sticky: boolean; children?: React.ReactNode }) {
  // The one place `tag` is right rather than a shortcut: the element *is* the level.
  return useBoxElement({
    tag: level ? HEADINGS[level - 1] : 'div',
    component: 'list.label',
    px: 4,
    py: 1.5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    // Above the items' covering actions, and as far down as `--list-sticky-top` says — clear of an app's header.
    ...(sticky ? { position: 'sticky', zIndex: 2, css: { top: 'var(--list-sticky-top, 0)' } } : {}),
    children,
  } as never);
}

function GroupItems({ children }: { children?: React.ReactNode }) {
  return useBoxElement({ tag: 'ul', props: { role: 'list' }, children } as never);
}

/** A plain part: one element, its defaults under whatever it is given. */
function part<TTag extends keyof React.JSX.IntrinsicElements>(tag: TTag, defaults: BoxComponentStyles, displayName: string, muted = false) {
  return boxComponent(
    (props: BoxProps<TTag>, ref: Ref<ExtractElementFromTag<TTag>>) =>
      useBoxElement({ tag, ...(muted ? { component: 'list.muted' } : {}), ...withDefaults(defaults, props) } as never, ref),
    displayName,
  );
}

interface ListType {
  <TKey extends keyof ComponentsAndVariants = 'list'>(props: ListProps<TKey> & RefAttributes<HTMLUListElement>): React.ReactNode;
  /** One thing in the list: a flex row of `Media`, `Content`, `End` and `Actions`. */
  Item: <TKey extends keyof ComponentsAndVariants = 'list.item'>(
    props: ListItemProps<TKey> & RefAttributes<HTMLLIElement>,
  ) => React.ReactNode;
  /** The leading slot: an icon, an avatar, a thumbnail. `variant` is `icon`, `avatar` or `image`. */
  Media: <TKey extends keyof ComponentsAndVariants = 'list.media'>(props: Part<'div', TKey>) => React.ReactNode;
  /** The middle, taking the room: a column of rows and text. */
  Content: <TKey extends keyof ComponentsAndVariants = never>(props: Part<'div', TKey>) => React.ReactNode;
  /** A row of parts inside the content — the main line, or a `secondary` one. */
  Row: <TKey extends keyof ComponentsAndVariants = never>(props: ListRowProps<TKey> & RefAttributes<HTMLDivElement>) => React.ReactNode;
  /** A small line above the title. */
  Overline: <TKey extends keyof ComponentsAndVariants = never>(
    props: ListOverlineProps<TKey> & RefAttributes<HTMLSpanElement>,
  ) => React.ReactNode;
  /** The item's name. */
  Title: <TKey extends keyof ComponentsAndVariants = never>(
    props: ListTitleProps<TKey> & RefAttributes<HTMLSpanElement>,
  ) => React.ReactNode;
  /** Muted supporting text. */
  Description: <TKey extends keyof ComponentsAndVariants = never>(
    props: ListDescriptionProps<TKey> & RefAttributes<HTMLSpanElement>,
  ) => React.ReactNode;
  /** A small value that never wraps: a time, a count. */
  Meta: <TKey extends keyof ComponentsAndVariants = never>(props: Part<'span', TKey>) => React.ReactNode;
  /** The trailing slot: a value and its label, stacked and aligned to the end. */
  End: <TKey extends keyof ComponentsAndVariants = never>(props: Part<'div', TKey>) => React.ReactNode;
  /** Controls of the item's own, above the action that covers it. */
  Actions: <TKey extends keyof ComponentsAndVariants = never>(props: Part<'div', TKey>) => React.ReactNode;
  /** The item's primary action, covering the whole item. */
  Action: <TKey extends keyof ComponentsAndVariants = 'list.action'>(
    props: ListActionProps<TKey> & RefAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  /** A `<dl>` of `List.Field`s, as many to a line as fit. */
  Fields: <TKey extends keyof ComponentsAndVariants = never>(props: Part<'dl', TKey>) => React.ReactNode;
  /** One labelled value. */
  Field: <TKey extends keyof ComponentsAndVariants = never>(props: ListFieldProps<TKey> & RefAttributes<HTMLDivElement>) => React.ReactNode;
  /** A labelled section of items. */
  Group: <TKey extends keyof ComponentsAndVariants = never>(props: ListGroupProps<TKey> & RefAttributes<HTMLLIElement>) => React.ReactNode;
  displayName?: string;
}

/** The leading slot: an icon, an avatar, a thumbnail — `variant` is `icon`, `avatar` or `image`, or none for a bare icon. */
const ListMedia = boxComponent(ListMediaImpl, 'List.Media');

/** The middle of an item, taking the room: a column of rows and text, which may shrink past its content. */
const ListContent = part('div', PARTS.content, 'List.Content');

/** A small line above the title: an id, a date, a category. */
const ListOverline = textPart('list.overline', 'List.Overline');

/** The item's name, and where its `List.Action` goes. */
const ListTitle = textPart('list.title', 'List.Title');

/** Muted supporting text under the title. */
const ListDescription = textPart('list.description', 'List.Description');

/** A small muted value that never wraps — a time, a count — in tabular figures. */
const ListMeta = part('span', PARTS.meta, 'List.Meta', true);

/** The trailing slot: a value and its label, stacked and aligned to the end so a column of them lines up. */
const ListEnd = part('div', PARTS.end, 'List.End');

/** Controls of the item's own — a switch, a menu, a checkbox — lifted above the action that covers the item. */
const ListActions = part('div', PARTS.actions, 'List.Actions');

/** A `<dl>` of `List.Field`s, as many to a line as fit at 8rem each. */
const ListFields = part('dl', PARTS.fields, 'List.Fields');

const List = boxComponent(ListImpl, 'List') as unknown as ListType;
List.Item = boxComponent(ListItem, 'List.Item') as ListType['Item'];
List.Media = ListMedia as ListType['Media'];
List.Content = ListContent as ListType['Content'];
List.Row = boxComponent(ListRow, 'List.Row') as ListType['Row'];
List.Overline = ListOverline as ListType['Overline'];
List.Title = ListTitle as ListType['Title'];
List.Description = ListDescription as ListType['Description'];
List.Meta = ListMeta as ListType['Meta'];
List.End = ListEnd as ListType['End'];
List.Actions = ListActions as ListType['Actions'];
List.Action = boxComponent(ListAction, 'List.Action') as ListType['Action'];
List.Fields = ListFields as ListType['Fields'];
List.Field = boxComponent(ListField, 'List.Field') as ListType['Field'];
List.Group = boxComponent(ListGroup, 'List.Group') as ListType['Group'];

export default List;
