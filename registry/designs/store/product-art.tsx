'use client';
import { ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Stop, Svg } from '@box-kite/react/components/svg';
import { useId } from 'react';
import { type Glaze, glazes, type Shape } from './store-data';

/**
 * The product pictures, drawn rather than photographed. A piece is lit like a turned cylinder — a shadow
 * edge, a lit face, a highlight, a falling-off edge — and dipped: the glaze stops in a wavy line with a
 * couple of drips, over bare clay. Every colour is a variable, so a piece follows the theme around it.
 */
interface Geometry {
  body: string;
  /** The body's horizontal extent, which the light is laid across. */
  span: readonly [number, number];
  top: number;
  /** The opening seen from above: `[cx, cy, rx, ry]`. */
  rim: readonly [number, number, number, number];
  /** Where the dipped glaze ends. Left out, the piece is glazed all over. */
  dip?: number;
  handle?: string;
  spout?: string;
  /** The unglazed ring a bowl stands on. */
  foot?: string;
  plant?: boolean;
  /** A plate is seen from above, so its opening is a well rather than a dark interior. */
  well?: boolean;
  /** The table shadow: `[cx, rx]`. */
  ground: readonly [number, number];
  /** The piece alone with its shadow, a square of the drawing: what a thumbnail and a card show. */
  fit: string;
  /** The close-up: a square of the 200×200 drawing. */
  detail: string;
}

const GROUND = 171;

const shapes: Record<Shape, Geometry> = {
  mug: {
    body: 'M58 64 C57 100 58 140 62 157 C64 166 71 170 81 170 L115 170 C125 170 132 166 134 157 C138 140 139 100 138 64 Z',
    span: [58, 138],
    top: 64,
    rim: [98, 64, 40, 8],
    dip: 136,
    handle: 'M137 84 C170 82 172 138 135 140',
    ground: [100, 58],
    fit: '26 36 152 152',
    detail: '48 40 110 110',
  },
  tumbler: {
    body: 'M64 62 L136 62 C134 100 130 140 126 159 C124 167 118 170 110 170 L90 170 C82 170 76 167 74 159 C70 140 66 100 64 62 Z',
    span: [64, 136],
    top: 62,
    rim: [100, 62, 36, 7],
    dip: 142,
    ground: [100, 46],
    fit: '34 46 132 132',
    detail: '45 40 110 110',
  },
  bowl: {
    body: 'M28 104 C30 142 60 166 100 166 C140 166 170 142 172 104 Z',
    span: [28, 172],
    top: 104,
    rim: [100, 104, 72, 17],
    dip: 146,
    foot: 'M78 162 L80 170 C80 171 81 172 83 172 L117 172 C119 172 120 171 120 170 L122 162 Z',
    ground: [100, 66],
    fit: '16 42 168 168',
    detail: '30 60 140 140',
  },
  plate: {
    body: 'M16 126 A84 30 0 0 1 184 126 L184 130 A84 30 0 0 1 16 130 Z',
    span: [16, 184],
    top: 96,
    rim: [100, 125, 64, 21],
    well: true,
    ground: [100, 86],
    fit: '8 44 184 184',
    detail: '35 70 130 130',
  },
  vase: {
    body: 'M88 36 C88 52 84 60 76 72 C58 96 54 128 66 152 C72 164 84 170 100 170 C116 170 128 164 134 152 C146 128 142 96 124 72 C116 60 112 52 112 36 Z',
    span: [57, 143],
    top: 36,
    rim: [100, 36, 13, 3.5],
    dip: 148,
    ground: [100, 44],
    fit: '26 22 148 148',
    detail: '45 22 110 110',
  },
  budVase: {
    body: 'M93 80 L107 80 C107 92 108 100 112 104 C130 110 140 124 140 140 C140 158 124 170 100 170 C76 170 60 158 60 140 C60 124 70 110 88 104 C92 100 93 92 93 80 Z',
    span: [60, 140],
    top: 80,
    rim: [100, 80, 7, 2.2],
    dip: 152,
    ground: [100, 42],
    fit: '36 60 128 128',
    detail: '45 62 110 110',
  },
  pitcher: {
    body: 'M66 52 L130 52 C128 70 128 84 134 98 C146 124 144 150 130 162 C124 168 116 170 100 170 C84 170 76 168 70 162 C56 150 54 124 66 98 C72 84 70 70 66 52 Z',
    span: [57, 143],
    top: 52,
    rim: [98, 52, 32, 7],
    dip: 146,
    spout: 'M70 50 C60 46 52 44 44 46 C52 52 60 62 66 72 Z',
    handle: 'M130 66 C168 68 166 124 136 132',
    ground: [100, 54],
    fit: '26 32 152 152',
    detail: '38 30 115 115',
  },
  planter: {
    body: 'M52 92 L148 92 L146 104 C142 130 138 150 134 161 C132 168 126 170 118 170 L82 170 C74 170 68 168 66 161 C62 150 58 130 54 104 Z',
    span: [52, 148],
    top: 92,
    rim: [100, 92, 48, 9],
    dip: 140,
    plant: true,
    ground: [100, 54],
    fit: '20 14 160 160',
    detail: '35 20 130 130',
  },
};

