import type { FamilyPageProps } from '../app/routePages';
import NotFoundPage from './notFoundPage';

/** `/templates/<slug>/demo/`: the template alone, full-bleed. Its `<h1>` is its own brand's, which is why it is `noindex`. */
export default function TemplateDemoPage({ Content }: FamilyPageProps) {
  return Content ? <Content /> : <NotFoundPage />;
}
