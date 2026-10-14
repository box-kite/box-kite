/**
 * The catalogue the store pages render: plain objects, so swapping in your own fetch changes nothing else.
 * A glaze is two palette tokens, the colour and its shadow, which is all `ProductArt` needs to draw a piece.
 */
export type Shape = 'mug' | 'tumbler' | 'bowl' | 'plate' | 'vase' | 'budVase' | 'pitcher' | 'planter';

export interface Glaze {
  id: string;
  name: string;
  color: string;
  shade: string;
}

export interface Product {
  slug: string;
  name: string;
  shape: Shape;
  category: string;
  price: number;
  glazes: readonly string[];
  sizes?: readonly string[];
  badge?: string;
  summary: string;
}

export interface CartLine {
  id: string;
  slug: string;
  glaze: string;
  size?: string;
  quantity: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  detail: string;
  price: number;
}

export const STORE_NAME = 'Tidewell';

export const glazes: Record<string, Glaze> = {
  sea: { id: 'sea', name: 'Sea glass', color: 'teal-500', shade: 'teal-800' },
  ash: { id: 'ash', name: 'Ash', color: 'stone-300', shade: 'stone-500' },
  ember: { id: 'ember', name: 'Ember', color: 'orange-600', shade: 'orange-900' },
  moss: { id: 'moss', name: 'Moss', color: 'lime-700', shade: 'green-900' },
  dusk: { id: 'dusk', name: 'Dusk', color: 'indigo-400', shade: 'indigo-700' },
  bone: { id: 'bone', name: 'Bone', color: 'stone-100', shade: 'stone-400' },
  ink: { id: 'ink', name: 'Ink', color: 'slate-700', shade: 'slate-950' },
};

export const products: readonly Product[] = [
  {
    slug: 'tide-mug',
    name: 'Tide mug',
    shape: 'mug',
    category: 'Mugs & cups',
    price: 34,
    glazes: ['sea', 'ash', 'ember'],
    sizes: ['300 ml', '450 ml'],
    badge: 'Bestseller',
    summary: 'A straight-sided mug thrown thick at the base, so the coffee stays hot and the mug stays put.',
  },
  {
    slug: 'harbor-bowl',
    name: 'Harbor bowl',
    shape: 'bowl',
    category: 'Bowls & plates',
    price: 42,
    glazes: ['moss', 'ash', 'dusk'],
    summary: 'Wide and shallow, for noodles, salads and the kind of breakfast that needs a spoon.',
  },
  {
    slug: 'dune-vase',
    name: 'Dune vase',
    shape: 'vase',
    category: 'Vases',
    price: 88,
    glazes: ['ember', 'bone'],
    badge: 'Small batch',
    summary: 'A tall, shouldered vase with a narrow mouth that holds a few long stems upright.',
  },
  {
    slug: 'drift-tumbler',
    name: 'Drift tumbler',
    shape: 'tumbler',
    category: 'Mugs & cups',
    price: 26,
    glazes: ['bone', 'ink', 'sea'],
    summary: 'A handleless cup with a soft taper, sized for water, wine or a long pour of tea.',
  },
  {
    slug: 'shoal-plate',
    name: 'Shoal dinner plate',
    shape: 'plate',
    category: 'Bowls & plates',
    price: 38,
    glazes: ['bone', 'sea'],
    summary: 'A 27 cm plate with a raised rim that keeps sauces where they belong.',
  },
  {
    slug: 'reef-bud-vase',
    name: 'Reef bud vase',
    shape: 'budVase',
    category: 'Vases',
    price: 29,
    glazes: ['dusk', 'sea', 'ember'],
    summary: 'A round little vase for one stem, a sprig of herbs or whatever the walk home turned up.',
  },
  {
    slug: 'moor-pitcher',
    name: 'Moor pitcher',
    shape: 'pitcher',
    category: 'Serving',
    price: 64,
    glazes: ['ash', 'ink'],
    summary: 'A one-litre pitcher with a pulled spout that pours without a drip.',
  },
  {
    slug: 'cove-planter',
    name: 'Cove planter',
    shape: 'planter',
    category: 'Planters',
    price: 56,
    glazes: ['moss', 'bone'],
    summary: 'A drained planter with a matching saucer, glazed inside so the soil never wicks through.',
  },
];

export const categories = [...new Set(products.map((product) => product.category))];

export const sampleCart: readonly CartLine[] = [
  { id: 'line-1', slug: 'tide-mug', glaze: 'sea', size: '450 ml', quantity: 2 },
  { id: 'line-2', slug: 'harbor-bowl', glaze: 'moss', quantity: 1 },
  { id: 'line-3', slug: 'reef-bud-vase', glaze: 'dusk', quantity: 1 },
];

export const shippingMethods: readonly ShippingMethod[] = [
  { id: 'standard', name: 'Standard', detail: '3–5 working days, tracked', price: 8 },
  { id: 'express', name: 'Express', detail: 'Next working day if ordered by 2 pm', price: 18 },
  { id: 'pickup', name: 'Collect from the studio', detail: 'Ready in two days, Tuesday to Saturday', price: 0 },
];

/** Orders over this ship free on the standard service. */
export const FREE_SHIPPING_FROM = 150;
export const TAX_RATE = 0.08;

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatPrice = (amount: number) => money.format(amount);

export const productBySlug = (slug: string) => products.find((product) => product.slug === slug) ?? products[0];

export const subtotalOf = (lines: readonly CartLine[]) =>
  lines.reduce((sum, line) => sum + productBySlug(line.slug).price * line.quantity, 0);

export const countOf = (lines: readonly CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
