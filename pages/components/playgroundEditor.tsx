/**
 * The editor half of the playground: a real `<textarea>` with a highlighted copy behind it. A textarea
 * rather than a code-editor dependency, because it is the one control that already has the caret, the
 * selection, undo, IME input and a screen reader's forms mode — all of which a `contenteditable` gives up.
 *
 * The two layers have to share every metric that decides where a glyph lands, so the font, the size, the
 * line height and the padding are declared once and spread on both. The font is the one value with no prop
 * for it, which is what `css` is for. The colours behind are VS Code's Dark+, read off a Lezer tree
 * (`pages/site/playgroundTokens.ts`), and each one is a Box class rather than a stylesheet. Until that
 * parser has loaded, the site's own Prism highlighting stands in.
 */
import { ChangeEvent, KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxClassNameProps, BoxProps, useClassNames } from '../../src/box';
import Textarea from '../../src/components/textarea';
import highlight from '../site/highlight';
import { accept, complete, Completion, MONO_FONT, opensOn, optionId } from '../site/playgroundCompletion';
import { completionContext } from '../site/playgroundContext';
import type { TokenKind } from '../site/playgroundTokens';
import { PlaygroundCompletions } from '../site/playgroundVocabulary';
import PlaygroundCompletion from './playgroundCompletion';

/** One line, in px — the anchor under the caret is exactly this tall so the popup opens below the line. */
const LINE = 22;
/** The line-number column, on the ÷4 scale. */
const GUTTER = 10;

// Inline, because every Box class carries the base `display: block` and a token is a run of text.
const hex = (color: string, rest: BoxClassNameProps = {}): BoxClassNameProps => ({
  display: 'inline',
  ...rest,
  css: { color, ...rest.css },
});

/** VS Code's Dark+, by token. Hex through `css`, because these are VS Code's colours rather than the palette's. */
const TOKEN_STYLES: Record<TokenKind, BoxClassNameProps> = {
  keyword: hex('#569CD6'),
  control: hex('#C586C0'),
  string: hex('#CE9178'),
  number: hex('#B5CEA8'),
  literal: hex('#569CD6'),
  comment: hex('#6A9955', { fontStyle: 'italic' }),
  variable: hex('#9CDCFE'),
  function: hex('#DCDCAA'),
  property: hex('#9CDCFE'),
  type: hex('#4EC9B0'),
  operator: hex('#D4D4D4'),
  bracket0: hex('#FFD700'),
  bracket1: hex('#DA70D6'),
  bracket2: hex('#179FFF'),
  tagPunctuation: hex('#808080'),
  tag: hex('#569CD6'),
  component: hex('#4EC9B0'),
  text: hex('#D4D4D4'),
  styleProp: hex('#9CDCFE'),
  nestingProp: hex('#C586C0'),
  componentProp: hex('#4FC1FF'),
  event: hex('#DCDCAA'),
  reserved: hex('#569CD6', { fontStyle: 'italic' }),
  // A name the tag does not take is dropped without a word, which is exactly what a squiggle is for.
  unknownProp: hex('#9CDCFE', {
    css: { textDecorationLine: 'underline', textDecorationStyle: 'wavy', textDecorationColor: '#F48771', textUnderlineOffset: '3px' },
  }),
};

const TOKEN_KINDS = Object.keys(TOKEN_STYLES) as TokenKind[];

/** One class per token kind: a hook per kind, in a fixed order, since the record above never changes shape. */
function useTokenClasses(): Record<TokenKind, string> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const names = TOKEN_KINDS.map((kind) => useClassNames(TOKEN_STYLES[kind]).className ?? '');
  const key = names.join(' ');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Object.fromEntries(TOKEN_KINDS.map((kind, index) => [kind, names[index]])) as Record<TokenKind, string>, [key]);
}

/**
 * Two elements, one glyph grid: anything that moves a character has to be set on both layers. `satisfies`
 * rather than a `BoxProps` annotation, so what spreads is these six props — the whole shape would bring
 * `required` with it, which `Textarea` claims as an attribute of its own.
 */
const metrics = {
  fontSize: 13,
  lineHeight: LINE,
  p: 4,
  pl: GUTTER + 3,
  m: 0,
  whiteSpace: 'pre',
  css: { fontFamily: MONO_FONT, tabSize: 2 },
} satisfies BoxProps;

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** What a screen reader calls the field: there is no visible label, and a placeholder is not a name. */
  label: string;
  /** Props and values to offer while typing; null until they have loaded, and the editor works without them. */
  completions?: PlaygroundCompletions | null;
}

