'use client';
import Flex from '@box-kite/react/components/flex';
import Icon from '@box-kite/react/components/icon';
import { Armchair, Clock, Coffee, Flower2, GlassWater, Lamp, LampDesk, type LucideIcon, Speaker } from 'lucide-react';
import { finishes, type Shape } from './store-data';

/**
 * The product pictures: a lucide line icon on a tile washed in the finish, drawn in a deep tone of the same
 * colour. Swap in photographs by replacing this one component — every page and block renders through it.
 */
const icons: Record<Shape, LucideIcon> = {
  lamp: Lamp,
  clock: Clock,
  vase: Flower2,
  speaker: Speaker,
  mug: Coffee,
  chair: Armchair,
  glass: GlassWater,
  'desk-lamp': LampDesk,
};

export type ArtView = 'front' | 'set';

export interface ProductArtProps {
  shape: Shape;
  finish: string;
  /** For the `set` view: more finishes, each on its own tile beside the first. */
  also?: readonly string[];
  view?: ArtView;
  /** Names the picture; without one it is decoration, hidden from assistive technology. */
  label?: string;
  /** The line's width in the icon's own 24-unit grid: thinner on a large tile, heavier on a thumbnail. */
  stroke?: 0.5 | 0.75 | 1 | 1.25 | 1.5;
  /** Rounds the picture’s corners, on the ÷4 scale: the tiles clip themselves, so nothing around them has to. */
  radius?: 2 | 3 | 4 | 6;
}

/** Fills its parent: give the parent a size or an aspect ratio, and the picture takes the rest. */
export default function ProductArt({ shape, finish, also = [], view = 'front', label, stroke = 0.75, radius }: ProductArtProps) {
  const Glyph = icons[shape];
  const shown = view === 'set' ? [finish, ...also] : [finish];

  return (
    <Flex
      width="fit"
      height="fit"
      borderRadius={radius}
      overflow="hidden"
      props={label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }}
    >
      {shown.map((id) => (
        <Flex
          key={id}
          flex1
          ai="center"
          jc="center"
          vars={{ tile: finishes[id].tile, ink: finishes[id].ink }}
          css={{ backgroundColor: 'var(--tile)', color: 'var(--ink)' }}
        >
          <Icon width="1/2" height="1/2" strokeWidth={stroke}>
            <Glyph />
          </Icon>
        </Flex>
      ))}
    </Flex>
  );
}

/** A flat dot of the finish, for the colour swatches. */
export function finishSwatch(id: string) {
  return { vars: { swatch: finishes[id].color }, css: { backgroundColor: 'var(--swatch)' } };
}