const LEAVES = [
  'M100 92 C84 70 78 44 92 22 C104 42 108 68 100 92 Z',
  'M100 92 C118 70 136 58 160 56 C150 78 128 92 100 92 Z',
  'M100 92 C82 80 60 76 40 84 C58 98 82 100 100 92 Z',
  'M100 92 C106 68 118 50 138 38 C136 62 122 80 100 92 Z',
  'M100 92 C90 72 70 56 52 52 C56 74 76 88 100 92 Z',
];

/** An ellipse as path data: the geometry lives in an attribute, so no drawing writes a class per shape. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

/** Everything above the dip line: a wave with two drips running down, clipped to the body by its caller. */
const glazed = (y: number) =>
  `M0 0 H200 V${y} C186 ${y + 5} 174 ${y - 2} 160 ${y + 3} C150 ${y + 7} 144 ${y + 15} 138 ${y + 13} C132 ${y + 11} 134 ${y + 2} 122 ${y + 1} ` +
  `C106 ${y} 98 ${y + 6} 86 ${y + 4} C76 ${y + 2} 72 ${y + 12} 65 ${y + 11} C58 ${y + 10} 60 ${y + 1} 48 ${y + 2} C32 ${y + 3} 16 ${y - 2} 0 ${y + 2} Z`;

/** Iron speckles, the same for every render of a shape so the server and the browser draw one picture. */
function speckles(shape: Shape, [left, right]: readonly [number, number], top: number) {
  let seed = [...shape].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
  const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

  return Array.from({ length: 26 }, () => {
    const x = (left + next() * (right - left)).toFixed(1);
    const y = (top + next() * (GROUND - top)).toFixed(1);
    const r = (0.5 + next() * 0.9).toFixed(2);

    return `M${x} ${y} m-${r} 0 a${r} ${r} 0 1 0 ${Number(r) * 2} 0 a${r} ${r} 0 1 0 -${Number(r) * 2} 0`;
  }).join(' ');
}

export type ArtView = 'front' | 'detail' | 'pair';

export interface ProductArtProps {
  shape: Shape;
  glaze: string;
  /** `pair` draws a second piece behind the first, in this glaze. */
  pairGlaze?: string;
  view?: ArtView;
  /** Names the picture. Leave it out where the product's name is already beside it, and it is decoration. */
  label?: string;
}

