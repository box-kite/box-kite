import { useSyncExternalStore } from 'react';
import ProductPage from '../../registry/designs/store/product-page';
import { products } from '../../registry/designs/store/store-data';
import { StoreDemoLinks } from '../components/storeDemo';

const noUpdates = () => () => {};
const query = () => new URLSearchParams(window.location.search).get('product') ?? '';

/**
 * Every product links to this one demo with `?product=`. The page is prerendered once, for the robot, so the
 * server's answer is the empty query and hydration matches it before the real one is read.
 */
export default function Demo() {
  const asked = useSyncExternalStore(noUpdates, query, () => '');
  const slug = products.some((product) => product.slug === asked) ? asked : 'bolt-robot';

  return (
    <StoreDemoLinks>
      <ProductPage key={slug} slug={slug} />
    </StoreDemoLinks>
  );
}
