import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BoxClassNameProps, useClassNames } from '../../src/box';
import { prefetchPage } from '../app/routePages';

/**
 * A router link with Box props. The class lands on the `<a>` React Router renders, so a page can link
 * to another without a full load and without a style attribute — and the target's chunk starts loading
 * when the pointer arrives, the way the sidebar's entries do. `label` names a link whose own text does
 * not — a version number, an arrow.
 */
export default function SiteLink({
  to,
  label,
  children,
  ...props
}: { to: string; label?: string; children: ReactNode } & BoxClassNameProps) {
  const { className, styles } = useClassNames(props);
  const prefetch = () => prefetchPage(to);

  return (
    <>
      {styles}
      <NavLink to={to} className={className} aria-label={label} onPointerEnter={prefetch} onFocus={prefetch}>
        {children}
      </NavLink>
    </>
  );
}
