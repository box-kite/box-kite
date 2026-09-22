/**
 * The editor half of the playground: a real `<textarea>` with a highlighted copy behind it. A textarea
 * rather than a code-editor dependency, because it is the one control that already has the caret, the
 * selection, undo, IME input and a screen reader's forms mode — all of which a `contenteditable` gives up.
 *
 * The two layers have to share every metric that decides where a glyph lands, so the font, the size, the
 * line height and the padding are declared once and spread on both. The font is the one value with no prop
 * for it, which is what `css` is for.
 */
import { KeyboardEvent, UIEvent, useMemo, useRef } from 'react';
import Box, { BoxProps } from '../../src/box';
import Textarea from '../../src/components/textarea';
import highlight from '../site/highlight';

/**
 * Two elements, one glyph grid: anything that moves a character has to be set on both layers. `satisfies`
 * rather than a `BoxProps` annotation, so what spreads is these six props — the whole shape would bring
 * `required` with it, which `Textarea` claims as an attribute of its own.
 */
const metrics = {
  fontSize: 13,
  lineHeight: 22,
  p: 4,
  m: 0,
  whiteSpace: 'pre',
  css: { fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace", tabSize: 2 },
} satisfies BoxProps;

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** What a screen reader calls the field: there is no visible label, and a placeholder is not a name. */
  label: string;
}

export default function PlaygroundEditor({ value, onChange, label }: Props) {
  const behind = useRef<HTMLPreElement>(null);

  // A trailing newline keeps the highlighted layer as tall as the textarea while the caret sits on a blank
  // last line, so the two never scroll apart by one row.
  const highlighted = useMemo(() => highlight(`${value}\n`, 'jsx') ?? '', [value]);

  /**
   * Tab indents rather than leaving the field. Escape first is what keeps that legal: a reader who wants
   * out presses Escape and then Tab, which is WCAG 2.1.2's documented way round for a code editor.
   */
  function keyHandler(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

    const element = event.currentTarget;
    const { selectionStart, selectionEnd } = element;

    event.preventDefault();
    onChange(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`);
    // The new value arrives on the next render, so the caret is put back once it has.
    requestAnimationFrame(() => element.setSelectionRange(selectionStart + 2, selectionStart + 2));
  }

  function scrollHandler(event: UIEvent<HTMLTextAreaElement>) {
    if (!behind.current) return;

    behind.current.scrollTop = event.currentTarget.scrollTop;
    behind.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  return (
    <Box position="relative" height="fit" overflow="hidden" bgColor="code-bg">
      <Box tag="pre" ref={behind} {...metrics} position="absolute" inset={0} overflow="hidden" props={{ 'aria-hidden': 'true' }}>
        <Box tag="code" className="language-jsx" props={{ dangerouslySetInnerHTML: { __html: highlighted } }} />
      </Box>

      <Textarea
        {...metrics}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
        props={{
          'aria-label': label,
          onKeyDown: keyHandler,
          onScroll: scrollHandler,
          spellCheck: false,
          autoCapitalize: 'off',
          autoCorrect: 'off',
          wrap: 'off',
        }}
      />
    </Box>
  );
}
