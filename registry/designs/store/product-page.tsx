'use client';
import Box from '@box-kite/react';
import Accordion from '@box-kite/react/components/accordion';
import Grid from '@box-kite/react/components/grid';
import { H1, H2, Li, Link, Nav, Ol, P, Section, Span, Ul } from '@box-kite/react/components/semantics';
import { useState } from 'react';
import ProductCard from './product-card';
import ProductGallery from './product-gallery';
import { countOf, formatPrice, productBySlug, products, sampleCart } from './store-data';
import { eyebrow, heading, useStoreLinks } from './store-design';
import StoreShell from './store-shell';
import VariantPicker from './variant-picker';

const muted = { color: 'stone-600', theme: { dark: { color: 'stone-400' } } } as const;

/** One product: the gallery and the picker share the finish, and adding to the cart moves the header's count. */
export default function ProductPage({ slug = 'table-lamp', theme }: { slug?: string; theme?: string }) {
  const links = useStoreLinks();
  const product = productBySlug(slug);
  const [finish, setFinish] = useState(product.finishes[0]);
  const [cartCount, setCartCount] = useState(countOf(sampleCart));
  const related = [...products.filter((entry) => entry.slug !== product.slug)]
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 4);

  return (
    <StoreShell cartCount={cartCount} theme={theme}>
      <Nav props={{ 'aria-label': 'Breadcrumb' }} mb={6} fontSize={14}>
        <Ol display="flex" listStyle="none" m={0} p={0} gap={2} flexWrap="wrap" {...muted}>
          <Li>
            <Link
              props={{ href: `${links.shop}#collection` }}
              color="currentColor"
              hover={{ color: 'stone-500' }}
              theme={{ dark: { hover: { color: 'stone-400' } } }}
            >
              Shop
            </Link>
          </Li>
          <Li props={{ 'aria-hidden': true }}>/</Li>
          <Li>{product.category}</Li>
          <Li props={{ 'aria-hidden': true }}>/</Li>
          <Li color="stone-900" theme={{ dark: { color: 'stone-100' } }} props={{ 'aria-current': 'page' }}>
            {product.name}
          </Li>
        </Ol>
      </Nav>

      <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={10} xl={{ gap: 16 }} ai="start">
        <ProductGallery product={product} finish={finish} />

        <Box>
          {product.badge && (
            <Span {...eyebrow} {...muted}>
              {product.badge}
            </Span>
          )}
          <H1 mt={3} fontSize={40} lineHeight={46} {...heading} letterSpacing={-1}>
            {product.name}
          </H1>
          <Span display="block" mt={2} fontSize={20}>
            {formatPrice(product.price)}
          </Span>
          <P mt={5} fontSize={17} lineHeight={28} {...muted}>
            {product.summary}
          </P>

          <Box mt={8}>
            <VariantPicker
              product={product}
              finish={finish}
              onFinishChange={setFinish}
              onAdd={(line) => setCartCount((count) => count + line.quantity)}
            />
          </Box>

          <Ul listStyle="none" m={0} p={0} mt={6} display="flex" d="column" gap={1.5} fontSize={14} {...muted}>
            <Li>Ships in 2–3 working days.</Li>
            <Li>Spare parts for ten years.</Li>
          </Ul>

          <Accordion id="details" mt={8} defaultValue={['materials']} level={2} css={{ scrollMarginTop: '6rem' }}>
            <Accordion.Item value="materials">
              <Accordion.Trigger>Materials and size</Accordion.Trigger>
              <Accordion.Panel>
                Solid materials only — steel, oak, stoneware and porcelain — under a matte finish that does not chip or yellow. Where an
                object comes in more than one size, the measurements are on the options above.
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="care">
              <Accordion.Trigger>Care</Accordion.Trigger>
              <Accordion.Panel>
                Dust with a dry cloth; a damp one and a drop of soap for anything more. Every part unscrews, and every part can be ordered
                again for ten years after you buy it.
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="shipping">
              <Accordion.Trigger>Shipping and returns</Accordion.Trigger>
              <Accordion.Panel>
                Free standard shipping on orders over $250. Returns are free within 30 days, and anything that arrives damaged is replaced —
                send us a photo, and keep the box.
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      </Grid>

      <Section props={{ 'aria-labelledby': 'related-heading' }} mt={20}>
        <H2 id="related-heading" fontSize={24} mb={8} {...heading}>
          You might also like
        </H2>
        <Grid gridTemplateColumns={2} lg={{ gridTemplateColumns: 4 }} columnGap={5} rowGap={8}>
          {related.map((entry) => (
            <ProductCard key={entry.slug} product={entry} />
          ))}
        </Grid>
      </Section>
    </StoreShell>
  );
}
