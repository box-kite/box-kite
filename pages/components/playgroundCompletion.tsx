/**
 * The playground's completion popup: the list and the card beside it. Rendering only — what is offered,
 * in what order and what taking it writes are `pages/site/playgroundCompletion.ts`'s. Focus never leaves
 * the textarea: the rows are `aria-activedescendant` options, and a press on the popup is swallowed so the
 * caret stays where it was.
 */
import { Braces, Component, CornerDownLeft, Hash, Layers, LucideIcon, Paintbrush, Search, Settings2, Zap } from 'lucide-react';
import { ReactNode, RefObject, useEffect, useRef } from 'react';
import Box, { BoxProps } from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Overlay from '../../src/components/overlay';
import {
  Completion,
  Entry,
  MONO_FONT,
  numberSamples,
  optionId,
  Suggestion,
  SuggestionKind,
  valueShape,
  ValueShape,
  writtenAs,
} from '../site/playgroundCompletion';

const mono = { css: { fontFamily: MONO_FONT } } satisfies BoxProps;

type Measure = (name: string, value: unknown) => string;
type Color = NonNullable<BoxProps['bgColor']>;

/** Past this many rows the list stops rendering and asks for more letters: 300 rows a keystroke is a lot of Box. */
const RENDERED = 80;

const KINDS: Record<SuggestionKind, { icon: LucideIcon; label: string; bg: Color; fg: NonNullable<BoxProps['color']> }> = {
  component: { icon: Component, label: 'Component', bg: 'pink-500/15', fg: 'pink-300' },
  prop: { icon: Settings2, label: 'Component prop', bg: 'emerald-500/15', fg: 'emerald-300' },
  style: { icon: Paintbrush, label: 'Style prop', bg: 'sky-500/15', fg: 'sky-300' },
  nesting: { icon: Layers, label: 'Nested styles', bg: 'violet-500/15', fg: 'violet-300' },
  event: { icon: Zap, label: 'Event', bg: 'amber-500/15', fg: 'amber-300' },
  reserved: { icon: Braces, label: 'Box prop', bg: 'slate-500/20', fg: 'slate-300' },
  value: { icon: Hash, label: 'Value', bg: 'teal-500/15', fg: 'teal-300' },
  color: { icon: Hash, label: 'Colour', bg: 'transparent', fg: 'slate-300' },
};

const NOUNS: Record<Completion['context']['kind'], string> = { tag: 'components', attribute: 'props', key: 'keys', value: 'values' };

interface Props {
  id: string;
  completion: Completion;
  active: number;
  /** The zero-width box standing where the word being completed starts. */
  anchor: RefObject<HTMLElement | null>;
  measure: Measure;
  onActiveChange(index: number): void;
  onPick(index: number): void;
}

export default function PlaygroundCompletion({ id, completion, active, anchor, measure, onActiveChange, onPick }: Props) {
  const { context, suggestions, entry, shape } = completion;
  const current = suggestions[active];
  const tooltip = context.kind === 'value' && !suggestions.length;

  return (
    <Overlay
      anchor={anchor}
      side="bottom"
      align="start"
      offset={1}
      matchWidth={false}
      minWidth={tooltip ? 60 : undefined}
      maxWidth={tooltip ? 90 : undefined}
      borderRadius={3}
      overflow="hidden"
      bgColor="slate-900/95"
      backdropBlur="md"
      ring={1}
      ringColor="slate-700"
      shadow="xl"
      color="slate-200"
      fontSize={13}
      transition="opacity"
      transitionDuration={120}
      startingStyle={{ opacity: 0 }}
      css={{ maxWidth: 'calc(100vw - 24px)' }}
      props={{ onMouseDown: (event) => event.preventDefault() }}
    >
      {tooltip ? (
        <TypeCard entry={entry!} shape={shape!} typed={completion.typed} measure={measure} />
      ) : (
        <Flex d="column">
          <Flex ai="center" gap={2} px={3} py={2} bb={1} borderColor="slate-800">
            <Icon size={3.5} color="slate-500">
              <Search />
            </Icon>
            <Flex flex1 minWidth={0} gap={1} {...mono} whiteSpace="nowrap" overflow="hidden">
              {context.kind === 'value' && entry ? (
                <Box color="sky-300">
                  {entry.name}
                  <Box tag="span" display="inline" color="slate-600">
                    {' ='}
                  </Box>
                </Box>
              ) : null}
              <Box color={context.query ? 'slate-100' : 'slate-500'}>{context.query || 'type to filter'}</Box>
            </Flex>
            <Box fontSize={11} color="slate-500" whiteSpace="nowrap">
              {suggestions.length} {NOUNS[context.kind]}
            </Box>
          </Flex>

          {suggestions.length ? (
            <Flex>
              <List id={id} completion={completion} active={active} measure={measure} onActiveChange={onActiveChange} onPick={onPick} />
              <Box
                display="none"
                md={{ display: 'block' }}
                width={64}
                maxHeight={72}
                overflowY="auto"
                bl={1}
                borderColor="slate-800"
                p={4}
                bgColor="slate-950/40"
              >
                {current ? <Details completion={completion} suggestion={current} measure={measure} /> : null}
              </Box>
            </Flex>
          ) : (
            <Box px={3} py={4} color="slate-500" width={72}>
              Nothing matches <Code>{context.query}</Code>.
            </Box>
          )}

          <Flex ai="center" gap={3} px={3} py={1.5} bt={1} borderColor="slate-800" fontSize={11} color="slate-500">
            <Hint keys="↑↓">choose</Hint>
            <Hint keys={<CornerDownLeft size={10} />}>or</Hint>
            <Hint keys="Tab">insert</Hint>
            <Hint keys="Esc">close</Hint>
          </Flex>
        </Flex>
      )}
    </Overlay>
  );
}

