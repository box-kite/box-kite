import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CatalogSchema } from '../../core';
import { SpecIssue } from '../../utils/spec/specTypes';
import { renderSpec } from './renderSpec';
import { createSpecRegistry } from './specRegistry';
import SpecRenderer from './specRenderer';

/**
 * Components of the test's own rather than Box's: what is under test is the walk, the judgements and the
 * boundaries, and a fake component says what it was handed without a style engine in the way.
 */
function Stack({ gap, children }: { gap?: number; children?: ReactNode }) {
  return (
    <div data-testid="stack" data-gap={gap}>
      {children}
    </div>
  );
}

function Text({ tone, children }: { tone?: string; children?: ReactNode }) {
  return <p data-tone={tone}>{children}</p>;
}

function Action({ label, onPress }: { label?: string; onPress?: (value: string) => void }) {
  return (
    <button type="button" onClick={() => onPress?.('clicked')}>
      {label}
    </button>
  );
}

function Panel({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <section>
      <header>{title}</header>
      {children}
    </section>
  );
}

function Boom({ crash }: { crash?: boolean }) {
  if (crash) throw new Error('boom');

  return <span>fine</span>;
}

function Bare() {
  return <hr />;
}

const object = (properties: Record<string, CatalogSchema>, required?: string[]): CatalogSchema => ({
  type: 'object',
  properties,
  ...(required ? { required } : {}),
  additionalProperties: false,
});

const registry = createSpecRegistry({
  components: {
    Stack: { component: Stack, props: object({ gap: { type: 'number' } }), slots: ['default'] },
    Text: { component: Text, props: object({ tone: { type: 'string', enum: ['muted', 'loud'] } }), slots: ['default'] },
    Action: { component: Action, props: object({ label: { type: 'string' } }), slots: [], events: ['onPress'] },
    Panel: { component: Panel, props: object({}), slots: ['default', 'title'] },
    Boom: { component: Boom, props: object({ crash: { type: 'boolean' } }), slots: [] },
    Bare,
  },
});

const issuesOf = (spec: unknown, options: Parameters<typeof renderSpec>[1] = { registry }) => renderSpec(spec, options).issues;

afterEach(() => vi.restoreAllMocks());

