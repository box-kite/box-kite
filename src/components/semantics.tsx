import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps } from '../box';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';
import StringUtils from '../utils/string/stringUtils';

type SemanticComponentType<TTag extends keyof React.JSX.IntrinsicElements, TKey extends keyof ComponentsAndVariants = never> = (
  props: Omit<BoxProps<TTag, TKey>, 'tag'> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;

function semantic<TTag extends keyof React.JSX.IntrinsicElements, TKey extends keyof ComponentsAndVariants>(
  tagName: TTag,
): SemanticComponentType<TTag, TKey> {
  const comp = forwardRef((props: Omit<BoxProps<TTag, TKey>, 'tag'>, ref: Ref<ExtractElementFromTag<TTag>>) => (
    <Box tag={tagName} ref={ref} component={tagName as unknown as TKey} {...props} />
  ));

  comp.displayName = StringUtils.capitalize(tagName);

  return comp;
}

export const Label = semantic('label');
export const Span = semantic('span');
export const Article = semantic('article');
export const Aside = semantic('aside');
export const Details = semantic('details');
export const Figcaption = semantic('figcaption');
export const Figure = semantic('figure');
export const Footer = semantic('footer');
export const Header = semantic('header');
export const Main = semantic('main');
export const Mark = semantic('mark');
export const Nav = semantic('nav');
export const MenuList = semantic('menu');
/**
 * @deprecated `MenuList` is this element now. `Menu` is the menu **button** (`components/menu`), and two exports of
 * that name are one import away from the wrong component. Same element, same props.
 */
export const Menu = MenuList;
export const Section = semantic('section');
export const Summary = semantic('summary');
export const Time = semantic('time');
export const P = semantic('p');
// A list, because `marker` is a prop now and `::marker` applies to nothing else.
export const Ul = semantic('ul');
export const Ol = semantic('ol');
export const Li = semantic('li');
export const H1 = semantic('h1');
export const H2 = semantic('h2');
export const H3 = semantic('h3');
export const H4 = semantic('h4');
export const H5 = semantic('h5');
export const H6 = semantic('h6');
export const Link = semantic('a');
export const Img = semantic('img');
