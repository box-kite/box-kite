'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { H1, H2, Link, P, Section, Span } from '@box-kite/react/components/semantics';
import ProductArt from './product-art';
import ProductGrid from './product-grid';
import { countOf, FREE_SHIPPING_FROM, formatPrice, productBySlug, sampleCart } from './store-data';
import { eyebrow, heading, muted, useStoreLinks } from './store-design';
import StoreShell from './store-shell';

const promises = [
  { title: `Free shipping over ${formatPrice(FREE_SHIPPING_FROM)}`, detail: 'Packed in paper and card, never plastic.' },
  { title: 'Made in small numbers', detail: 'By four workshops we visit every year.' },
  { title: 'Repaired, not replaced', detail: 'Spare parts for every object, for ten years.' },
];

const textLink = {
  fontSize: 15,
  fontWeight: 500,
  color: 'stone-900',
  textDecoration: 'underline',
  css: { textUnderlineOffset: '6px' },
  hover: { color: 'stone-500' },
  theme: { dark: { color: 'stone-100', hover: { color: 'stone-400' } } },
} as const;

/** The store's front page: the hero, three promises, the collection with its filters, and the shop's story. */
export default function StorefrontPage({ theme }: { theme?: string }) {
  const links = useStoreLinks();
  const lamp = productBySlug('table-lamp');

  return (
    <StoreShell cartCount={countOf(sampleCart)} theme={theme}>
      <Section props={{ 'aria-labelledby': 'hero-heading' }}>
        <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={10} xl={{ gap: 20 }} ai="center">
          <Box py={4} lg={{ py: 0 }}>
            <Span display="block" {...eyebrow} {...muted}>
              Autumn objects · 2026
            </Span>
            <H1
              id="hero-heading"
              mt={6}
              fontSize={48}
              lineHeight={52}
              md={{ fontSize: 72, lineHeight: 76 }}
              textWrap="balance"
              {...heading}
              letterSpacing={-2}
            >
              Fewer, better things.
            </H1>
            <P mt={6} maxWidth={110} fontSize={18} lineHeight={30} {...muted}>
              A lamp, a clock, a mug that stacks. Everyday objects in five quiet colours, made to be used for a long time and noticed only
              when they are needed.
            </P>
            <Flex gap={8} mt={10} ai="center" flexWrap="wrap">
              <Link component="button" props={{ href: '#collection' }} textDecoration="none" py={3.5} px={8}>
                Shop the collection
              </Link>
              <Link props={{ href: '#studio' }} {...textLink}>
                About the shop
              </Link>
            </Flex>
          </Box>

          <Box>
            <Link props={{ href: links.product(lamp.slug) }} display="block" aspectRatio="square">
              <ProductArt shape={lamp.shape} finish="clay" label={`${lamp.name} in Clay`} stroke={0.5} />
            </Link>
            <Flex jc="space-between" mt={3} fontSize={14} {...muted}>
              <Span>{lamp.name}, Clay</Span>
              <Span>{formatPrice(lamp.price)}</Span>
            </Flex>
          </Box>
        </Grid>
      </Section>

      <Grid
        gridTemplateColumns={1}
        md={{ gridTemplateColumns: 3 }}
        gap={8}
        mt={20}
        pt={8}
        bt={1}
        borderColor="stone-200"
        theme={{ dark: { borderColor: 'stone-800' } }}
      >
        {promises.map((promise) => (
          <Box key={promise.title}>
            <Span display="block" fontWeight={500}>
              {promise.title}
            </Span>
            <Span display="block" mt={1} fontSize={14} {...muted}>
              {promise.detail}
            </Span>
          </Box>
        ))}
      </Grid>

      <Box id="collection" mt={24} css={{ scrollMarginTop: '6rem' }}>
        <ProductGrid />
      </Box>

      <Studio />
    </StoreShell>
  );
}

function Studio() {
  return (
    <Section
      id="studio"
      props={{ 'aria-labelledby': 'studio-heading' }}
      mt={28}
      pt={16}
      bt={1}
      borderColor="stone-200"
      css={{ scrollMarginTop: '6rem' }}
      theme={{ dark: { borderColor: 'stone-800' } }}
    >
      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={12} xl={{ gap: 20 }} ai="center">
        <Box aspectRatio="square">
          <ProductArt
            shape="vase"
            finish="sand"
            also={['sage']}
            view="set"
            label="Two bud vases, one in Sand and one in Sage"
            stroke={0.5}
          />
        </Box>
        <Box>
          <Span display="block" {...eyebrow} {...muted}>
            About
          </Span>
          <H2 id="studio-heading" mt={5} fontSize={36} lineHeight={42} textWrap="balance" {...heading} letterSpacing={-1}>
            Made slowly, in small numbers
          </H2>
          <P mt={6} fontSize={17} lineHeight={28} {...muted}>
            Every object starts as a drawing, goes through a dozen prototypes, and is made by one of four workshops we know by name. We
            would rather make one thing well than ten things quickly, so the collection changes once a year, not once a week.
          </P>
          <Box tag="blockquote" mt={10} mx={0} mb={0} ps={5} bs={2} borderColor="stone-900" theme={{ dark: { borderColor: 'stone-100' } }}>
            <P fontSize={18} lineHeight={28}>
              “The clock has hung in our kitchen for six years. I have never once had to think about it.”
            </P>
            <Span display="block" mt={3} fontSize={14} {...muted}>
              Ana, Chișinău
            </Span>
          </Box>
        </Box>
      </Grid>
    </Section>
  );
}