describe('renderSpec', () => {
  it('renders a tree of components, with the props each one allows', () => {
    render(
      <SpecRenderer registry={registry} spec={{ type: 'Stack', props: { gap: 4 }, children: [{ type: 'Text', children: ['Hello'] }] }} />,
    );

    expect(screen.getByTestId('stack')).toHaveAttribute('data-gap', '4');
    expect(screen.getByText('Hello').tagName).toBe('P');
  });

  it('renders nothing for a component the app did not register, and says which one', () => {
    const [issue] = issuesOf({ type: 'DataGrid', props: {} });

    expect(issue.code).toBe('unknown-component');
    expect(issue.component).toBe('DataGrid');
    expect(renderSpec({ type: 'DataGrid' }, { registry }).element).toBeNull();
  });

  it('puts the app’s fallback where a node could not render', () => {
    render(
      <SpecRenderer
        registry={registry}
        spec={{ type: 'Stack', children: [{ type: 'Chart' }] }}
        fallback={(issue) => <b>{issue.component} is not available</b>}
      />,
    );

    expect(screen.getByText('Chart is not available')).toBeInTheDocument();
  });

  describe('the props a node may set', () => {
    it('drops a prop the component has not got', () => {
      const [issue] = issuesOf({ type: 'Stack', props: { onMouseEnter: 'x' } });

      expect(issue).toMatchObject({ code: 'unknown-prop', prop: 'onMouseEnter' });
    });

    it('drops a value the schema refuses and keeps the rest of the node', () => {
      render(<SpecRenderer registry={registry} spec={{ type: 'Text', props: { tone: 'screaming' }, children: ['Still here'] }} />);

      expect(screen.getByText('Still here')).not.toHaveAttribute('data-tone');
      expect(issuesOf({ type: 'Text', props: { tone: 'screaming' } })[0]).toMatchObject({ code: 'invalid-prop', prop: 'tone' });
    });

    it('sets no props at all on a component registered without a schema', () => {
      expect(issuesOf({ type: 'Bare', props: { size: 1 } })[0]).toMatchObject({ code: 'unknown-prop', prop: 'size' });
    });

    it('refuses the props that are the way in — a raw handler, inner HTML, a prototype', () => {
      const dangerous = {
        type: 'Text',
        props: JSON.parse(
          '{ "onClick": "alert(1)", "dangerouslySetInnerHTML": { "__html": "<script>" }, "__proto__": { "polluted": true } }',
        ),
      };

      expect(issuesOf(dangerous).every((issue) => issue.code === 'unknown-prop')).toBe(true);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });

  describe('children and slots', () => {
    it('fills a named slot, and refuses one the component has not got', () => {
      render(
        <SpecRenderer
          registry={registry}
          spec={{ type: 'Panel', slots: { title: ['Costs'], footer: ['nope'] }, children: [{ type: 'Text', children: ['Body'] }] }}
        />,
      );

      expect(screen.getByRole('banner')).toHaveTextContent('Costs');
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(issuesOf({ type: 'Panel', slots: { footer: ['nope'] } })[0]).toMatchObject({ code: 'unknown-slot' });
    });

    it('refuses children on a component with nowhere to put them', () => {
      expect(issuesOf({ type: 'Action', children: ['Save'] })[0]).toMatchObject({ code: 'unknown-slot', component: 'Action' });
    });

    it('renders text as text, and refuses a child that is neither node nor text', () => {
      render(<SpecRenderer registry={registry} spec={{ type: 'Stack', children: ['Plain ', 42] }} />);

      expect(screen.getByTestId('stack')).toHaveTextContent('Plain 42');
      expect(issuesOf({ type: 'Stack', children: [['nested']] })[0]).toBeUndefined();
      expect(issuesOf({ type: 'Stack', children: [3n as unknown as string] })[0]).toMatchObject({ code: 'invalid-child' });
    });
  });

  describe('data', () => {
    const data = { user: { name: 'Ada' }, rows: [{ label: 'One' }, { label: 'Two' }], gap: 6 };

    it('reads a prop and a child out of the data it was given', () => {
      render(
        <SpecRenderer
          registry={registry}
          data={data}
          spec={{ type: 'Stack', props: { gap: { $data: 'gap' } }, children: [{ $data: '/user/name' }] }}
        />,
      );

      expect(screen.getByTestId('stack')).toHaveAttribute('data-gap', '6');
      expect(screen.getByTestId('stack')).toHaveTextContent('Ada');
    });

    it('validates what a reference resolved to, not what the spec wrote', () => {
      const [issue] = issuesOf({ type: 'Stack', props: { gap: { $data: 'user.name' } } }, { registry, data });

      expect(issue).toMatchObject({ code: 'invalid-prop', prop: 'gap' });
    });

    it('reports a reference that resolved to nothing and keeps the node', () => {
      const [issue] = issuesOf({ type: 'Stack', props: { gap: { $data: 'missing.deep' } } }, { registry, data });

      expect(issue).toMatchObject({ code: 'unresolved-data' });
      expect(renderSpec({ type: 'Stack', props: { gap: { $data: 'missing' } } }, { registry, data }).element).not.toBeNull();
    });

    it('repeats a node once per item, with $item and $index in scope', () => {
      render(
        <SpecRenderer
          registry={registry}
          data={data}
          spec={{
            type: 'Stack',
            children: [{ type: 'Text', repeat: { $data: 'rows' }, children: [{ $index: true }, ': ', { $item: 'label' }] }],
          }}
        />,
      );

      expect(screen.getByText('0: One')).toBeInTheDocument();
      expect(screen.getByText('1: Two')).toBeInTheDocument();
    });

    it('refuses a repeat over something that is not an array, and an $item outside one', () => {
      expect(issuesOf({ type: 'Text', repeat: { $data: 'user' } }, { registry, data })[0]).toMatchObject({ code: 'invalid-repeat' });
      expect(issuesOf({ type: 'Stack', props: { gap: { $item: 'x' } } }, { registry, data })[0]).toMatchObject({ code: 'unresolved-data' });
    });
  });

  describe('actions', () => {
    it('binds an event the catalog names, and hands the host what fired it', async () => {
      const onAction = vi.fn();

      render(
        <SpecRenderer
          registry={registry}
          onAction={onAction}
          spec={{ type: 'Action', props: { label: 'Refresh' }, on: { onPress: { action: 'refresh', payload: { id: 7 } } } }}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

      expect(onAction).toHaveBeenCalledWith('refresh', expect.objectContaining({ payload: { id: 7 }, args: ['clicked'], prop: 'onPress' }));
    });

    it('refuses to bind a prop the catalog does not call an event', () => {
      expect(issuesOf({ type: 'Stack', on: { onPress: 'refresh' } })[0]).toMatchObject({ code: 'unknown-event' });
    });
  });

  describe('a spec that is still arriving', () => {
    it('renders what is there and reports nothing about what is not', () => {
      const partial = { type: 'Stack', props: { gap: 2 }, children: [{ type: 'Text', children: ['Half'] }, {}] };

      expect(issuesOf(partial)).toEqual([]);
      render(<SpecRenderer registry={registry} spec={partial} />);
      expect(screen.getByText('Half')).toBeInTheDocument();
    });

    it('grows as the object does, over the renders a stream produces', () => {
      const frames = [
        {},
        { type: 'Stack' },
        { type: 'Stack', props: { gap: 1 }, children: [{}] },
        { type: 'Stack', props: { gap: 1 }, children: [{ type: 'Te' }] },
        { type: 'Stack', props: { gap: 1 }, children: [{ type: 'Text', props: { tone: 'mut' } }] },
        { type: 'Stack', props: { gap: 1 }, children: [{ type: 'Text', props: { tone: 'muted' }, children: ['Done'] }] },
      ];
      const { rerender } = render(<SpecRenderer registry={registry} spec={frames[0]} />);

      for (const frame of frames) rerender(<SpecRenderer registry={registry} spec={frame} />);

      expect(screen.getByText('Done')).toHaveAttribute('data-tone', 'muted');
    });
  });

  describe('the limits a generated tree needs and a written one does not', () => {
    const deep = (depth: number): object => ({ type: 'Stack', children: depth ? [deep(depth - 1)] : [] });

    it('stops at a depth, and reports it once', () => {
      const issues = issuesOf(deep(10), { registry, maxDepth: 3 });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('too-deep');
    });

    it('stops at a node count, and reports that once however many nodes follow', () => {
      const wide = { type: 'Stack', children: Array.from({ length: 20 }, () => ({ type: 'Text' })) };
      const issues = issuesOf(wide, { registry, maxNodes: 5 });

      expect(issues).toHaveLength(1);
      expect(issues[0].code).toBe('too-many-nodes');
    });
  });

  describe('a node that throws', () => {
    it('loses that node and nothing else', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SpecRenderer
          registry={registry}
          fallback={() => <b>unavailable</b>}
          spec={{
            type: 'Stack',
            children: [
              { type: 'Boom', props: { crash: true } },
              { type: 'Text', children: ['Survived'] },
            ],
          }}
        />,
      );

      expect(screen.getByText('unavailable')).toBeInTheDocument();
      expect(screen.getByText('Survived')).toBeInTheDocument();
    });

    it('reports it, and tries the node again on the next spec', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const onIssues = vi.fn();
      const { rerender } = render(<SpecRenderer registry={registry} onIssues={onIssues} spec={{ type: 'Boom', props: { crash: true } }} />);

      expect(onIssues).toHaveBeenCalledWith([expect.objectContaining({ code: 'render-error', component: 'Boom' })]);

      rerender(<SpecRenderer registry={registry} onIssues={onIssues} spec={{ type: 'Boom', props: { crash: false } }} />);

      expect(screen.getByText('fine')).toBeInTheDocument();
    });
  });

  it('tells the host what did not render, once per set of issues', () => {
    const onIssues = vi.fn<(issues: SpecIssue[]) => void>();
    const spec = { type: 'Stack', children: [{ type: 'Chart' }] };
    const { rerender } = render(<SpecRenderer registry={registry} onIssues={onIssues} spec={spec} />);

    rerender(<SpecRenderer registry={registry} onIssues={onIssues} spec={spec} />);

    expect(onIssues).toHaveBeenCalledTimes(1);
    expect(onIssues.mock.calls[0][0]).toEqual([expect.objectContaining({ code: 'unknown-component', path: 'spec.children.0' })]);
  });
});
