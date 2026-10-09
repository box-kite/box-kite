import { Newspaper } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { Link } from '../../src/components/semantics';
import Markdown from '../components/markdown';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { postBody, POSTS_PATH } from '../site/posts';
import { posts } from '../site/routes';
import { REPO_URL } from '../site/site';
import { headings } from '../utils/markdownUtils';
import NotFoundPage from './notFoundPage';

/** One article: `posts/<slug>.md`, which the pathname names. */
export default function PostPage() {
  const { pathname } = useLocation();
  const post = posts.find((candidate) => candidate.path === pathname.replace(/\/+$/, ''));
  const body = post ? postBody(post.markdown) : '';

  useTableOfContents(post ? [{ label: post.title, section: true }, ...headings(body)] : []);

  if (!post) return <NotFoundPage />;

  const linkTheme = {
    dark: { color: 'sky-400', hover: { color: 'sky-300' } },
    light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
  } as const;

  return (
    <Box>
      <PageHeader icon={Newspaper} title={post.title} badge={post.level} description={`${post.date} · ${post.readingTime} min read`} />

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
