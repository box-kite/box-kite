'use client';
import Box from '@box-kite/react';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { Span } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import { useState } from 'react';
import FormField from './form-field';

type CardField = 'number' | 'name' | 'expiry' | 'cvc';

const digits = (value: string) => value.replace(/\D/g, '');

/** Groups of four as the reader types, which is how the number is printed on the card in their hand. */
const formatCardNumber = (value: string) =>
  digits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

/** `MM / YY`, with the slash written for them once the month is whole. */
const formatExpiry = (value: string) => {
  const raw = digits(value).slice(0, 4);

  return raw.length > 2 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw;
};

/** The Luhn checksum every card number carries: catches a mistyped or transposed digit before a server is asked. */
function passesLuhn(value: string) {
  const number = digits(value);
  if (number.length < 12) return false;

  let sum = 0;
  for (let index = 0; index < number.length; index++) {
    let digit = Number(number[number.length - 1 - index]);
    if (index % 2) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }

  return sum % 10 === 0;
}

function problemWith(field: CardField, value: string, today = new Date()): string | undefined {
  if (!value.trim()) return 'Required.';
  if (field === 'number' && !passesLuhn(value)) return 'That card number does not look right — check the digits.';
  if (field === 'cvc' && !/^\d{3,4}$/.test(value)) return 'Three digits on the back, four on the front of some cards.';
  if (field === 'expiry') {
    const [month, year] = value.split(' / ').map(Number);
    if (!month || month > 12 || !year) return 'Write it as MM / YY.';
    if (new Date(2000 + year, month) <= today) return 'This card has expired.';
  }

  return undefined;
}

/**
 * A card payment fieldset: number, name, expiry and security code, formatted as they are typed and checked
 * when a field is left, with a card drawn above that fills in as they go. It is a `<fieldset>`, not a form,
 * so it drops into a checkout form beside the address; the fields submit as `cardNumber`, `cardName`,
 * `cardExpiry` and `cardCvc`, with the `autocomplete` tokens a browser fills a saved card from.
 *
 * This only shapes the input. Sending a raw card number to your own server puts you in scope for PCI DSS —
 * in production these fields are usually your payment provider's hosted inputs, laid out the same way.
 */
export default function CreditCardForm() {
  const [values, setValues] = useState<Record<CardField, string>>({ number: '', name: '', expiry: '', cvc: '' });
  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>({});

  const error = (field: CardField) => (touched[field] ? problemWith(field, values[field]) : undefined);
  const set = (field: CardField, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const leave = (field: CardField) => () => setTouched((current) => ({ ...current, [field]: true }));

  return (
    <Box tag="fieldset" b={0} p={0} m={0} minWidth={0}>
      <Box tag="legend" fontSize={18} fontWeight={600} mb={4}>
        Payment
      </Box>

      <Card number={values.number} name={values.name} expiry={values.expiry} />

      <Flex d="column" gap={4} mt={5}>
        <FormField label="Card number" error={error('number')}>
          {(control) => (
            <Textbox
              name="cardNumber"
              value={values.number}
              onChange={(event) => set('number', formatCardNumber(event.target.value))}
              placeholder="1234 5678 9012 3456"
              props={{ ...control, inputMode: 'numeric', autoComplete: 'cc-number', onBlur: leave('number') }}
            />
          )}
        </FormField>
        <FormField label="Name on card" error={error('name')}>
          {(control) => (
            <Textbox
              name="cardName"
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              props={{ ...control, autoComplete: 'cc-name', onBlur: leave('name') }}
            />
          )}
        </FormField>
        <Grid gridTemplateColumns={2} gap={4}>
          <FormField label="Expiry" error={error('expiry')}>
            {(control) => (
              <Textbox
                name="cardExpiry"
                value={values.expiry}
                onChange={(event) => set('expiry', formatExpiry(event.target.value))}
                placeholder="MM / YY"
                props={{ ...control, inputMode: 'numeric', autoComplete: 'cc-exp', onBlur: leave('expiry') }}
              />
            )}
          </FormField>
          <FormField label="Security code" error={error('cvc')}>
            {(control) => (
              <Textbox
                name="cardCvc"
                value={values.cvc}
                onChange={(event) => set('cvc', digits(event.target.value).slice(0, 4))}
                placeholder="123"
                props={{ ...control, inputMode: 'numeric', autoComplete: 'cc-csc', onBlur: leave('cvc') }}
              />
            )}
          </FormField>
        </Grid>
      </Flex>
    </Box>
  );
}

/** The card as it fills in. Decoration: every character on it is already in a labelled field below. */
function Card({ number, name, expiry }: { number: string; name: string; expiry: string }) {
  const shown = digits(number)
    .padEnd(16, '•')
    .replace(/(.{4})(?=.)/g, '$1 ');

  return (
    <Flex
      d="column"
      jc="space-between"
      aspectRatio={1.586}
      maxWidth={88}
      p={5}
      borderRadius={4}
      color="white"
      shadow="lg"
      bgGradient={{ linear: 135, colors: ['stone-800', 'stone-950'] }}
      theme={{ dark: { bgGradient: { linear: 135, colors: ['orange-800', 'stone-900'] }, shadow: 'none', ring: 1, ringColor: 'white/10' } }}
      props={{ 'aria-hidden': true }}
    >
      <Flex jc="space-between" ai="start">
        <Box width={10} height={7.5} borderRadius={1.5} bgGradient={{ linear: 'br', colors: ['amber-200', 'amber-500'] }} />
        <Span fontSize={13} fontWeight={600} letterSpacing={2} opacity={0.8}>
          DEBIT
        </Span>
      </Flex>
      <Span fontSize={20} letterSpacing={2} css={{ fontVariantNumeric: 'tabular-nums' }}>
        {shown}
      </Span>
      <Flex jc="space-between" fontSize={12} textTransform="uppercase" letterSpacing={1}>
        <Span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {name || 'Your name'}
        </Span>
        <Span>{expiry || 'MM / YY'}</Span>
      </Flex>
    </Flex>
  );
}
