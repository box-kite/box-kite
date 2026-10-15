import { Path, Svg, SvgProps } from '../components/svg';

export default function CloseIcon(props: SvgProps) {
  return (
    <Svg viewBox="0 0 24 24" width="1.25rem" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <Path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </Svg>
  );
}
