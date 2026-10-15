'use client';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import RadioGroup from '@box-kite/react/components/radioGroup';
import { Span } from '@box-kite/react/components/semantics';
import { toast } from '@box-kite/react/components/toaster';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import { useState } from 'react';
import { finishBead } from './product-art';
import QuantityStepper from './quantity-stepper';
import { type CartLine, formatPrice, finishes, type Product, productBySlug } from './store-data';
import { useStoreLinks } from './store-design';

export interface VariantPickerProps {
  product?: Product;
  /** The finish, when the page owns it — the gallery beside the picker shows the same one. */
  finish?: string;
  onFinishChange?: (finish: string) => void;
  /** Called with the line the reader added. */
  onAdd?: (line: CartLine) => void;
}

/**
 * Colour, size and quantity, then Add to cart. The swatches and the sizes are native radios, each set one
 * tab stop with the arrow keys inside it, and only the frame around them is drawn here: the `<label>`
 * finds out which radio is chosen with `:has(:checked)`, so nothing is mirrored into state for the styling.
 */
export default function VariantPicker({ product = productBySlug('bolt-robot'), finish, onFinishChange, onAdd }: VariantPickerProps) {
  const links = useStoreLinks();
  const [ownFinish, setOwnFinish] = useState(product.finishes[0]);
  const [size, setSize] = useState(product.sizes?.[0]);
  const [quantity, setQuantity] = useState(1);
  const current = finish ?? ownFinish;

  const choose = (value: string | undefined) => {
    if (!value) return;
    setOwnFinish(value);
    onFinishChange?.(value);
  };

  const add = () => {
    const line = { id: `${product.slug}-${current}-${size ?? ''}`, slug: product.slug, finish: current, size, quantity };

    onAdd?.(line);
    toast.success('Added to your cart', {
      description: `${quantity} × ${product.name}, ${finishes[current].name}${size ? `, ${size}` : ''}`,
      action: { label: 'View cart', onClick: () => window.location.assign(links.cart) },
    });
  };

  return (
    <Flex d="column" gap={6}>
      <RadioGroup
        label={
          <>
            Finish:{' '}
            <Span fontWeight={400} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
              {finishes[current].name}
            </Span>
          </>
        }
        value={current}
        onValueChange={choose}
        orientation="horizontal"
        gap={3}
      >
        {product.finishes.map((id) => (
          <RadioGroup.Item
            key={id}
            value={id}
            label={<VisuallyHidden>{finishes[id].name}</VisuallyHidden>}
            clean
            appearance="none"
            display="block"
            width={8}
            height={8}
            m={0}
            borderRadius={999}
            cursor="pointer"
            {...finishBead(id)}
            ring={1}
            ringColor="slate-900/15"
            theme={{ dark: { ringColor: 'white/20' } }}
            labelProps={{
              p: 1,
              b: 2,
              borderRadius: 999,
              borderColor: 'transparent',
              has: {
                ':checked': { borderColor: 'slate-900' },
                ':focus-visible': { outline: 2, outlineColor: 'violet-600', outlineOffset: 2 },
              },
              theme: { dark: { has: { ':checked': { borderColor: 'slate-100' } } } },
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
                borderColor: 'slate-300',
                hover: { borderColor: 'slate-500' },
                has: {
                  ':checked': { bgColor: 'slate-900', borderColor: 'slate-900', color: 'slate-50' },
                  ':focus-visible': { outline: 2, outlineColor: 'violet-600', outlineOffset: 2 },
                },
                theme: {
                  dark: {
                    borderColor: 'slate-700',
                    hover: { borderColor: 'slate-500' },
                    has: { ':checked': { bgColor: 'slate-100', borderColor: 'slate-100', color: 'slate-900' } },
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
