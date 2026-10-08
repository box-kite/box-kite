import React, { forwardRef, memo, Ref } from 'react';

// React 19 hands a function component its `ref` as a prop, so a memoized one needs no `forwardRef` under it.
const REF_IS_A_PROP = parseInt(React.version, 10) >= 19;

// Loose on purpose: each caller asserts its own public type, which a generic render cannot be inferred into.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Render = (props: any, ref: any) => React.ReactNode;

/**
 * A component that is a Box: memoized, which skips a leaf whose props are all primitives, and one fiber on
 * React 19. React 18 needs a `forwardRef` under the `memo`, which makes it two.
 */
export default function boxComponent(render: Render, displayName: string) {
  const inner = REF_IS_A_PROP ? (props: { ref?: Ref<unknown> }) => render(props, props.ref ?? null) : forwardRef(render);
  const component = memo(inner);

  (inner as { displayName?: string }).displayName = displayName;
  component.displayName = displayName;

  return component;
}
