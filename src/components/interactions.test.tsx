import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Box from '../box';
import { InteractionEvent } from '../utils/interactions/interactionChannel';
import createToastStore from '../utils/toast/toastStore';
import Button from './button';
import GridModel from './dataGrid/models/gridModel';
import Dialog from './dialog';
import Menu from './menu';
import Tabs from './tabs';

/** What `Box.onInteraction` hears from real components: the channel itself is `interactionChannel.test.ts`. */
describe('Box.onInteraction', () => {
  ignoreLogs();

  let heard: InteractionEvent[];
  let stop: () => void;

  beforeEach(() => {
    heard = [];
    stop = Box.onInteraction((event) => heard.push(event));
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
    expect(heard).toEqual([expect.objectContaining({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true })]);
    expect(heard[0].target).toBe(screen.getByRole('button', { name: 'Rename' }));
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

    expect(heard).toEqual([expect.objectContaining({ component: 'tabs', type: 'valueChange', reason: 'click', value: 'activity' })]);
    expect(heard[0].target).toBe(screen.getByRole('tab', { name: 'Activity' }));
  });

  it('hears a menu command, and the menu closing because of it', () => {
    render(
      <Menu trigger={(bag) => <Button {...bag}>Actions</Button>} defaultOpen>
        <Menu.Item>Duplicate</Menu.Item>
      </Menu>,
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));

    expect(heard.map(({ component, type, reason }) => [component, type, reason])).toEqual([
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

    expect(heard).toEqual([]);
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

    expect(heard.map(({ component, type, reason }) => [component, type, reason])).toEqual([
      ['datagrid', 'sortingChange', 'sort'],
      ['datagrid', 'selectedRowKeysChange', 'select'],
      ['datagrid', 'columnVisibilityChange', 'hide'],
    ]);
    expect(heard[0].value).toEqual({ columnKey: 'name', direction: 'ASC' });
    expect(heard.every((event) => event.target === element)).toBe(true);
  });

  it('hears a toast shown and dismissed', () => {
    const store = createToastStore<string>();

    const id = store.add('Saved', { kind: 'success' });
    store.dismiss(id, 'close');

    expect(heard.map(({ type, reason, value }) => [type, reason, value])).toEqual([
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
