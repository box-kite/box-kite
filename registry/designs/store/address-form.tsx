'use client';
import Box from '@box-kite/react';
import Dropdown from '@box-kite/react/components/dropdown';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { Span } from '@box-kite/react/components/semantics';
import Textbox from '@box-kite/react/components/textbox';
import FormField from './form-field';

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Ireland', 'Germany', 'France', 'Netherlands', 'Moldova', 'Australia'];

export interface AddressFormProps {
  /** The fieldset's caption, and the prefix every field submits under: `shipping.city`, `billing.city`. */
  legend?: string;
  prefix?: string;
}

/**
 * A postal address as a `<fieldset>`: name, two street lines, city, postcode, country and a phone. Every
 * field carries the `autocomplete` token a browser fills it from, which on a phone is most of the typing.
 * Drop two into one form, with different prefixes, for a shipping and a billing address.
 */
export default function AddressForm({ legend = 'Shipping address', prefix = 'shipping' }: AddressFormProps) {
  const section = prefix === 'billing' ? 'billing' : 'shipping';
  const field = (name: string) => `${prefix}.${name}`;

  return (
    <Box tag="fieldset" b={0} p={0} m={0} minWidth={0}>
      <Box tag="legend" fontSize={18} fontWeight={600} mb={4}>
        {legend}
      </Box>
      <Flex d="column" gap={4}>
        <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 2 }} gap={4}>
          <FormField label="First name">
            {(control) => <Textbox name={field('firstName')} props={{ ...control, autoComplete: `${section} given-name` }} required />}
          </FormField>
          <FormField label="Last name">
            {(control) => <Textbox name={field('lastName')} props={{ ...control, autoComplete: `${section} family-name` }} required />}
          </FormField>
        </Grid>
        <FormField label="Street address">
          {(control) => <Textbox name={field('line1')} props={{ ...control, autoComplete: `${section} address-line1` }} required />}
        </FormField>
        <FormField label="Apartment, suite, floor" hint="Optional.">
          {(control) => <Textbox name={field('line2')} props={{ ...control, autoComplete: `${section} address-line2` }} />}
        </FormField>
        <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 2 }} gap={4}>
          <FormField label="City">
            {(control) => <Textbox name={field('city')} props={{ ...control, autoComplete: `${section} address-level2` }} required />}
          </FormField>
          <FormField label="Postcode">
            {(control) => <Textbox name={field('postcode')} props={{ ...control, autoComplete: `${section} postal-code` }} required />}
          </FormField>
        </Grid>
        <Dropdown<string>
          name={field('country')}
          label={
            <Span fontSize={14} fontWeight={500}>
              Country
            </Span>
          }
          labelProps={{ width: 'fit', gap: 1.5 }}
          defaultValue={COUNTRIES[0]}
          isSearchable
          searchPlaceholder="Search countries…"
        >
          {COUNTRIES.map((country) => (
            <Dropdown.Item key={country} value={country}>
              {country}
            </Dropdown.Item>
          ))}
        </Dropdown>
        <FormField label="Phone" hint="Only for the courier, if they cannot find you.">
          {(control) => <Textbox name={field('phone')} type="tel" props={{ ...control, autoComplete: `${section} tel` }} />}
        </FormField>
      </Flex>
    </Box>
  );
}
