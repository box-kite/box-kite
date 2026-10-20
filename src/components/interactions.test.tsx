import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Box from '../box';
import { flushInteractions, InteractionEvent } from '../utils/interactions/interactionChannel';
import createToastStore from '../utils/toast/toastStore';
import Button from './button';
import GridModel from './dataGrid/models/gridModel';
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
    flushInteractions();

    return collected;
  };
  let stop: () => void;

  beforeEach(() => {
    collected = [];
    stop = Box.onInteraction((event) => collected.push(event));
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

    expect(heard().map(({ type, reason, value }) => [type, reason, value])).toEqual([
      ['show', 'success', 'Saved'],
      ['dismiss', 'close', 'Saved'],
    ]);
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