export default function ProductArt({ shape, glaze, pairGlaze, view = 'front', label }: ProductArtProps) {
  const geometry = shapes[shape];

  return (
    <Svg
      viewBox={view === 'detail' ? geometry.detail : view === 'pair' ? '0 0 200 200' : geometry.fit}
      width="100%"
      height="100%"
      label={label}
      display="block"
      overflow="visible"
      vars={{
        clay: 'orange-100',
        'clay-shade': 'stone-400',
        'clay-deep': 'stone-600',
        shadow: 'stone-900',
        leaf: 'green-400',
        'leaf-deep': 'green-800',
      }}
      theme={{ dark: { vars: { clay: 'stone-300', 'clay-shade': 'stone-500', 'clay-deep': 'stone-700', shadow: 'black' } } }}
    >
      {view === 'pair' ? (
        <>
          <Piece shape={shape} geometry={geometry} glaze={glazes[pairGlaze ?? glaze]} transform="translate(70 40) scale(0.66)" />
          <Piece shape={shape} geometry={geometry} glaze={glazes[glaze]} transform="translate(-4 26) scale(0.82)" />
        </>
      ) : (
        <Piece shape={shape} geometry={geometry} glaze={glazes[glaze]} />
      )}
    </Svg>
  );
}

interface PieceProps {
  shape: Shape;
  geometry: Geometry;
  glaze: Glaze;
  transform?: string;
}

