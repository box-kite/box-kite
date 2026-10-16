/**
 * The catalogue the store pages render: plain objects, so swapping in your own fetch changes nothing else.
 * A finish is the object's colour, the wash its picture sits on, and the ink the picture is drawn in.
 */
export type Shape = 'lamp' | 'clock' | 'vase' | 'speaker' | 'mug' | 'chair' | 'glass' | 'desk-lamp';

export interface Finish {
  id: string;
  name: string;
  /** The swatch, as any CSS colour: the finishes are muted on purpose, between the palette's steps. */
  color: string;
  /** The wash behind the picture: the finish, lightened. */
  tile: string;
  /** The picture's line: a deep tone of the same hue, or a light one on a dark finish. */
  ink: string;
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

export const STORE_NAME = 'Still';

export const finishes: Record<string, Finish> = {
  chalk: { id: 'chalk', name: 'Chalk', color: 'oklch(99% .004 85)', tile: 'oklch(95.5% .006 85)', ink: 'oklch(34% .01 70)' },
  sand: { id: 'sand', name: 'Sand', color: 'oklch(86% .035 80)', tile: 'oklch(92.5% .028 82)', ink: 'oklch(42% .045 70)' },
  clay: { id: 'clay', name: 'Clay', color: 'oklch(66% .095 45)', tile: 'oklch(87% .045 50)', ink: 'oklch(42% .09 40)' },
  sage: { id: 'sage', name: 'Sage', color: 'oklch(74% .045 145)', tile: 'oklch(91% .03 145)', ink: 'oklch(39% .05 150)' },
  graphite: { id: 'graphite', name: 'Graphite', color: 'oklch(38% .006 260)', tile: 'oklch(33% .006 260)', ink: 'oklch(92% .004 85)' },
};

export const products: readonly Product[] = [
  {
    slug: 'table-lamp',
    name: 'Table lamp',
    shape: 'lamp',
    category: 'Lighting',
    price: 240,
    finishes: ['clay', 'chalk', 'graphite'],
    sizes: ['Small · 30 cm', 'Large · 45 cm'],
    badge: 'Bestseller',
    summary: 'A linen shade on a turned base. The light falls down and out, never into your eyes, and a touch on the base dims it.',
  },
  {
    slug: 'wall-clock',
    name: 'Wall clock',
    shape: 'clock',
    category: 'Living',
    price: 120,
    finishes: ['chalk', 'sage', 'graphite'],
    summary: 'Twelve marks, two hands and a silent sweep movement. Nothing on the face that a glance across the room does not need.',
  },
  {
    slug: 'bud-vase',
    name: 'Bud vase',
    shape: 'vase',
    category: 'Living',
    price: 38,
    finishes: ['sand', 'clay', 'sage'],
    badge: 'New',
    summary: 'Slip-cast stoneware with a narrow neck that holds one stem upright. Glazed inside, left bare and soft outside.',
  },
  {
    slug: 'speaker',
    name: 'Speaker',
    shape: 'speaker',
    category: 'Living',
    price: 180,
    finishes: ['graphite', 'chalk', 'sage'],
    summary: 'An oak box, two drivers and one knob. Bluetooth and a line in, a cell that lasts a week, and no app to install.',
  },
  {
    slug: 'stacking-mug',
    name: 'Stacking mug',
    shape: 'mug',
    category: 'Kitchen',
    price: 24,
    finishes: ['sage', 'chalk', 'sand', 'clay', 'graphite'],
    sizes: ['250 ml', '350 ml'],
    summary: 'A straight-sided porcelain mug that nests in its neighbours, so six take the shelf space of two.',
  },
  {
    slug: 'lounge-chair',
    name: 'Lounge chair',
    shape: 'chair',
    category: 'Living',
    price: 420,
    finishes: ['sand', 'clay', 'graphite'],
    summary: 'A low oak frame and a wool seat deep enough to fold your legs into. Every cover zips off and can be replaced.',
  },
  {
    slug: 'tumbler-set',
    name: 'Tumblers, set of two',
    shape: 'glass',
    category: 'Kitchen',
    price: 32,
    finishes: ['chalk', 'sage', 'sand'],
    summary: 'Mouth-blown glass, tinted just enough to tell yours from a guest’s, and heavy enough at the base not to tip.',
  },
  {
    slug: 'desk-lamp',
    name: 'Desk lamp',
    shape: 'desk-lamp',
    category: 'Lighting',
    price: 180,
    finishes: ['graphite', 'clay', 'chalk'],
    badge: 'Limited',
    summary: 'One arm, one hinge and a head that turns a full circle. The light stays on the page and off the screen.',
  },
];

export const categories = [...new Set(products.map((product) => product.category))];

export const sampleCart: readonly CartLine[] = [
  { id: 'line-1', slug: 'wall-clock', finish: 'chalk', quantity: 1 },
  { id: 'line-2', slug: 'stacking-mug', finish: 'clay', size: '350 ml', quantity: 2 },
  { id: 'line-3', slug: 'bud-vase', finish: 'sage', quantity: 1 },
];

export const shippingMethods: readonly ShippingMethod[] = [
  { id: 'standard', name: 'Standard', detail: '3–5 working days, tracked', price: 8 },
  { id: 'express', name: 'Express', detail: 'Next working day if ordered by 2 pm', price: 18 },
  { id: 'pickup', name: 'Collect from the shop', detail: 'Ready in two days, Tuesday to Saturday', price: 0 },
];

/** Orders over this ship free on the standard service. */
export const FREE_SHIPPING_FROM = 250;
export const TAX_RATE = 0.08;

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** A price as a tag prints it: $240, with cents only when there are some. */
export const formatPrice = (amount: number) => (Number.isInteger(amount) ? whole : money).format(amount);

export const productBySlug = (slug: string) => products.find((product) => product.slug === slug) ?? products[0];

export const subtotalOf = (lines: readonly CartLine[]) =>
  lines.reduce((sum, line) => sum + productBySlug(line.slug).price * line.quantity, 0);

export const countOf = (lines: readonly CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);
