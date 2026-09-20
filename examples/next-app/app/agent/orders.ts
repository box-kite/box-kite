/** The data the tools read. Shared by the route and the page, so a refusal can quote a real figure. */
export interface Order {
  id: number;
  customer: string;
  total: number;
  status: 'paid' | 'shipped' | 'delivered' | 'refunded';
  placed: string;
}

export const ORDERS: Order[] = [
  { id: 4182, customer: 'Elena Rusu', total: 6400, status: 'delivered', placed: '2026-09-04' },
  { id: 4183, customer: 'Andrei Popa', total: 1250, status: 'shipped', placed: '2026-09-11' },
  { id: 4184, customer: 'Elena Rusu', total: 890, status: 'paid', placed: '2026-09-16' },
  { id: 4185, customer: 'Mihai Ciobanu', total: 12400, status: 'delivered', placed: '2026-08-29' },
];

/** Over this, a refund is a person's decision rather than a tool's. */
export const APPROVAL_THRESHOLD = 5000;
