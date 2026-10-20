import { Newspaper, Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { Link } from '../../src/components/semantics';
import Markdown, { MarkdownDemos } from '../components/markdown';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { postBody, POSTS_PATH } from '../site/posts';
import { posts } from '../site/routes';
import { REPO_URL } from '../site/site';
import { headings } from '../utils/markdownUtils';
import NotFoundPage from './notFoundPage';

// Eager, because a demo behind `lazy` would suspend the prerender; few posts have one.
const demoModules = import.meta.glob<MarkdownDemos>('../postDemos/*.tsx', { eager: true });

/** One article: `posts/<slug>.md`, which the pathname names. */
export default function PostPage() {
  const { pathname } = useLocation();
  const post = posts.find((candidate) => candidate.path === pathname.replace(/\/+$/, ''));
  const body = post ? postBody(post.markdown) : '';
  const demos = post ? demoModules[`../postDemos/${post.slug}.tsx`] : undefined;

  useTableOfContents(post ? [{ label: post.title, section: true }, ...headings(body)] : []);

  if (!post) return <NotFoundPage />;

  const linkTheme = {
    dark: { color: 'sky-400', hover: { color: 'sky-300' } },
    light: { color: 'accent-600', hover: { color: 'accent-500' } },
  } as const;

  return (
    <Box>
      <PageHeader icon={Newspaper} title={post.title} badge={post.level} description={`${post.date} · ${post.readingTime} min read`} />

      <Reveal delay={0.1}>
        <Markdown source={body} demos={demos} maxWidth={210} />
      </Reveal>

      <Reveal delay={0.2}>
        <Flex
          ai="center"
          jc="space-between"
          gap={4}
          flexWrap="wrap"
          mt={12}
          p={5}
          b={1}
          borderRadius={3}
          maxWidth={210}
          theme={{ dark: { borderColor: 'base-800', bgColor: 'base-800/40' }, light: { borderColor: 'base-200', bgColor: 'base-50' } }}
        >
          <Box fontSize={15} lineHeight={24} theme={{ dark: { color: 'base-300' }, light: { color: 'base-700' } }}>
            Found this useful? A star on GitHub is how other people find Box Kite.
          </Box>
          <Link
            props={{ href: REPO_URL, target: '_blank', rel: 'noopener noreferrer' }}
            display="flex"
            ai="center"
            gap={2}
            px={4}
            py={2}
            borderRadius={2}
            fontSize={14}
            fontWeight={600}
            whiteSpace="nowrap"
            textDecoration="none"
            cursor="pointer"
            transition="colors"
            theme={{
              dark: { bgColor: 'white', color: 'base-900', hover: { bgColor: 'base-200' } },
              light: { bgColor: 'base-900', color: 'white', hover: { bgColor: 'base-700' } },
            }}
          >
            <Icon size={4}>
              <Star />
            </Icon>
            Star on GitHub
          </Link>
        </Flex>

        <Flex
          gap={6}
          mt={8}
          pt={6}
          bt={1}
          fontSize={14}
          flexWrap="wrap"
          theme={{ dark: { borderColor: 'base-800' }, light: { borderColor: 'base-200' } }}
        >
          <SiteLink to={POSTS_PATH} textDecoration="underline" theme={linkTheme}>
            All articles
          </SiteLink>
          <Link
            props={{ href: `${REPO_URL}/blob/main/posts/${post.slug}.md`, target: '_blank', rel: 'noopener noreferrer' }}
            textDecoration="underline"
            cursor="pointer"
            theme={linkTheme}
          >
            Edit this article
          </Link>
        </Flex>
      </Reveal>
    </Box>
  );
}
