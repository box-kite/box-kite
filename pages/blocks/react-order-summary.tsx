import OrderSummary from '../../registry/designs/store/order-summary';
import { sampleCart } from '../../registry/designs/store/store-data';
import { StoreBlock } from '../components/storeDemo';

export default function Preview() {
  return (
    <StoreBlock>
      <OrderSummary lines={sampleCart} />
    </StoreBlock>
  );
}
