import { ComponentType, isValidElement, ReactNode } from 'react';
import Box from '../box';
import { H1, H2, H3, H4, H5, H6, Img, Li, Link, Ol, P, Ul } from './semantics';

/**
 * Box Kite's half of a markdown renderer: the `components` map that `react-markdown`, `streamdown` and
 * every other renderer built on that shape already takes, with the engine's own classes in it.
 *
 * The dependency is deliberately **not** taken. Streamdown — the hardened streaming renderer this would
 * otherwise wrap — asks a project for a Tailwind `@source` line pointing into its `dist/` and for
 * shadcn's design tokens in a global stylesheet, which is the one thing this library exists not to need;
 * and a parser is a choice an app has usually already made. So what ships is the half that is ours, and
 * it works with whichever renderer is already there.
 */

/**
 * What a renderer hands one of these components. A superset of what any single node uses, which is what
 * makes the map assignable to `react-markdown`'s own `Components` type without importing it.
 */
export interface MarkdownNodeProps {
  children?: ReactNode;
  /** A fenced block's `language-ts`, and nothing else the map reads. */
  className?: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  /** A task list's box. `null` is a list item that is not one. */
  checked?: boolean | null;
  /** Where an ordered list starts, when the source said. */
  start?: number;
}

export type MarkdownComponents = Record<string, ComponentType<MarkdownNodeProps>>;

/** `language-ts` → `ts`. A fence with no language is `''`, and nothing is drawn for it. */
function languageOf(className?: string): string {
  const match = /(?:^|\s)language-([\w+-]+)/.exec(className ?? '');

  return match ? match[1] : '';
}

const heading = (Component: typeof H1, level: 1 | 2 | 3 | 4 | 5 | 6) =>
  function MarkdownHeading({ children }: MarkdownNodeProps) {
    return (
      <Component component="markdown.heading" variant={`level${level}`}>
        {children}
      </Component>
    );
  };

function MarkdownParagraph({ children }: MarkdownNodeProps) {
  return <P component="markdown.paragraph">{children}</P>;
}

/**
 * `rel="noreferrer"` on every link, which costs nothing. Whether the URL is safe at all is the renderer's
 * `urlTransform`/`defaultUrlTransform`, because by the time a component is called the href has been parsed.
 */
function MarkdownLink({ children, href, title }: MarkdownNodeProps) {
  return (
    <Link component="markdown.link" props={{ href, title, rel: 'noreferrer' }}>
      {children}
    </Link>
  );
}

function MarkdownList({ children }: MarkdownNodeProps) {
  return <Ul component="markdown.list">{children}</Ul>;
}

function MarkdownOrderedList({ children, start }: MarkdownNodeProps) {
  return (
    <Ol component="markdown.list" variant={{ ordered: true }} props={{ start }}>
      {children}
    </Ol>
  );
}

function MarkdownItem({ children }: MarkdownNodeProps) {
  return <Li component="markdown.item">{children}</Li>;
}

function MarkdownQuote({ children }: MarkdownNodeProps) {
  return (
    <Box tag="blockquote" component="markdown.quote">
      {children}
    </Box>
  );
}

/** Inline code only: a fenced block never reaches here, because `pre` renders the fence itself. */
function MarkdownCode({ children }: MarkdownNodeProps) {
  return (
    <Box tag="code" component="markdown.code">
      {children}
    </Box>
  );
}

/**
 * The fence, unwrapped. A renderer hands `pre` a `<code>` element rather than the text, and reading
 * through it here is what keeps the inline chip and the block surface two separate styles — the
 * alternative is a `pre code { … }` descendant rule, which is a stylesheet.
 */
function MarkdownPre({ children }: MarkdownNodeProps) {
  const fence = isValidElement<MarkdownNodeProps>(children) ? children.props : undefined;
  const language = languageOf(fence?.className);

  return (
    <Box tag="pre" component="markdown.codeBlock">
      {language !== '' && (
        <Box tag="span" component="markdown.codeBlock.language">
          {language}
        </Box>
      )}
      <Box tag="code" component="markdown.codeBlock.code">
        {fence ? fence.children : children}
      </Box>
    </Box>
  );
}

