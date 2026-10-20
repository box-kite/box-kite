/* eslint-disable @typescript-eslint/no-explicit-any */
import { classNames, ClassNameType } from '../core';
import { BoxStyleProps } from '../types';
import BoxUtils from '../utils/box/boxUtils';
import { marksComponents } from '../utils/interactions/componentAttribute';

/**
 * The props that reach the HTML tag: whatever the caller put in `props`, the resolved class list,
 * and the handful of attributes Box lifts to its own top level. Hook-free, so the client Box and
 * the Server-Component Box assemble their markup through the same code.
 */
export default function buildTagProps(source: BoxStyleProps<any>, styleClasses: string[]): Record<string, any> {
  const props = source as BoxStyleProps<any> & { props?: Record<string, any>; className?: ClassNameType; style?: unknown; id?: string };
  const { props: tagProps, className: userClassName, disabled, required, checked, selected } = props;

  const propsToUse: Record<string, any> = { ...tagProps, className: classNames(styleClasses, userClassName).join(' ') };

  if (typeof props.component === 'string' && marksComponents()) propsToUse['data-bk'] ??= props.component;

  BoxUtils.assignBooleanProp(disabled, 'disabled', propsToUse);
  BoxUtils.assignBooleanProp(required, 'required', propsToUse);
  BoxUtils.assignBooleanProp(checked, 'checked', propsToUse);
  BoxUtils.assignBooleanProp(selected, 'selected', propsToUse);
  'style' in props && (propsToUse.style = props.style);
  'id' in props && (propsToUse.id = props.id);

  return propsToUse;
}
