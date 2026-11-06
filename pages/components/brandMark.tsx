import Flex from '../../src/components/flex';
import { Path, Svg } from '../../src/components/svg';

/** The solid cube the favicon and the GitHub avatar draw; `public/logo.svg` carries the same path. */
export const CUBE_PATH =
  'm17.578 4.432-2-1.05C13.822 2.461 12.944 2 12 2s-1.822.46-3.578 1.382l-2 1.05c-1.773.93-2.816 1.478-3.462 2.21l9.04 4.52 9.04-4.52c-.646-.732-1.688-1.28-3.462-2.21ZM21.748 7.964l-8.998 4.5v9.44c.718-.179 1.535-.607 2.828-1.286l2-1.05c2.151-1.129 3.227-1.693 3.825-2.708C22 15.846 22 14.583 22 12.06v-.117c0-1.893 0-3.076-.252-3.978ZM11.25 21.904v-9.44l-8.998-4.5C2 8.866 2 10.05 2 11.941v.117c0 2.525 0 3.788.597 4.802.598 1.015 1.674 1.58 3.825 2.709l2 1.049c1.293.679 2.11 1.107 2.828 1.286Z';

interface Props {
  /** The tile's side on the ÷4 scale. */
  size: 8 | 10;
  shadow?: boolean;
}

/** The logo tile: the design's own gradient behind a white cube, at the avatar's proportions. */
export default function BrandMark({ size, shadow }: Props) {
  return (
    <Flex
      width={size}
      height={size}
      borderRadius={2}
      bgImage="gradient-primary"
      ai="center"
      jc="center"
      flexShrink={0}
      shadow={shadow ? 'medium' : undefined}
    >
      <Svg viewBox="0 0 24 24" width="62.5%" height="62.5%" fill="white">
        <Path d={CUBE_PATH} />
      </Svg>
    </Flex>
  );
}
