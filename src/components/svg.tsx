import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps, BoxTagProps } from '../box';
import { ExtractElementFromTag } from '../react/reactTypes';
import { withAttributesInProps } from '../react/svg/attributesInProps';
import svgNaming from '../react/svg/svgNaming';
import { ComponentsAndVariants } from '../types';
import StringUtils from '../utils/string/stringUtils';

/**
 * The SVG elements as components, so a drawing is written the way the rest of this library is —
 * `<Circle cx={28} r={12} />`, never `<Box tag="circle">`. The difficulty is that SVG attribute names and
 * Box prop names collide silently (a `<path>`'s `d` is Box's flex-direction; Chakra once turned `d` into
 * `display` this way), so each component names the attributes it owns and lifts them off the style props —
 * per element, because whether a name is CSS or an attribute is a question about the element.
 */

/** A name the element accepts as an attribute. */
type Attribute<TTag extends keyof React.JSX.IntrinsicElements> = keyof React.JSX.IntrinsicElements[TTag];

/** Box's props for the tag, minus the names this element claims as attributes, plus those attributes. */
type SvgElementProps<
  TTag extends keyof React.JSX.IntrinsicElements,
  TAttribute extends Attribute<TTag>,
  TKey extends keyof ComponentsAndVariants,
> = Omit<BoxProps<TTag, TKey>, 'tag' | TAttribute> & Pick<React.JSX.IntrinsicElements[TTag], TAttribute>;

// `TKey` is a parameter of the *call*, not of the alias: an SVG element is a Box, so it can name a
// style node (`<Path component="sparkline.line">`) and have its `variant` typed against that node.
type SvgElementType<TTag extends keyof React.JSX.IntrinsicElements, TAttribute extends Attribute<TTag>> = <
  TKey extends keyof ComponentsAndVariants = never,
