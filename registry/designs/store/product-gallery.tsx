'use client';
import Tabs from '@box-kite/react/components/tabs';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
import ProductArt, { type ArtView } from './product-art';
import { finishes, type Product, productBySlug } from './store-data';

const views: { value: ArtView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'set', label: 'All finishes' },
];

const list = new Intl.ListFormat('en');

export interface ProductGalleryProps {
  product?: Product;
  /** The finish on show — the variant picker beside the gallery owns it. */
  finish?: string;
}

/**
 * A product's pictures: one large view and a row of thumbnails that choose it. The thumbnails are tabs
 * (APG's tabbed carousel), so the arrow keys move between them and each picture is named by its tab.
 */
export default function ProductGallery({ product = productBySlug('table-lamp'), finish = product.finishes[0] }: ProductGalleryProps) {
  const also = product.finishes.filter((id) => id !== finish);
  const labels: Record<ArtView, string> = {
    front: `${product.name} in ${finishes[finish].name}`,
    set: `${product.name} in ${list.format([finish, ...also].map((id) => finishes[id].name))}`,
  };

  return (
    <Tabs defaultValue="front" gap={3}>
      <Tabs.List label={`${product.name} pictures`} order={1} bb={0} gap={3}>
        {views.map((view) => (
          <Tabs.Tab
            key={view.value}
            value={view.value}
            px={1}
            py={1}
            bgColor="transparent"
            mb={0}
            width={20}
            height={20}
            borderRadius={3}
            b={1}
            borderColor="transparent"
            hover={{ borderColor: 'stone-300' }}
            ariaAttr={{ selected: { borderColor: 'stone-900' } }}
            focusVisible={{ outlineOffset: 2 }}
            theme={{
              dark: { bgColor: 'transparent', hover: { borderColor: 'stone-600' }, ariaAttr: { selected: { borderColor: 'stone-100' } } },
            }}
          >
            <ProductArt shape={product.shape} finish={finish} also={also} view={view.value} stroke={1.5} radius={2} />
            <VisuallyHidden>{view.label}</VisuallyHidden>
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {views.map((view) => (
        <Tabs.Panel key={view.value} value={view.value} aspectRatio="square" borderRadius={6} startingStyle={{ opacity: 0 }}>
          <ProductArt
            shape={product.shape}
            finish={finish}
            also={also}
            view={view.value}
            label={labels[view.value]}
            stroke={0.5}
            radius={6}
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
