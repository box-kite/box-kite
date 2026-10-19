import { ArrowLeft } from 'lucide-react';
import Box from '../../src/box';
import Icon from '../../src/components/icon';
import SiteLink from './siteLink';

/**
 * The way back from a full-bleed demo to its page on the site. Pinned to a corner rather than a bar, so the
 * page under it keeps its own header; `data-demo-exit` is what the snapshot script removes before shooting.
 */
export default function DemoExit({ to, name }: { to: string; name: string }) {
  return (
    <Box position="fixed" bottom={4} insetStart={4} zIndex={100} props={{ 'data-demo-exit': '', 'data-md': 'skip' }}>
      <SiteLink
        to={to}
        display="flex"
        ai="center"
        gap={2}
        ps={3}
        pe={4}
        py={2}
        borderRadius={999}
        fontSize={13}
        fontWeight={600}
        textDecoration="none"
        shadow="lg"
        b={1}
        focusVisible={{ outline: 2, outlineOffset: 2, outlineColor: 'accent-500' }}
        theme={{
          light: { bgColor: 'white', color: 'base-900', borderColor: 'base-200', hover: { bgColor: 'base-100' } },
          dark: { bgColor: 'base-900', color: 'base-100', borderColor: 'base-700', hover: { bgColor: 'base-800' } },
        }}
      >
        <Icon size={4}>
          <ArrowLeft />
        </Icon>
        {name}
      </SiteLink>
    </Box>
  );
}
