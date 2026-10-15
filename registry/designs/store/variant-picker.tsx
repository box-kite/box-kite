'use client';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import RadioGroup from '@box-kite/react/components/radioGroup';
import { Span } from '@box-kite/react/components/semantics';
import { toast } from '@box-kite/react/components/toaster';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import { useState } from 'react';
import { glazeBead } from './product-art';
import QuantityStepper from './quantity-stepper';
import { type CartLine, formatPrice, glazes, type Product, productBySlug } from './store-data';
import { useStoreLinks } from './store-design';

export interface VariantPickerProps {
  product?: Product;
  /** The glaze, when the page owns it — the gallery beside the picker shows the same one. */
  glaze?: string;
  onGlazeChange?: (glaze: string) => void;
  /** Called with the line the reader added. */
  onAdd?: (line: CartLine) => void;
}

/**
 * Colour, size and quantity, then Add to cart. The swatches and the sizes are native radios, each set one
 * tab stop with the arrow keys inside it, and only the frame around them is drawn here: the `<label>`
 * finds out which radio is chosen with `:has(:checked)`, so nothing is mirrored into state for the styling.
 */
export default function VariantPicker({ product = productBySlug('tide-mug'), glaze, onGlazeChange, onAdd }: VariantPickerProps) {
  const links = useStoreLinks();
  const [ownGlaze, setOwnGlaze] = useState(product.glazes[0]);
  const [size, setSize] = useState(product.sizes?.[0]);
  const [quantity, setQuantity] = useState(1);
  const current = glaze ?? ownGlaze;

  const choose = (value: string | undefined) => {
    if (!value) return;
    setOwnGlaze(value);
    onGlazeChange?.(value);
  };

  const add = () => {
    const line = { id: `${product.slug}-${current}-${size ?? ''}`, slug: product.slug, glaze: current, size, quantity };

    onAdd?.(line);
    toast.success('Added to your cart', {
      description: `${quantity} × ${product.name}, ${glazes[current].name}${size ? `, ${size}` : ''}`,
      action: { label: 'View cart', onClick: () => window.location.assign(links.cart) },
    });
  };

  return (
    <Flex d="column" gap={6}>
      <RadioGroup
        label={
          <>
            Glaze:{' '}
            <Span fontWeight={400} color="stone-600" theme={{ dark: { color: 'stone-400' } }}>
              {glazes[current].name}
            </Span>
          </>
        }
        value={current}
        onValueChange={choose}
        orientation="horizontal"
        gap={3}
      >
        {product.glazes.map((id) => (
          <RadioGroup.Item
            key={id}
            value={id}
            label={<VisuallyHidden>{glazes[id].name}</VisuallyHidden>}
            clean
            appearance="none"
            display="block"
            width={8}
            height={8}
            m={0}
            borderRadius={999}
            cursor="pointer"
            {...glazeBead(id)}
            ring={1}
            ringColor="stone-900/15"
            theme={{ dark: { ringColor: 'white/20' } }}
            labelProps={{
              p: 1,
              b: 2,
              borderRadius: 999,
              borderColor: 'transparent',
              has: {
                ':checked': { borderColor: 'stone-900' },
                ':focus-visible': { outline: 2, outlineColor: 'orange-600', outlineOffset: 2 },
              },
              theme: { dark: { has: { ':checked': { borderColor: 'stone-100' } } } },
            }}
          />
        ))}
      </RadioGroup>

      {product.sizes && (
        <RadioGroup label="Size" value={size} onValueChange={setSize} orientation="horizontal" gap={2}>
          {product.sizes.map((option) => (
            <RadioGroup.Item
              key={option}
              value={option}
              label={option}
              clean
              appearance="none"
              position="absolute"
              opacity={0}
              width={0}
              height={0}
              m={0}
              labelProps={{
                position: 'relative',
                px: 5,
                py: 2,
                b: 1,
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderColor: 'stone-300',
                hover: { borderColor: 'stone-500' },
                has: {
                  ':checked': { bgColor: 'stone-900', borderColor: 'stone-900', color: 'stone-50' },
                  ':focus-visible': { outline: 2, outlineColor: 'orange-600', outlineOffset: 2 },
                },
                theme: {
                  dark: {
                    borderColor: 'stone-700',
                    hover: { borderColor: 'stone-500' },
                    has: { ':checked': { bgColor: 'stone-100', borderColor: 'stone-100', color: 'stone-900' } },
                  },
                },
              }}
            />
          ))}
        </RadioGroup>
      )}

      <Flex gap={3} ai="center" flexWrap="wrap">
        <QuantityStepper value={quantity} onChange={setQuantity} item={product.name} />
        <Button flex1 minWidth={48} py={3} onClick={add}>
          Add to cart · {formatPrice(product.price * quantity)}
        </Button>
      </Flex>
    </Flex>
  );
}
