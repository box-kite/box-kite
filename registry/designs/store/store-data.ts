/**
 * The catalogue the store pages render: plain objects, so swapping in your own fetch changes nothing else.
 * A finish is four palette tokens from its highlight to its deepest shade, and a palette family for the glow.
 */
export type Shape = 'robot' | 'duck' | 'cat' | 'ghost' | 'rocket' | 'planet' | 'mushroom' | 'cloud';

export interface Finish {
  id: string;
  name: string;
  light: string;
  color: string;
  shade: string;
  deep: string;
  /** The family the toy's backdrop glows in. */
  tint: string;
}

export interface Product {
  slug: string;
  name: string;
  shape: Shape;
  category: string;
  price: number;
  finishes: readonly string[];
  sizes?: readonly string[];
  badge?: string;
  summary: string;
}

export interface CartLine {
  id: string;
  slug: string;
  finish: string;
  size?: string;
  quantity: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  detail: string;
  price: number;
}

export const STORE_NAME = 'Moonpop';

export const finishes: Record<string, Finish> = {
  grape: { id: 'grape', name: 'Grape', light: 'violet-200', color: 'violet-400', shade: 'violet-600', deep: 'indigo-900', tint: 'violet' },
  bubblegum: {
    id: 'bubblegum',
    name: 'Bubblegum',
    light: 'pink-200',
    color: 'pink-400',
    shade: 'fuchsia-600',
    deep: 'purple-900',
    tint: 'pink',
  },
  lemon: { id: 'lemon', name: 'Lemon', light: 'yellow-100', color: 'yellow-300', shade: 'amber-500', deep: 'orange-700', tint: 'amber' },
  mint: { id: 'mint', name: 'Mint', light: 'emerald-100', color: 'emerald-300', shade: 'teal-500', deep: 'teal-800', tint: 'emerald' },
  ocean: { id: 'ocean', name: 'Ocean', light: 'sky-200', color: 'sky-400', shade: 'blue-600', deep: 'indigo-900', tint: 'sky' },
  sunset: { id: 'sunset', name: 'Sunset', light: 'amber-200', color: 'orange-400', shade: 'rose-500', deep: 'rose-800', tint: 'orange' },
  pearl: { id: 'pearl', name: 'Pearl', light: 'white', color: 'slate-50', shade: 'violet-200', deep: 'indigo-400', tint: 'violet' },
};

export const products: readonly Product[] = [
  {
    slug: 'bolt-robot',
    name: 'Bolt the robot',
    shape: 'robot',
    category: 'Space',
    price: 32,
    finishes: ['grape', 'ocean', 'pearl'],
    sizes: ['Mini · 8 cm', 'Classic · 14 cm'],
    badge: 'Bestseller',
    summary: 'A pocket-sized co-pilot with a glossy visor and two eyes that glow in the dark after an hour on a sunny desk.',
  },
  {
    slug: 'quack-duck',
    name: 'Quack the duck',
    shape: 'duck',
    category: 'Critters',
    price: 24,
    finishes: ['lemon', 'bubblegum', 'mint'],
    summary: 'The rubber duck for explaining your code to, in soft-touch vinyl that never squeaks during a meeting.',
  },
  {
    slug: 'mochi-cat',
    name: 'Mochi the cat',
    shape: 'cat',
    category: 'Critters',
    price: 28,
    finishes: ['bubblegum', 'grape', 'pearl'],
    badge: 'New',
    summary: 'A round, unbothered cat head with permanent blush, weighted at the base so it sits wherever it is put.',
  },
  {
    slug: 'boo-ghost',
    name: 'Boo the ghost',
    shape: 'ghost',
    category: 'Critters',
    price: 22,
    finishes: ['pearl', 'mint', 'grape'],
    summary: 'A friendly little ghost in pearlescent vinyl, more surprised to see you than you are to see it.',
  },
  {
    slug: 'zoom-rocket',
    name: 'Zoom rocket',
    shape: 'rocket',
    category: 'Space',
    price: 36,
    finishes: ['ocean', 'sunset', 'pearl'],
    sizes: ['Mini · 8 cm', 'Classic · 14 cm'],
    summary: 'A tilted-for-take-off rocket with a glass porthole and a translucent flame that catches the light.',
  },
  {
    slug: 'ringo-planet',
    name: 'Ringo planet',
    shape: 'planet',
    category: 'Space',
    price: 44,
    finishes: ['sunset', 'grape'],
    badge: 'Limited run',
    summary: 'A cratered planet in its own iridescent ring, cast in a run of 500 and numbered on the base.',
  },
  {
    slug: 'toad-mushroom',
    name: 'Toad the mushroom',
    shape: 'mushroom',
    category: 'Daydreams',
    price: 26,
    finishes: ['bubblegum', 'sunset'],
    summary: 'A spotty toadstool with a shy smile, the kind of thing a desk did not know it was missing.',
  },
  {
    slug: 'puff-cloud',
    name: 'Puff the cloud',
    shape: 'cloud',
    category: 'Daydreams',
    price: 30,
    finishes: ['mint', 'pearl', 'ocean'],
    summary: 'A sleepy cloud with rosy cheeks, soft enough to squeeze through the last hour of a long day.',
  },
];

export const categories = [...new Set(products.map((product) => product.category))];

export const sampleCart: readonly CartLine[] = [
  { id: 'line-1', slug: 'bolt-robot', finish: 'grape', size: 'Classic · 14 cm', quantity: 2 },
  { id: 'line-2', slug: 'quack-duck', finish: 'lemon', quantity: 1 },
  { id: 'line-3', slug: 'puff-cloud', finish: 'mint', quantity: 1 },
];

export const shippingMethods: readonly ShippingMethod[] = [
  { id: 'standard', name: 'Standard', detail: '3–5 working days, tracked', price: 6 },
  { id: 'express', name: 'Express', detail: 'Next working day if ordered by 2 pm', price: 14 },
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
