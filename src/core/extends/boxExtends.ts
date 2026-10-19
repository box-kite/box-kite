import { BoxStyle } from '../coreTypes';
import getDefaultEngine from '../engine/defaultEngine';
import { Keyframes } from '../engine/keyframes';
import Palette from '../palette';
import { Components } from './boxComponents';
import createComponentsRegistry from './componentsRegistry';

// Thin delegation to the default style engine — every registry these functions used to own
// (variables, extended props, component styles) now lives on the engine instance.
namespace BoxExtends {
  export function extend<TProps extends Record<string, BoxStyle[]>, TPropTypes extends Record<string, BoxStyle[]>>(
    variables: Record<string, string>,
    extendedProps: TProps,
    extendedPropTypes: TPropTypes,
  ) {
    return getDefaultEngine().extend(variables, extendedProps, extendedPropTypes);
  }

  export function keyframes<T extends Keyframes>(keyframes: T) {
    return getDefaultEngine().keyframes(keyframes);
  }

  export function getComponentsStyles(): Components {
    return getDefaultEngine().getComponentsStyles();
  }

  export function components<T extends Components>(components: T, options?: { design?: string }) {
    return getDefaultEngine().components(components, options);
  }

  /** `vars={Box.palette({ accent: 'orange', base: 'stone' })}`: the components' two colour families, pointed elsewhere. */
  export const palette = Palette.point;

  /** A design for one subtree: registered nowhere, applied by `<Box.Components value>` or `<Box.Theme components>`. */
  export const createComponents = createComponentsRegistry;
}

export default BoxExtends;
