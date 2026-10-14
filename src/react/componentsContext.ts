import React from 'react';
import { ComponentsRegistry } from '../core';
import assertClientRuntime from './clientRuntime';

assertClientRuntime(React);

// The design the Boxes below resolve their `component` against. Undefined is the app's `Box.components()`.
const ComponentsContext = React.createContext<ComponentsRegistry | undefined>(undefined);

export default ComponentsContext;
