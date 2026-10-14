import Toaster from '../../src/components/toaster';
import type { FamilyPageProps } from '../app/routePages';
import NotFoundPage from './notFoundPage';

/** `/templates/<slug>/demo/`: the template alone, full-bleed. Its `<h1>` is its own brand's, which is why it is `noindex`. */
export default function TemplateDemoPage({ Content }: FamilyPageProps) {
  if (!Content) return <NotFoundPage />;

  return (
    <>
      <Content />
      {/* A template may confirm through `toast()`, which needs a viewport on the page. */}
      <Toaster />
    </>
  );
}
