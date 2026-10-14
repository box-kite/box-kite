'use client';
import { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop, Svg } from '@box-kite/react/components/svg';
import { useId } from 'react';
import { type Glaze, glazes, type Shape } from './store-data';

/**
 * The product pictures, drawn rather than photographed: one path per piece, painted from its glaze through
 * two variables, so every piece follows the theme around it and the catalogue ships no images.
 */
interface Geometry {
  body: string;
  /** The opening, seen from above: `[cx, cy, rx, ry]`. */
  rim: readonly [number, number, number, number];
  /** How much of the shadow colour the opening takes — a cup is dark inside, a plate barely at all. */
  depth?: 0.3;
  handle?: string;
  spout?: string;
  leaves?: readonly string[];
  /** A sliver of light down the left side: `[x, y, height]`. */
  highlight?: readonly [number, number, number];
  /** The shadow on the table: `[cx, cy, rx]`. */
  ground: readonly [number, number, number];
  /** The close-up, a square of the 200×200 drawing. */
  detail: string;
}

const shapes: Record<Shape, Geometry> = {
  mug: {
    body: 'M60 72 L60 155 Q60 168 73 168 L117 168 Q130 168 130 155 L130 72 Z',
    rim: [95, 72, 35, 7],
    handle: 'M128 92 C158 92 158 142 128 142',
    highlight: [70, 86, 56],
    ground: [100, 169, 54],
    detail: '50 45 110 110',
  },
  tumbler: {
    body: 'M64 70 L136 70 L127 160 Q126 168 117 168 L83 168 Q74 168 73 160 Z',
    rim: [100, 70, 36, 7],
    highlight: [76, 84, 60],
    ground: [100, 169, 46],
    detail: '45 40 110 110',
  },
  bowl: {
    body: 'M36 108 Q38 168 100 168 Q162 168 164 108 Z',
    rim: [100, 108, 64, 13],
    highlight: [52, 120, 22],
    ground: [100, 169, 60],
    detail: '35 70 130 130',
  },
  plate: {
    body: 'M24 134 A76 24 0 0 1 176 134 L176 141 A76 24 0 0 1 24 141 Z',
    rim: [100, 134, 50, 15],
    depth: 0.3,
    ground: [100, 163, 80],
    detail: '40 80 120 120',
  },
  vase: {
    body: 'M84 40 L116 40 Q114 62 124 80 Q152 114 138 150 Q132 168 112 168 L88 168 Q68 168 62 150 Q48 114 76 80 Q86 62 84 40 Z',
    rim: [100, 40, 16, 4],
    highlight: [72, 98, 44],
    ground: [100, 169, 44],
    detail: '45 25 110 110',
  },
  budVase: {
    body: 'M92 84 L108 84 L108 106 Q134 112 134 138 Q134 168 100 168 Q66 168 66 138 Q66 112 92 106 Z',
    rim: [100, 84, 8, 2.5],
    highlight: [76, 124, 24],
    ground: [100, 169, 38],
    detail: '50 70 100 100',
  },
  pitcher: {
    body: 'M68 58 L128 58 Q126 90 136 110 Q146 140 132 160 Q127 168 115 168 L81 168 Q69 168 64 160 Q50 140 60 110 Q70 90 68 58 Z',
    rim: [98, 58, 30, 6],
    spout: 'M72 56 L48 48 Q58 62 68 76 Z',
    handle: 'M126 72 C164 76 162 130 134 138',
    highlight: [70, 96, 50],
    ground: [98, 169, 52],
    detail: '40 35 110 110',
  },
  planter: {
    body: 'M56 96 L144 96 L142 106 L132 162 Q131 168 125 168 L75 168 Q69 168 68 162 L58 106 Z',
    rim: [100, 96, 44, 7],
    leaves: [
      'M100 98 C82 72 74 50 88 32 C98 54 104 76 100 98 Z',
      'M100 98 C120 74 134 62 154 60 C142 82 124 94 100 98 Z',
      'M100 98 C84 84 62 80 46 86 C64 100 84 104 100 98 Z',
      'M100 98 C104 72 112 54 128 42 C128 66 116 84 100 98 Z',
    ],
    highlight: [68, 112, 44],
    ground: [100, 169, 48],
    detail: '40 25 120 120',
  },
};

export type ArtView = 'front' | 'detail' | 'pair';

export interface ProductArtProps {
  shape: Shape;
  glaze: string;
  /** `pair` draws a second piece beside the first, in this glaze. */
  pairGlaze?: string;
  view?: ArtView;
  /** Names the picture. Leave it out where the product's name is already beside it, and it is decoration. */
  label?: string;
}

export default function ProductArt({ shape, glaze, pairGlaze, view = 'front', label }: ProductArtProps) {
  const geometry = shapes[shape];

  return (
    <Svg viewBox={view === 'detail' ? geometry.detail : '0 0 200 200'} width="100%" height="100%" label={label} display="block">
      {view === 'pair' ? (
        <>
          <Piece geometry={geometry} glaze={glazes[pairGlaze ?? glaze]} transform="translate(62 46) scale(0.62)" />
          <Piece geometry={geometry} glaze={glazes[glaze]} transform="translate(-6 22) scale(0.8)" />
        </>
      ) : (
        <Piece geometry={geometry} glaze={glazes[glaze]} />
      )}
    </Svg>
  );
}

function Piece({ geometry, glaze, transform }: { geometry: Geometry; glaze: Glaze; transform?: string }) {
  // A gradient reads its colours where it is defined, so each piece carries its own beside its variables.
  const id = useId();
  const [cx, cy, rx, ry] = geometry.rim;
  const [groundX, groundY, groundRx] = geometry.ground;

  return (
    <G transform={transform} vars={{ glaze: glaze.color, 'glaze-shade': glaze.shade }}>
      <Defs>
        <LinearGradient id={id}>
          <Stop offset="0" stopColor="var(--glaze)" />
          <Stop offset="0.55" stopColor="var(--glaze)" />
          <Stop offset="1" stopColor="var(--glaze-shade)" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={groundX} cy={groundY} rx={groundRx} ry={5} fill="stone-900/10" theme={{ dark: { fill: 'black/40' } }} />
      {geometry.handle && <Path d={geometry.handle} fill="none" stroke="var(--glaze-shade)" strokeWidth={11} strokeLinecap="round" />}
      {geometry.spout && <Path d={geometry.spout} fill="var(--glaze)" />}
      {geometry.leaves && (
        <>
          <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="stone-700" />
          {geometry.leaves.map((leaf) => (
            <Path key={leaf} d={leaf} fill="green-600" theme={{ dark: { fill: 'green-500' } }} />
          ))}
        </>
      )}
      <Path d={geometry.body} props={{ fill: `url(#${id})` }} />
      {geometry.highlight && (
        <Rect x={geometry.highlight[0]} y={geometry.highlight[1]} width={5} height={geometry.highlight[2]} rx={2.5} fill="white/30" />
      )}
      {!geometry.leaves && (
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill="var(--glaze-shade)"
          fillOpacity={geometry.depth ?? 1}
          stroke="var(--glaze)"
          strokeWidth={2}
        />
      )}
    </G>
  );
}
