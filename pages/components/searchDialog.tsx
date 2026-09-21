import { CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentifier, useRovingFocus } from '../../src/a11y';
import Box from '../../src/box';
import Dialog from '../../src/components/dialog';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { Mark } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import { SearchIndex } from '../site/searchIndex';
import { SearchKind, SearchResult, searchDocs } from '../site/searchQuery';
import { Hint, loadSearchIndex } from './searchTrigger';

/**
 * Docs search (G5), and the chunk a reader only downloads once they search. The index is one JSON file
 * the build writes from the rendered pages (`pages/site/searchIndex.ts`), fetched the first time this
 * opens — 132 KB gzipped, which is why the trigger prefetches it on hover.
 *
 * The pattern is APG's combobox: a text field that owns focus, a listbox it names with
 * `aria-activedescendant`, and `<Dialog>` for the top layer, Escape and focus return. **The field keeps
 * its own keys** — only the two arrows and Enter are the list's, because Home, End and Space belong to
 * the caret in anything a reader types into, which is why `useRovingFocus`'s handler is filtered rather
 * than spread.
 */

/** Where a reader with nothing typed is pointed. */
const START_HERE = ['/installation', '/box', '/ai-context', '/datagrid', '/motion'];

const KIND_LABEL: Record<SearchKind, string> = { page: 'Page', section: 'Section', prop: 'Prop' };

type Row = Pick<SearchResult, 'href' | 'page' | 'title' | 'excerpt' | 'ranges' | 'kind'>;

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const identifier = useIdentifier('docs-search');
  const listId = `${identifier}-results`;
  const optionId = (position: number) => `${identifier}-option-${position}`;

  useEffect(() => {
    if (!open || index) return;

    let live = true;

    loadSearchIndex().then(
      (loaded) => live && setIndex(loaded),
      () => live && setFailed(true),
    );

    return () => {
      live = false;
    };
  }, [index, open]);

  const rows: Row[] = useMemo(() => {
    if (!index) return [];
    if (!query.trim()) return suggestions(index);

    return searchDocs(index, query);
  }, [index, query]);

  const roving = useRovingFocus({ count: rows.length, focusItems: false, loop: false });
  const { setActiveIndex } = roving;

  // A fresh query is a fresh list, so the highlight goes back to the top of it.
  const [previousQuery, setPreviousQuery] = useState(query);
  if (query !== previousQuery) {
    setPreviousQuery(query);
    setActiveIndex(0, { reason: 'programmatic' });
  }

  const { activeItem } = roving;

  useEffect(() => {
    activeItem()?.scrollIntoView({ block: 'nearest' });
  }, [activeItem, rows]);

  const close = () => {
    onOpenChange(false);
    setQuery('');
  };

  const go = (row: Row | undefined) => {
    if (!row) return;

    close();
    navigate(row.href);
  };

  const active = rows.length > 0 ? roving.activeIndex : -1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      label="Search the documentation"
      initialFocus={input}
      width={160}
      mt={8}
      sm={{ mt: 20 }}
      p={0}
      borderRadius={4}
      overflow="hidden"
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-700', color: 'slate-100' },
        light: { bgColor: 'white', borderColor: 'slate-200', color: 'slate-900' },
      }}
    >
      <Flex ai="center" gap={3} px={4} py={3} bb={1} theme={{ dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-100' } }}>
        <Icon size={4.5} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
          <Search />
        </Icon>
        <Textbox
          ref={input}
          flex1
          type="search"
          b={0}
          p={0}
          fontSize={16}
          bgColor="transparent"
          focus={{ outline: 0 }}
          theme={{ dark: { bgColor: 'transparent', color: 'slate-100' }, light: { bgColor: 'transparent', color: 'slate-900' } }}
          placeholder="Search the docs — a page, a prop, a sentence"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          props={{
            role: 'combobox',
            'aria-label': 'Search the documentation',
            'aria-expanded': rows.length > 0,
            'aria-controls': listId,
            'aria-activedescendant': active === -1 ? undefined : optionId(active),
            autoComplete: 'off',
            // Only the two arrows and Enter are the list's: Home, End and Space belong to the caret.
            onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') return roving.onKeyDown(event);
              if (event.key !== 'Enter') return;

              event.preventDefault();
              go(rows[active]);
            },
          }}
        />
        <Hint>esc</Hint>
      </Flex>

      <Box id={listId} props={{ role: 'listbox', 'aria-label': 'Results' }} overflowY="auto" css={{ maxHeight: 'min(60vh, 26rem)' }} py={2}>
        {rows.map((row, position) => (
          <Result
            key={`${row.href}-${row.title}-${position}`}
            row={row}
            id={optionId(position)}
            active={position === active}
            rowRef={roving.itemProps(position).ref}
            onHover={() => setActiveIndex(position, { reason: 'programmatic' })}
            onSelect={() => go(row)}
          />
        ))}
        {rows.length === 0 && <Empty failed={failed} loading={!index && !failed} query={query} />}
      </Box>

      <Flex
        px={4}
        py={2}
        gap={4}
        bt={1}
        fontSize={12}
        flexWrap="wrap"
        theme={{ dark: { borderColor: 'slate-800', color: 'slate-500' }, light: { borderColor: 'slate-100', color: 'slate-400' } }}
      >
        <Flex gap={2} ai="center">
          <Hint>↑</Hint>
          <Hint>↓</Hint>
          to move
        </Flex>
        <Flex gap={2} ai="center">
          <Hint>
            <Icon size={3}>
              <CornerDownLeft />
            </Icon>
          </Hint>
          to open
        </Flex>
        {index && <Box ml="auto">Box Kite {index.version}</Box>}
      </Flex>
    </Dialog>
  );
}

