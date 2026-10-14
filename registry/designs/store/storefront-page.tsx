'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Icon from '@box-kite/react/components/icon';
import { H1, H2, Link, P, Section, Span } from '@box-kite/react/components/semantics';
import { Flame, RotateCcw, Truck } from 'lucide-react';
import { type ReactElement } from 'react';
import ProductArt from './product-art';
import ProductGrid from './product-grid';
import { countOf, FREE_SHIPPING_FROM, formatPrice, sampleCart } from './store-data';
import { SERIF } from './store-design';
import StoreShell from './store-shell';

const muted = { color: 'stone-600', theme: { dark: { color: 'stone-400' } } } as const;

const promises: { icon: ReactElement; title: string; detail: string }[] = [
  { icon: <Truck />, title: `Free shipping over ${formatPrice(FREE_SHIPPING_FROM)}`, detail: 'Packed in paper and wool, never foam.' },
  { icon: <Flame />, title: 'Fired in small batches', detail: 'Forty pieces a kiln, twice a month.' },
  { icon: <RotateCcw />, title: '30-day returns', detail: 'Chipped in transit? We send another.' },
];

/** The store's front page: the hero, three promises, the collection with its filters, and the studio. */
export default function StorefrontPage({ theme }: { theme?: string }) {
  return (
    <StoreShell cartCount={countOf(sampleCart)} theme={theme}>
      <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={10} ai="center">
        <Box>
          <Span
            fontSize={13}
            fontWeight={600}
            letterSpacing={1.5}
            textTransform="uppercase"
            color="orange-800"
            theme={{ dark: { color: 'orange-300' } }}
          >
            Autumn kiln · batch 14
          </Span>
          <H1
            mt={4}
            fontSize={46}
            lineHeight={50}
            md={{ fontSize: 64, lineHeight: 68 }}
            fontWeight={500}
            letterSpacing={-1.5}
            textWrap="balance"
            css={{ fontFamily: SERIF }}
          >
            Stoneware for slow mornings
          </H1>
          <P mt={5} maxWidth={120} fontSize={18} lineHeight={30} {...muted}>
            Mugs, bowls and vases thrown by hand on the coast and glazed in colours borrowed from it. Made to be used every day, and to last
            longer than the habit.
          </P>
          <Flex gap={3} mt={8} flexWrap="wrap">
            <Link component="button" props={{ href: '#collection' }} textDecoration="none" py={3}>
              Shop the collection
            </Link>
            <Link component="button" variant="secondary" props={{ href: '#studio' }} textDecoration="none" py={3}>
              Visit the studio
            </Link>
          </Flex>
        </Box>
        <Box
          position="relative"
          aspectRatio="4/3"
          borderRadius={6}
          overflow="hidden"
          bgGradient={{ linear: 'b', colors: ['orange-100', 'stone-100'] }}
          theme={{ dark: { bgGradient: { linear: 'b', colors: ['orange-950', 'stone-900'] } } }}
        >
          <Box position="absolute" width="3/5" aspectRatio="square" insetStart="1/5" bottom={6}>
            <ProductArt shape="vase" glaze="ember" label="A tall Dune vase in the Ember glaze" />
          </Box>
          <Box position="absolute" width="2/5" aspectRatio="square" insetStart={0} bottom={-2}>
            <ProductArt shape="mug" glaze="sea" label="A Tide mug in Sea glass" />
          </Box>
          <Box position="absolute" width="1/2" aspectRatio="square" insetEnd={-4} bottom={-8}>
            <ProductArt shape="bowl" glaze="ash" label="A Harbor bowl in Ash" />
          </Box>
        </Box>
      </Grid>

      <Grid
        gridTemplateColumns={1}
        md={{ gridTemplateColumns: 3 }}
        gap={6}
        mt={16}
        py={8}
        by={1}
        borderColor="stone-200"
        theme={{ dark: { borderColor: 'stone-800' } }}
      >
        {promises.map((promise) => (
          <Flex key={promise.title} gap={4} ai="start">
            <Flex
              flexShrink={0}
              p={2.5}
              borderRadius={999}
              bgColor="orange-100"
              color="orange-800"
              theme={{ dark: { bgColor: 'orange-950', color: 'orange-300' } }}
            >
              <Icon size={5}>{promise.icon}</Icon>
            </Flex>
            <Box>
              <Span display="block" fontWeight={600}>
                {promise.title}
              </Span>
              <Span display="block" mt={1} fontSize={14} {...muted}>
                {promise.detail}
              </Span>
            </Box>
          </Flex>
        ))}
      </Grid>

      <Box id="collection" mt={16} css={{ scrollMarginTop: '6rem' }}>
        <ProductGrid />
      </Box>

      <Section
        id="studio"
        props={{ 'aria-labelledby': 'studio-heading' }}
        mt={20}
        p={8}
        md={{ p: 14 }}
        borderRadius={6}
        bgColor="stone-900"
        color="stone-100"
        css={{ scrollMarginTop: '6rem' }}
        theme={{ dark: { bgColor: 'stone-900', ring: 1, ringColor: 'stone-800' } }}
      >
        <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={10} ai="center">
          <Box>
            <H2 id="studio-heading" fontSize={36} fontWeight={500} letterSpacing={-0.5} css={{ fontFamily: SERIF }}>
              Four potters, one boathouse
            </H2>
            <P mt={4} fontSize={17} lineHeight={28} color="stone-300">
              We dig nothing ourselves and pretend nothing either: the clay comes from a family pit two hours inland, and the glazes are
              ours, mixed by weight and written down. Come on a Saturday and you can throw a mug of your own.
            </P>
            <Box tag="blockquote" mt={8} mx={0} mb={0} ps={5} bs={2} borderColor="orange-400">
              <P fontSize={18} lineHeight={28} fontStyle="italic" css={{ fontFamily: SERIF }}>
                “The mug I reach for first every single morning, two years on.”
              </P>
              <Span display="block" mt={2} fontSize={14} color="stone-400">
                Maren, a regular since batch 3
              </Span>
            </Box>
          </Box>
          <Box aspectRatio="square" maxWidth={100} width="fit" mx="auto">
            <ProductArt shape="pitcher" glaze="ash" pairGlaze="ink" view="pair" label="Two Moor pitchers, one in Ash and one in Ink" />
          </Box>
        </Grid>
      </Section>
    </StoreShell>
  );
}
