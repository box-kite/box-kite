'use client';
import { Defs, G, LinearGradient, Path, RadialGradient, Stop, Svg } from '@box-kite/react/components/svg';
import { Fragment, useId } from 'react';
import { type Finish, finishes, type Shape } from './store-data';

/**
 * The product pictures, drawn rather than photographed: soft vinyl toys lit from the top left. Every part is
 * filled with a radial gradient whose focus sits off-centre, which is what reads as a glossy round surface;
 * a glow from below in the backdrop's colour and a soft specular spot finish it. Colours are variables, so a
 * toy follows the theme and its finish.
 */
type Material = 'body' | 'accent' | 'dark' | 'white' | 'cream' | 'glass' | 'glow' | 'halo' | 'blush' | 'occlude' | 'crater' | 'flame';

interface Part {
  d: string;
  m: Material | 'line' | 'ring';
  /** A specular spot: `[cx, cy, rx, ry, rotation]`. */
  shine?: readonly [number, number, number, number, number];
  width?: number;
  /** A line drawn in white instead of ink, at this opacity: a reflection rather than a feature. */
  glint?: 0.2 | 0.3;
}

interface Toy {
  /** Degrees: the toy floats a little off true, which is most of what makes it look alive. */
  tilt: number;
  /** The second material, as four tokens from highlight to shade. */
  accent: readonly [string, string, string, string];
  /** The close-up: a square of the 200×220 drawing. */
  detail: string;
  parts: readonly Part[];
}

