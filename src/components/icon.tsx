import { cloneElement, forwardRef, isValidElement, Ref } from 'react';
import { BoxClassNameProps, useClassNames } from '../box';
import { TagPropsType } from '../react/boxProps';
import { hasAttributesInProps } from '../react/svg/attributesInProps';
import svgNaming from '../react/svg/svgNaming';
import { BoxStyleProps } from '../types';

/**
 * Box props for an icon this library did not draw. An icon set is somebody else's component, and the only
 * styling channel it offers is the `className` it spreads onto its `<svg>`; `Icon` fills that channel
 * with a class the engine generated, so an icon takes the props everything else here takes:
 *
 * ```tsx
 * <Icon size={5} color="amber-400" hover={{ color: 'amber-300' }} label="Sunny"><Sun /></Icon>
 * ```
 *
 * **Nothing is passed down as a prop.** The size is in the class, where a CSS declaration outranks the
 * `width`/`height` attributes a set writes for itself — which is why one component fits every set
 * without knowing any of their prop names, and why `strokeWidth` can differ on hover. The child must
 * spread its props onto an `<svg>`. **For SVG you draw yourself, `Svg` and the `components/svg` elements
 * are Boxes already** and need no adapter.
 */
export interface IconProps extends BoxClassNameProps {
  /** The icon: exactly one element, whose `<svg>` these props are styling. */
  children: React.ReactElement;
  /**
   * Width and height at once, on the ÷4 scale: `size={6}` is the 24px an icon set defaults to, and is the
   * default here too. It wins over `width`/`height`. Careful when porting — a set's own `size` is in pixels.
   */
  size?: BoxStyleProps['width'] & BoxStyleProps['height'];
  /** Names the icon — `role="img"` and this text. Without one the icon is `aria-hidden`. */
  label?: string;
  /** Attributes forwarded to the icon's element, over anything the icon writes for itself. */
  props?: TagPropsType<'svg'>;
  /** Inline styles forwarded to the icon's element. Box props are the way to style it; this is for a
   * value that has to be computed per render, which no class can hold. */
  style?: React.CSSProperties;
}

/** 1.5rem — 24px, which is what every icon set draws at and what its viewBox is cut for. */
const DEFAULT_SIZE = 6;

/** What the cloned child is handed. Open, because the element belongs to whoever wrote the set. */
interface IconChildProps {
  className?: string;
  style?: React.CSSProperties;
  [attribute: string]: unknown;
}

/**
 * Box props on an icon somebody else drew — lucide, Tabler, react-icons, an Iconify set, a raw `<svg>`.
 * It clones the one element it is given and puts the engine's class on it, so it knows no icon set's API
 * and the class beats the `width`/`height` the set writes for itself.
 *
 * @a11y An icon with no `label` is `aria-hidden`, which is right for the common case: the icon repeats
 * a label that is already there, and reading it twice is noise.
 * @a11y A `label` makes it `role="img"` with that text as its name — for an icon that is the only thing
 * saying what a control does.
 */
function IconImpl(props: IconProps, ref: Ref<SVGSVGElement>) {
  const { children, label, size, props: tagProps, style, ...styleProps } = props;
  const sized = size !== undefined ? { width: size, height: size } : undefined;

  // `svg: true` picks the engine's SVG reset over its block one — the same base class Box puts on
  // a `<svg>` it renders itself, so an icon transitions on `--svgTransitionTime` like every shape.
  const { className, styles } = useClassNames({ width: DEFAULT_SIZE, height: DEFAULT_SIZE, ...styleProps, ...sized }, { svg: true });

  if (!isValidElement<IconChildProps>(children)) {
    throw new Error('[box-kite] <Icon> takes exactly one element — the icon to style. For SVG of your own, use <Svg> from components/svg.');
  }

  /**
   * Where the child's DOM attributes go. An icon set spreads its props onto its `<svg>`, so they go on top;
   * one of our own components keeps them in a `props` bag, and handing it `role` at the top level drops
   * them without a word (bug #78). The child says which it is — see `attributesInProps`.
   */
  const inProps = hasAttributesInProps(children.type);
  const childProps = children.props as { props?: IconChildProps; label?: string };
  const given = (inProps ? childProps.props : children.props) ?? {};

  // A component of ours names itself with a `label` prop rather than with an attribute, and that is
  // a decision as much as a hand-written `aria-label` is: without reading it, an `<Icon>` around an
  // `<Svg label="…">` would add `aria-hidden` on top of the name the child is about to write.
  const alreadyNamed = inProps && childProps.label !== undefined ? { ...given, 'aria-label': childProps.label } : given;
  const attributes = { ...tagProps, ...svgNaming(label, { ...alreadyNamed, ...tagProps }) };

  const iconProps: IconChildProps = {
    // Merged with what the child already had: `cloneElement` replaces a prop it is given, so a bare
    // `props` bag here would clone away the attributes the child was written with.
    ...(inProps ? { props: { ...given, ...attributes } } : attributes),
    // Spread rather than assigned: `style: undefined` would clone away a style the icon set wrote.
    ...(style ? { style } : undefined),
    ref,
    // The icon's own class first: it is what the set's own stylesheet targets, and the engine's
    // classes are atomic, so their order in the attribute decides nothing anyway.
    className: children.props.className ? `${children.props.className} ${className}` : className,
  };

  return (
    <>
      {styles}
      {cloneElement(children, iconProps)}
    </>
  );
}

/** Box props on an icon somebody else renders — see `IconProps`. */
const Icon = forwardRef(IconImpl);
Icon.displayName = 'Icon';

export default Icon;
