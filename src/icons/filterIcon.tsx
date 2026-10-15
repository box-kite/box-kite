import { Path, Svg, SvgProps } from '../components/svg';

export default function FilterIcon(props: SvgProps) {
  return (
    <Svg viewBox="0 0 24 24" width="1rem" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <Path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </Svg>
  );
}