/** The width of one glyph in the textarea's font, which is monospaced — so a column is a multiplication. */
function glyphWidth(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return 8;

  context.font = `${style.fontSize} ${style.fontFamily}`;

  return context.measureText('0'.repeat(20)).width / 20;
}

export default function PlaygroundEditor({ value, onChange, label, completions }: Props) {
  const behind = useRef<HTMLPreElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const listId = useId();

  const [completion, setCompletion] = useState<Completion | null>(null);
  const [active, setActive] = useState(0);
  const [anchorAt, setAnchorAt] = useState({ left: 0, top: 0 });
  // An edit of our own (an indent, a suggestion taken) sets the caret once React has rendered the value.
  const pending = useRef<{ caret: number; reopen: boolean } | null>(null);
  // Escape, then Tab, leaves the field: WCAG 2.1.2's documented way out of an editor that keeps Tab.
  const escaped = useRef(false);
  const glyph = useRef(0);

  // A trailing newline keeps the highlighted layer as tall as the textarea while the caret sits on a blank
  // last line, so the two never scroll apart by one row.
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [caretLine, setCaretLine] = useState<number | null>(null);

  const classes = useTokenClasses();
  const highlighted = useMemo(() => {
    const source = `${value}\n`;

    return completions ? completions.highlight(source, classes) : (highlight(source, 'jsx') ?? '');
  }, [value, completions, classes]);
  const lines = useMemo(() => value.split('\n').length, [value]);

  function trackCaret(element: HTMLTextAreaElement) {
    setCaretLine(element.value.slice(0, element.selectionStart).split('\n').length - 1);
  }

  function close() {
    setCompletion(null);
  }

  /** Puts the anchor where the word being completed starts, so the popup does not slide along as it is typed. */
  function place(source: string, offset: number) {
    const element = field.current;
    if (!element) return;

    glyph.current ||= glyphWidth(element);
    const lines = source.slice(0, offset).split('\n');
    const style = getComputedStyle(element);

    setAnchorAt({
      left: parseFloat(style.paddingLeft) + lines[lines.length - 1].length * glyph.current - element.scrollLeft,
      top: parseFloat(style.paddingTop) + (lines.length - 1) * LINE - element.scrollTop,
    });
  }

  /** Recomputes the popup for the caret, opening it only when asked to; `null` closes it. */
  function refresh(source: string, caret: number, open: boolean) {
    if (!completions || (!open && !completion)) return;

    const context = completionContext(source, caret);
    const next = context ? complete(completions.vocabulary, context) : null;
    // A value with no list still has a type to show; anything else with nothing to offer closes.
    const worthShowing = next && (next.suggestions.length || (next.context.kind === 'value' && next.shape?.types.length));
    if (!next || !worthShowing) return close();

    const moved = completion?.context.from !== next.context.from || completion?.context.kind !== next.context.kind;
    setCompletion(next);
    if (moved || completion?.context.query !== next.context.query) setActive(0);
    if (moved) place(source, next.context.from);
  }

  useLayoutEffect(() => {
    const element = field.current;
    const edit = pending.current;
    if (!element || !edit) return;

    pending.current = null;
    element.setSelectionRange(edit.caret, edit.caret);
    if (edit.reopen) refresh(value, edit.caret, true);
    else close();
    // Only when a value we wrote has arrived.
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function write(source: string, caret: number, reopen = false) {
    pending.current = { caret, reopen };
    onChange(source);
  }

  function pick(index: number) {
    const suggestion = completion?.suggestions[index];
    if (!completion || !suggestion) return;

    const edit = accept(value, completion, suggestion);
    write(edit.source, edit.caret, edit.reopen);
  }

  function changeHandler(event: ChangeEvent<HTMLTextAreaElement>) {
    const { value: source, selectionStart } = event.target;
    const typed = (event.nativeEvent as InputEvent).data ?? '';

    onChange(source);

    const context = completionContext(source, selectionStart);
    // A space after a name is the end of it, the way an editor reads one.
    if (completion && /^\s$/.test(typed) && context?.kind !== 'value') return close();
    refresh(source, selectionStart, !!completion || opensOn(typed, context));
  }

  function selectHandler() {
    const element = field.current;
    if (element) trackCaret(element);
    if (!element || !completion) return;
    if (element.selectionStart !== element.selectionEnd) return close();

    refresh(element.value, element.selectionStart, true);
  }

  function keyHandler(event: KeyboardEvent<HTMLTextAreaElement>) {
    const element = event.currentTarget;
    const plain = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
    const count = completion?.suggestions.length ?? 0;

    if (completion) {
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[event.key];
      if (step && count && !event.altKey) {
        event.preventDefault();
        setActive((index) => (Math.abs(step) === 1 ? (index + step + count) % count : Math.min(count - 1, Math.max(0, index + step))));
        return;
      }
      if ((event.key === 'Enter' || event.key === 'Tab') && plain && count) {
        event.preventDefault();
        pick(active);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
    }

    if (event.key === ' ' && event.ctrlKey) {
      event.preventDefault();
      refresh(element.value, element.selectionStart, true);
      return;
    }

    if (event.key === 'Escape') {
      escaped.current = true;
      return;
    }

    const leaving = escaped.current;
    escaped.current = false;
    // Tab indents rather than leaving the field — unless Escape came first, which is the way out.
    if (event.key !== 'Tab' || !plain || leaving) return;

    const { selectionStart, selectionEnd } = element;

    event.preventDefault();
    write(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`, selectionStart + 2);
  }

  function scrollHandler() {
    const element = field.current;
    if (!behind.current || !element) return;

    behind.current.scrollTop = element.scrollTop;
    behind.current.scrollLeft = element.scrollLeft;
    setScroll({ top: element.scrollTop, left: element.scrollLeft });
    if (completion) place(element.value, completion.context.from);
  }

  const options = completion?.suggestions.length ? completion : null;

  return (
    <Box position="relative" height="fit" overflow="hidden" bgColor="code-bg">
      {/* The line the caret is on, while the field has focus — offset by the scroll, so inline. */}
      {caretLine !== null ? (
        <Box
          position="absolute"
          left={0}
          right={0}
          height={LINE / 4}
          bgColor="white/4"
          bt={1}
          bb={1}
          borderColor="white/5"
          pointerEvents="none"
          style={{ top: 16 + caretLine * LINE - scroll.top }}
        />
      ) : null}

      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        width={GUTTER}
        overflow="hidden"
        pointerEvents="none"
        props={{ 'aria-hidden': 'true' }}
      >
        <Box {...metrics} p={0} pl={0} pr={3} textAlign="right" color="slate-600" style={{ translate: `0 ${16 - scroll.top}px` }}>
          {Array.from({ length: lines }, (_, line) => (
            <Box key={line} color={line === caretLine ? 'slate-300' : undefined}>
              {line + 1}
            </Box>
          ))}
        </Box>
      </Box>

      <Box tag="pre" ref={behind} {...metrics} position="absolute" inset={0} overflow="hidden" props={{ 'aria-hidden': 'true' }}>
        <Box
          tag="code"
          className={completions ? undefined : 'language-jsx'}
          css={{ color: '#D4D4D4' }}
          props={{ dangerouslySetInnerHTML: { __html: highlighted } }}
        />
      </Box>

      {/* Where the word being completed starts. Inline, like a slider thumb's offset: it moves with every keystroke. */}
      <Box ref={anchor} position="absolute" width={0} height={LINE / 4} pointerEvents="none" style={anchorAt} />

      <Textarea
        {...metrics}
        ref={field}
        value={value}
        onChange={changeHandler}
        position="relative"
        width="fit"
        height="fit"
        b={0}
        borderRadius={0}
        outlineStyle="none"
        resize="none"
        overflow="auto"
        bgColor="transparent"
        // The caret is what a reader follows; the glyphs it moves over are the coloured layer behind.
        color="transparent"
        caretColor="slate-100"
        selection={{ bgColor: 'sky-500/30' }}
        props={{
          'aria-label': label,
          'aria-autocomplete': completions ? 'list' : undefined,
          'aria-controls': options ? listId : undefined,
          'aria-activedescendant': options ? optionId(listId, active) : undefined,
          onKeyDown: keyHandler,
          onScroll: scrollHandler,
          onSelect: selectHandler,
          onBlur: () => {
            close();
            setCaretLine(null);
          },
          onFocus: (event) => trackCaret(event.currentTarget),
          spellCheck: false,
          autoCapitalize: 'off',
          autoCorrect: 'off',
          wrap: 'off',
        }}
      />

      {completion && completions ? (
        <PlaygroundCompletion
          id={listId}
          completion={completion}
          active={Math.min(active, Math.max(0, completion.suggestions.length - 1))}
          anchor={anchor}
          measure={completions.measure}
          onActiveChange={setActive}
          onPick={pick}
        />
      ) : null}
    </Box>
  );
}
