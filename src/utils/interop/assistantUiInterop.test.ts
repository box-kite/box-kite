import { describe, expect, it } from 'vitest';
import AssistantUiInterop from './assistantUiInterop';

describe('AssistantUiInterop.toSpec', () => {
  it('renames the one field the two shapes disagree about', () => {
    const spec = AssistantUiInterop.toSpec({ root: { component: 'Flex', props: { gap: 4 }, key: 'k1' } });

    expect(spec).toEqual([{ type: 'Flex', key: 'k1', props: { gap: 4 } }]);
  });

  it('keeps a bare string child, which their nodes allow and ours already did', () => {
    const spec = AssistantUiInterop.toSpec({ root: { component: 'P', children: ['Revenue is up.', { component: 'Span' }] } });

    expect(spec[0].children).toEqual(['Revenue is up.', { type: 'Span' }]);
  });

  // Several roots are several roots: wrapping them in a container nobody asked for would change the layout.
  it('gives back one node per root rather than inventing a parent', () => {
    expect(AssistantUiInterop.toSpec({ root: [{ component: 'H2' }, { component: 'P' }] })).toHaveLength(2);
  });

  it('answers nothing for a spec that has not arrived', () => {
    expect(AssistantUiInterop.toSpec(null)).toEqual([]);
    expect(AssistantUiInterop.toSpec({ root: { props: {} } as never })).toEqual([]);
  });
});

describe('AssistantUiInterop.fromSpec', () => {
  it('carries a plain tree across unchanged but for the name', () => {
    const { spec, losses } = AssistantUiInterop.fromSpec({
      type: 'Flex',
      props: { gap: 4 },
      children: [{ type: 'H2', children: 'Revenue' }],
    });

    expect(spec).toEqual({ root: [{ component: 'Flex', props: { gap: 4 }, children: [{ component: 'H2', children: ['Revenue'] }] }] });
    expect(losses).toEqual([]);
  });

  it('writes a number or a boolean child as the text their nodes take', () => {
    expect(AssistantUiInterop.fromSpec({ type: 'P', children: [42, true] }).spec.root).toEqual([
      { component: 'P', children: ['42', 'true'] },
    ]);
  });

  // Their spec has nowhere to put these three, and a tree that renders half a view in silence is worse
  // than one that says what it could not bring.
  it('reports the data binding it could not carry', () => {
    const { spec, losses } = AssistantUiInterop.fromSpec({ type: 'H2', children: [{ $data: 'stats.revenue' }] });

    expect(losses).toEqual([{ code: 'data-binding', path: 'root.0.children.0' }]);
    expect(spec.root).toEqual([{ component: 'H2' }]);
  });

  it('reports a repeat and an event, and still emits the node around them', () => {
    const { spec, losses } = AssistantUiInterop.fromSpec({ type: 'Button', on: { onClick: 'refresh' }, repeat: { $data: 'rows' } });

    expect(losses).toEqual([
      { code: 'repeat', path: 'root.0' },
      { code: 'event', path: 'root.0.on.onClick' },
    ]);
    expect(spec.root).toEqual([{ component: 'Button' }]);
  });
});
