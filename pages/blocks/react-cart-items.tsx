import { useState } from 'react';
import CartItems from '../../registry/designs/store/cart-items';
import { CartLine, sampleCart } from '../../registry/designs/store/store-data';
import { StoreBlock } from '../components/storeDemo';

// The cart is the page's to keep, so the preview keeps it.
export default function Preview() {
  const [lines, setLines] = useState<CartLine[]>([...sampleCart]);

  return (
    <StoreBlock>
      <CartItems lines={lines} onLinesChange={setLines} />
    </StoreBlock>
  );
}
