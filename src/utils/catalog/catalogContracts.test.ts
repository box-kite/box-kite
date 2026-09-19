import { describe, expect, it } from 'vitest';
import type { CatalogSchema } from '../../core';
import SpecValidate from '../spec/specValidate';
import CatalogContracts from './catalogContracts';
import catalogManifest from './catalogManifest';

const { CONTRACTS } = CatalogContracts;

/** A contract's prop, judged by the validator the spec renderer uses — the point being that it is the same one. */
function accepts(component: string, prop: string, value: unknown): boolean {
  return SpecValidate.matches(CONTRACTS[component].props[prop] as CatalogSchema, value);
}

const layout = { version: 1, columns: 12, items: [{ id: 'revenue', x: 0, y: 0, w: 6, h: 2 }] };

describe('CatalogContracts', () => {
  it('writes for components the manifest has, so a rename cannot leave one behind', () => {
    for (const name of Object.keys(CONTRACTS)) expect(catalogManifest.components[name]).toBeDefined();
  });

  it('describes only props the generated entry had to drop', () => {
    for (const [name, contract] of Object.entries(CONTRACTS)) {
      for (const prop of Object.keys(contract.props)) expect(catalogManifest.components[name].props[prop]).toBeUndefined();
    }
  });

  describe('a dashboard layout', () => {
    it('takes one a drag would report', () => {
      expect(accepts('DashboardGrid', 'layout', layout)).toBe(true);
      expect(accepts('DashboardGrid', 'defaultLayout', layout)).toBe(true);
    });

    it('refuses a place with no size and a field nobody declared', () => {
      expect(accepts('DashboardGrid', 'layout', { ...layout, items: [{ id: 'revenue', x: 0, y: 0 }] })).toBe(false);
      expect(accepts('DashboardGrid', 'layout', { ...layout, title: 'Sales' })).toBe(false);
    });

    it('takes a column count either way it is written', () => {
      expect(accepts('DashboardGrid', 'columns', 12)).toBe(true);
      expect(accepts('DashboardGrid', 'columns', { xs: 1, md: 6, xxl: 12 })).toBe(true);
      expect(accepts('DashboardGrid', 'columns', { huge: 12 })).toBe(false);
    });
  });

  describe('a grid definition', () => {
    it('takes the columns and the flags a generated grid is made of', () => {
      const def = {
        rowKey: 'id',
        title: 'Orders',
        footer: true,
        columns: [
          { key: 'customer', header: 'Customer' },
          { key: 'total', header: 'Total', align: 'end', aggregate: 'sum' },
        ],
      };

      expect(accepts('DataGrid', 'def', def)).toBe(true);
    });

    it('refuses a column with no key, an aggregate that is not one, and a renderer no JSON could carry', () => {
      expect(accepts('DataGrid', 'def', { columns: [{ header: 'Customer' }] })).toBe(false);
      expect(accepts('DataGrid', 'def', { columns: [{ key: 'total', aggregate: 'median' }] })).toBe(false);
      expect(accepts('DataGrid', 'def', { columns: [{ key: 'total', Cell: 'StatusCell' }] })).toBe(false);
    });

    it('requires the columns, since a grid with none is not a grid', () => {
      expect(accepts('DataGrid', 'def', { rowKey: 'id' })).toBe(false);
      expect(CONTRACTS.DataGrid.required).toEqual(['def']);
    });

    it('takes rows as the host wrote them — the one prop in the catalog that carries values', () => {
      expect(accepts('DataGrid', 'data', [{ id: 1, customer: 'Ana', total: 42.5 }])).toBe(true);
      expect(accepts('DataGrid', 'data', [42])).toBe(false);
    });
  });
});
