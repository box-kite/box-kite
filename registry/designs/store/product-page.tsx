'use client';
import Box from '@box-kite/react';
import Accordion from '@box-kite/react/components/accordion';
import Grid from '@box-kite/react/components/grid';
import { H1, H2, Li, Link, Nav, Ol, P, Section, Span, Ul } from '@box-kite/react/components/semantics';
import { useState } from 'react';
import ProductCard from './product-card';
import ProductGallery from './product-gallery';
import { countOf, formatPrice, productBySlug, products, sampleCart } from './store-data';
import { heading, useStoreLinks } from './store-design';
import StoreShell from './store-shell';
import VariantPicker from './variant-picker';

const muted = { color: 'slate-600', theme: { dark: { color: 'slate-400' } } } as const;

/** One product: the gallery and the picker share the finish, and adding to the cart moves the header's count. */
export default function ProductPage({ slug = 'bolt-robot', theme }: { slug?: string; theme?: string }) {
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
              hover={{ color: 'violet-800' }}
              theme={{ dark: { hover: { color: 'violet-300' } } }}
            >
              Shop
            </Link>
          </Li>
          <Li props={{ 'aria-hidden': true }}>/</Li>
          <Li>{product.category}</Li>
          <Li props={{ 'aria-hidden': true }}>/</Li>
          <Li color="slate-900" theme={{ dark: { color: 'slate-100' } }} props={{ 'aria-current': 'page' }}>
            {product.name}
          </Li>
        </Ol>
      </Nav>

      <Grid gridTemplateColumns={1} lg={{ gridTemplateColumns: 2 }} gap={10} xl={{ gap: 16 }} ai="start">
        <ProductGallery product={product} finish={finish} />

        <Box>
          {product.badge && (
            <Span
              fontSize={13}
              fontWeight={600}
              letterSpacing={1.5}
              textTransform="uppercase"
              color="violet-800"
              theme={{ dark: { color: 'violet-300' } }}
            >
              {product.badge}
            </Span>
          )}
          <H1 mt={2} fontSize={44} lineHeight={50} letterSpacing={-1} {...heading}>
            {product.name}
          </H1>
          <Span display="block" mt={3} fontSize={22} fontWeight={500}>
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
            <Li>Ships in 2–3 working days from the studio.</Li>
            <Li>Arrives in a numbered box, ready to give.</Li>
          </Ul>

          <Accordion id="details" mt={8} defaultValue={['materials']} level={2} css={{ scrollMarginTop: '6rem' }}>
            <Accordion.Item value="materials">
              <Accordion.Trigger>Materials and size</Accordion.Trigger>
              <Accordion.Panel>
                Soft-touch vinyl with a gloss coat, weighted at the base so it stands where it is put. Every toy is painted by hand, so the
                blush and the eyes wander a millimetre from one to the next.
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="care">
              <Accordion.Trigger>Care and cleaning</Accordion.Trigger>
              <Accordion.Panel>
                Wipe with a damp cloth and a drop of soap. Keep it out of a hot car: vinyl forgives a lot, but not a summer afternoon on a
                dashboard.
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="shipping">
              <Accordion.Trigger>Shipping and returns</Accordion.Trigger>
              <Accordion.Panel>
                Free standard shipping on orders over $150. Returns are free within 30 days, and anything that arrives scuffed is replaced —
                send us a photo, keep the toy.
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Box>
      </Grid>

      <Section props={{ 'aria-labelledby': 'related-heading' }} mt={20}>
        <H2 id="related-heading" fontSize={30} letterSpacing={-0.5} mb={6} {...heading}>
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