function Piece({ shape, geometry, glaze, transform }: PieceProps) {
  // Gradients read their colours where they are defined, so each piece carries its own beside its variables.
  const id = useId().replace(/:/g, '');
  const url = (name: string) => `url(#${id}-${name})`;
  const [left, right] = geometry.span;
  const [cx, cy, rx, ry] = geometry.rim;
  const [groundX, groundRx] = geometry.ground;
  const lit = { x1: String(left), x2: String(right), gradientUnits: 'userSpaceOnUse' } as const;
  const streak = left + (right - left) * 0.26;
  const glazeEnd = geometry.dip ?? GROUND;

  return (
    <G
      transform={transform}
      vars={{ 'glaze-light': glaze.light, glaze: glaze.color, 'glaze-shade': glaze.shade, 'glaze-deep': glaze.deep }}
    >
      <Defs>
        <LinearGradient id={`${id}-glaze`} {...lit}>
          <Stop offset="0" stopColor="var(--glaze-shade)" />
          <Stop offset="0.16" stopColor="var(--glaze)" />
          <Stop offset="0.3" stopColor="var(--glaze-light)" />
          <Stop offset="0.46" stopColor="var(--glaze)" />
          <Stop offset="0.8" stopColor="var(--glaze-shade)" />
          <Stop offset="1" stopColor="var(--glaze-deep)" />
        </LinearGradient>
        <LinearGradient id={`${id}-clay`} {...lit}>
          <Stop offset="0" stopColor="var(--clay-shade)" />
          <Stop offset="0.3" stopColor="var(--clay)" />
          <Stop offset="0.8" stopColor="var(--clay-shade)" />
          <Stop offset="1" stopColor="var(--clay-deep)" />
        </LinearGradient>
        {/* Glaze runs and pools towards its edge, which is what makes the dip read as a liquid that set. */}
        <LinearGradient id={`${id}-pool`} x1="0" x2="0" y1={String(geometry.top)} y2={String(glazeEnd + 14)} gradientUnits="userSpaceOnUse">
          <Stop offset="0.5" stopColor="var(--glaze-deep)" stopOpacity="0" />
          <Stop offset="1" stopColor="var(--glaze-deep)" stopOpacity="0.45" />
        </LinearGradient>
        <LinearGradient id={`${id}-shine`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="white" stopOpacity="0" />
          <Stop offset="0.35" stopColor="white" stopOpacity="0.55" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id={`${id}-inside`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="var(--glaze)" />
          <Stop offset="1" stopColor="var(--glaze-deep)" />
        </LinearGradient>
        <RadialGradient id={`${id}-well`} cx="0.45" cy="0.4" r="0.7">
          <Stop offset="0" stopColor="var(--glaze-light)" />
          <Stop offset="1" stopColor="var(--glaze)" />
        </RadialGradient>
        <RadialGradient id={`${id}-shadow`}>
          <Stop offset="0" stopColor="var(--shadow)" stopOpacity="0.3" />
          <Stop offset="0.6" stopColor="var(--shadow)" stopOpacity="0.12" />
          <Stop offset="1" stopColor="var(--shadow)" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={`${id}-leaf`} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="var(--leaf)" />
          <Stop offset="1" stopColor="var(--leaf-deep)" />
        </LinearGradient>
        <ClipPath id={`${id}-body`}>
          <Path d={geometry.body} />
        </ClipPath>
      </Defs>

      <Path d={ellipse(groundX, GROUND, groundRx, 7)} props={{ fill: url('shadow') }} />
      {geometry.handle && (
        <>
          <Path d={geometry.handle} fill="none" stroke="var(--glaze-shade)" strokeWidth={12} strokeLinecap="round" />
          <Path d={geometry.handle} fill="none" stroke="var(--glaze-light)" strokeWidth={3} strokeLinecap="round" strokeOpacity={0.4} />
        </>
      )}
      {geometry.spout && <Path d={geometry.spout} props={{ fill: url('glaze') }} />}
      {geometry.foot && <Path d={geometry.foot} props={{ fill: url('clay') }} />}

      <G props={{ clipPath: url('body') }}>
        <Path d={geometry.body} props={{ fill: geometry.dip ? url('clay') : url('glaze') }} />
        {geometry.dip !== undefined && (
          <>
            <Path d={glazed(geometry.dip)} props={{ fill: url('glaze') }} />
            <Path d={glazed(geometry.dip)} props={{ fill: url('pool') }} />
          </>
        )}
        <Path d={speckles(shape, geometry.span, geometry.top)} fill="var(--glaze-deep)" fillOpacity={0.3} />
        <Path d={`M${streak} ${geometry.top + 10} h7 V${glazeEnd - 8} h-7 Z`} props={{ fill: url('shine') }} />
      </G>

      {geometry.plant ? (
        <>
          <Path d={ellipse(cx, cy, rx, ry)} fill="stone-800" />
          {LEAVES.map((leaf) => (
            <Path key={leaf} d={leaf} props={{ fill: url('leaf') }} />
          ))}
          <Path d={ellipse(cx, cy + 1, rx, ry)} fill="none" stroke="var(--glaze-light)" strokeWidth={2.5} strokeOpacity={0.8} />
        </>
      ) : (
        <>
          <Path d={ellipse(cx, cy, rx, ry)} props={{ fill: geometry.well ? url('well') : url('inside') }} />
          <Path
            d={ellipse(cx, cy, rx, ry)}
            fill="none"
            stroke="var(--glaze-light)"
            strokeWidth={geometry.well ? 1.5 : 2.5}
            strokeOpacity={0.8}
          />
        </>
      )}
    </G>
  );
}

/**
 * The backdrop a piece is photographed on — a soft light from above in its own glaze's family, so a grid of
 * them reads as a set of colours rather than a set of grey boxes. Spread it on the frame around the art.
 */
export function glazeBackdrop(id: string) {
  const { tint } = glazes[id];

  return {
    vars: { 'tint-soft': 'white', tint: `${tint}-50`, 'tint-deep': `${tint}-100` },
    css: { backgroundImage: 'radial-gradient(120% 95% at 50% 10%, var(--tint-soft), var(--tint) 55%, var(--tint-deep))' },
    theme: { dark: { vars: { 'tint-soft': `${tint}-800/50`, tint: `${tint}-900/45`, 'tint-deep': `${tint}-950/60` } } },
  };
}

/** A glossy little bead of the glaze, for the colour swatches. */
export function glazeBead(id: string) {
  const glaze = glazes[id];

  return {
    vars: { 'bead-light': glaze.light, bead: glaze.color, 'bead-deep': glaze.deep },
    css: { backgroundImage: 'radial-gradient(circle at 32% 28%, var(--bead-light), var(--bead) 52%, var(--bead-deep))' },
  };
}
