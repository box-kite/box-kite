import { LayoutTemplate } from 'lucide-react';
import Box from '../../src/box';
import Grid from '../../src/components/grid';
import GalleryCard from '../components/galleryCard';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { BLOCKS_PATH, templatePath, templates } from '../site/templates';

const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'accent-600', hover: { color: 'accent-500' } },
} as const;

/** `/templates/`: every template, as the snapshot its own page approved. */
export default function TemplatesPage() {
  return (
    <Box>
      <PageHeader
        icon={LayoutTemplate}
        title="React templates"
        description="Complete pages to start from, each one drawn in light and dark, with a live demo and the whole source."
      />

      <Reveal delay={0.1}>
        <Box fontSize={15} lineHeight={26} mb={8} maxWidth={210} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
          Every template is one design — a set of component styles and a handful of variables — over the same components, so none of them
          ships a stylesheet. The sections they are made of are{' '}
          <SiteLink to={BLOCKS_PATH} display="inline" theme={linkTheme}>
            blocks
          </SiteLink>{' '}
          you can take on their own.
        </Box>
        <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={6}>
          {templates.map((template) => (
            <GalleryCard
              key={template.slug}
              to={templatePath(template.slug)}
              slug={template.slug}
              name={template.name}
              description={template.description}
            />
          ))}
        </Grid>
      </Reveal>
    </Box>
  );
}
