import { POSTS_PATH } from './posts';

/** The site's sections, which the bar above every page names; the sidebar holds the docs tree inside the first. */
export type Section = 'docs' | 'start' | 'blog';

/** The sections, in the order the bar shows them, and where each one starts. */
export const SECTIONS: readonly { id: Section; to: string; label: string }[] = [
  { id: 'docs', to: '/', label: 'Docs' },
  { id: 'start', to: '/start', label: 'Start with AI' },
  { id: 'blog', to: POSTS_PATH, label: 'Blog' },
];

/** Which section a page belongs to: everything that is not the blog or the AI start is docs. */
export function sectionOf(pathname: string): Section {
  const path = pathname.replace(/\/+$/, '');
  if (path === POSTS_PATH || path.startsWith(`${POSTS_PATH}/`)) return 'blog';
  if (path === '/start') return 'start';

  return 'docs';
}