function MarkdownRule() {
  return <Box tag="hr" component="markdown.rule" />;
}

function MarkdownImage({ src, alt, title }: MarkdownNodeProps) {
  return <Img component="markdown.image" props={{ src, alt, title }} />;
}

// Every part of a table says its own `display`: Box is `display: block` by default, so without these a
// table is a stack of lines.
function MarkdownTable({ children }: MarkdownNodeProps) {
  return (
    <Box component="markdown.tableWrap">
      <Box tag="table" component="markdown.table">
        {children}
      </Box>
    </Box>
  );
}

const tableSection = (tag: 'thead' | 'tbody', display: 'table-header-group' | 'table-row-group') =>
  function MarkdownTableSection({ children }: MarkdownNodeProps) {
    return (
      <Box tag={tag} display={display}>
        {children}
      </Box>
    );
  };

function MarkdownRow({ children }: MarkdownNodeProps) {
  return (
    <Box tag="tr" component="markdown.row">
      {children}
    </Box>
  );
}

const cell = (tag: 'th' | 'td', header: boolean) =>
  function MarkdownCell({ children }: MarkdownNodeProps) {
    return (
      <Box tag={tag} component="markdown.cell" variant={{ header }}>
        {children}
      </Box>
    );
  };

const inline = (tag: 'strong' | 'em' | 'del') =>
  function MarkdownInline({ children }: MarkdownNodeProps) {
    return (
      <Box tag={tag} component="markdown.inline" variant={tag === 'del' ? { struck: true } : { strong: tag === 'strong' }}>
        {children}
      </Box>
    );
  };

/** A task list's box, which `remark-gfm` renders as a disabled checkbox rather than as a character. */
function MarkdownCheckbox({ checked }: MarkdownNodeProps) {
  return <Box tag="input" component="markdown.checkbox" disabled props={{ type: 'checkbox', defaultChecked: checked === true }} />;
}

/**
 * Markdown rendered with Box components — the map a renderer takes, so an agent's prose is themed,
 * restylable and needs no stylesheet.
 *
 * ```tsx
 * import Markdown from 'react-markdown';
 * import { markdownComponents } from '@box-kite/react/components/markdown';
 *
 * <Box component="markdown">
 *   <Markdown components={markdownComponents}>{message}</Markdown>
 * </Box>
 * ```
 *
 * **It is a constant, not a factory, and that matters while streaming.** A map built inside render is a
 * new set of component *types* every token, and React unmounts and rebuilds the whole tree for each one.
 * Override a node by spreading — `{ ...markdownComponents, h1: MyHeading }` — at module scope.
 *
 * **Whether a URL is safe is the renderer's**, not this map's: by the time a component is called the href
 * has already been parsed, so `urlTransform` (react-markdown) or `defaultUrlTransform` (Streamdown) is
 * where a `javascript:` link is refused. What is set here is `rel="noreferrer"`, which costs nothing.
 *
 * Wrapping the renderer in `<Box component="markdown">` is what gives the block its size and colour; the
 * nodes inherit from it, so restyling the prose is one place.
 */
export const markdownComponents: MarkdownComponents = {
  h1: heading(H1, 1),
  h2: heading(H2, 2),
  h3: heading(H3, 3),
  h4: heading(H4, 4),
  h5: heading(H5, 5),
  h6: heading(H6, 6),
  p: MarkdownParagraph,
  a: MarkdownLink,
  ul: MarkdownList,
  ol: MarkdownOrderedList,
  li: MarkdownItem,
  blockquote: MarkdownQuote,
  code: MarkdownCode,
  pre: MarkdownPre,
  hr: MarkdownRule,
  img: MarkdownImage,
  table: MarkdownTable,
  thead: tableSection('thead', 'table-header-group'),
  tbody: tableSection('tbody', 'table-row-group'),
  tr: MarkdownRow,
  th: cell('th', true),
  td: cell('td', false),
  strong: inline('strong'),
  em: inline('em'),
  del: inline('del'),
  input: MarkdownCheckbox,
};

export default markdownComponents;
