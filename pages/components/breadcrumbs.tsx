import { ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Icon from '../../src/components/icon';
import { Li, Nav, Ol, Span } from '../../src/components/semantics';
import { routes } from '../site/routes';
import { breadcrumbsFor } from '../site/siteMeta';
import SiteLink from './siteLink';

/**
 * The trail above a page that sits inside a section — a post, a release, a block. It is the same list the
 * page's `BreadcrumbList` is built from, so what a search result shows is what the reader sees.
 */
export default function Breadcrumbs() {
  const crumbs = breadcrumbsFor(useLocation().pathname, routes);

  if (!crumbs.length) return null;

  return (
    // Chrome, and the mirror's own header says where the page is, so the markdown skips it.
    <Nav props={{ 'aria-label': 'Breadcrumb', 'data-md': 'skip' }} mb={6}>
      <Ol
        display="flex"
        flexWrap="wrap"
        ai="center"
        gap={1.5}
        fontSize={13}
        theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}
      >
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;

          return (
            <Li key={crumb.path} display="flex" ai="center" gap={1.5} minWidth={0}>
              {index > 0 && (
                <Icon size={3.5} flexShrink={0}>
                  <ChevronRight />
                </Icon>
              )}
              {last ? (
                <Span props={{ 'aria-current': 'page' }} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {crumb.name}
                </Span>
              ) : (
                <SiteLink
                  to={crumb.path}
                  textDecoration="none"
                  whiteSpace="nowrap"
                  theme={{ dark: { hover: { color: 'white' } }, light: { hover: { color: 'slate-900' } } }}
                >
                  {crumb.name}
                </SiteLink>
              )}
            </Li>
          );
        })}
      </Ol>
    </Nav>
  );
}
