'use client';
import Flex from '@box-kite/react/components/flex';
import RadioGroup from '@box-kite/react/components/radioGroup';
import { Span } from '@box-kite/react/components/semantics';
import { formatPrice, type ShippingMethod as Method, shippingMethods } from './store-data';

export interface ShippingMethodProps {
  methods?: readonly Method[];
  value?: string;
  onValueChange?: (id: string) => void;
  /** Standard shipping is free above this subtotal. */
  freeStandard?: boolean;
}

/**
 * Delivery options as cards. Each card is the `<label>` of a native radio, so the whole card is the
 * target, the set is one tab stop with the arrow keys inside it, and the chosen card is styled with
 * `:has(:checked)` — the radio itself stays visible, because it is what says this is a choice of one.
 */
export default function ShippingMethod({ methods = shippingMethods, value, onValueChange, freeStandard }: ShippingMethodProps) {
  const priceOf = (method: Method) => (freeStandard && method.id === 'standard' ? 0 : method.price);

  return (
    <RadioGroup
      label="Delivery"
      name="shipping.method"
      value={value}
      defaultValue={value === undefined ? methods[0].id : undefined}
      onValueChange={(id) => id && onValueChange?.(id)}
      gap={3}
    >
      {methods.map((method) => (
        <RadioGroup.Item
          key={method.id}
          value={method.id}
          flexShrink={0}
          labelProps={{
            display: 'flex',
            ai: 'center',
            gap: 3,
            p: 4,
            b: 1,
            borderRadius: 3,
            cursor: 'pointer',
            borderColor: 'stone-300',
            bgColor: 'transparent',
            hover: { borderColor: 'stone-500' },
            has: { ':checked': { borderColor: 'stone-900', ring: 1, ringColor: 'stone-900' } },
            theme: {
              dark: {
                borderColor: 'stone-700',
                bgColor: 'transparent',
                hover: { borderColor: 'stone-500' },
                has: { ':checked': { borderColor: 'stone-100', ringColor: 'stone-100' } },
              },
            },
          }}
          label={
            <Flex flex1 jc="space-between" ai="center" gap={4}>
              <Flex d="column" gap={0.5}>
                <Span fontWeight={500}>{method.name}</Span>
                <Span fontSize={14} color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
                  {method.detail}
                </Span>
              </Flex>
              <Span fontWeight={500}>{priceOf(method) ? formatPrice(priceOf(method)) : 'Free'}</Span>
            </Flex>
          }
        />
      ))}
    </RadioGroup>
  );
}
