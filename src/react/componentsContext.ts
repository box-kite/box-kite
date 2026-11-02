import React from 'react';
import { ComponentsRegistry } from '../core';
import assertClientRuntime from './clientRuntime';

assertClientRuntime(React);

// The design the Boxes below resolve their `component` against. Undefined is the app's `Box.components()`.
// Annotated, or the declaration spells the type argument's default as a path into core (bug #307).
const ComponentsContext: React.Context<ComponentsRegistry | undefined> = React.createContext<ComponentsRegistry | undefined>(undefined);

export default ComponentsContext;
