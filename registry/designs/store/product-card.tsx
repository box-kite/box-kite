'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import { Article, H2, H3, Link, Span } from '@box-kite/react/components/semantics';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt, { finishBackdrop, finishBead } from './product-art';
import { formatPrice, finishes, type Product } from './store-data';
import { heading, useStoreLinks } from './store-design';

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
  const [first, ...rest] = product.finishes;

  return (
    <Article position="relative" className="card">
      <Box
        position="relative"
        aspectRatio="4/5"
        borderRadius={6}
        overflow="hidden"
        px={5}
        pt={10}
        pb={4}
        transition="all"
        group={{ 'card/hover': { translateY: -1, shadow: 'xl', shadowColor: 'violet-900/10' } }}
        {...finishBackdrop(first)}
      >
        <Box height="fit" transition="transform" group={{ 'card/hover': { scale: 1.05, translateY: -1 } }}>
          <ProductArt shape={product.shape} finish={first} />
        </Box>
        {product.badge && (
          <Span
            position="absolute"
            top={3}
            insetStart={3}
            px={2.5}
            py={1}
            borderRadius={999}
            fontSize={11}
            fontWeight={700}
            letterSpacing={0.5}
            textTransform="uppercase"
            bgColor="white/80"
            color="slate-900"
            backdropBlur="sm"
            theme={{ dark: { bgColor: 'black/40', color: 'slate-100' } }}
          >
            {product.badge}
          </Span>
        )}
      </Box>
      <Flex jc="space-between" ai="baseline" gap={3} mt={4}>
        <Heading fontSize={19} letterSpacing={-0.2} {...heading}>
          <Link
            props={{ href: links.product(product.slug) }}
            color="currentColor"
            textDecoration="none"
            // The link's box stretched over the card, so the whole card is one target and still one tab stop.
            after={{ position: 'absolute', inset: 0, borderRadius: 6 }}
            focusVisible={{ outline: 0, after: { outline: 2, outlineColor: 'violet-600', outlineOffset: 3 } }}
          >
            {product.name}
          </Link>
        </Heading>
        <Span fontSize={15} fontWeight={600}>
          {formatPrice(product.price)}
        </Span>
      </Flex>
      <Flex ai="center" gap={1.5} mt={2}>
        {product.finishes.map((id) => (
          <Box
            key={id}
            width={4}
            height={4}
            borderRadius={999}
            ring={1}
            ringColor="slate-900/10"
            theme={{ dark: { ringColor: 'white/20' } }}
            {...finishBead(id)}
          />
        ))}
        <VisuallyHidden>Available in {[finishes[first].name, ...rest.map((id) => finishes[id].name)].join(', ')}.</VisuallyHidden>
      </Flex>
    </Article>
  );
}