/** An ellipse as path data: the geometry lives in an attribute, so no drawing writes a class per shape. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} ` +
  `H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;

const PINK = ['pink-100', 'pink-300', 'pink-500', 'rose-700'] as const;
const ORANGE = ['amber-200', 'orange-400', 'orange-600', 'red-800'] as const;
const CREAM = ['white', 'amber-50', 'orange-200', 'orange-400'] as const;

const toys: Record<Shape, Toy> = {
  robot: {
    tilt: -10,
    accent: PINK,
    detail: '44 50 112 112',
    parts: [
      { d: rect(96, 26, 8, 34, 4), m: 'accent' },
      { d: ellipse(100, 26, 12, 12), m: 'accent', shine: [96, 21, 5, 3, -30] },
      { d: ellipse(42, 112, 15, 22), m: 'body' },
      { d: ellipse(158, 112, 15, 22), m: 'body' },
      { d: rect(44, 54, 112, 108, 46), m: 'body', shine: [76, 70, 22, 9, -24] },
      { d: rect(58, 78, 84, 60, 26), m: 'dark' },
      { d: 'M70 92 C74 84 84 82 96 82', m: 'line', width: 3, glint: 0.3 },
      { d: ellipse(85, 108, 12, 16), m: 'halo' },
      { d: ellipse(115, 108, 12, 16), m: 'halo' },
      { d: rect(80, 96, 10, 24, 5), m: 'glow' },
      { d: rect(110, 96, 10, 24, 5), m: 'glow' },
    ],
  },
  duck: {
    tilt: 6,
    accent: ORANGE,
    detail: '88 30 112 112',
    parts: [
      {
        d: 'M34 96 C44 108 56 112 68 108 C88 100 110 104 130 110 C152 106 172 118 172 140 C172 164 146 176 110 176 C74 176 44 168 37 146 C32 130 32 114 34 96 Z',
        m: 'body',
        shine: [66, 122, 20, 8, -14],
      },
      { d: ellipse(128, 104, 30, 10), m: 'occlude' },
      { d: 'M74 134 C90 122 118 124 128 140 C116 152 90 154 74 134 Z', m: 'body' },
      { d: ellipse(132, 80, 34, 32), m: 'body', shine: [118, 64, 12, 7, -32] },
      { d: 'M158 84 C170 78 186 82 190 90 C186 100 170 102 158 98 Z', m: 'accent', shine: [170, 84, 7, 2.5, 0] },
      { d: ellipse(142, 74, 5.5, 7), m: 'dark' },
      { d: ellipse(140.5, 71.5, 1.8, 2.2), m: 'white' },
      { d: ellipse(152, 92, 7, 4), m: 'blush' },
    ],
  },
  cat: {
    tilt: 8,
    accent: PINK,
    detail: '40 60 120 120',
    parts: [
      { d: 'M48 98 C44 70 50 46 60 38 C76 44 90 58 98 76 Z', m: 'body' },
      { d: 'M152 98 C156 70 150 46 140 38 C124 44 110 58 102 76 Z', m: 'body' },
      { d: 'M58 82 C56 66 60 54 64 50 C72 56 80 64 84 74 Z', m: 'accent' },
      { d: 'M142 82 C144 66 140 54 136 50 C128 56 120 64 116 74 Z', m: 'accent' },
      { d: ellipse(100, 114, 66, 56), m: 'body', shine: [72, 82, 22, 9, -22] },
      { d: ellipse(78, 110, 8, 10.5), m: 'dark' },
      { d: ellipse(122, 110, 8, 10.5), m: 'dark' },
      { d: ellipse(75.5, 106, 2.6, 3.2), m: 'white' },
      { d: ellipse(119.5, 106, 2.6, 3.2), m: 'white' },
      { d: ellipse(64, 130, 11, 6.5), m: 'blush' },
      { d: ellipse(136, 130, 11, 6.5), m: 'blush' },
      { d: 'M95 124 C95 120 105 120 105 124 C104 128 101 130 100 130 C99 130 96 128 95 124 Z', m: 'accent' },
      { d: 'M91 133 C94 138 99 138 100 133 C101 138 106 138 109 133', m: 'line', width: 2.5 },
    ],
  },
  ghost: {
    tilt: -8,
    accent: PINK,
    detail: '44 44 112 112',
    parts: [
      { d: ellipse(50, 118, 14, 10), m: 'body' },
      { d: ellipse(150, 112, 14, 10), m: 'body' },
      {
        d: 'M54 98 C54 62 74 38 100 38 C126 38 146 62 146 98 V158 C146 172 136 176 128 168 C122 162 116 162 112 170 C107 178 93 178 88 170 C84 162 78 162 72 168 C64 176 54 172 54 158 Z',
        m: 'body',
        shine: [76, 62, 18, 9, -32],
      },
      { d: ellipse(84, 98, 7.5, 11), m: 'dark' },
      { d: ellipse(116, 98, 7.5, 11), m: 'dark' },
      { d: ellipse(81.5, 94, 2.4, 3.2), m: 'white' },
      { d: ellipse(113.5, 94, 2.4, 3.2), m: 'white' },
      { d: ellipse(100, 124, 7, 9), m: 'dark' },
      { d: ellipse(70, 116, 9, 5.5), m: 'blush' },
      { d: ellipse(130, 116, 9, 5.5), m: 'blush' },
    ],
  },
  rocket: {
    tilt: 32,
    accent: PINK,
    detail: '58 36 108 108',
    parts: [
      { d: 'M82 150 C82 168 92 182 100 194 C108 182 118 168 118 150 Z', m: 'flame' },
      { d: 'M72 106 C54 116 44 136 46 162 L74 148 Z', m: 'accent' },
      { d: 'M128 106 C146 116 156 136 154 162 L126 148 Z', m: 'accent' },
      {
        d: 'M100 22 C126 40 136 76 134 118 C134 132 132 146 128 154 L72 154 C68 146 66 132 66 118 C64 76 74 40 100 22 Z',
        m: 'body',
        shine: [84, 64, 9, 22, 12],
      },
      { d: ellipse(100, 86, 20, 20), m: 'white' },
      { d: ellipse(100, 86, 14, 14), m: 'glass', shine: [95, 81, 5, 3, -30] },
      { d: rect(80, 150, 40, 10, 5), m: 'dark' },
    ],
  },
  planet: {
    tilt: -16,
    accent: PINK,
    detail: '40 40 120 120',
    parts: [
      { d: 'M18 106 A82 22 0 0 1 182 106', m: 'ring' },
      { d: ellipse(100, 100, 54, 54), m: 'body', shine: [76, 70, 18, 10, -34] },
      { d: ellipse(122, 116, 10, 8), m: 'crater' },
      { d: ellipse(86, 126, 6, 5), m: 'crater' },
      { d: ellipse(126, 80, 5, 4), m: 'crater' },
      { d: 'M18 106 A82 22 0 0 0 182 106', m: 'ring' },
    ],
  },
  mushroom: {
    tilt: -6,
    accent: CREAM,
    detail: '40 60 120 120',
    parts: [
      {
        d: 'M76 112 C72 136 70 158 78 170 C90 178 110 178 122 170 C130 158 128 136 124 112 Z',
        m: 'accent',
        shine: [90, 132, 5, 12, 4],
      },
      { d: ellipse(100, 116, 42, 9), m: 'occlude' },
      {
        d: 'M26 114 C26 66 60 34 100 34 C140 34 174 66 174 114 C174 124 160 128 100 128 C40 128 26 124 26 114 Z',
        m: 'body',
        shine: [70, 56, 22, 9, -26],
      },
      { d: ellipse(70, 78, 12, 9), m: 'cream' },
      { d: ellipse(116, 58, 10, 7), m: 'cream' },
      { d: ellipse(144, 92, 10, 8), m: 'cream' },
      { d: ellipse(98, 98, 8, 6), m: 'cream' },
      { d: ellipse(44, 106, 6, 5), m: 'cream' },
      { d: ellipse(90, 148, 4, 5.5), m: 'dark' },
      { d: ellipse(110, 148, 4, 5.5), m: 'dark' },
      { d: 'M95 158 C98 162 102 162 105 158', m: 'line', width: 2.5 },
    ],
  },
  cloud: {
    tilt: 4,
    accent: PINK,
    detail: '36 52 128 128',
    parts: [
      {
        d: 'M56 156 C30 156 20 130 34 114 C36 92 58 82 76 90 C82 62 116 52 134 74 C158 68 178 88 172 114 C188 124 182 156 156 156 Z',
        m: 'body',
        shine: [96, 74, 18, 8, -18],
      },
      { d: 'M78 120 C82 126 90 126 94 120', m: 'line', width: 3 },
      { d: 'M110 120 C114 126 122 126 126 120', m: 'line', width: 3 },
      { d: ellipse(70, 132, 9, 5.5), m: 'blush' },
      { d: ellipse(134, 132, 9, 5.5), m: 'blush' },
      { d: 'M96 134 C99 138 103 138 106 134', m: 'line', width: 2.5 },
    ],
  },
};

export type ArtView = 'front' | 'detail' | 'pair';

export interface ProductArtProps {
  shape: Shape;
  finish: string;
  /** `pair` draws a second toy behind the first, in this finish. */
  pairFinish?: string;
  view?: ArtView;
  /** Names the picture. Leave it out where the product's name is already beside it, and it is decoration. */
  label?: string;
  /** Leave out the shadow underneath, for a toy that is not floating over anything. */
  grounded?: boolean;
}

