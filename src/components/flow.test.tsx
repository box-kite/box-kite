import { cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import Box, { useClassNames } from '../box';
import { StylesContext } from '../react/useStyles';
import { FlowContainer, flowEdgeStyles, flowNodeSelectedStyles, flowNodeStyles } from './flow';

const styles = () => {
  StylesContext.flushSync();

  return (document.getElementById(StylesContext.styleElementId()) as unknown as HTMLStyleElement).innerText;
};

describe('FlowContainer', () => {
  afterEach(() => {
    cleanup();
  });

  it("declares xyflow's variables from the roles, and the roles from the palette, in a class", () => {
    const { container } = render(<FlowContainer />);

    expect(container.firstElementChild).not.toHaveAttribute('style');
    expect(styles()).toContain('--xy-edge-stroke:var(--flow-edge)');
    expect(styles()).toContain('--xy-edge-stroke-selected:var(--flow-selection)');
    // The base class draws outlines in --outlineColor, so a custom node's focus and selection follow the role.
    expect(styles()).toContain('--outlineColor:var(--flow-selection)');
    expect(styles()).toContain('--flow-selection:var(--accent-500,');
    expect(styles()).toContain('--flow-surface:var(--white,#fff)');
  });

  // The point of the step: nothing inside the canvas changes between the two themes.
  it('redeclares only the roles under the theme selector', () => {
    render(<FlowContainer />);

    expect(styles()).toContain('@scope (.dark) to ([data-theme]){:scope .theme-dark-vars-flow-surface-base-950');
    expect(styles()).toContain('--flow-selection:var(--accent-400,');
  });

  it('takes a role per theme, and a token for both', () => {
    render(<FlowContainer tokens={{ selection: 'sky-500', surface: { light: 'base-50', dark: 'slate-950' } }} />);

    const css = styles();
    expect(css).toContain('--flow-surface:var(--base-50,');
    expect(css).toContain('--flow-surface:var(--slate-950,');
    expect(css.match(/--flow-selection:var\(--sky-500,/g)?.length).toBe(2);
  });

  // The roles are the `flowContainer` style node, so a design repaints every canvas without a prop.
  it('takes its roles from the flowContainer style node', () => {
    const emerald = Box.createComponents({ flowContainer: { styles: { vars: { 'flow-selection': 'emerald-500' } } } });

    render(
      <Box.Components value={emerald}>
        <FlowContainer />
      </Box.Components>,
    );

    const css = styles();
    expect(css).toContain('--flow-selection:var(--emerald-500,');
    expect(css).toContain('--flow-surface:var(--white,#fff)');
  });

  it("keeps the caller's vars and theme beside its own", () => {
    const { container } = render(<FlowContainer vars={{ 'xy-edge-stroke-width': '2' }} theme={{ dark: { p: 2 } }} />);

    const css = styles();
    expect(css).toContain('--xy-edge-stroke-width:2');
    expect(css).toContain('--xy-edge-stroke:var(--flow-edge)');
    expect(css).toContain('.theme-dark-p-2{padding:0.5rem}');
    expect(container.firstElementChild!.className).toContain('theme-dark-vars-flow-surface');
  });

  it('zeroes both transition times inside a static canvas, and only when asked', () => {
    const { container } = render(<FlowContainer motion="static" />);
    const { container: moving } = render(<FlowContainer />);

    expect(styles()).toContain('--transitionTime:0s;--svgTransitionTime:0s');
    expect(container.firstElementChild!.className).not.toBe(moving.firstElementChild!.className);
  });

  it('adds nothing to the accessibility tree', async () => {
    const { container } = render(
      <FlowContainer height={40}>
        <Box>canvas</Box>
      </FlowContainer>,
    );

    expect(container.firstElementChild).not.toHaveAttribute('role');
    await expectNoAxeViolations(container);
  });
});

describe('the custom node and edge styles', () => {
  afterEach(() => {
    cleanup();
  });

  it("put a focus outline on a node under xyflow's focused wrapper, and a selected one beside it", () => {
    render(<Box {...flowNodeStyles} {...flowNodeSelectedStyles} />);

    const css = styles();
    expect(css).toContain('.react-flow__node:focus-visible .');
    expect(css).toContain('-outline-2{outline-width:2px;outline-style:solid}');
    expect(css).toContain('.outline-1{outline-width:1px;outline-style:solid}');
  });

  it('widen a focused edge', () => {
    render(<Box {...flowEdgeStyles} />);

    expect(styles()).toContain('.react-flow__edge:focus-visible .');
  });
});

// Bug #231: a library's own root keeps its margin, display and transitions.
describe('useClassNames({ base: false })', () => {
  it('leaves the reset class out and keeps the rest', () => {
    const withBase = renderHook(() => useClassNames({ p: 2, className: 'react-flow' })).result.current.className.split(' ');
    const without = renderHook(() => useClassNames({ p: 2, className: 'react-flow' }, { base: false })).result.current.className.split(' ');

    expect(withBase[0]).toBe('_b');
    expect(without).toEqual(withBase.slice(1));
    expect(without).toContain('react-flow');
  });
});
