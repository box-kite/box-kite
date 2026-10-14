import { POSTS_PATH } from './posts';
import { BLOCKS_PATH, TEMPLATES_PATH, templates } from './templates';

/** The site's sections, which the bar above every page names; the sidebar holds the docs tree inside the first. */
export type Section = 'docs' | 'start' | 'templates' | 'blog';

// Until the first template lands the gallery is not served, so the section starts at the blocks.
const gallery = templates.length ? { to: TEMPLATES_PATH, label: 'Templates' } : { to: BLOCKS_PATH, label: 'Blocks' };

/** The sections, in the order the bar shows them, and where each one starts. */
export const SECTIONS: readonly { id: Section; to: string; label: string }[] = [
  { id: 'docs', to: '/', label: 'Docs' },
  { id: 'start', to: '/start-with-ai', label: 'Start with AI' },
  { id: 'templates', ...gallery },
  { id: 'blog', to: POSTS_PATH, label: 'Blog' },
];

const within = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Which section a page belongs to: everything that is not the blog, the galleries or the AI start is docs. */
export function sectionOf(pathname: string): Section {
  const path = pathname.replace(/\/+$/, '');
  if (within(path, POSTS_PATH)) return 'blog';
  if (within(path, TEMPLATES_PATH) || within(path, BLOCKS_PATH)) return 'templates';
  if (path === '/start-with-ai') return 'start';

  return 'docs';
}
