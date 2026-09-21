import { Box as BoxIcon, Menu, Moon, Sun, X } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import Presence from '../../src/components/presence';
import IconSwap from '../components/iconSwap';
import PageFooter from '../components/pageFooter';
import Reveal from '../components/reveal';
import SearchTrigger, { useSearchShortcut } from '../components/searchTrigger';
import TableOfContents from '../components/tableOfContents';
import PageContext, { TocEntry } from '../pageContext';
import DocumentHead from '../site/documentHead';
import Sidebar from './sidebar';

// The dialog is a chunk of its own, and nothing renders it until a reader asks for it — on a page
// nobody searches it costs the trigger and the two shortcut keys (see `searchTrigger.tsx`).
const SearchDialog = lazy(() => import('../components/searchDialog'));

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Stays true once opened: the chunk is loaded, and an exit transition needs the node to survive.
  const [searchMounted, setSearchMounted] = useState(false);
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [theme, setTheme] = Box.useTheme();
  const location = useLocation();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Stable, or the shortcut's listener is torn down and re-added on every render of the page.
  const openSearch = useCallback(() => {
    setSearchMounted(true);
    setSearchOpen(true);
  }, []);

  useSearchShortcut(searchOpen, openSearch);

  // Close sidebar on route change (mobile) — render-phase sync, no effect needed.
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setSidebarOpen(false);
  }

  return (
    <Box
      minHeight="fit-screen"
      position="relative"
      theme={{
        dark: { bgColor: 'slate-900', color: 'slate-100', bgImage: 'gradient-aurora-dark' },
        light: { bgColor: 'white', color: 'slate-900', bgImage: 'gradient-aurora-light' },
      }}
    >
      <DocumentHead />
      <ScrollToLocation />
      {searchMounted && (
        <Suspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}

      {/* Mobile Header */}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        lg={{ display: 'none' }}
        bb={1}
        theme={{
          dark: { borderColor: 'slate-800' },
          light: { borderColor: 'slate-200' },
        }}
        backdropFilter="blur(12px)"
      >
        <Flex ai="center" jc="space-between" px={4} py={3}>
          <Flex ai="center" gap={3}>
            <Button
              clean
              p={2}
              borderRadius={2}
              theme={{
                dark: { bgColor: 'slate-800', color: 'slate-100' },
                light: { bgColor: 'slate-100', color: 'slate-900' },
              }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Icon size={5} label={sidebarOpen ? 'Close the menu' : 'Open the menu'}>
                {sidebarOpen ? <X /> : <Menu />}
              </Icon>
            </Button>
            <NavLink to="/">
              <Flex ai="center" gap={2}>
                {/* The same mark the sidebar carries — this header is the whole logo on a phone,
                    where the sidebar is closed, so a bare letter was the brand on every small screen. */}
                <Box width={8} height={8} borderRadius={2} bgImage="gradient-primary" display="flex" ai="center" jc="center">
                  <Icon size={4} color="white" strokeWidth={2.5}>
                    <BoxIcon />
                  </Icon>
                </Box>
                <Box fontWeight={600} fontSize={18}>
                  Box Kite
                </Box>
              </Flex>
            </NavLink>
          </Flex>
          <Flex ai="center" gap={2}>
            <SearchTrigger icon onOpen={openSearch} />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </Flex>
        </Flex>
      </Box>

      <Flex>
        {/* Sidebar Overlay (Mobile) — the site's own use of `<Presence>`, so the scrim fades both ways. */}
        <Presence present={sidebarOpen}>
          {(presence) => (
            <Box
              ref={presence.ref}
              position="fixed"
              inset={0}
              bgColor="black"
              opacity={presence.present ? 0.5 : 0}
              zIndex={4}
              startingStyle={{ opacity: 0 }}
              transitionDuration={200}
              props={{ ...presence.props, onClick: () => setSidebarOpen(false) }}
            />
          )}
        </Presence>

        {/* Sidebar */}
        <Box
          position="fixed"
          top={0}
          left={0}
          height="fit-screen"
          zIndex={5}
          width={70}
          translateX={sidebarOpen ? 0 : -70}
          lg={{ position: 'sticky', translateX: 0, zIndex: 3 }}
          transition="transform"
          transitionDuration={300}
          transitionTimingFunction="ease-in-out"
        >
          <Sidebar toggleTheme={toggleTheme} onClose={() => setSidebarOpen(false)} onSearch={openSearch} />
        </Box>

        {/* Main Content + Right Sidebar */}
        <PageContext.Provider value={{ tocEntries, setTocEntries }}>
          <Box flex1 minWidth={0} minHeight="fit-screen">
            {/* The landmark, and the root the markdown mirror converts: everything outside it is
                chrome that repeats on every page (`scripts/prerender-pages.mjs`). */}
            <Box tag="main" maxWidth={300} mx="auto" px={4} sm={{ px: 8 }} py={8} lg={{ py: 12 }}>
              {/* Keyed on the route, so a navigation is a fresh mount and `Reveal` has something to
                  reveal. The page under this is prerendered, which is why the entrance is gated on
                  hydration rather than running on the first paint. */}
              <Reveal key={location.pathname} y={2.5}>
                {children}
              </Reveal>
            </Box>
            <PageFooter />
          </Box>
          {tocEntries.length > 0 && (
            <Box width={50} flexShrink={0} display="none" xl={{ display: 'block' }}>
              <Box position="sticky" top={0} maxHeight="fit-screen" overflow="auto" py={8} pr={4}>
                <TableOfContents entries={tocEntries} />
              </Box>
            </Box>
          )}
        </PageContext.Provider>
      </Flex>
    </Box>
  );
}

function ThemeToggle({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  return (
    <Button
      clean
      p={2}
      borderRadius={2}
      theme={{
        dark: { bgColor: 'slate-800', color: 'slate-100' },
        light: { bgColor: 'slate-100', color: 'slate-900' },
      }}
      onClick={toggleTheme}
    >
      {/* Keyed on the theme, so each icon is a mount and `startingStyle` is its spin-in. */}
      <IconSwap key={theme} rotate={-90}>
        <Icon
          size={4.5}
          color={theme === 'dark' ? 'amber-400' : 'indigo-500'}
          label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Icon>
      </IconSwap>
    </Button>
  );
}

/**
 * The top of the page on a navigation — or the section a link named. A hash has to be *waited* for:
 * the route's chunk is loaded on demand, so the element a search result points at is not in the
 * document on the frame the URL changes (and the browser only scrolls to a hash on a full load).
 */
function ScrollToLocation() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);

      return;
    }

    let frame = 0;
    let frames = 0;

    const find = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));

      if (target) return target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // About a second at 60Hz, after which the anchor is not going to appear.
      if (frames++ < 60) frame = requestAnimationFrame(find);
    };

    find();

    return () => cancelAnimationFrame(frame);
  }, [hash, pathname]);

  return null;
}