function List({ id, completion, active, measure, onActiveChange, onPick }: Omit<Props, 'anchor'>) {
  const list = useRef<HTMLDivElement>(null);
  const { suggestions, entry } = completion;
  const shown = suggestions.slice(0, Math.max(RENDERED, active + 20));

  // The active row stays in view as the arrows walk past the edge of the list.
  useEffect(() => {
    list.current?.querySelector(`#${CSS.escape(optionId(id, active))}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, active]);

  return (
    <Box
      ref={list}
      id={id}
      width={64}
      maxHeight={72}
      overflowY="auto"
      p={1}
      props={{ role: 'listbox', 'aria-label': `${NOUNS[completion.context.kind]} to insert` }}
    >
      {shown.map((suggestion, index) => (
        <Row
          key={suggestion.id}
          id={optionId(id, index)}
          suggestion={suggestion}
          selected={index === active}
          detail={rowDetail(suggestion, entry, measure)}
          onHover={() => index !== active && onActiveChange(index)}
          onPick={() => onPick(index)}
        />
      ))}
      {suggestions.length > shown.length ? (
        <Box px={2} py={1.5} fontSize={11} color="slate-500">
          {suggestions.length - shown.length} more — keep typing to narrow the list.
        </Box>
      ) : null}
    </Box>
  );
}

/** What a row says on its right: a value's CSS where there is one, the prop's type otherwise. */
function rowDetail(suggestion: Suggestion, entry: Entry | undefined, measure: Measure): string {
  if (suggestion.kind !== 'value' || !entry || entry.kind === 'prop') return suggestion.detail;

  const css = declaredValue(measure(entry.name, suggestion.value));

  // `none` writing `none` says nothing twice.
  return css === suggestion.label ? '' : css || suggestion.detail;
}

interface RowProps {
  id: string;
  suggestion: Suggestion;
  selected: boolean;
  detail: string;
  onHover(): void;
  onPick(): void;
}

function Row({ id, suggestion, selected, detail, onHover, onPick }: RowProps) {
  const deprecated = suggestion.entry?.deprecated;

  return (
    <Flex
      id={id}
      ai="center"
      gap={2}
      px={2}
      py={1}
      borderRadius={1.5}
      cursor="pointer"
      bgColor={selected ? 'sky-500/15' : 'transparent'}
      ring={selected ? 1 : 0}
      ringColor="sky-400/30"
      hover={{ bgColor: selected ? 'sky-500/15' : 'slate-800/60' }}
      props={{ role: 'option', 'aria-selected': selected, onMouseMove: onHover, onClick: onPick }}
    >
      {suggestion.kind === 'color' ? <Swatch token={String(suggestion.value)} size={4.5} /> : <KindBadge kind={suggestion.kind} />}
      <Box
        flex1
        minWidth={0}
        {...mono}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        color={deprecated ? 'slate-500' : 'slate-200'}
        textDecoration={deprecated ? 'line-through' : undefined}
      >
        <Highlighted label={suggestion.label} indices={suggestion.indices} />
        {suggestion.alias ? (
          <Box tag="span" display="inline" color="slate-500" fontSize={11} ml={2}>
            {suggestion.alias}
          </Box>
        ) : null}
      </Box>
      <Box
        fontSize={11}
        color={selected ? 'sky-200/80' : 'slate-500'}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        maxWidth={28}
        {...mono}
      >
        {detail}
      </Box>
    </Flex>
  );
}

function Highlighted({ label, indices }: { label: string; indices: number[] }) {
  if (!indices.length) return <>{label}</>;

  const matched = new Set(indices);

  return (
    <>
      {[...label].map((letter, index) =>
        matched.has(index) ? (
          <Box key={index} tag="span" display="inline" color="sky-300" fontWeight={700}>
            {letter}
          </Box>
        ) : (
          letter
        ),
      )}
    </>
  );
}

function KindBadge({ kind }: { kind: SuggestionKind }) {
  const { icon: Glyph, bg, fg, label } = KINDS[kind];

  return (
    <Flex flexShrink={0} jc="center" ai="center" width={4.5} height={4.5} borderRadius={1} bgColor={bg} color={fg} props={{ title: label }}>
      <Icon size={3}>
        <Glyph />
      </Icon>
    </Flex>
  );
}

function Swatch({ token, size }: { token: string; size: number }) {
  return <Box flexShrink={0} width={size} height={size} borderRadius={1} bgColor={token as Color} ring={1} ringColor="white/15" />;
}

function Details({ completion, suggestion, measure }: { completion: Completion; suggestion: Suggestion; measure: Measure }) {
  const { context, entry } = completion;

  if (context.kind === 'value' && entry) {
    const css = measure(entry.name, suggestion.value);

    return (
      <Flex d="column" gap={3}>
        <Heading kind={suggestion.kind === 'color' ? 'color' : 'value'} name={entry.name} tag={entry.category} />
        {suggestion.kind === 'color' ? (
          <Box height={12} borderRadius={2} bgColor={String(suggestion.value) as Color} ring={1} ringColor="white/15" />
        ) : null}
        <Written text={writtenAs(entry.name, suggestion.value)} css={css} />
        <Takes shape={completion.shape!} />
      </Flex>
    );
  }

  if (suggestion.kind === 'component') {
    return (
      <Flex d="column" gap={3}>
        <Heading kind="component" name={suggestion.label} />
        <Prose>{suggestion.description || 'A component in the playground’s scope.'}</Prose>
      </Flex>
    );
  }

  const item = suggestion.entry;
  if (!item) {
    return (
      <Flex d="column" gap={3}>
        <Heading kind={suggestion.kind} name={suggestion.label} tag={suggestion.detail} />
        <Prose>Nests styles under this key.</Prose>
      </Flex>
    );
  }

  const shape = valueShape(item.schema);

  return (
    <Flex d="column" gap={3}>
      <Heading kind={item.kind} name={item.name} tag={item.deprecated ? 'Deprecated' : (item.category ?? KINDS[item.kind].label)} />
      <Prose>{item.description}</Prose>
      {suggestion.alias ? (
        <Prose>
          Writes <Code>{suggestion.alias}</Code>.
        </Prose>
      ) : null}
      {item.nesting ? (
        <Section title="Compiles to">
          <Code>{item.nesting.compiles}</Code>
        </Section>
      ) : null}
      {item.example ? <Written text={writtenAs(item.name, item.example.value)} css={item.example.css} /> : null}
      {item.kind === 'style' || item.kind === 'prop' ? <Takes shape={shape} /> : null}
      {item.type ? (
        <Section title="Type">
          <Code>{item.type}</Code>
        </Section>
      ) : null}
    </Flex>
  );
}

/**
 * The tooltip a value with no list gets: what the prop takes, and what a few values of it write — so a
 * number's divider is read off the CSS rather than remembered.
 */
function TypeCard({ entry, shape, typed, measure }: { entry: Entry; shape: ValueShape; typed?: number; measure: Measure }) {
  const numeric = shape.types.some((hint) => hint.type === 'number');
  const samples = numeric ? numberSamples(entry.example?.value) : [];

  return (
    <Flex d="column" gap={3} p={4}>
      <Heading kind={entry.kind} name={entry.name} tag={entry.category ?? KINDS[entry.kind].label} />
      <Takes shape={shape} />
      {typed !== undefined ? <Written text={writtenAs(entry.name, typed)} css={measure(entry.name, typed)} /> : null}
      {samples.length ? (
        <Section title="Scale">
          <Box
            tag="table"
            display="table"
            width="fit"
            {...mono}
            fontSize={12}
            css={{ borderCollapse: 'collapse' }}
            props={{ 'aria-label': `What ${entry.name} writes` }}
          >
            <Box tag="tbody" display="table-row-group">
              {samples.map((sample) => (
                <Box key={sample} tag="tr" display="table-row">
                  <Box tag="td" display="table-cell" {...mono} py={0.5} pr={3} color="sky-300" whiteSpace="nowrap">
                    {sample}
                  </Box>
                  <Box tag="td" display="table-cell" {...mono} py={0.5} color="slate-300">
                    {declaredValue(measure(entry.name, sample)) || '—'}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Section>
      ) : entry.example ? (
        <Written text={writtenAs(entry.name, entry.example.value)} css={entry.example.css} />
      ) : null}
    </Flex>
  );
}

/** `line-height: 24px` → `24px`: in a table whose rows are all one prop, the property is noise. */
const declaredValue = (css: string) => css.slice(css.indexOf(':') + 1).trim();

function Takes({ shape }: { shape: ValueShape }) {
  const chips = [
    ...(shape.color ? ['a palette token', 'token/opacity'] : []),
    ...(shape.choices.length ? [`${shape.choices.length} named value${shape.choices.length === 1 ? '' : 's'}`] : []),
    ...shape.types.map((hint) => (hint.examples?.length ? `${hint.label} — ${hint.examples.join(', ')}` : hint.label)),
  ];
  if (!chips.length) return null;

  return (
    <Section title="Takes">
      <Flex gap={1.5} flexWrap="wrap">
        {chips.map((chip) => (
          <Box key={chip} px={2} py={0.5} borderRadius={10} bgColor="slate-800" color="slate-300" fontSize={11} whiteSpace="nowrap">
            {chip}
          </Box>
        ))}
      </Flex>
    </Section>
  );
}

function Written({ text, css }: { text: string; css: string }) {
  return (
    <Box borderRadius={2} bgColor="black/30" ring={1} ringColor="slate-800" p={2.5} {...mono} fontSize={12}>
      <Box color="slate-100" css={{ overflowWrap: 'anywhere' }}>
        {text}
      </Box>
      <Box color={css ? 'emerald-300' : 'rose-300'} mt={1} css={{ overflowWrap: 'anywhere' }}>
        {css ? `→ ${css}` : '→ no rule: the engine does not accept this value'}
      </Box>
    </Box>
  );
}

function Heading({ kind, name, tag }: { kind: SuggestionKind; name: string; tag?: string }) {
  return (
    <Flex ai="center" gap={2}>
      <KindBadge kind={kind} />
      <Box {...mono} fontSize={14} fontWeight={600} color="white">
        {name}
      </Box>
      {tag ? (
        <Box ml="auto" px={2} py={0.5} borderRadius={10} bgColor="slate-800" color="slate-400" fontSize={11} whiteSpace="nowrap">
          {tag}
        </Box>
      ) : null}
    </Flex>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Flex d="column" gap={1.5}>
      <Box fontSize={10} fontWeight={600} textTransform="uppercase" color="slate-500">
        {title}
      </Box>
      {children}
    </Flex>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <Box fontSize={12} lineHeight={18} color="slate-400">
      {children}
    </Box>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <Box tag="code" display="inline" {...mono} fontSize={12} color="slate-200" bgColor="slate-800" px={1} borderRadius={1}>
      {children}
    </Box>
  );
}

function Hint({ keys, children }: { keys: ReactNode; children: ReactNode }) {
  return (
    <Flex ai="center" gap={1}>
      <Flex ai="center" px={1} minWidth={4} jc="center" borderRadius={1} bgColor="slate-800" color="slate-300" {...mono} fontSize={10}>
        {keys}
      </Flex>
      {children}
    </Flex>
  );
}
