import React from 'react';
import { ComponentsRegistry } from '../core';
import ComponentsContext from './componentsContext';

interface ComponentsProps {
  /** A registry from `Box.createComponents()`. Create it at module scope, or memoise it: its identity is the context value. */
  value: ComponentsRegistry | undefined;
  children: React.ReactNode;
}

/** Every Box below resolves its `component` against `value` instead of the app's `Box.components()`. Renders no element. */
export default function Components({ value, children }: ComponentsProps) {
  return <ComponentsContext.Provider value={value}>{children}</ComponentsContext.Provider>;
}
