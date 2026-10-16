import { type ReactNode } from 'react';
import { StoreLinks, type StoreRoutes, StoreSurface } from '../../registry/designs/store/store-design';
import Box from '../../src/box';
import { templateDemoPath } from '../site/templates';

/** The store's links on this site: each page is another template's demo, and a product is a query on one. */
export const storeDemoRoutes: StoreRoutes = {
  shop: `${templateDemoPath('react-ecommerce-storefront')}/`,
  product: (slug) => `${templateDemoPath('react-product-page')}/${slug === 'table-lamp' ? '' : `?product=${slug}`}`,
  cart: `${templateDemoPath('react-shopping-cart')}/`,
  checkout: `${templateDemoPath('react-checkout-page')}/`,
};

export function StoreDemoLinks({ children }: { children: ReactNode }) {
  return <StoreLinks.Provider value={storeDemoRoutes}>{children}</StoreLinks.Provider>;
}

/** A store block on its own page: the store's design and links around it, and the theme of the half it is in. */
export function StoreBlock({ children }: { children: ReactNode }) {
  return (
    <StoreDemoLinks>
      <StoreSurface>
        <Box p={5} md={{ p: 6 }}>
          {children}
        </Box>
      </StoreSurface>
    </StoreDemoLinks>
  );
}