/** The pages a reader with an empty box is offered, in the order the nav lists them. */
function suggestions(index: SearchIndex): Row[] {
  return START_HERE.flatMap((path) => {
    const page = index.pages.find((entry) => entry.path === path);

    return page
      ? [{ href: page.path, page: page.name, title: page.name, excerpt: page.description, ranges: [], kind: 'page' as const }]
      : [];
  });
}

interface ResultProps {
  row: Row;
  id: string;
  active: boolean;
  /** The list's own ref for this row, so the highlight can be scrolled into view. */
  rowRef: (element: HTMLElement | null) => void;
  onHover: () => void;
  onSelect: () => void;
}

function Result({ row, id, active, rowRef, onHover, onSelect }: ResultProps) {
  return (
    <Box
      ref={rowRef}
      id={id}
      props={{ role: 'option', 'aria-selected': active, onPointerMove: onHover, onClick: onSelect }}
      px={4}
      py={2.5}
      cursor="pointer"
      theme={{
        dark: { bgColor: active ? 'slate-800' : 'transparent' },
        light: { bgColor: active ? 'slate-100' : 'transparent' },
      }}
    >
      <Flex ai="baseline" gap={2} flexWrap="wrap">
        <Box fontSize={14} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          {row.title}
        </Box>
        <Box fontSize={11} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
          {KIND_LABEL[row.kind]} · {row.page}
        </Box>
      </Flex>
      {row.excerpt && (
        <Box fontSize={13} lineHeight={20} mt={0.5} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          <Highlighted text={row.excerpt} ranges={row.ranges} />
        </Box>
      )}
    </Box>
  );
}

/** The matched words, marked. A `<mark>` of its own so a forced-colors mode keeps the distinction. */
function Highlighted({ text, ranges }: { text: string; ranges: Row['ranges'] }) {
  const parts: React.ReactNode[] = [];
  let at = 0;

  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start));

    parts.push(
      <Mark
        key={start}
        display="inline"
        bgColor="transparent"
        fontWeight={600}
        theme={{ dark: { color: 'violet-300' }, light: { color: 'violet-700' } }}
      >
        {text.slice(start, end)}
      </Mark>,
    );
    at = end;
  }

  parts.push(text.slice(at));

  return <>{parts}</>;
}

function Empty({ failed, loading, query }: { failed: boolean; loading: boolean; query: string }) {
  const message = failed
    ? 'The search index did not load. Every page is also at /llms.txt, and every prop at /props.md.'
    : loading
      ? 'Loading the index…'
      : `Nothing matches “${query.trim()}”. Every prop is on the Box page, and every page is at /llms.txt.`;

  return (
    <Box px={4} py={6} fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} props={{ role: 'status' }}>
      {message}
    </Box>
  );
}
