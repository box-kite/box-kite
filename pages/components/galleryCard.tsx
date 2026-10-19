import { ArrowRight } from 'lucide-react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { P } from '../../src/components/semantics';
import SiteLink from './siteLink';
import Snapshot from './snapshot';

interface GalleryCardProps {
  to: string;
  slug: string;
  name: string;
  description: string;
}

/** A gallery entry: the snapshot, the name and the one sentence a reader decides on. */
export default function GalleryCard({ to, slug, name, description }: GalleryCardProps) {
  return (
    <SiteLink to={to} display="block" textDecoration="none" height="fit">
      <Box
        height="fit"
        b={1}
        borderRadius={3}
        overflow="hidden"
        transitionDuration={150}
        theme={{
          dark: { borderColor: 'base-800', bgColor: 'base-900', hover: { borderColor: 'base-600' } },
          light: { borderColor: 'base-200', bgColor: 'white', hover: { borderColor: 'base-400' } },
        }}
      >
        <Box bb={1} theme={{ dark: { borderColor: 'base-800' }, light: { borderColor: 'base-200' } }}>
          <Snapshot slug={slug} name={name} />
        </Box>
        <Box p={5}>
          <Box fontSize={18} fontWeight={600} mb={2} theme={{ dark: { color: 'white' }, light: { color: 'base-900' } }}>
            {name}
          </Box>
          <P fontSize={14} lineHeight={22} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
            {description}
          </P>
          <Flex
            ai="center"
            gap={2}
            mt={4}
            fontSize={14}
            fontWeight={500}
            theme={{ dark: { color: 'sky-400' }, light: { color: 'accent-600' } }}
          >
            See it, and the code
            <Icon size={4}>
              <ArrowRight />
            </Icon>
          </Flex>
        </Box>
      </Box>
    </SiteLink>
  );
}
