import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { catalog } from './catalog';
import Button from './components/button';
import { Sparkline } from './components/chart';
import DashboardGrid, { Widget } from './components/dashboard';
import DataGrid from './components/dataGrid';
import Flex from './components/flex';
import { H2, Link, P } from './components/semantics';
import SpecRenderer, { createSpecRegistry, renderSpec, specSchema } from './spec';
import { renderToStaticMarkup } from './ssg';
import type { SpecIssue } from './utils/spec/specTypes';

/**
 * The whole loop, end to end: the catalog says what may be built, `specSchema()` turns that into the
 * constraint a model generates under, and `<SpecRenderer>` renders what came back as real Box
 * components. Everything else in this file is what happens when what came back is wrong or half-written.
 */
const ALLOWED = ['Flex', 'H2', 'P', 'Button', 'Sparkline', 'Link'];
const STYLE_PROPS = ['d', 'gap', 'p', 'bgColor', 'color', 'fontSize'];

const box = catalog({ include: ALLOWED, styleProps: STYLE_PROPS });

const registry = createSpecRegistry({ catalog: box, components: { Flex, H2, P, Button, Sparkline, Link } });

const DASHBOARD = {
  type: 'Flex',
  props: { d: 'column', gap: 4, p: 4, bgColor: 'sky-500/10' },
  children: [
    { type: 'H2', props: { fontSize: 24 }, children: ['Revenue'] },
    { type: 'Sparkline', props: { data: [3, 5, 4, 9] } },
    { type: 'P', props: { color: 'slate-500' }, children: [{ $data: 'summary' }] },
  ],
};

