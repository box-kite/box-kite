'use client';
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Checkbox from '@box-kite/react/components/checkbox';
import Flex from '@box-kite/react/components/flex';
import Form from '@box-kite/react/components/form';
import Grid from '@box-kite/react/components/grid';
import { H1, P } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import { toast } from '@box-kite/react/components/toaster';
import { useState } from 'react';
import AddressForm from './address-form';
import CreditCardForm from './credit-card-form';
import FormField from './form-field';
import OrderSummary from './order-summary';
import ShippingMethod from './shipping-method';
import { FREE_SHIPPING_FROM, formatPrice, sampleCart, shippingMethods, subtotalOf, TAX_RATE } from './store-data';
import { card, heading } from './store-design';
import StoreShell from './store-shell';

const panel = { ...card, p: 6, borderRadius: 6 } as const;

/**
 * The checkout: one form of contact, address, delivery and payment, beside the order it pays for. The
 * sections are separate blocks, each a `<fieldset>`, so the form reads every field by name on submit.
 */
export default function CheckoutPage({ theme }: { theme?: string }) {
  const lines = sampleCart;
  const [method, setMethod] = useState(shippingMethods[0].id);
  const [sameBilling, setSameBilling] = useState(true);
  const [discount, setDiscount] = useState(0);
  const subtotal = subtotalOf(lines);
  const freeStandard = subtotal >= FREE_SHIPPING_FROM;
  const chosen = shippingMethods.find((entry) => entry.id === method) ?? shippingMethods[0];
  const shipping = freeStandard && chosen.id === 'standard' ? 0 : chosen.price;
  const total = subtotal - discount + shipping + (subtotal - discount) * TAX_RATE;

  return (
    <StoreShell checkout theme={theme}>
      <H1 fontSize={44} lineHeight={50} letterSpacing={-1} mb={8} {...heading}>
        Checkout
      </H1>

      <Grid gridTemplateColumns={1} lg={{ css: { gridTemplateColumns: 'minmax(0, 1fr) 26rem' } }} gap={12} ai="start">
        <Form<Record<string, string>>
          display="flex"
          d="column"
          gap={5}
          onSubmit={(values) =>
            toast.success('Order placed', { description: `A confirmation is on its way to ${values.email || 'your inbox'}.` })
          }
        >
          <Box {...panel}>
            <Box tag="fieldset" b={0} p={0} m={0} minWidth={0}>
              <Box tag="legend" fontSize={18} fontWeight={600} mb={4}>
                Contact
              </Box>
              <Flex d="column" gap={3}>
                <FormField label="Email" hint="For the receipt and the tracking link, nothing else.">
                  {(control) => <Textbox name="email" type="email" props={{ ...control, autoComplete: 'email' }} required />}
                </FormField>
                <Checkbox name="newsletter" label="Tell me when the next drop lands" />
              </Flex>
            </Box>
          </Box>

          <Box {...panel}>
            <AddressForm />
          </Box>

          <Box {...panel}>
            <ShippingMethod value={method} onValueChange={setMethod} freeStandard={freeStandard} />
          </Box>

          <Box {...panel}>
            <CreditCardForm />
            <Box mt={5}>
              <Checkbox
                name="sameBilling"
                label="Billing address is the same as shipping"
                checked={sameBilling}
                onChange={(event) => setSameBilling(event.target.checked)}
              />
            </Box>
          </Box>

          {!sameBilling && (
            <Box {...panel}>
              <AddressForm legend="Billing address" prefix="billing" />
            </Box>
          )}

          <Box>
            <Button type="submit" width="fit" py={4} fontSize={17}>
              Pay {formatPrice(total)}
            </Button>
            <P mt={3} fontSize={13} textAlign="center" color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
              A demo: nothing is charged and nothing is sent anywhere.
            </P>
          </Box>
        </Form>

        <Box lg={{ position: 'sticky', top: 24 }}>
          <OrderSummary lines={lines} shipping={shipping} showLines onDiscountChange={setDiscount} />
        </Box>
      </Grid>
    </StoreShell>
  );
}
