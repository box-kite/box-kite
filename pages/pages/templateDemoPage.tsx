import { useLocation } from 'react-router-dom';
import Box from '../../src/box';
import Toaster from '../../src/components/toaster';
import type { FamilyPageProps } from '../app/routePages';
import DemoExit from '../components/demoExit';
import { designScope } from '../designs/designs';
import { templateFor, templatePath } from '../site/templates';
import NotFoundPage from './notFoundPage';

/** `/templates/<slug>/demo/`: the template alone, full-bleed. Its `<h1>` is its own brand's, which is why it is `noindex`. */
export default function TemplateDemoPage({ Content }: FamilyPageProps) {
  const template = templateFor(useLocation().pathname);

  if (!template || !Content) return <NotFoundPage />;

  // A template is a brand of its own, drawn over the library's defaults whichever design the site is in.
  return (
    <>
      <Box {...designScope('classic')} props={{ 'data-design': 'classic' }}>
        <Content />
      </Box>
      <DemoExit to={templatePath(template.slug)} name={template.name} />
      {/* A template may confirm through `toast()`, which needs a viewport on the page. */}
      <Toaster />
    </>
  );
}
