'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import { Li, Link, Span, Ul } from '@box-kite/react/components/semantics';
import ProductArt from './product-art';
import QuantityStepper from './quantity-stepper';
import { type CartLine, formatPrice, finishes, productBySlug } from './store-data';
import { useStoreLinks } from './store-design';

export interface CartItemsProps {
  lines: readonly CartLine[];
  onLinesChange: (lines: CartLine[]) => void;
}

/**
 * The lines of a cart: picture, name, the options chosen, a quantity stepper, the line's price and a way
 * out. It holds no state — the cart is the page's, so the summary beside it reads the same list.
 */
export default function CartItems({ lines, onLinesChange }: CartItemsProps) {
  const links = useStoreLinks();
  const update = (id: string, quantity: number) => onLinesChange(lines.map((line) => (line.id === id ? { ...line, quantity } : line)));
  const remove = (id: string) => onLinesChange(lines.filter((line) => line.id !== id));

  return (
    <Ul listStyle="none" m={0} p={0} bt={1} borderColor="stone-200" theme={{ dark: { borderColor: 'stone-800' } }}>
      {lines.map((line) => {
        const product = productBySlug(line.slug);

        return (
          <Li key={line.id} display="flex" gap={4} py={5} bb={1} borderColor="stone-200" theme={{ dark: { borderColor: 'stone-800' } }}>
            <Box flexShrink={0} width={24} height={24} sm={{ width: 28, height: 28 }}>
              <ProductArt shape={product.shape} finish={line.finish} stroke={1} radius={3} />
            </Box>
            <Flex d="column" flex1 minWidth={0} gap={1}>
              <Flex jc="space-between" gap={3}>
                <Span fontSize={15} fontWeight={500}>
                  <Link
                    props={{ href: links.product(product.slug) }}
                    color="currentColor"
                    textDecoration="none"
                    hover={{ textDecoration: 'underline' }}
                  >
                    {product.name}
                  </Link>
                </Span>
                <Span fontWeight={500}>{formatPrice(product.price * line.quantity)}</Span>
              </Flex>
              <Span fontSize={14} color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
                {[finishes[line.finish].name, line.size].filter(Boolean).join(' · ')}
                {line.quantity > 1 && ` · ${formatPrice(product.price)} each`}
              </Span>
              <Flex ai="center" jc="space-between" gap={3} mt="auto" pt={3}>
                <QuantityStepper value={line.quantity} onChange={(quantity) => update(line.id, quantity)} item={product.name} />
                <Button
                  variant="ghost"
                  px={3}
                  py={1.5}
                  fontSize={14}
                  textDecoration="underline"
                  onClick={() => remove(line.id)}
                  props={{ 'aria-label': `Remove ${product.name} from the cart` }}
                >
                  Remove
                </Button>
              </Flex>
            </Flex>
          </Li>
        );
      })}
    </Ul>
  );
}
