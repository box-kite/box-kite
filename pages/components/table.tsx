import { ReactNode } from 'react';
import Box from '../../src/box';
import { BoxProps } from '../../src/box';

/**
 * The docs site's tables, in one place because every copy of them had the same bug: `._b` puts
 * `display: block` on every Box whatever its `tag`, so a `<Box tag="table">` was a stack of full-width
 * blocks and a `<td>` a paragraph of its own (bug #74). Each part names the display value its element
 * needs, which also gives it back the table semantics Chrome derives from that value.
 */
export function Table({ children, ...props }: BoxProps<'table'>) {
  return (
    <Box tag="table" display="table" borderCollapse="collapse" width="fit" {...props}>
      {children}
    </Box>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <Box tag="thead" display="table-header-group">
      {children}
    </Box>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <Box tag="tbody" display="table-row-group">
      {children}
    </Box>
  );
}

export function TableRow({ children }: { children: ReactNode }) {
  return (
    <Box tag="tr" display="table-row">
      {children}
    </Box>
  );
}

export function HeadCell({ children, ...props }: BoxProps<'th'>) {
  return (
    <Box
      tag="th"
      display="table-cell"
      textAlign="start"
      fontSize={13}
      fontWeight={600}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-300', borderColor: 'slate-700' }, light: { color: 'slate-700', borderColor: 'slate-200' } }}
      {...props}
    >
      {children}
    </Box>
  );
}

export function Cell({ children, ...props }: BoxProps<'td'>) {
  return (
    <Box
      tag="td"
      display="table-cell"
      fontSize={14}
      lineHeight={22}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-400', borderColor: 'slate-800' }, light: { color: 'slate-600', borderColor: 'slate-100' } }}
      {...props}
    >
      {children}
    </Box>
  );
}
