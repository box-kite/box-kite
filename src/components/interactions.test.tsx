import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Box, { InteractionEvent } from '../box';
import { QuietInteractions, ReportInteractions } from '../react/a11y/interactions';
import createToastStore from '../utils/toast/toastStore';
import Button from './button';
import DataGridListValue from './dataGrid/components/dataGridListValue';
import GridModel from './dataGrid/models/gridModel';
import RowModel from './dataGrid/models/rowModel';
import Dialog from './dialog';
import Dropdown from './dropdown';
import Form from './form';
import Menu from './menu';
import Tabs from './tabs';
import Tooltip from './tooltip';

/** What `Box.onInteraction` hears from real components: the channel itself is `interactionChannel.test.ts`. */
describe('Box.onInteraction', () => {
  ignoreLogs();

  let collected: InteractionEvent[];
  // Delivery is a background task, so a test reads what is queued by delivering it now.
  const heard = () => {
    Box.flushInteractions();

    return collected;
  };
  let stop: () => void;

  beforeEach(async () => {
    collected = [];
    stop = Box.onInteraction((event) => collected.push(event));
    // The half that watches the page is fetched with the first subscription.
    await vi.dynamicImportSettled();
  });

  afterEach(() => {
    stop();
    Box.configure({ componentAttribute: false });
    cleanup();
  });

  it('hears a dialog open from its trigger, beside the callback the app passed', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog trigger={(bag) => <Button {...bag}>Rename</Button>} onOpenChange={onOpenChange}>
        <Dialog.Title>Rename this view</Dialog.Title>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' }));
    expect(heard()).toEqual([expect.objectContaining({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true })]);
    expect(heard()[0].target).toBe(screen.getByRole('button', { name: 'Rename' }));
  });

  it('hears a moment the app reports itself, from a handler of its own in props', () => {
    render(
      <Button props={{ onMouseEnter: (event) => Box.reportInteraction({ component: 'pricing-cta', type: 'mouseEnter', event }) }}>
        Pricing
      </Button>,
    );

    fireEvent.mouseEnter(screen.getByRole('button'));

    expect(heard()).toEqual([
      expect.objectContaining({ kind: 'custom', component: 'pricing-cta', type: 'mouseEnter', event: expect.any(MouseEvent) }),
    ]);
    expect(heard()[0].target).toBe(screen.getByRole('button'));
  });

  it('hears a tab chosen, with the tab as its target', () => {
    render(
      <Tabs defaultValue="overview">
        <Tabs.List label="Project">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">Who is on it</Tabs.Panel>
        <Tabs.Panel value="activity">What changed</Tabs.Panel>
      </Tabs>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(heard()).toEqual([expect.objectContaining({ component: 'tabs', type: 'valueChange', reason: 'click', value: 'activity' })]);
    expect(heard()[0].target).toBe(screen.getByRole('tab', { name: 'Activity' }));
  });

  it('hears a menu command, and the menu closing because of it', () => {
    render(
      <Menu trigger={(bag) => <Button {...bag}>Actions</Button>} defaultOpen>
        <Menu.Item>Duplicate</Menu.Item>
      </Menu>,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    expect(heard().map(({ component, type, reason }) => [component, type, reason])).toEqual([
      ['menu.item', 'select', 'select'],
      ['menu', 'openChange', 'select'],
    ]);
    expect(heard()[0].value).toBe('Duplicate');
  });

  it('says nothing for a component that never changed', () => {
    render(
      <Dialog trigger={(bag) => <Button {...bag}>Rename</Button>}>
        <Dialog.Title>Rename this view</Dialog.Title>
      </Dialog>,
    );

    expect(heard()).toEqual([]);
  });

  it('hears what the DataGrid does, including the changes it has no callback for', () => {
    const grid = new GridModel<{ id: number; name: string }>(
      { data: [{ id: 1, name: 'Ada' }], def: { rowKey: 'id', columns: [{ key: 'name', header: 'Name' }], rowSelection: true } },
      vi.fn(),
    );
    const element = document.createElement('div');
    grid.setSizingElement(element);

    grid.setSortColumn('name');
    grid.toggleRowSelection(1);
    grid.toggleColumnVisibility('name');

    expect(heard().map(({ component, type, reason }) => [component, type, reason])).toEqual([
      ['datagrid', 'sortingChange', 'sort'],
      ['datagrid', 'selectedRowKeysChange', 'select'],
      ['datagrid', 'columnVisibilityChange', 'hide'],
    ]);
    expect(heard()[0].value).toEqual({ columnKey: 'name', direction: 'ASC' });
    // Narrowed by kind, component and type, the value is typed: this line is the compile-time half of the test.
    const sorted = heard()[0];
    if (sorted.kind === 'change' && sorted.component === 'datagrid' && sorted.type === 'sortingChange') {
      expect(sorted.value?.direction).toBe('ASC');
    }
    expect(heard().every((event) => event.target === element)).toBe(true);
  });

  it('hears a dropdown open and close once per change, with why', () => {
    render(
      <Dropdown<string>>
        <Dropdown.Item value="a">Alpha</Dropdown.Item>
        <Dropdown.Item value="b">Beta</Dropdown.Item>
      </Dropdown>,
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Beta' }));

    expect(heard().map(({ component, type, reason, value }) => [component, type, reason, value])).toEqual([
      ['dropdown', 'openChange', 'trigger', true],
      ['dropdown', 'valueChange', 'select', ['b']],
      ['dropdown', 'openChange', 'select', false],
    ]);
  });

  it('tells which fields a form sent, never what was typed into them', () => {
    render(
      <Form onSubmit={() => undefined}>
        <input name="email" defaultValue="ada@example.com" />
        <input name="password" type="password" defaultValue="hunter2" />
      </Form>,
    );

    fireEvent.submit(document.querySelector('form')!);

    expect(heard()).toEqual([expect.objectContaining({ component: 'form', type: 'submit', value: ['email', 'password'] })]);
    expect(JSON.stringify(heard()[0].value)).not.toContain('hunter2');
  });

  it('says nothing for a tooltip shown on hover', () => {
    render(<Tooltip content="Saves the draft">{(trigger) => <Button {...trigger}>Save</Button>}</Tooltip>);

    fireEvent.pointerEnter(screen.getByRole('button'));
    fireEvent.focus(screen.getByRole('button'));

    expect(heard()).toEqual([]);
  });

  it('reports a column pinned from its menu, which the grid never heard as a change', () => {
    const grid = new GridModel<{ id: number; name: string }>(
      { data: [], def: { rowKey: 'id', columns: [{ key: 'name', header: 'Name' }] } },
      vi.fn(),
    );

    grid.columns.value.flat.find((column) => column.key === 'name')!.pinColumn('START');

    expect(heard()).toEqual([expect.objectContaining({ component: 'datagrid', type: 'columnPinChange', reason: 'pin', value: 'START' })]);
  });

  it('reports a marked block, not every move of the current cell', () => {
    const grid = new GridModel<{ id: number; a: string; b: string }>(
      {
        data: [{ id: 1, a: 'x', b: 'y' }],
        def: {
          rowKey: 'id',
          columns: [
            { key: 'a', header: 'A' },
            { key: 'b', header: 'B' },
          ],
          rangeSelection: true,
        },
      },
      vi.fn(),
    );

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(0, 1);
    grid.range.setCurrent(0, 0, true);

    expect(heard().map(({ type, reason }) => [type, reason])).toEqual([['rangeChange', 'extend']]);
  });

  it('reports show-all in the columns panel once, however many columns it shows', () => {
    const grid = new GridModel<{ id: number; a: string; b: string }>(
      {
        data: [],
        def: {
          rowKey: 'id',
          columns: [
            { key: 'a', header: 'A' },
            { key: 'b', header: 'B' },
          ],
        },
      },
      vi.fn(),
    );
    grid.quietly(() => ['a', 'b'].forEach((key) => grid.toggleColumnVisibility(key)));

    grid.columnVisibility.setAll(true);

    expect(heard()).toEqual([
      expect.objectContaining({ type: 'columnVisibilityChange', reason: 'show-all', details: { columnKeys: ['a', 'b'] } }),
    ]);
  });

  it('hears a toast shown and dismissed', () => {
    const store = createToastStore<string>();

    const id = store.add('Saved', { kind: 'success' });
    store.dismiss(id, 'close');

    expect(heard().map(({ type, reason, value, source }) => [type, reason, value, source])).toEqual([
      ['show', 'success', 'Saved', 'app'],
      ['dismiss', 'close', 'Saved', 'user'],
    ]);
  });

  it('names a menu command by its value, and a checkbox item by the item it is', () => {
    render(
      <Menu trigger={(bag) => <Button {...bag}>View</Button>} defaultOpen>
        <Menu.Item value="duplicate-view">Duplicate</Menu.Item>
        <Menu.CheckboxItem>Show grid</Menu.CheckboxItem>
      </Menu>,
    );

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Show grid' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    expect(heard().map(({ component, value, details }) => [component, value, details])).toEqual([
      ['menu.checkboxItem', true, { item: 'Show grid' }],
      ['menu.item', 'duplicate-view', undefined],
      ['menu', false, undefined],
    ]);
  });

  it("keeps a composite's parts quiet, but not the app's own content rendered inside them", () => {
    const tabs = (
      <Tabs defaultValue="a">
        <Tabs.List label="Inner">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    );
    render(
      <QuietInteractions>
        <div data-testid="part">{tabs}</div>
        <ReportInteractions>
          <div data-testid="app">{tabs}</div>
        </ReportInteractions>
      </QuietInteractions>,
    );

    fireEvent.click(within(screen.getByTestId('part')).getByRole('tab', { name: 'B' }));
    fireEvent.click(within(screen.getByTestId('app')).getByRole('tab', { name: 'B' }));

    expect(heard()).toEqual([expect.objectContaining({ component: 'tabs', value: 'b' })]);
    expect(screen.getByTestId('app').contains(heard()[0].target!)).toBe(true);
  });

  it("hears a column's own Cell in the phone layout, whose sheet keeps the grid's parts quiet", () => {
    const Cell = () => (
      <Tabs defaultValue="a">
        <Tabs.List label="Cell">
          <Tabs.Tab value="a">A</Tabs.Tab>
          <Tabs.Tab value="b">B</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    );
    const grid = new GridModel<{ id: number; name: string }>(
      { data: [{ id: 1, name: 'Ada' }], def: { rowKey: 'id', columns: [{ key: 'name', header: 'Name', Cell }] } },
      vi.fn(),
    );
    render(
      <QuietInteractions>
        <DataGridListValue row={grid.flatRows.value[0] as RowModel<{ id: number; name: string }>} column={grid.columns.value.flat[0]} />
      </QuietInteractions>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'B' }));

    expect(heard()).toEqual([expect.objectContaining({ component: 'tabs', type: 'valueChange', value: 'b' })]);
  });

  it('hears a press and the change it made from one stream, the press first', () => {
    Box.configure({ componentAttribute: true });
    render(
      <Tabs defaultValue="overview">
        <Tabs.List label="Project">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
        </Tabs.List>
      </Tabs>,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }));

    expect(heard().map(({ kind, component, type }) => [kind, component, type])).toEqual([
      ['dom', 'tabs.tab', 'click'],
      ['change', 'tabs', 'valueChange'],
    ]);
    expect(heard()[0].target).toBe(screen.getByRole('tab', { name: 'Activity' }));
  });

  it('hears a press on a plain Button, which reports no change of its own', () => {
    Box.configure({ componentAttribute: true });
    render(<Button>Save</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(heard()).toEqual([expect.objectContaining({ kind: 'dom', component: 'button', type: 'click', details: { interactive: true } })]);
  });

  it('gives a DataGrid change the press behind it, which the model was never handed', () => {
    const grid = new GridModel<{ id: number; name: string }>(
      { data: [{ id: 1, name: 'Ada' }], def: { rowKey: 'id', columns: [{ key: 'name', header: 'Name' }] } },
      vi.fn(),
    );
    render(
      <div role="columnheader" tabIndex={-1} onClick={() => grid.setSortColumn('name')}>
        <span>Name</span>
      </div>,
    );

    fireEvent.click(screen.getByText('Name'));

    expect(heard()).toEqual([expect.objectContaining({ component: 'datagrid', type: 'sortingChange', event: expect.any(MouseEvent) })]);
    expect(heard()[0].target).toBe(screen.getByRole('columnheader'));
  });

  describe('componentAttribute', () => {
    it('marks nothing by default', () => {
      render(<Button>Save</Button>);

      expect(screen.getByRole('button')).not.toHaveAttribute('data-bk');
    });

    it("writes each part's component key, so a delegated listener can name a click", () => {
      Box.configure({ componentAttribute: true });
      render(
        <Box component="widget">
          <Button>Save</Button>
        </Box>,
      );

      expect(screen.getByRole('button')).toHaveAttribute('data-bk', 'button');
      expect(screen.getByRole('button').closest('[data-bk="widget"]')).not.toBeNull();
    });

    it("leaves an app's own data-bk alone", () => {
      Box.configure({ componentAttribute: true });
      render(<Button props={{ 'data-bk': 'save-button' } as object}>Save</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('data-bk', 'save-button');
    });
  });
});
