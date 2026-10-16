import ProductGallery from '../../registry/designs/store/product-gallery';
import Box from '../../src/box';
import { StoreBlock } from '../components/storeDemo';

export default function Preview() {
  return (
    <StoreBlock>
      <Box maxWidth={120} mx="auto">
        <ProductGallery />
      </Box>
    </StoreBlock>
  );
}
