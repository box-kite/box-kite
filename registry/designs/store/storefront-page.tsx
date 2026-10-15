'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Icon from '@box-kite/react/components/icon';
import { H1, H2, Link, P, Section, Span } from '@box-kite/react/components/semantics';
import { Flame, RotateCcw, Star, Truck } from 'lucide-react';
import { type ReactElement, type ReactNode } from 'react';
import ProductArt from './product-art';
import ProductGrid from './product-grid';
import { countOf, FREE_SHIPPING_FROM, formatPrice, sampleCart } from './store-data';
import { card, kilnText, SERIF } from './store-design';
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
      <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={12} ai="center" pt={4}>
        <Box>
          <Flex
            display="inline-flex"
            ai="center"
            gap={2}
            px={3}
            py={1.5}
            borderRadius={999}
            fontSize={13}
            fontWeight={600}
            bgColor="white/70"
            ring={1}
            ringColor="orange-900/10"
            theme={{ dark: { bgColor: 'white/5', ringColor: 'white/10' } }}
          >
            <Box width={2} height={2} borderRadius={999} bgGradient={{ linear: 'r', colors: ['amber-400', 'rose-500'] }} />
            Autumn kiln · batch 14 is out
          </Flex>
          <H1
            mt={6}
            fontSize={48}
            lineHeight={52}
            md={{ fontSize: 72, lineHeight: 74 }}
            fontWeight={400}
            letterSpacing={-2}
            textWrap="balance"
            css={{ fontFamily: SERIF }}
          >
            Stoneware for{' '}
            <Span display="inline" fontStyle="italic" pe={1} {...kilnText}>
              slow
            </Span>{' '}
            mornings
          </H1>
          <P mt={6} maxWidth={120} fontSize={18} lineHeight={30} {...muted}>
            Mugs, bowls and vases thrown by hand on the coast and dipped in glazes borrowed from it — sea glass, ember, moss and dusk. Made
            to be used every day, and to outlast the habit.
          </P>
          <Flex gap={3} mt={8} flexWrap="wrap">
            <Link component="button" props={{ href: '#collection' }} textDecoration="none" py={3.5} px={7}>
              Shop the collection
            </Link>
            <Link component="button" variant="secondary" props={{ href: '#studio' }} textDecoration="none" py={3.5} px={7}>
              Meet the potters
            </Link>
          </Flex>
          <Flex ai="center" gap={3} mt={10} fontSize={14} {...muted}>
            <Flex gap={0.5} color="amber-500" props={{ 'aria-hidden': true }}>
              {[0, 1, 2, 3, 4].map((star) => (
                <Icon key={star} size={4} fill="amber-400">
                  <Star />
                </Icon>
              ))}
            </Flex>
            <Span>
              <Span display="inline" fontWeight={700} color="stone-900" theme={{ dark: { color: 'stone-100' } }}>
                4.9
              </Span>{' '}
              from 2,300 kitchens
            </Span>
          </Flex>
        </Box>

        <Hero />
      </Grid>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={4} mt={20}>
        {promises.map((promise) => (
          <Flex key={promise.title} gap={4} ai="center" p={5} borderRadius={5} {...card}>
            <Flex
              flexShrink={0}
              p={3}
              borderRadius={4}
              bgGradient={{ linear: 'br', colors: ['amber-100', 'rose-100'] }}
              color="orange-800"
              theme={{ dark: { bgGradient: { linear: 'br', colors: ['orange-950', 'rose-950'] }, color: 'orange-300' } }}
            >
              <Icon size={5}>{promise.icon}</Icon>
            </Flex>
            <Box>
              <Span display="block" fontWeight={600}>
                {promise.title}
              </Span>
              <Span display="block" mt={0.5} fontSize={14} {...muted}>
                {promise.detail}
              </Span>
            </Box>
          </Flex>
        ))}
      </Grid>

      <Box id="collection" mt={24} css={{ scrollMarginTop: '6rem' }}>
        <ProductGrid />
      </Box>

      <Studio />
    </StoreShell>
  );
}

/** A piece standing on the shelf: `bottom` puts its foot on the shelf's line, `start` across the window. */
function OnShelf({
  width,
  bottom,
  start,
  end,
  children,
}: {
  width: string;
  bottom: string;
  start?: string;
  end?: string;
  children: ReactNode;
}) {
  return (
    <Box position="absolute" aspectRatio="square" css={{ width, bottom, insetInlineStart: start, insetInlineEnd: end }}>
      {children}
    </Box>
  );
}

