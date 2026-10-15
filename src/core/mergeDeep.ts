/* eslint-disable @typescript-eslint/no-explicit-any */
import ObjectUtils from '../utils/object/objectUtils';
import { pseudo2 } from './boxStyles';

/**
 * What puts a component's default styles *under* the props a caller passes. It lives in core rather than
 * beside the other object helpers because it reads the prop registry (`pseudo2`) to know which keys carry
 * a nested block — and a util that reaches into core would drag the whole registry into the React package
 * on the other side of the boundary.
 */
export function mergeDeep<T>(...objects: T[]) {
  return objects.reduce((prev, obj) => {
    Object.keys(obj ?? {}).forEach((key) => {
      const pVal = (prev as any)[key];
      const oVal = (obj as any)[key];

      if (oVal === undefined) {
        // An absent prop is exactly what JSX means by `undefined`, so it must not erase what it is
        // merging into: `hoverGroup={cond ? {…} : undefined}` — the shape every component here uses —
        // used to delete the component style's own block for that prop (bug #61). `clean` is still the
        // way to drop a component's styles on purpose.
      } else if (ObjectUtils.isObject(oVal) && 'clean' in oVal && oVal.clean) {
        (prev as any)[key] = oVal;
      } else if (key in pseudo2 && typeof oVal === 'boolean') {
        // skip overriding object of styles with a boolean
      } else if (key in pseudo2 && Array.isArray(oVal)) {
        (prev as any)[key] = mergeDeep(pVal, oVal[1] ?? {});
      } else if (Array.isArray(oVal)) {
        // An array is one value — a gradient's stops, a scrollbar's two colours — so the later one replaces it (bug #265).
        (prev as any)[key] = oVal;
      } else if (ObjectUtils.isObject(pVal) && ObjectUtils.isObject(oVal)) {
        (prev as any)[key] = mergeDeep(pVal, oVal);
      } else {
        (prev as any)[key] = oVal;
      }
    });

    return prev;
  }, {} as T);
}
