import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { Link } from '../../src/components/semantics';
import { markdownPath } from '../site/pageMarkdown';
import { routes } from '../site/routes';
import { routeFor } from '../site/siteMeta';

/**
 * The addresses an agent wants, on every page: this page as markdown, the index of all of them, and
 * the generated prop reference. Plain `<a>` elements rather than router links — none of the three is
 * a route, they are static files the build writes (`scripts/prerender-pages.mjs`).
 *
 * It sits outside `<main>` on purpose: `<main>` is what the markdown mirror converts, and a footer of
 * links to that mirror is not part of the page.
 */
export default function PageFooter() {
  const { pathname } = useLocation();
  const route = routeFor(pathname, routes);

  // Nothing to point at from an address the router does not serve.
  if (!route) return null;

  const links = [
    ['This page as markdown', markdownPath(route.path)],
    ['llms.txt', '/llms.txt'],
    ['Every prop, measured', '/props.md'],
  ];

  return (
    <Flex
      tag="footer"
      maxWidth={300}
      mx="auto"
      px={4}
      sm={{ px: 8 }}
      pb={8}
      gap={4}
      flexWrap="wrap"
      fontSize={13}
      theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}
    >
      <Flex gap={2} flexWrap="wrap" ai="center">
        For an agent reading this:
        {links.map(([label, href], index) => (
          <Flex key={href} gap={2} ai="center">
            {index > 0 && <Box display="inline">·</Box>}
            <Link
              props={{ href }}
              theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
              hover={{ textDecoration: 'underline' }}
            >
              {label}
            </Link>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}
