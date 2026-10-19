import { Blocks } from 'lucide-react';
import Box from '../../src/box';
import Grid from '../../src/components/grid';
import GalleryCard from '../components/galleryCard';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { blockPath, blocks } from '../site/templates';

const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'accent-600', hover: { color: 'accent-500' } },
} as const;

/** `/blocks/`: every block, as the snapshot its own page approved. */
export default function BlocksPage() {
  return (
    <Box>
      <PageHeader
        icon={Blocks}
        title="React UI blocks"
        description="Finished sections to copy into your own app, each one drawn in light and dark, with the whole source on its page."
      />

      <Reveal delay={0.1}>
        <Box fontSize={15} lineHeight={26} mb={8} maxWidth={210} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
          A block is a composition of the components, not a component: the part of a page that is always half yours. Each one installs with{' '}
          <Mono>npx shadcn add</Mono> as files you then edit —{' '}
          <SiteLink to="/registry" display="inline" theme={linkTheme}>
            the shadcn registry page
          </SiteLink>{' '}
          has the setup.
        </Box>
        <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={6}>
          {blocks.map((block) => (
            <GalleryCard key={block.slug} to={blockPath(block.slug)} slug={block.slug} name={block.name} description={block.description} />
          ))}
        </Grid>
      </Reveal>
    </Box>
  );
}
