'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { H1, Link, P } from '@box-kite/react/components/semantics';
import { useState } from 'react';
import CartItems from './cart-items';
import OrderSummary from './order-summary';
import ProductArt from './product-art';
import { type CartLine, countOf, sampleCart } from './store-data';
import { heading, useStoreLinks } from './store-design';
import StoreShell from './store-shell';

const muted = { color: 'slate-600', theme: { dark: { color: 'slate-400' } } } as const;

/** The cart: its lines beside the summary, both reading one list, and an empty state once it is cleared. */
export default function CartPage({ theme }: { theme?: string }) {
  const links = useStoreLinks();
  const [lines, setLines] = useState<CartLine[]>([...sampleCart]);
  const count = countOf(lines);

  return (
    <StoreShell cartCount={count} theme={theme}>
      <Flex jc="space-between" ai="baseline" gap={4} flexWrap="wrap" mb={8}>
        <H1 fontSize={44} lineHeight={50} letterSpacing={-1} {...heading}>
          Your cart
        </H1>
        <Link props={{ href: `${links.shop}#collection` }} fontSize={15} color="violet-800" theme={{ dark: { color: 'violet-300' } }}>
          Continue shopping
        </Link>
      </Flex>

      {lines.length ? (
        <Grid gridTemplateColumns={1} lg={{ css: { gridTemplateColumns: 'minmax(0, 1fr) 24rem' } }} gap={10} ai="start">
          <Box>
            <P mb={4} fontSize={15} {...muted}>
              {count} {count === 1 ? 'toy' : 'toys'}, each hand-finished — so the paint on yours may wander a little from the pictures.
            </P>
            <CartItems lines={lines} onLinesChange={setLines} />
          </Box>
          <OrderSummary
            lines={lines}
            action={
              <Link component="button" props={{ href: links.checkout }} width="fit" py={3.5} textDecoration="none">
                Checkout
              </Link>
            }
          />
        </Grid>
      ) : (
        <Flex
          d="column"
          ai="center"
          textAlign="center"
          gap={3}
          py={16}
          borderRadius={6}
          bgColor="slate-100"
          theme={{ dark: { bgColor: 'slate-900' } }}
        >
          <Box width={32} height={32}>
            <ProductArt shape="ghost" finish="pearl" />
          </Box>
          <P fontSize={20} {...heading}>
            Your cart is empty.
          </P>
          <P fontSize={15} {...muted}>
            Boo is lonely. The next drop lands on Thursday.
          </P>
          <Link component="button" props={{ href: `${links.shop}#collection` }} mt={3} textDecoration="none">
            Browse the collection
          </Link>
        </Flex>
      )}
    </StoreShell>
  );
}