>(
  props: SvgElementProps<TTag, TAttribute, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;

/**
 * Split the claimed attributes out of a component's props: the style props with those names removed, and
 * the attributes to merge over `props`. A name that was not passed is not written either — an absent
 * attribute must never shadow one the caller put in `props` by hand.
 */
function liftAttributes(source: object, names: readonly string[]) {
  // A fresh object, so deleting from it leaves the caller's props untouched.
  const { props: tagProps, ...rest } = source as { props?: Record<string, unknown> };
  const styleProps = rest as Record<string, unknown>;
  let lifted: Record<string, unknown> | undefined;

  for (const name of names) {
    if (!(name in styleProps)) continue;

    (lifted ??= {})[name] = styleProps[name];
    delete styleProps[name];
  }

  return { styleProps, tagProps: lifted ? { ...tagProps, ...lifted } : tagProps };
}

function svgElement<TTag extends keyof React.JSX.IntrinsicElements, TAttribute extends Attribute<TTag>>(
  tagName: TTag,
  attributes: readonly TAttribute[] = [],
  displayName?: string,
): SvgElementType<TTag, TAttribute> {
  const names = attributes as unknown as readonly string[];

  // Typed loosely inside and asserted once on the way out: while the tag is still a type parameter,
  // an `Omit` of Box's props does not survive the `PropsWithoutRef` React wraps a forwardRef in.
  const comp = forwardRef((props: object, ref: Ref<unknown>) => {
    const { styleProps, tagProps } = liftAttributes(props, names);

    return (
      <Box
        tag={tagName}
        ref={ref as Ref<ExtractElementFromTag<TTag>>}
        component={tagName as unknown as never}
        {...(styleProps as BoxProps<TTag>)}
        props={tagProps as BoxTagProps<TTag>}
      />
    );
  });

  comp.displayName = displayName ?? StringUtils.capitalize(tagName);

  // These are Boxes, so their attributes live in `props` — `Icon` has to know before it clones one.
  withAttributesInProps(comp);

  return comp as unknown as SvgElementType<TTag, TAttribute>;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

interface SvgOwnProps {
  /** The coordinate system every number inside the drawing is measured in — `"0 0 24 24"`. */
  viewBox?: string;
  /** How the drawing is fitted when the box it is given is a different shape. */
  preserveAspectRatio?: string;
  /** The `width` attribute: a number in user units, or any CSS length — `"100%"`, `"12rem"`. */
  width?: string | number;
  /** The `height` attribute: a number in user units, or any CSS length. */
  height?: string | number;
  /** Names the drawing — `role="img"` and this text. Without one the `<svg>` is `aria-hidden`. */
  label?: string;
}

/** The `width`/`height` here are the SVG attributes, not the ÷4 layout props they are on a `<div>`. */
type Props<TKey extends keyof ComponentsAndVariants = never> = Omit<BoxProps<'svg', TKey>, 'tag' | 'width' | 'height'> & SvgOwnProps;

const SVG_ATTRIBUTES = ['viewBox', 'preserveAspectRatio', 'width', 'height'];

function SvgImpl(props: Props, ref: Ref<SVGSVGElement>) {
  const { label, ...withoutLabel } = props;
  const { styleProps, tagProps } = liftAttributes(withoutLabel, SVG_ATTRIBUTES);

  return (
    <Box
      tag="svg"
      ref={ref}
      component={'svg' as never}
      {...(styleProps as BoxProps<'svg'>)}
      props={{ xmlns: SVG_NAMESPACE, ...svgNaming(label, tagProps), ...tagProps }}
    />
  );
}

/** The root `<svg>`: the coordinate system, the size, and whether a screen reader is told about it. */
export const Svg = /* @__PURE__ */ withAttributesInProps(forwardRef(SvgImpl)) as (<TKey extends keyof ComponentsAndVariants = never>(
  props: Props<TKey> & RefAttributes<SVGSVGElement>,
) => React.ReactNode) & { displayName?: string };
Svg.displayName = 'Svg';

export type SvgProps = Props & RefAttributes<SVGSVGElement>;

/**
 * The rest of the elements, each with the attributes it owns — everything CSS styles on it stays a Box
 * prop. `transform` is an attribute everywhere, because SVG's version carries its own centre of rotation
 * (`rotate(-90 48 48)`) and the CSS `rotate` prop cannot say that without a `transformOrigin` we lack.
 */
export const G = /* @__PURE__ */ svgElement('g', ['transform']);
export const Defs = /* @__PURE__ */ svgElement('defs');
export const Path = /* @__PURE__ */ svgElement('path', ['d', 'transform', 'pathLength']);
export const Circle = /* @__PURE__ */ svgElement('circle', ['transform', 'pathLength']);
export const Ellipse = /* @__PURE__ */ svgElement('ellipse', ['transform', 'pathLength']);
export const Rect = /* @__PURE__ */ svgElement('rect', ['width', 'height', 'transform', 'pathLength']);
export const Line = /* @__PURE__ */ svgElement('line', ['x1', 'y1', 'x2', 'y2', 'transform', 'pathLength']);
export const Polyline = /* @__PURE__ */ svgElement('polyline', ['points', 'transform', 'pathLength']);
export const Polygon = /* @__PURE__ */ svgElement('polygon', ['points', 'transform', 'pathLength']);

/**
 * `SvgText`, not `Text`, which a future HTML text component would want. Its `x`/`y` are attributes: the
 * CSS geometry properties do not apply to `<text>`, so the Box props of that name would move nothing.
 */
export const SvgText = /* @__PURE__ */ svgElement('text', ['x', 'y', 'dx', 'dy', 'textLength', 'lengthAdjust', 'transform'], 'SvgText');
export const TSpan = /* @__PURE__ */ svgElement('tspan', ['x', 'y', 'dx', 'dy', 'textLength', 'lengthAdjust'], 'TSpan');

export const LinearGradient = /* @__PURE__ */ svgElement('linearGradient', [
  'x1',
  'y1',
  'x2',
  'y2',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
]);
export const RadialGradient = /* @__PURE__ */ svgElement('radialGradient', [
  'cx',
  'cy',
  'r',
  'fx',
  'fy',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
]);
export const Stop = /* @__PURE__ */ svgElement('stop', ['offset', 'stopColor', 'stopOpacity']);

export const ClipPath = /* @__PURE__ */ svgElement('clipPath', ['clipPathUnits', 'transform']);
export const Mask = /* @__PURE__ */ svgElement('mask', ['maskUnits', 'maskContentUnits', 'x', 'y', 'width', 'height']);
export const Use = /* @__PURE__ */ svgElement('use', ['href', 'width', 'height', 'transform']);
/** `SvgSymbol`, not `Symbol` — the global of that name is not something a module should shadow. */
export const SvgSymbol = /* @__PURE__ */ svgElement('symbol', ['viewBox', 'preserveAspectRatio', 'x', 'y', 'width', 'height'], 'SvgSymbol');
export const Marker = /* @__PURE__ */ svgElement('marker', [
  'markerWidth',
  'markerHeight',
  'refX',
  'refY',
  'orient',
  'markerUnits',
  'viewBox',
]);
