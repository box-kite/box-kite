import { ArrowRight, Rocket } from 'lucide-react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { Link, P } from '../../src/components/semantics';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { releases } from '../site/routes';

export default function ReleasesPage() {
  return (
    <Box>
      <PageHeader
        icon={Rocket}
        title="Releases"
        description="What changed in each version, written as it landed: new props and components, breaking changes with their migration notes, and fixes. The same notes are the body of each GitHub release."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={4} mb={12} maxWidth={210}>
          {releases.map((release, index) => (
            <SiteLink key={release.version} to={release.path} display="block" textDecoration="none">
              <Box
                b={1}
                borderRadius={3}
                p={6}
                transitionDuration={150}
                theme={{
                  dark: { borderColor: 'base-800', bgColor: 'base-900', hover: { borderColor: 'base-600' } },
                  light: { borderColor: 'base-200', bgColor: 'white', hover: { borderColor: 'base-400' } },
                }}
              >
                <Flex ai="center" gap={3} mb={2} flexWrap="wrap">
                  <Box fontSize={22} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'base-900' } }}>
                    Box Kite {release.version}
                  </Box>
                  {index === 0 && <Box component="badge">Latest</Box>}
                  <Box fontSize={13} ms="auto" color="base-500">
                    {release.date}
                  </Box>
                </Flex>
                <P fontSize={15} lineHeight={26} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
                  {release.summary}
                </P>
                <Flex
                  ai="center"
                  gap={2}
                  mt={4}
                  fontSize={14}
                  fontWeight={500}
                  theme={{ dark: { color: 'sky-400' }, light: { color: 'accent-600' } }}
                >
                  Read the notes
                  <Icon size={4}>
                    <ArrowRight />
                  </Icon>
                </Flex>
              </Box>
            </SiteLink>
          ))}
        </Flex>
      </Reveal>

      <Reveal delay={0.2}>
        <P fontSize={14} lineHeight={24} color="base-500">
          Releases before 1.0.0, under the library&apos;s previous name, are on the{' '}
          <Link
            props={{ href: 'https://github.com/box-kite/box-kite/releases', target: '_blank', rel: 'noopener noreferrer' }}
            display="inline"
            textDecoration="underline"
            theme={{ dark: { color: 'sky-400' }, light: { color: 'accent-600' } }}
          >
            GitHub releases page
          </Link>
          .
        </P>
      </Reveal>
    </Box>
  );
}
