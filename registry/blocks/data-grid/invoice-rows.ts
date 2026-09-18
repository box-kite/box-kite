/** The rows the block is wired to. Replace this file with your own fetch — the grid reads plain objects. */
export interface Invoice {
  id: number;
  reference: string;
  customer: string;
  team: string;
  status: 'paid' | 'pending' | 'overdue';
  amount: number;
  issued: string;
}

const TEAMS = ['Northern', 'Southern', 'Eastern', 'Western'];
const STATUSES = ['paid', 'pending', 'overdue'] as const;
const CUSTOMERS = [
  'Ardent Supply',
  'Beacon Freight',
  'Corvus Analytics',
  'Delta Hardware',
  'Evergreen Mills',
  'Fairline Media',
  'Granite Foods',
  'Harbour Logistics',
];

/**
 * Two hundred invoices generated from the index, so the block has something to sort, filter, group and
 * total without shipping a data file — and every reload shows the same table.
 */
export const invoices: Invoice[] = Array.from({ length: 200 }, (_, index) => ({
  id: index + 1,
  reference: `INV-${(2480 + index).toString()}`,
  customer: CUSTOMERS[index % CUSTOMERS.length],
  team: TEAMS[index % TEAMS.length],
  status: STATUSES[index % STATUSES.length],
  amount: 400 + ((index * 137) % 9600),
  issued: new Date(Date.UTC(2026, index % 12, ((index * 7) % 27) + 1)).toISOString().slice(0, 10),
}));