/** Variables `<name>-0` … `<name>-n` for a list of tokens: a gradient attribute reads a variable, never a token. */
const tokens = (name: string, list: readonly string[]) => Object.fromEntries(list.map((token, index) => [`${name}-${index}`, token]));

// The materials every toy shares, declared once on the drawing.
const shared = {
  ...tokens('dark', ['slate-500', 'slate-800', 'slate-900', 'slate-950']),
  ...tokens('white', ['white', 'slate-50', 'slate-200', 'slate-400']),
  ...tokens('cream', CREAM),
  ...tokens('glass', ['sky-100', 'sky-300', 'blue-500', 'indigo-800']),
  ...tokens('flame', ['amber-100', 'orange-400', 'pink-500']),
  ...tokens('ring', ['pink-300', 'amber-200', 'pink-500']),
  glow: 'cyan-200',
  halo: 'cyan-300',
  blush: 'pink-400',
  ground: 'indigo-950',
};

export default function ProductArt({ shape, finish, pairFinish, view = 'front', label, grounded = true }: ProductArtProps) {
  return (
    <Svg
      viewBox={view === 'detail' ? toys[shape].detail : '0 0 200 220'}
      width="100%"
      height="100%"
      label={label}
      display="block"
      overflow="visible"
      vars={shared}
    >
      {view === 'pair' ? (
        <>
          <Figure shape={shape} finish={finishes[pairFinish ?? finish]} grounded={grounded} transform="translate(84 6) scale(0.56)" />
          <Figure shape={shape} finish={finishes[finish]} grounded={grounded} transform="translate(-2 52) scale(0.72)" />
        </>
      ) : (
        <Figure shape={shape} finish={finishes[finish]} grounded={grounded && view === 'front'} />
      )}
    </Svg>
  );
}