/** An arched window at golden hour — dusk in the dark theme — with the pieces on the sill. */
function Hero() {
  return (
    <Box position="relative" width="fit" maxWidth={140} mx="auto">
      <Box
        position="relative"
        aspectRatio="4/5"
        overflow="hidden"
        css={{ borderRadius: '999px 999px 32px 32px' }}
        bgGradient={{ linear: 'b', colors: ['amber-100', 'orange-200', 'rose-200'], interpolate: 'oklch' }}
        shadow="xl"
        shadowColor="orange-900/15"
        theme={{
          dark: {
            bgGradient: { linear: 'b', colors: ['indigo-950', 'violet-900', 'orange-800'], interpolate: 'oklch' },
            shadowColor: 'black/50',
          },
        }}
      >
        <Box
          position="absolute"
          top="1/5"
          insetStart="1/5"
          width="3/5"
          aspectRatio="square"
          borderRadius={999}
          bgGradient={{ radial: 'circle', colors: ['white/90', 'amber-100/60', 'transparent'] }}
          theme={{ dark: { bgGradient: { radial: 'circle', colors: ['amber-200/70', 'orange-400/25', 'transparent'] } } }}
        />
        <Box
          position="absolute"
          insetX={0}
          bottom={0}
          height="1/3"
          bt={1}
          borderColor="white/70"
          bgGradient={{ linear: 'b', colors: ['stone-100', 'stone-200'] }}
          theme={{ dark: { borderColor: 'white/10', bgGradient: { linear: 'b', colors: ['stone-800', 'stone-900'] } } }}
        />
        <OnShelf width="30%" bottom="28%" end="12%">
          <ProductArt shape="budVase" glaze="dusk" />
        </OnShelf>
        <OnShelf width="50%" bottom="30%" start="22%">
          <ProductArt
            shape="vase"
            glaze="ember"
            label="A Dune vase in Ember, a Tide mug in Sea glass and a Harbor bowl in Moss on a sill"
          />
        </OnShelf>
        <OnShelf width="42%" bottom="16%" start="4%">
          <ProductArt shape="mug" glaze="sea" />
        </OnShelf>
        <OnShelf width="48%" bottom="8%" end="2%">
          <ProductArt shape="bowl" glaze="moss" />
        </OnShelf>
      </Box>

      <Flex
        position="absolute"
        bottom={8}
        insetStart={-6}
        ai="center"
        gap={3}
        p={3}
        pe={5}
        borderRadius={4}
        bgColor="white/75"
        backdropBlur="md"
        shadow="lg"
        shadowColor="orange-900/10"
        ring={1}
        ringColor="white/60"
        display="none"
        sm={{ display: 'flex' }}
        theme={{ dark: { bgColor: 'stone-900/70', ringColor: 'white/10' } }}
      >
        <Flex
          width={10}
          height={10}
          ai="center"
          jc="center"
          borderRadius={3}
          color="white"
          bgGradient={{ linear: 'br', colors: ['amber-400', 'orange-500', 'rose-500'] }}
        >
          <Icon size={5}>
            <Flame />
          </Icon>
        </Flex>
        <Box fontSize={13}>
          <Span display="block" fontWeight={700}>
            Fresh from the kiln
          </Span>
          <Span display="block" {...muted}>
            12 of 40 pieces left
          </Span>
        </Box>
      </Flex>
    </Box>
  );
}

function Studio() {
  return (
    <Section
      id="studio"
      props={{ 'aria-labelledby': 'studio-heading' }}
      position="relative"
      overflow="hidden"
      mt={24}
      p={8}
      md={{ p: 16 }}
      borderRadius={8}
      color="stone-100"
      css={{ scrollMarginTop: '6rem' }}
      bgGradient={{ linear: 135, colors: ['stone-900', 'orange-950', 'rose-950'], interpolate: 'oklch' }}
      theme={{ dark: { ring: 1, ringColor: 'white/10' } }}
    >
      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={12} ai="center" position="relative">
        <Box>
          <Span fontSize={13} fontWeight={600} letterSpacing={1.5} textTransform="uppercase" color="orange-300">
            The studio
          </Span>
          <H2 id="studio-heading" mt={3} fontSize={40} lineHeight={46} fontWeight={400} letterSpacing={-1} css={{ fontFamily: SERIF }}>
            Four potters, one boathouse, a kiln that hums all night
          </H2>
          <P mt={5} fontSize={17} lineHeight={28} color="stone-300">
            The clay comes from a family pit two hours inland, and the glazes are ours, mixed by weight and written down. Come on a Saturday
            and you can throw a mug of your own.
          </P>
          <Box tag="blockquote" mt={8} mx={0} mb={0} p={5} borderRadius={4} bgColor="white/5" ring={1} ringColor="white/10">
            <P fontSize={19} lineHeight={30} fontStyle="italic" css={{ fontFamily: SERIF }}>
              “The mug I reach for first every single morning, two years on.”
            </P>
            <Span display="block" mt={3} fontSize={14} color="stone-400">
              Maren — a regular since batch 3
            </Span>
          </Box>
        </Box>
        <Box
          position="relative"
          aspectRatio="square"
          maxWidth={110}
          width="fit"
          mx="auto"
          borderRadius={999}
          bgGradient={{ radial: 'circle', colors: ['orange-300/40', 'rose-500/10', 'transparent'] }}
        >
          <ProductArt shape="pitcher" glaze="ash" pairGlaze="ink" view="pair" label="Two Moor pitchers, one in Ash and one in Ink" />
        </Box>
      </Grid>
    </Section>
  );
}