describe('@box-kite/react/spec', () => {
  it('renders a generated tree as the components the app registered', () => {
    render(<SpecRenderer registry={registry} spec={DASHBOARD} data={{ summary: 'Up 12% this week' }} />);

    const heading = screen.getByRole('heading', { level: 2 });

    expect(heading).toHaveTextContent('Revenue');
    // The engine's class, so the node really went through Box rather than through a plain element.
    expect(heading.className).toContain('_b');
    expect(screen.getByText('Up 12% this week')).toBeInTheDocument();
  });

  it('keeps a colour the palette has and drops one it has not', () => {
    const { container } = render(
      <SpecRenderer registry={registry} spec={{ type: 'Flex', props: { bgColor: 'sky-500/40' }, children: ['ok'] }} />,
    );
    const invented = renderSpec({ type: 'Flex', props: { bgColor: '#ff00ff' } }, { registry });

    expect(container.firstElementChild?.className).toContain('bgColor');
    expect(invented.issues).toEqual([expect.objectContaining({ code: 'invalid-prop', prop: 'bgColor' })]);
  });

  /**
   * The catalog leaves HTML attributes out, so a generated `<Link>` has nowhere to put an `href` until
   * the app says where one may point. That is the shape of every escape hatch here: the app narrows the
   * schema, and the renderer enforces whatever it narrowed it to.
   */
  it('takes the attributes an app opened up, to the grammar the app opened them up with', () => {
    const safe = createSpecRegistry({
      catalog: box,
      components: {
        Link: {
          component: Link,
          props: {
            ...box.components.Link.props,
            properties: {
              ...box.components.Link.props.properties,
              props: {
                type: 'object',
                properties: { href: { type: 'string', pattern: '^(?:/|https://)' } },
                additionalProperties: false,
              },
            },
          },
        },
      },
    });
    const link = (href: string) => ({ type: 'Link', props: { props: { href } }, children: ['Open'] });

    render(<SpecRenderer registry={safe} spec={link('/reports')} />);

    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/reports');
    expect(renderSpec(link('javascript:alert(1)'), { registry: safe }).issues[0]).toMatchObject({ code: 'invalid-prop' });
  });

  it('renders a static spec on a server, with the CSS it needs', () => {
    const html = renderToStaticMarkup(<SpecRenderer registry={registry} spec={DASHBOARD} data={{ summary: 'Steady' }} />, false);

    expect(html.html).toContain('Revenue');
    expect(html.html).toContain('<svg');
    expect(html.styles).toContain('background-color');
  });

  /** What `streamObject` hands a UI: the same object, a few more characters of it each time. */
  describe('arriving a piece at a time', () => {
    const repair = (prefix: string) => {
      const stack: string[] = [];
      let inString = false;
      let escaped = false;

      for (const character of prefix) {
        if (escaped) escaped = false;
        else if (character === '\\' && inString) escaped = true;
        else if (character === '"') inString = !inString;
        else if (!inString && (character === '{' || character === '[')) stack.push(character === '{' ? '}' : ']');
        else if (!inString && (character === '}' || character === ']')) stack.pop();
      }

      const closed = (inString ? `${prefix}"` : prefix).replace(/[,\s]+$/, '').replace(/:$/, ':null');

      return closed + stack.reverse().join('');
    };

    it('renders every partial a stream can produce, and never throws on one', () => {
      const text = JSON.stringify(DASHBOARD);
      const frames = Array.from({ length: text.length }, (_, index) => repair(text.slice(0, index + 1)))
        .map((candidate) => {
          try {
            return JSON.parse(candidate);
          } catch {
            return null;
          }
        })
        .filter((frame) => frame !== null);

      // A prefix that parses at all is a frame a real partial parser would hand the renderer, and there
      // are hundreds of them in one small dashboard.
      expect(frames.length).toBeGreaterThan(100);

      const { rerender } = render(<SpecRenderer registry={registry} spec={frames[0]} data={{ summary: 'Up' }} />);

      for (const frame of frames) {
        expect(() => rerender(<SpecRenderer registry={registry} spec={frame} data={{ summary: 'Up' }} />)).not.toThrow();
      }

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Revenue');
    });
  });

  /**
   * The flagship shape: a dashboard, where the two things a dashboard *is* — where each widget sits and
   * what is in it — are object props no extraction could describe. Without their contracts the catalog
   * could place a `<DashboardGrid>` and neither lay it out nor put a grid in it.
   */
  describe('a generated dashboard', () => {
    const allowed = catalog({ include: ['DashboardGrid', 'Widget', 'DataGrid', 'Sparkline'], styleProps: ['gap', 'height'] });
    const dashboard = createSpecRegistry({ catalog: allowed, components: { DashboardGrid, Widget, DataGrid, Sparkline } });

    const GENERATED = {
      type: 'DashboardGrid',
      props: {
        label: 'Sales',
        columns: 12,
        defaultLayout: {
          version: 1,
          columns: 12,
          items: [
            { id: 'revenue', x: 0, y: 0, w: 6, h: 2 },
            { id: 'orders', x: 6, y: 0, w: 6, h: 2 },
          ],
        },
      },
      children: [
        {
          type: 'Widget',
          props: { id: 'revenue', name: 'Revenue' },
          slots: { title: ['Revenue'] },
          children: [{ type: 'Sparkline', props: { data: { $data: 'revenue' } } }],
        },
        {
          type: 'Widget',
          props: { id: 'orders', name: 'Orders' },
          slots: { title: ['Orders'] },
          children: [
            {
              type: 'DataGrid',
              props: {
                data: { $data: 'orders' },
                def: {
                  rowKey: 'id',
                  columns: [
                    { key: 'customer', header: 'Customer' },
                    { key: 'total', header: 'Total', align: 'end', aggregate: 'sum' },
                  ],
                },
              },
            },
          ],
        },
      ],
    };

    const data = {
      revenue: [3, 5, 4, 9],
      orders: [
        { id: 1, customer: 'Ana', total: 42.5 },
        { id: 2, customer: 'Bo', total: 17 },
      ],
    };

    it('lays the widgets out and fills them, from JSON alone', () => {
      const issues: SpecIssue[] = [];

      render(<SpecRenderer registry={dashboard} spec={GENERATED} data={data} onIssues={(reported) => issues.push(...reported)} />);

      expect(issues).toEqual([]);
      expect(screen.getByRole('list', { name: 'Sales' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Revenue' })).toBeInTheDocument();
      // The grid's own columns and one of the rows the host supplied, so `def` and `data` both arrived.
      expect(screen.getByRole('columnheader', { name: /Customer/ })).toBeInTheDocument();
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    it('drops a layout a dashboard could not be, and renders the rest of the tree', () => {
      const issues: SpecIssue[] = [];
      const spec = { ...GENERATED, props: { ...GENERATED.props, defaultLayout: { version: 1, columns: 12, items: [{ id: 'revenue' }] } } };

      render(<SpecRenderer registry={dashboard} spec={spec} data={data} onIssues={(reported) => issues.push(...reported)} />);

      expect(issues.map((issue) => issue.code)).toEqual(['invalid-prop']);
      expect(screen.getByRole('heading', { name: 'Revenue' })).toBeInTheDocument();
    });

    it('refuses a column the grid could not draw, before anything renders', () => {
      const validator = z.fromJSONSchema(specSchema(dashboard, { bindings: true }) as never);

      expect(validator.safeParse(GENERATED).success).toBe(true);
      expect(validator.safeParse({ type: 'DataGrid', props: { def: { columns: [{ header: 'Total' }] } } }).success).toBe(false);
      expect(validator.safeParse({ type: 'DataGrid', props: { def: { columns: [{ key: 'total', aggregate: 'median' }] } } }).success).toBe(
        false,
      );
      // `def` is required, and a catalog that dropped the prop dropped that with it.
      expect(validator.safeParse({ type: 'DataGrid', props: {} }).success).toBe(false);
    });
  });

  /**
   * The constraint and the renderer are two halves of one contract, so the test is that a tree the
   * schema accepts is a tree the renderer renders — with the same registry answering both.
   */
  describe('specSchema() as the constraint a model generates under', () => {
    const validator = z.fromJSONSchema(specSchema(registry, { bindings: true }) as never);

    it('accepts the spec the renderer renders', () => {
      expect(validator.safeParse(DASHBOARD).success).toBe(true);
    });

    it('refuses what the renderer would have had to drop', () => {
      expect(validator.safeParse({ type: 'DataGrid' }).success).toBe(false);
      expect(validator.safeParse({ type: 'Flex', props: { bgColor: '#ff00ff' } }).success).toBe(false);
      expect(validator.safeParse({ type: 'Sparkline', props: {} }).success).toBe(false);
      expect(validator.safeParse({ type: 'H2', on: { onClick: 'save' } }).success).toBe(false);
    });

    it('describes the components it was given and nothing else', () => {
      const names = Object.keys(specSchema(registry).$defs ?? {}).filter((name) => ALLOWED.includes(name));

      expect(names.sort()).toEqual([...ALLOWED].sort());
    });
  });
});
