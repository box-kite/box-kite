/**
 * The editor half of the playground: a real `<textarea>` with a highlighted copy behind it. A textarea
 * rather than a code-editor dependency, because it is the one control that already has the caret, the
 * selection, undo, IME input and a screen reader's forms mode — all of which a `contenteditable` gives up.
 *
 * The two layers have to share every metric that decides where a glyph lands, so the font, the size, the
 * line height and the padding are declared once and spread on both. The font is the one value with no prop
 * for it, which is what `css` is for. The layer behind is the site's own highlighter, the one every code
 * block uses, and every colour in the editor is a part of the `code` style tree in `pages/extends.ts`.
 */
import { ChangeEvent, KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../../src/box';
import Textarea from '../../src/components/textarea';
import { accept, complete, Completion, MONO_FONT, opensOn, optionId } from '../site/playgroundCompletion';
import { completionContext } from '../site/playgroundContext';
import { PlaygroundCompletions } from '../site/playgroundVocabulary';
import CodeHighlight from './codeHighlight';
import PlaygroundCompletion from './playgroundCompletion';

/** One line, in px — the anchor under the caret is exactly this tall so the popup opens below the line. */
const LINE = 22;
/** The line-number column, on the ÷4 scale. */
const GUTTER = 10;

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

  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [caretLine, setCaretLine] = useState<number | null>(null);

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
    <Box component="code" position="relative" height="fit" overflow="hidden">
      {/* The line the caret is on, while the field has focus — offset by the scroll, so inline. */}
      {caretLine !== null ? (
        <Box
          component="code.currentLine"
          position="absolute"
          left={0}
          right={0}
          height={LINE / 4}
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
        <Box component="code.gutter" {...metrics} p={0} pl={0} pr={3} textAlign="right" style={{ translate: `0 ${16 - scroll.top}px` }}>
          {Array.from({ length: lines }, (_, line) => (
            <Box key={line} component="code.lineNumber" variant={{ current: line === caretLine }}>
              {line + 1}
            </Box>
          ))}
        </Box>
      </Box>

      <Box tag="pre" ref={behind} {...metrics} position="absolute" inset={0} overflow="hidden" props={{ 'aria-hidden': 'true' }}>
        {/* A trailing newline keeps this layer as tall as the textarea while the caret sits on a blank last
            line, so the two never scroll apart by one row. */}
        <Box tag="code" display="inline">
          <CodeHighlight source={`${value}\n`} classifier={completions?.classifier} />
        </Box>
      </Box>

      {/* Where the word being completed starts. Inline, like a slider thumb's offset: it moves with every keystroke. */}
      <Box ref={anchor} position="absolute" width={0} height={LINE / 4} pointerEvents="none" style={anchorAt} />

      <Textarea
        {...metrics}
        component="code.field"
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
