'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Progress from '@box-kite/react/components/progress';
import { Aside, H2, Label, Li, Span, Ul } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import ProductArt from './product-art';
import { type CartLine, FREE_SHIPPING_FROM, formatPrice, finishes, productBySlug, subtotalOf, TAX_RATE } from './store-data';
import { heading } from './store-design';

/** The one code the demo accepts. Check codes on your server; this is only the shape of the round trip. */
const CODES: Record<string, number> = { STILL10: 0.1 };

export interface OrderSummaryProps {
  lines: readonly CartLine[];
  /** The shipping price once a method is chosen. Left out, the summary says it is worked out at checkout. */
  shipping?: number;
  /** List the objects themselves — what a checkout page shows, where the cart is no longer on screen. */
  showLines?: boolean;
  /** The button underneath: "Checkout" on the cart page, nothing on the checkout. */
  action?: ReactNode;
  /** Told the discount once a code is accepted, for a page that shows the total somewhere else too. */
  onDiscountChange?: (amount: number) => void;
}

/**
 * Subtotal, discount, shipping, tax and the total, with a discount-code field and how far the cart is from
 * free shipping. Every figure is computed from `lines`, so it can never disagree with the cart beside it.
 */
export default function OrderSummary({ lines, shipping, showLines, action, onDiscountChange }: OrderSummaryProps) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<string>();
  const [error, setError] = useState<string>();
  const ids = { heading: useId(), code: useId(), error: useId() };

  const subtotal = subtotalOf(lines);
  const discount = applied ? subtotal * CODES[applied] : 0;
  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + (shipping ?? 0) + tax;
  const toFree = Math.max(FREE_SHIPPING_FROM - subtotal, 0);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    const normalised = code.trim().toUpperCase();

    if (CODES[normalised]) {
      setApplied(normalised);
      onDiscountChange?.(subtotal * CODES[normalised]);
      setError(undefined);
    } else {
      setError(normalised ? `“${code.trim()}” is not a code we recognise.` : 'Enter a code first.');
    }
  };

  return (
    <Aside props={{ 'aria-labelledby': ids.heading }} p={6} bgColor="stone-100" theme={{ dark: { bgColor: 'stone-900' } }}>
      <H2 id={ids.heading} fontSize={18} {...heading}>
        Order summary
      </H2>

      {showLines && (
        <Ul listStyle="none" m={0} p={0} mt={5} display="flex" d="column" gap={4}>
          {lines.map((line) => {
            const product = productBySlug(line.slug);

            return (
              <Li key={line.id} display="flex" ai="center" gap={3}>
                <Box position="relative" flexShrink={0} width={14} height={14}>
                  <ProductArt shape={product.shape} finish={line.finish} stroke={1.5} />
                  <Span
                    position="absolute"
                    top={-1.5}
                    insetEnd={-1.5}
                    minWidth={5}
                    height={5}
                    px={1}
                    display="flex"
                    ai="center"
                    jc="center"
                    borderRadius={999}
                    fontSize={11}
                    fontWeight={700}
                    bgColor="stone-700"
                    color="white"
                    props={{ 'aria-hidden': true }}
                  >
                    {line.quantity}
                  </Span>
                </Box>
                <Flex d="column" flex1 minWidth={0} fontSize={14}>
                  <Span fontWeight={500}>
                    {product.name}
                    {line.quantity > 1 && <Span display="inline" fontWeight={400}>{` × ${line.quantity}`}</Span>}
                  </Span>
                  <Span color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
                    {[finishes[line.finish].name, line.size].filter(Boolean).join(' · ')}
                  </Span>
                </Flex>
                <Span fontSize={14} fontWeight={500}>
                  {formatPrice(product.price * line.quantity)}
                </Span>
              </Li>
            );
          })}
        </Ul>
      )}

      <Box tag="form" mt={5} props={{ onSubmit: apply, noValidate: true }}>
        <Label display="block" fontSize={14} fontWeight={500} mb={2} props={{ htmlFor: ids.code }}>
          Discount code
        </Label>
        <Flex gap={2}>
          <Textbox
            id={ids.code}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Try STILL10"
            props={{ autoComplete: 'off', 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? ids.error : undefined }}
          />
          <Button type="submit" variant="secondary" flexShrink={0}>
            Apply
          </Button>
        </Flex>
        {error && (
          <Span id={ids.error} display="block" mt={2} fontSize={13} color="red-700" theme={{ dark: { color: 'red-400' } }}>
            {error}
          </Span>
        )}
      </Box>

      <Box tag="dl" mt={5} display="flex" d="column" gap={3} fontSize={15}>
        <Row term="Subtotal" value={formatPrice(subtotal)} />
        {applied && <Row term={`Discount (${applied})`} value={`−${formatPrice(discount)}`} accent />}
        <Row term="Shipping" value={shipping === undefined ? 'At checkout' : shipping === 0 ? 'Free' : formatPrice(shipping)} />
        <Row term="Estimated tax" value={formatPrice(tax)} />
        <Flex jc="space-between" ai="baseline" pt={4} mt={1} bt={1} borderColor="stone-200" theme={{ dark: { borderColor: 'stone-800' } }}>
          <Box tag="dt" fontWeight={500}>
            Total
          </Box>
          <Box tag="dd" m={0} fontSize={22} fontWeight={500}>
            {formatPrice(total)}
          </Box>
        </Flex>
      </Box>

      {shipping === undefined && (
        <Box mt={5}>
          <Progress label="Progress towards free shipping" value={Math.min(subtotal / FREE_SHIPPING_FROM, 1) * 100} />
          <Span display="block" mt={2} fontSize={13} color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
            {toFree ? `${formatPrice(toFree)} more and standard shipping is free.` : 'Your order ships free.'}
          </Span>
        </Box>
      )}

      {action && <Box mt={6}>{action}</Box>}
    </Aside>
  );
}

function Row({ term, value, accent }: { term: string; value: string; accent?: boolean }) {
  return (
    <Flex jc="space-between" gap={4} color={accent ? 'green-700' : undefined} theme={accent ? { dark: { color: 'green-400' } } : undefined}>
      <Box tag="dt" color={accent ? undefined : 'stone-600'} theme={accent ? undefined : { dark: { color: 'stone-400' } }}>
        {term}
      </Box>
      <Box tag="dd" m={0} fontWeight={500}>
        {value}
      </Box>
    </Flex>
  );
}
