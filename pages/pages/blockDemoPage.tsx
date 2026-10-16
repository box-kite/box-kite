import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H1 } from '../../src/components/semantics';
import Toaster from '../../src/components/toaster';
import VisuallyHidden from '../../src/components/visuallyHidden';
import type { FamilyPageProps } from '../app/routePages';
import DemoExit from '../components/demoExit';
import { blockFor, blockPath } from '../site/templates';
import NotFoundPage from './notFoundPage';

/**
 * `/blocks/<slug>/demo/`: the block alone, full-bleed, in the reader's theme — what the snapshots are
 * shot from. The block's own headings are its own, so the page's one `<h1>` is for a screen reader.
 */
export default function BlockDemoPage({ Content }: FamilyPageProps) {
  const block = blockFor(useLocation().pathname);

  if (!block || !Content) return <NotFoundPage />;

  return (
    <Box.Theme use="local">
      <Flex
        d="column"
        minHeight="fit-screen"
        p={6}
        md={{ p: 12 }}
        theme={{ dark: { bgColor: 'slate-950', color: 'slate-100' }, light: { bgColor: 'slate-100', color: 'slate-900' } }}
      >
        <VisuallyHidden>
          <H1>{block.name}</H1>
        </VisuallyHidden>
        {/* A grid item that stretches is a definite height, which is what a shell's `minHeight="fit"` resolves against. */}
        <Box
          flex1
          display="grid"
          ai={block.wide ? undefined : 'center'}
          width="fit"
          maxWidth={block.wide ? undefined : 160}
          mx="auto"
          props={{ 'data-preview': '' }}
        >
          <Content />
        </Box>
      </Flex>
      <DemoExit to={blockPath(block.slug)} name={block.name} />
      <Toaster />
    </Box.Theme>
  );
}
