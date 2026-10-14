'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Article, H2, H3, Link, Span } from '@box-kite/react/components/semantics';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt from './product-art';
import { formatPrice, glazes, type Product } from './store-data';
import { SERIF, useStoreLinks } from './store-design';

export interface ProductCardProps {
  product: Product;
  /** The heading level the card's name takes in the page around it. */
  level?: 'h2' | 'h3';
}

/**
 * One product in a grid. The whole card is the link, and its name is the link's text: the picture is
 * decoration beside it, and the glaze swatches are spelled out for a screen reader in one sentence.
 */
export default function ProductCard({ product, level = 'h3' }: ProductCardProps) {
  const Heading = level === 'h2' ? H2 : H3;
  const links = useStoreLinks();
  const [first, ...rest] = product.glazes;

  return (
    <Article position="relative" className="card">
      <Box
        position="relative"
        aspectRatio="square"
        borderRadius={4}
        overflow="hidden"
        bgGradient={{ radial: 'circle', at: 'top', colors: ['white', 'stone-200'] }}
        theme={{ dark: { bgGradient: { radial: 'circle', at: 'top', colors: ['stone-800', 'stone-900'] } } }}
        p={4}
      >
        <Box height="fit" transition="transform" group={{ 'card/hover': { scale: 1.04 } }}>
          <ProductArt shape={product.shape} glaze={first} />
        </Box>
        {product.badge && (
          <Span
            position="absolute"
            top={3}
            insetStart={3}
            px={2.5}
            py={1}
            borderRadius={999}
            fontSize={12}
            fontWeight={600}
            bgColor="white/90"
            color="stone-900"
            theme={{ dark: { bgColor: 'stone-950/80', color: 'stone-100' } }}
          >
            {product.badge}
          </Span>
        )}
      </Box>
      <Flex jc="space-between" ai="baseline" gap={3} mt={3}>
        <Heading fontSize={17} fontWeight={500} css={{ fontFamily: SERIF }}>
          <Link
            props={{ href: links.product(product.slug) }}
            color="currentColor"
            textDecoration="none"
            hover={{ textDecoration: 'underline' }}
            // The link's box stretched over the card, so the whole card is one target and still one tab stop.
            after={{ position: 'absolute', inset: 0, borderRadius: 4 }}
            focusVisible={{ outline: 0, after: { outline: 2, outlineColor: 'orange-600', outlineOffset: 2 } }}
          >
            {product.name}
          </Link>
        </Heading>
        <Span fontSize={15} fontWeight={600}>
          {formatPrice(product.price)}
        </Span>
      </Flex>
      <Flex ai="center" gap={1.5} mt={2}>
        {product.glazes.map((id) => (
          <Box
            key={id}
            width={3.5}
            height={3.5}
            borderRadius={999}
            css={{ backgroundColor: glazes[id].color }}
            ring={1}
            ringColor="stone-900/15"
            theme={{ dark: { ringColor: 'white/20' } }}
          />
        ))}
        <VisuallyHidden>Available in {[glazes[first].name, ...rest.map((id) => glazes[id].name)].join(', ')}.</VisuallyHidden>
      </Flex>
    </Article>
  );
}
