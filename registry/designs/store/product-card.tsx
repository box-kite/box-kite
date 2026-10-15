'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Article, H2, H3, Link, Span } from '@box-kite/react/components/semantics';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt, { finishSwatch } from './product-art';
import { formatPrice, finishes, type Product } from './store-data';
import { eyebrow, useStoreLinks } from './store-design';

export interface ProductCardProps {
  product: Product;
  /** The heading level the card's name takes in the page around it. */
  level?: 'h2' | 'h3';
}

/**
 * One product in a grid. The whole card is the link, and its name is the link's text: the picture is
 * decoration beside it, and the finish swatches are spelled out for a screen reader in one sentence.
 */
export default function ProductCard({ product, level = 'h3' }: ProductCardProps) {
  const Heading = level === 'h2' ? H2 : H3;
  const links = useStoreLinks();
  const [first] = product.finishes;

  return (
    <Article position="relative" className="card">
      <Box position="relative" aspectRatio="square" transition="opacity" group={{ 'card/hover': { opacity: 0.8 } }}>
        <ProductArt shape={product.shape} finish={first} />
        {product.badge && (
          <Span position="absolute" top={4} insetStart={4} px={2} py={1} {...eyebrow} fontSize={11} bgColor="white" color="stone-900">
            {product.badge}
          </Span>
        )}
      </Box>
      <Flex jc="space-between" ai="baseline" gap={3} mt={4}>
        <Heading fontSize={15} fontWeight={500}>
          <Link
            props={{ href: links.product(product.slug) }}
            color="currentColor"
            textDecoration="none"
            // The link's box stretched over the card, so the whole card is one target and still one tab stop.
            after={{ position: 'absolute', inset: 0 }}
            focusVisible={{ outline: 0, after: { outline: 2, outlineColor: 'stone-900', outlineOffset: 4 } }}
            theme={{ dark: { focusVisible: { after: { outlineColor: 'stone-100' } } } }}
          >
            {product.name}
          </Link>
        </Heading>
        <Span fontSize={15}>{formatPrice(product.price)}</Span>
      </Flex>
      <Flex ai="center" gap={1.5} mt={2.5}>
        {product.finishes.map((id) => (
          <Box
            key={id}
            width={2.5}
            height={2.5}
            borderRadius={999}
            ring={1}
            ringColor="stone-900/15"
            theme={{ dark: { ringColor: 'white/20' } }}
            {...finishSwatch(id)}
          />
        ))}
        <VisuallyHidden>Available in {product.finishes.map((id) => finishes[id].name).join(', ')}.</VisuallyHidden>
      </Flex>
    </Article>
  );
}