/** The lit surface: a radial gradient focused up and to the left of centre, so every part is a little sphere. */
function Surface({ id, name }: { id: string; name: string }) {
  return (
    <RadialGradient id={id} cx="0.5" cy="0.5" r="0.62" fx="0.34" fy="0.26">
      {[0, 0.3, 0.72, 1].map((offset, index) => (
        <Stop key={offset} offset={String(offset)} stopColor={`var(--${name}-${index})`} />
      ))}
    </RadialGradient>
  );
}

/** A soft spot of one colour fading out to nothing. */
function Spot({ id, color, from, to = 0 }: { id: string; color: string; from: number; to?: number }) {
  return (
    <RadialGradient id={id}>
      <Stop offset="0" stopColor={color} stopOpacity={String(from)} />
      <Stop offset="1" stopColor={color} stopOpacity={String(to)} />
    </RadialGradient>
  );
}

interface FigureProps {
  shape: Shape;
  finish: Finish;
  grounded: boolean;
  transform?: string;
}

function Figure({ shape, finish, grounded, transform }: FigureProps) {
  // Gradients read their colours where they are defined, so each toy carries its own beside its variables.
  const id = useId().replace(/:/g, '');
  const url = (name: string) => `url(#${id}-${name})`;
  const toy = toys[shape];
  const fills: Record<Material, string> = {
    body: url('body'),
    accent: url('accent'),
    dark: url('dark'),
    white: url('white'),
    cream: url('cream'),
    glass: url('glass'),
    glow: 'var(--glow)',
    halo: url('halo'),
    blush: url('blush'),
    occlude: url('occlude'),
    crater: url('crater'),
    flame: url('flame'),
  };

  return (
    <G
      transform={transform}
      vars={{
        ...tokens('body', [finish.light, finish.color, finish.shade, finish.deep]),
        ...tokens('accent', toy.accent),
        bounce: `${finish.tint}-300`,
      }}
    >
      <Defs>
        {['body', 'accent', 'dark', 'white', 'cream', 'glass'].map((name) => (
          <Surface key={name} id={`${id}-${name}`} name={name} />
        ))}
        {/* Light thrown back up from whatever the toy floats over: the lower right takes the backdrop's colour. */}
        <RadialGradient id={`${id}-bounce`} cx="0.72" cy="1" r="0.8">
          <Stop offset="0" stopColor="var(--bounce)" stopOpacity="0.75" />
          <Stop offset="1" stopColor="var(--bounce)" stopOpacity="0" />
        </RadialGradient>
        <Spot id={`${id}-shine`} color="white" from={0.95} />
        <Spot id={`${id}-halo`} color="var(--halo)" from={0.7} />
        <Spot id={`${id}-blush`} color="var(--blush)" from={0.65} />
        <Spot id={`${id}-occlude`} color="var(--body-3)" from={0.45} />
        <Spot id={`${id}-ground`} color="var(--ground)" from={0.35} />
        <RadialGradient id={`${id}-crater`} fx="0.65" fy="0.7">
          <Stop offset="0" stopColor="var(--body-3)" stopOpacity="0.35" />
          <Stop offset="1" stopColor="var(--body-2)" stopOpacity="0.15" />
        </RadialGradient>
        <LinearGradient id={`${id}-flame`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="var(--flame-0)" />
          <Stop offset="0.35" stopColor="var(--flame-1)" />
          <Stop offset="0.75" stopColor="var(--flame-2)" />
          <Stop offset="1" stopColor="var(--flame-2)" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id={`${id}-ring`} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="var(--ring-0)" />
          <Stop offset="0.5" stopColor="var(--ring-1)" />
          <Stop offset="1" stopColor="var(--ring-2)" />
        </LinearGradient>
      </Defs>

      {grounded && <Path d={ellipse(100, 206, 46, 7)} props={{ fill: url('ground') }} />}
      <G transform={`rotate(${toy.tilt} 100 110)`}>
        {toy.parts.map((part, index) => {
          if (part.m === 'line') {
            return (
              <Path
                key={index}
                d={part.d}
                fill="none"
                stroke={part.glint ? 'white' : 'slate-900'}
                strokeOpacity={part.glint}
                strokeWidth={part.width}
                strokeLinecap="round"
              />
            );
          }
          if (part.m === 'ring') {
            return <Path key={index} d={part.d} fill="none" strokeWidth={9} strokeLinecap="round" props={{ stroke: url('ring') }} />;
          }

          return (
            <Fragment key={index}>
              <Path d={part.d} props={{ fill: fills[part.m] }} />
              {(part.m === 'body' || part.m === 'accent') && <Path d={part.d} props={{ fill: url('bounce') }} />}
              {part.shine && (
                <Path
                  d={ellipse(part.shine[0], part.shine[1], part.shine[2], part.shine[3])}
                  transform={`rotate(${part.shine[4]} ${part.shine[0]} ${part.shine[1]})`}
                  props={{ fill: url('shine') }}
                />
              )}
            </Fragment>
          );
        })}
      </G>
    </G>
  );
}

/**
 * The backdrop a toy is shown on: a pastel glow from below in the light theme and a night sky in the dark,
 * both tinted by the toy's own finish and dusted with stars. Spread it on the frame around the art.
 */
export function finishBackdrop(id: string) {
  const { tint } = finishes[id];
  const stars = [
    [14, 20, 1],
    [82, 16, 1.2],
    [72, 62, 0.8],
    [24, 74, 1],
    [90, 84, 0.8],
    [46, 10, 0.7],
    [8, 52, 0.7],
  ]
    .map(([x, y, r]) => `radial-gradient(circle at ${x}% ${y}%, var(--star) 0 ${r}px, transparent ${r + 0.6}px)`)
    .join(', ');

  return {
    vars: { star: `${tint}-300`, glow: `${tint}-200`, mid: `${tint}-50`, top: 'white' },
    css: { backgroundImage: `${stars}, radial-gradient(130% 100% at 50% 100% in oklch, var(--glow), var(--mid) 55%, var(--top))` },
    theme: { dark: { vars: { star: 'white', glow: `${tint}-400/80`, mid: 'violet-800/70', top: 'indigo-950' } } },
  };
}

/** A glossy little bead of the finish, for the colour swatches. */
export function finishBead(id: string) {
  const finish = finishes[id];

  return {
    vars: { 'bead-light': finish.light, bead: finish.color, 'bead-deep': finish.shade },
    css: { backgroundImage: 'radial-gradient(circle at 32% 28%, var(--bead-light), var(--bead) 45%, var(--bead-deep))' },
  };
}
