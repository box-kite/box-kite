'use client';
import Tabs from '@box-kite/react/components/tabs';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt, { type ArtView, glazeBackdrop } from './product-art';
import { glazes, type Product, productBySlug } from './store-data';

const views: { value: ArtView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'detail', label: 'Close-up' },
  { value: 'pair', label: 'Pair' },
];

export interface ProductGalleryProps {
  product?: Product;
  /** The glaze on show — the variant picker beside the gallery owns it, and the backdrop follows it. */
  glaze?: string;
}

/**
 * A product's pictures: one large view and a row of thumbnails that choose it. The thumbnails are tabs
 * (APG's tabbed carousel), so the arrow keys move between them and each picture is named by its tab.
 */
export default function ProductGallery({ product = productBySlug('tide-mug'), glaze = product.glazes[0] }: ProductGalleryProps) {
  const pair = product.glazes.find((id) => id !== glaze) ?? glaze;
  const name = `${product.name} in ${glazes[glaze].name}`;
  const backdrop = glazeBackdrop(glaze);

  return (
    <Tabs defaultValue="front" gap={4}>
      <Tabs.List label={`${product.name} pictures`} order={1} bb={0} gap={3}>
        {views.map((view) => (
          <Tabs.Tab
            key={view.value}
            value={view.value}
            {...backdrop}
            p={1.5}
            mb={0}
            width={20}
            height={20}
            borderRadius={4}
            b={2}
            borderColor="transparent"
            opacity={0.7}
            hover={{ opacity: 1 }}
            ariaAttr={{ selected: { borderColor: 'stone-900', opacity: 1 } }}
            focusVisible={{ outlineOffset: 2, borderRadius: 4 }}
            theme={{ dark: { ...backdrop.theme.dark, ariaAttr: { selected: { borderColor: 'stone-100' } } } }}
          >
            <ProductArt shape={product.shape} glaze={glaze} pairGlaze={pair} view={view.value} />
            <VisuallyHidden>{view.label}</VisuallyHidden>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {views.map((view) => (
        <Tabs.Panel
          key={view.value}
          value={view.value}
          {...backdrop}
          aspectRatio="square"
          p={14}
          borderRadius={8}
          startingStyle={{ opacity: 0 }}
        >
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
