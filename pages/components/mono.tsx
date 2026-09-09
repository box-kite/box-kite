import { BoxProps } from '../../src/box';
import Box from '../../src/box';

/**
 * Inline code in prose. `display="inline"` is the whole reason this is shared: without it `._b` makes a
 * `<Box tag="code">` a block and every prop name in a sentence lands on a line of its own (bug #74),
 * which twenty pages each rediscovered for themselves. A prop name does not wrap either — pass
 * `whiteSpace="normal"` for the long type strings that have to.
 */
export default function Mono({ children, ...props }: BoxProps<'code'>) {
  return (
    <Box
      tag="code"
      display="inline"
      px={1}
      borderRadius={1}
      fontSize={13}
      whiteSpace="nowrap"
      theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' }, light: { bgColor: 'slate-100', color: 'slate-800' } }}
      {...props}
    >
      {children}
    </Box>
  );
}
