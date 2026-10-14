'use client';
import Box from '@box-kite/react';
import Tabs from '@box-kite/react/components/tabs';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt, { type ArtView } from './product-art';
import { glazes, type Product, productBySlug } from './store-data';

const views: { value: ArtView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'detail', label: 'Close-up' },
  { value: 'pair', label: 'Pair' },
];

const frame = {
  borderRadius: 5,
  bgGradient: { radial: 'circle', at: 'top', colors: ['white', 'stone-200'] },
  theme: { dark: { bgGradient: { radial: 'circle', at: 'top', colors: ['stone-800', 'stone-900'] } } },
} as const;

export interface ProductGalleryProps {
  product?: Product;
  /** The glaze on show — the variant picker beside the gallery owns it. */
  glaze?: string;
}

/**
 * A product's pictures: one large view and a row of thumbnails that choose it. The thumbnails are tabs
 * (APG's tabbed carousel), so the arrow keys move between them and each picture is named by its tab.
 */
export default function ProductGallery({ product = productBySlug('tide-mug'), glaze = product.glazes[0] }: ProductGalleryProps) {
  const pair = product.glazes.find((id) => id !== glaze) ?? glaze;
  const name = `${product.name} in ${glazes[glaze].name}`;

  return (
    <Tabs defaultValue="front" gap={3}>
      <Tabs.List label={`${product.name} pictures`} order={1} bb={0} gap={3}>
        {views.map((view) => (
          <Tabs.Tab
            key={view.value}
            value={view.value}
            {...frame}
            p={2}
            mb={0}
            width={20}
            height={20}
            borderRadius={3}
            b={2}
            borderColor="transparent"
            ariaAttr={{ selected: { borderColor: 'stone-900' } }}
            focusVisible={{ outlineOffset: 2, borderRadius: 3 }}
            theme={{ dark: { ...frame.theme.dark, ariaAttr: { selected: { borderColor: 'stone-100' } } } }}
          >
            <Box width="fit" height="fit" pointerEvents="none">
              <ProductArt shape={product.shape} glaze={glaze} pairGlaze={pair} view={view.value} />
            </Box>
            <VisuallyHidden>{view.label}</VisuallyHidden>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {views.map((view) => (
        <Tabs.Panel key={view.value} value={view.value} aspectRatio="square" p={10} startingStyle={{ opacity: 0 }} {...frame}>
          <ProductArt
            shape={product.shape}
            glaze={glaze}
            pairGlaze={pair}
            view={view.value}
            label={`${name}, ${view.label.toLowerCase()}`}
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
