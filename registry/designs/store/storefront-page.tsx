'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Icon from '@box-kite/react/components/icon';
import { H1, H2, Link, P, Section, Span } from '@box-kite/react/components/semantics';
import { RotateCcw, Sparkles, Star, Truck } from 'lucide-react';
import { type ReactElement } from 'react';
import ProductArt from './product-art';
import ProductGrid from './product-grid';
import { countOf, FREE_SHIPPING_FROM, formatPrice, sampleCart, type Shape } from './store-data';
import { card, heading } from './store-design';
import StoreShell from './store-shell';

const muted = { color: 'slate-600', theme: { dark: { color: 'slate-400' } } } as const;

Box.keyframes({ 'moonpop-float': { from: { translateY: 0 }, to: { translateY: -3 } } });

/** A night sky: stars over a glow rising from below. The same in both themes, which is what makes it the brand. */
const sky = (glowAt: string, css: { scrollMarginTop?: string } = {}) => ({
  vars: { star: 'white', 'sky-glow': 'violet-300', 'sky-mid': 'violet-600', 'sky-deep': 'indigo-900', 'sky-top': 'indigo-950' },
  css: {
    ...css,
    backgroundImage: [
      ...[
        [8, 14, 1.2],
        [22, 64, 1],
        [38, 8, 0.8],
        [47, 88, 1],
        [58, 22, 1.4],
        [66, 70, 0.8],
        [80, 12, 1],
        [92, 46, 1.2],
        [86, 84, 0.8],
        [14, 90, 0.8],
      ].map(([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%, var(--star) 0 ${r}px, transparent ${r + 0.7}px)`),
      `radial-gradient(80% 90% at ${glowAt} in oklch, var(--sky-glow), var(--sky-mid) 32%, var(--sky-deep) 68%, var(--sky-top))`,
    ].join(', '),
  },
});

const promises: { icon: ReactElement; title: string; detail: string }[] = [
  { icon: <Truck />, title: `Free shipping over ${formatPrice(FREE_SHIPPING_FROM)}`, detail: 'Boxed in recycled card, never plastic.' },
  { icon: <Sparkles />, title: 'Cast in small runs', detail: 'Numbered, and never restocked in the same colour.' },
  { icon: <RotateCcw />, title: '30-day returns', detail: 'Arrived scuffed? We send another.' },
];

/** The store's front page: the hero, three promises, the collection with its filters, and the studio. */
export default function StorefrontPage({ theme }: { theme?: string }) {
  return (
    <StoreShell cartCount={countOf(sampleCart)} theme={theme}>
      <Section
        props={{ 'aria-labelledby': 'hero-heading' }}
        position="relative"
        overflow="hidden"
        borderRadius={10}
        px={6}
        py={12}
        md={{ px: 14, py: 16 }}
        color="white"
        shadow="xl"
        shadowColor="violet-900/25"
        theme={{ dark: { ring: 1, ringColor: 'white/10', shadowColor: 'black/40' } }}
        {...sky('75% 100%')}
      >
        <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={10} ai="center">
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
              bgColor="white/10"
              ring={1}
              ringColor="white/20"
              backdropBlur="sm"
            >
              <Box width={2} height={2} borderRadius={999} bgGradient={{ linear: 'r', colors: ['cyan-300', 'pink-400'] }} />
              Drop 07 · the space set has landed
            </Flex>
            <H1
              id="hero-heading"
              mt={6}
              fontSize={48}
              lineHeight={52}
              md={{ fontSize: 68, lineHeight: 72 }}
              letterSpacing={-2}
              textWrap="balance"
              {...heading}
            >
              Tiny friends for{' '}
              <Span
                display="inline"
                bgGradient={{ linear: 'r', colors: ['cyan-200', 'violet-200', 'pink-300'], interpolate: 'oklch' }}
                bgClip="text"
                color="transparent"
              >
                big ideas
              </Span>
            </H1>
            <P mt={6} maxWidth={115} fontSize={18} lineHeight={30} color="violet-100">
              Glossy vinyl desk toys, designed in a tiny studio and cast in small runs: a robot co-pilot, a rubber duck for debugging, a
              ghost who is mostly friendly. Collect the whole sky.
            </P>
            <Flex gap={3} mt={8} flexWrap="wrap">
              <Link component="button" props={{ href: '#collection' }} textDecoration="none" py={3.5} px={7}>
                Shop the collection
              </Link>
              <Link
                component="button"
                variant="secondary"
                props={{ href: '#studio' }}
                textDecoration="none"
                py={3.5}
                px={7}
                bgColor="white/10"
                color="white"
                borderColor="white/25"
                hover={{ bgColor: 'white/20' }}
                theme={{ dark: { bgColor: 'white/10', color: 'white', borderColor: 'white/25', hover: { bgColor: 'white/20' } } }}
              >
                Meet the makers
              </Link>
            </Flex>
            <Flex ai="center" gap={3} mt={10} fontSize={14} color="violet-100">
              <Flex gap={0.5} props={{ 'aria-hidden': true }}>
                {[0, 1, 2, 3, 4].map((star) => (
                  <Icon key={star} size={4} color="amber-300" fill="amber-300">
                    <Star />
                  </Icon>
                ))}
              </Flex>
              <Span>
                <Span display="inline" fontWeight={700} color="white">
                  4.9
                </Span>{' '}
                from 12,000 desks
              </Span>
            </Flex>
          </Box>

          <Constellation />
        </Grid>
      </Section>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={4} mt={10}>
        {promises.map((promise) => (
          <Flex key={promise.title} gap={4} ai="center" p={5} borderRadius={6} {...card}>
            <Flex
              flexShrink={0}
              p={3}
              borderRadius={4}
              bgGradient={{ linear: 'br', colors: ['violet-100', 'pink-100'] }}
              color="violet-700"
              theme={{ dark: { bgGradient: { linear: 'br', colors: ['violet-950', 'fuchsia-950'] }, color: 'violet-300' } }}
            >
              <Icon size={5}>{promise.icon}</Icon>
            </Flex>
            <Box>
              <Span display="block" fontWeight={700}>
                {promise.title}
              </Span>
              <Span display="block" mt={0.5} fontSize={14} {...muted}>
                {promise.detail}
              </Span>
            </Box>
          </Flex>
        ))}
      </Grid>

      <Box id="collection" mt={20} css={{ scrollMarginTop: '6rem' }}>
        <ProductGrid />
      </Box>

      <Studio />
    </StoreShell>
  );
}

const floaters: {
  shape: Shape;
  finish: string;
  width: string;
  top?: string;
  bottom?: string;
  start?: string;
  end?: string;
  delay: number;
}[] = [
  { shape: 'rocket', finish: 'ocean', width: '32%', top: '-2%', start: '2%', delay: 600 },
  { shape: 'cat', finish: 'bubblegum', width: '34%', top: '2%', end: '-2%', delay: 1400 },
  { shape: 'robot', finish: 'grape', width: '58%', top: '20%', start: '21%', delay: 0 },
  { shape: 'duck', finish: 'lemon', width: '38%', bottom: '-2%', start: '-4%', delay: 900 },
  { shape: 'planet', finish: 'sunset', width: '34%', bottom: '8%', end: '-2%', delay: 2000 },
];

/** The toys, floating: each bobs on its own delay, and stands still for a reader who asked for less motion. */
function Constellation() {
  return (
    <Box
      position="relative"
      width="fit"
      maxWidth={130}
      mx="auto"
      aspectRatio="square"
      props={{
        role: 'img',
        'aria-label': 'Bolt the robot, Mochi the cat, Quack the duck, a Zoom rocket and a Ringo planet, floating in space',
      }}
    >
      <Box
        position="absolute"
        inset={10}
        borderRadius={999}
        bgGradient={{ radial: 'circle', colors: ['pink-300/45', 'violet-400/20', 'transparent'] }}
      />
      {floaters.map((toy) => (
        <Box
          key={toy.shape}
          position="absolute"
          aspectRatio="square"
          css={{ width: toy.width, top: toy.top, bottom: toy.bottom, insetInlineStart: toy.start, insetInlineEnd: toy.end }}
          animationName="moonpop-float"
          animationDuration={3200}
          animationDelay={-toy.delay}
          animationTimingFunction="ease-in-out"
          animationIterationCount="infinite"
          animationDirection="alternate"
          motionReduce={{ animationName: 'none' }}
        >
          <ProductArt shape={toy.shape} finish={toy.finish} grounded={false} />
        </Box>
      ))}
      <Flex
        position="absolute"
        bottom={-2}
        insetEnd="1/4"
        ai="center"
        gap={3}
        p={3}
        pe={5}
        borderRadius={5}
        bgColor="white/10"
        backdropBlur="lg"
        ring={1}
        ringColor="white/20"
        shadow="lg"
        shadowColor="indigo-950/30"
        display="none"
        sm={{ display: 'flex' }}
      >
        <Flex
          width={10}
          height={10}
          ai="center"
          jc="center"
          borderRadius={3}
          bgGradient={{ linear: 'br', colors: ['amber-300', 'orange-400', 'pink-500'] }}
        >
          <Icon size={5}>
            <Sparkles />
          </Icon>
        </Flex>
        <Box fontSize={13}>
          <Span display="block" fontWeight={700}>
            Ringo planet, limited
          </Span>
          <Span display="block" color="violet-100">
            142 of 500 left
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
      borderRadius={10}
      color="slate-100"
      theme={{ dark: { ring: 1, ringColor: 'white/10' } }}
      {...sky('20% 100%', { scrollMarginTop: '6rem' })}
    >
      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={12} ai="center" position="relative">
        <Box order={0} md={{ order: 1 }}>
          <Span fontSize={13} fontWeight={700} letterSpacing={1.5} textTransform="uppercase" color="pink-300">
            The studio
          </Span>
          <H2 id="studio-heading" mt={3} fontSize={38} lineHeight={44} letterSpacing={-1} color="white" {...heading}>
            Three designers, one sketchbook, a lot of tiny faces
          </H2>
          <P mt={5} fontSize={17} lineHeight={28} color="violet-100">
            Every character starts as a doodle, gets sculpted in clay, then cast in soft-touch vinyl by a family factory we have worked with
            since the first drop. Each run is numbered, and when a colour sells out it is gone.
          </P>
          <Box
            tag="blockquote"
            mt={8}
            mx={0}
            mb={0}
            p={5}
            borderRadius={5}
            bgColor="white/10"
            ring={1}
            ringColor="white/15"
            backdropBlur="sm"
          >
            <P fontSize={18} lineHeight={28} fontWeight={600} color="white">
              “Bolt has sat on my monitor through two jobs and a move. He has seen things.”
            </P>
            <Span display="block" mt={3} fontSize={14} color="violet-200">
              Priya — collecting since drop 2
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
          bgGradient={{ radial: 'circle', colors: ['pink-300/40', 'violet-500/15', 'transparent'] }}
        >
          <ProductArt
            shape="ghost"
            finish="pearl"
            pairFinish="mint"
            view="pair"
            grounded={false}
            label="Two Boo ghosts, one in Pearl and one in Mint"
          />
        </Box>
      </Grid>
    </Section>
  );
}
