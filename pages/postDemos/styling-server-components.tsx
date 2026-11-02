import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import { H2, P, Span } from '../../src/components/semantics';

// The article's own snippets, run: an image named `orders-page.png` is replaced by `OrdersPage`. Keep each identical to its code block,
// except that the `H1` is an `H2`: the post owns the page's `<h1>`.

const orders = [
  { id: 4100, customer: 'Ana', status: 'Shipped' },
  { id: 4101, customer: 'Ion', status: 'Packing' },
  { id: 4102, customer: 'Mara', status: 'Delivered' },
];

export function OrdersPage() {
  return (
    <Flex d="column" gap={6} p={6} maxWidth={300} mx="auto">
      <H2 fontSize={28} fontWeight={700}>
        Orders
      </H2>
      <Grid gridTemplateColumns={1} gap={4} md={{ gridTemplateColumns: 3 }}>
        {orders.map((order) => (
          <Flex
            key={order.id}
            d="column"
            gap={2}
            p={5}
            borderRadius={3}
            b={1}
            borderColor="slate-200"
            bgColor="white"
            hover={{ borderColor: 'sky-500' }}
            theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-800' } }}
          >
            <H2 fontSize={16} fontWeight={600}>
              Order #{order.id}
            </H2>
            <P fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
              {order.customer}
            </P>
            <Span fontSize={12} fontWeight={600} color="sky-600">
              {order.status}
            </Span>
          </Flex>
        ))}
      </Grid>
    </Flex>
  );
}
