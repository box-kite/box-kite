import { ArrowRight, Newspaper } from 'lucide-react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2, P } from '../../src/components/semantics';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Post, PostLevel } from '../site/posts';
import { posts } from '../site/routes';

const SECTIONS: { level: PostLevel; title: string; description: string }[] = [
  {
    level: 'Beginner',
    title: 'Start here',
    description: 'New to web development, or new to this library: one page built step by step, each step ending in something you can see.',
  },
  {
    level: 'Use case',
    title: 'Use cases',
    description: 'A real problem React developers keep running into, why the usual fixes hurt, and how it is solved here.',
  },
];

export default function BlogPage() {
  return (
    <Box>
      <PageHeader
        icon={Newspaper}
        title="Blog"
        description="Articles on building with Box Kite. Every article published elsewhere is a copy of one on this page, so this is where they stay current."
      />

      {SECTIONS.map(({ level, title, description }, index) => {
        const list = posts.filter((post) => post.level === level);
        if (!list.length) return null;

        return (
          <Reveal key={level} delay={0.1 + index * 0.05}>
            <Box mb={12} maxWidth={210}>
              <H2 fontSize={22} fontWeight={600} mb={2} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
                {title}
              </H2>
              <P fontSize={15} lineHeight={26} mb={5} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                {description}
              </P>
              <Flex d="column" gap={4}>
                {list.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </Flex>
            </Box>
          </Reveal>
        );
      })}
    </Box>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <SiteLink to={post.path} display="block" textDecoration="none">
      <Box
        b={1}
        borderRadius={3}
        p={6}
        transitionDuration={150}
        theme={{
          dark: { borderColor: 'slate-800', bgColor: 'slate-900', hover: { borderColor: 'slate-600' } },
          light: { borderColor: 'slate-200', bgColor: 'white', hover: { borderColor: 'slate-400' } },
        }}
      >
        <Box fontSize={20} fontWeight={600} mb={1} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          {post.title}
        </Box>
        <Box fontSize={13} mb={3} color="slate-500">
          {post.date} · {post.readingTime} min read
        </Box>
        <P fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          {post.summary}
        </P>
        <Flex
          ai="center"
          gap={2}
          mt={4}
          fontSize={14}
          fontWeight={500}
          theme={{ dark: { color: 'sky-400' }, light: { color: 'indigo-600' } }}
        >
          Read the article
          <Icon size={4}>
            <ArrowRight />
          </Icon>
        </Flex>
      </Box>
    </SiteLink>
  );
}
