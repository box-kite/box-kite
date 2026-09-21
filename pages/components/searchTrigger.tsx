import { Search } from 'lucide-react';
import { useEffect } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Icon from '../../src/components/icon';
import { SEARCH_INDEX_PATH, SearchIndex } from '../site/searchIndex';

/**
 * The half of docs search that is on every page: the control, the two shortcuts and the fetch. The
 * dialog itself is a chunk of its own, loaded the first time one of them asks for it — it and the
 * `<Dialog>` under it are 8 KB gzipped and 3.8 KB of CSS a reader who never searches would otherwise
 * download with every page (measured against the same build without it).
 */

/** Fetched once per load and shared: the file never changes, and the dialog may be opened twice. */
let pending: Promise<SearchIndex> | null = null;

export function loadSearchIndex(): Promise<SearchIndex> {
  pending ??= fetch(SEARCH_INDEX_PATH)
    .then((response) => {
      if (!response.ok) throw new Error(`${SEARCH_INDEX_PATH} answered ${response.status}`);

      return response.json() as Promise<SearchIndex>;
    })
    .catch((error: unknown) => {
      // Dropped, so the next open tries again rather than reporting a failure that is over.
      pending = null;
      throw error;
    });

  return pending;
}

/** Warm the index and the dialog's chunk before either is needed — the nav's trick, on the control. */
export function prefetchSearch(): void {
  void loadSearchIndex().catch(() => {});
  void import('./searchDialog').catch(() => {});
}

/** A keyboard hint, which is what `<kbd>` is for. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Box
      tag="kbd"
      display="inline-flex"
      ai="center"
      px={1.5}
      py={0.5}
      borderRadius={1}
      b={1}
      fontSize={11}
      theme={{
        dark: { bgColor: 'slate-800', borderColor: 'slate-700', color: 'slate-400' },
        light: { bgColor: 'slate-100', borderColor: 'slate-200', color: 'slate-500' },
      }}
    >
      {children}
    </Box>
  );
}

/** The two shortcuts every docs site answers to, and the one rule: not while somebody is typing. */
export function useSearchShortcut(open: boolean, onOpen: () => void) {
  useEffect(() => {
    if (open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      const command = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

      if ((!slash && !command) || isTyping(event.target)) return;

      event.preventDefault();
      onOpen();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpen, open]);
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element?.tagName) return false;

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
}

/** The control that opens it: the sidebar's own row, and an icon on the phone header. */
export default function SearchTrigger({ onOpen, icon = false }: { onOpen: () => void; icon?: boolean }) {
  const shared = {
    props: { 'aria-keyshortcuts': 'Control+K /', onPointerEnter: prefetchSearch, onFocus: prefetchSearch, onClick: onOpen },
    cursor: 'pointer',
    borderRadius: 2,
    b: 1,
    display: 'flex',
    theme: {
      dark: { bgColor: 'slate-800', borderColor: 'slate-700', color: 'slate-400', hover: { color: 'slate-200', borderColor: 'slate-600' } },
      light: {
        bgColor: 'slate-100',
        borderColor: 'slate-200',
        color: 'slate-500',
        hover: { color: 'slate-900', borderColor: 'slate-300' },
      },
    },
  } as const;

  if (icon) {
    return (
      <Button clean {...shared} p={2}>
        <Icon size={4.5} label="Search the documentation">
          <Search />
        </Icon>
      </Button>
    );
  }

  return (
    <Button clean {...shared} width="fit" ai="center" gap={2} px={3} py={2} fontSize={13}>
      <Icon size={4}>
        <Search />
      </Icon>
      <Box flex1 textAlign="start">
        Search
      </Box>
      <Hint>⌘K</Hint>
    </Button>
  );
}
