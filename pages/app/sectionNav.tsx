import { BookOpen, Newspaper, Zap } from 'lucide-react';
import { ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { Link, Nav } from '../../src/components/semantics';
import SiteLink from '../components/siteLink';
import { Section, SECTIONS, sectionOf } from '../site/sections';
import { REPO_URL } from '../site/site';
import SiGithub from '~icons/simple-icons/github';
import SiNpm from '~icons/simple-icons/npm';

// The icon is the bar's own; the sections themselves are data, so the sidebar test can count them as links.
const ICONS: Record<Section, ReactElement> = { docs: <BookOpen />, start: <Zap />, blog: <Newspaper /> };

const muted = {
  dark: { color: 'slate-400', hover: { color: 'white' } },
  light: { color: 'slate-500', hover: { color: 'slate-900' } },
} as const;

/**
 * The bar above the page on a wide screen, and the same links at the top of the drawer on a phone, where
 * the mobile header has no room for them. `Start with AI` carries the accent: it is the shortest way in.
 */
export default function SectionNav({ placement }: { placement: 'bar' | 'drawer' }) {
  const current = sectionOf(useLocation().pathname);
  const bar = placement === 'bar';

  return (
    <Nav
      props={{ 'aria-label': 'Site sections' }}
      display="flex"
      ai="center"
      gap={bar ? 1 : 0.5}
      width="fit"
      jc={bar ? 'start' : 'space-between'}
    >
      {SECTIONS.map(({ id, to, label }) => {
        const active = id === current;
        const accent = id === 'start';

        return (
          <SiteLink
            key={id}
            to={to}
            display="flex"
            ai="center"
            gap={bar ? 2 : 1.5}
            px={bar ? 3 : 2}
            py={1.5}
            borderRadius={2}
            fontSize={bar ? 14 : 13}
            whiteSpace="nowrap"
            fontWeight={active ? 600 : 500}
            textDecoration="none"
            transition="colors"
            theme={
              active
                ? { dark: { bgColor: 'slate-800', color: 'white' }, light: { bgColor: 'slate-100', color: 'slate-900' } }
                : accent
                  ? {
                      dark: { color: 'violet-300', hover: { color: 'violet-200' } },
                      light: { color: 'violet-600', hover: { color: 'violet-700' } },
                    }
                  : muted
            }
          >
            <Icon size={bar ? 4 : 3.5} theme={accent ? { dark: { color: 'violet-400' }, light: { color: 'violet-500' } } : undefined}>
              {ICONS[id]}
            </Icon>
            {label}
          </SiteLink>
        );
      })}

      {bar && (
        <Flex ai="center" gap={1} ms="auto">
          <External href={REPO_URL} label="Box Kite on GitHub">
            <SiGithub />
          </External>
          <External href="https://www.npmjs.com/package/@box-kite/react" label="@box-kite/react on npm">
            <SiNpm />
          </External>
        </Flex>
      )}
    </Nav>
  );
}

function External({ href, label, children }: { href: string; label: string; children: ReactElement }) {
  return (
    <Link
      props={{ href, target: '_blank', rel: 'noopener noreferrer' }}
      display="flex"
      p={2}
      borderRadius={2}
      transition="colors"
      theme={muted}
    >
      <Icon size={4.5} label={label}>
        {children}
      </Icon>
    </Link>
  );
}

/** The bar itself: sticky over the content and the table of contents, translucent like the mobile header. */
export function SectionBar() {
  return (
    <Box
      display="none"
      lg={{ display: 'block' }}
      position="sticky"
      top={0}
      zIndex={2}
      height={14}
      px={6}
      bb={1}
      backdropBlur="md"
      theme={{ dark: { borderColor: 'slate-800', bgColor: 'slate-900/70' }, light: { borderColor: 'slate-200', bgColor: 'white/70' } }}
    >
      <Flex height="fit" ai="center">
        <SectionNav placement="bar" />
      </Flex>
    </Box>
  );
}
