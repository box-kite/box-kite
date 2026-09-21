import { Rocket } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { version } from '../../package.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { Link } from '../../src/components/semantics';
import Markdown from '../components/markdown';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { RELEASES_PATH, withoutTitle } from '../site/releases';
import { releases } from '../site/routes';
import { headings } from '../utils/markdownUtils';
import NotFoundPage from './notFoundPage';

/** One version's notes: `releases/<version>.md`, which the pathname names. */
export default function ReleasePage() {
  const { pathname } = useLocation();
  const release = releases.find((candidate) => candidate.path === pathname.replace(/\/+$/, ''));
  const body = release ? withoutTitle(release.markdown) : '';

  useTableOfContents(release ? [{ label: `Box Kite ${release.version}`, section: true }, ...headings(body)] : []);

  if (!release) return <NotFoundPage />;

  const linkTheme = {
    dark: { color: 'sky-400', hover: { color: 'sky-300' } },
    light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
  } as const;

  return (
    <Box>
      <PageHeader
        icon={Rocket}
        title={`Box Kite ${release.version}`}
        badge={release.date}
        description="What changed in this version, written as it landed. The same notes are the body of the GitHub release."
      />

      {release.version !== version && (
        <Reveal delay={0.05}>
          <Box
            mb={8}
            p={4}
            borderRadius={3}
            b={1}
            fontSize={14}
            lineHeight={22}
            maxWidth={210}
            theme={{
              dark: { bgColor: 'amber-950', borderColor: 'amber-900', color: 'amber-200' },
              light: { bgColor: 'amber-50', borderColor: 'amber-200', color: 'amber-900' },
            }}
          >
            These notes are for {release.version}. The documentation on this site is for{' '}
            <SiteLink to={`${RELEASES_PATH}/${version}`} textDecoration="underline" display="inline">
              {version}
            </SiteLink>
            , the current release — this site documents the newest version only.
          </Box>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <Markdown source={body} maxWidth={210} />
      </Reveal>

      <Reveal delay={0.2}>
        <Flex
          gap={6}
          mt={12}
          pt={6}
          bt={1}
          fontSize={14}
          flexWrap="wrap"
          theme={{ dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-200' } }}
        >
          <SiteLink to={RELEASES_PATH} textDecoration="underline" theme={linkTheme}>
            All releases
          </SiteLink>
          <Link
            props={{
              href: `https://github.com/box-kite/box-kite/releases/tag/v${release.version}`,
              target: '_blank',
              rel: 'noopener noreferrer',
            }}
            textDecoration="underline"
            theme={linkTheme}
          >
            This release on GitHub
          </Link>
          <Link
            props={{
              href: `https://github.com/box-kite/box-kite/blob/main/releases/${release.version}.md`,
              target: '_blank',
              rel: 'noopener noreferrer',
            }}
            textDecoration="underline"
            theme={linkTheme}
          >
            Edit these notes
          </Link>
        </Flex>
      </Reveal>
    </Box>
  );
}
