import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs, installDialogPlatform, installPopoverApi } from '../../dev/tests';
import createToastStore from '../utils/toast/toastStore';
import Accordion from './accordion';
import Button from './button';
import Calendar from './calendar';
import DashboardGrid, { Widget } from './dashboard';
import Dialog, { AlertDialog } from './dialog';
import Menu from './menu';
import Popover from './popover';
import RadioGroup from './radioGroup';
import Slider from './slider';
import Tabs from './tabs';
import Toaster from './toaster';
import Tooltip from './tooltip';

/**
 * A caller's `ref` on a component that keeps one of its own (bug #311). React 19 hands it over as a prop, so a
 * `...rest` spread after the component's own `ref={…}` replaced it: the caller got the element and the
 * component lost it. Each test asserts both halves — the caller's element, and the behaviour the
 * component's own ref is there for.
 */
describe('A ref from the caller', () => {
  ignoreLogs();

  let uninstall: (() => void) | undefined;

  afterEach(() => {
    uninstall?.();
    uninstall = undefined;
    cleanup();
  });

  it('reaches an Accordion, whose arrow keys still walk its headers', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Accordion ref={ref}>
        <Accordion.Item value="a">
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Panel>One</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Second</Accordion.Trigger>
          <Accordion.Panel>Two</Accordion.Panel>
        </Accordion.Item>
      </Accordion>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    expect(ref.current).toContainElement(first);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Second' }));
  });

  it('reaches a RadioGroup, whose arrow keys still move the choice', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <RadioGroup ref={ref} label="Plan" defaultValue="free">
        <RadioGroup.Item value="free" label="Free" />
        <RadioGroup.Item value="pro" label="Pro" />
      </RadioGroup>,
    );

    const free = screen.getByRole('radio', { name: 'Free' });
    free.focus();
    fireEvent.keyDown(free, { key: 'ArrowDown' });

    expect(ref.current).toBe(screen.getByRole('radiogroup'));
    expect(screen.getByRole('radio', { name: 'Pro' })).toBeChecked();
  });

  it('reaches a Calendar, whose arrow keys still move the focused day', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} label="Due" defaultValue="2026-10-21" />);

    const day = document.querySelector<HTMLElement>('[data-date="2026-10-21"]')!;
    day.focus();
    fireEvent.keyDown(day, { key: 'ArrowRight' });

    expect(ref.current).toBe(screen.getByRole('group', { name: 'Due' }));
    expect(document.activeElement).toBe(document.querySelector('[data-date="2026-10-22"]'));
  });

  it('reaches a Tabs.List, whose arrow keys still select the next tab', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tabs defaultValue="overview">
        <Tabs.List ref={ref} label="Project">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">Who is on it</Tabs.Panel>
        <Tabs.Panel value="activity">What happened</Tabs.Panel>
      </Tabs>,
    );

    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    fireEvent.keyDown(overview, { key: 'ArrowRight' });

    expect(ref.current).toBe(screen.getByRole('tablist'));
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reaches a Toaster, whose hotkey still moves focus to the stack', () => {
    const ref = createRef<HTMLDivElement>();
    const store = createToastStore<React.ReactNode>({ duration: Number.POSITIVE_INFINITY });
    render(<Toaster ref={ref} store={store} />);
    act(() => {
      store.add('Saved');
    });

    fireEvent.keyDown(document, { key: 'F6' });

    expect(ref.current).toBe(screen.getByRole('region', { name: 'Notifications' }));
    expect(document.activeElement).toBe(ref.current);
  });

  it('reaches a Popover panel, which still opens', () => {
    uninstall = installPopoverApi();
    const ref = createRef<HTMLDivElement>();
    render(
      <Popover ref={ref} label="Filters" defaultOpen trigger={(bag) => <Button {...bag}>Filters</Button>}>
        <Button>Only mine</Button>
      </Popover>,
    );

    expect(ref.current).toBe(document.querySelector('[popover]'));
    expect(ref.current?.matches(':popover-open')).toBe(true);
  });

  it('reaches a Menu panel, which still opens', () => {
    uninstall = installPopoverApi();
    const ref = createRef<HTMLDivElement>();
    render(
      <Menu ref={ref} defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
        <Menu.Item>Duplicate</Menu.Item>
      </Menu>,
    );

    expect(ref.current).toBe(document.querySelector('[role="menu"]'));
    expect(ref.current?.matches(':popover-open')).toBe(true);
  });

  it('reaches a Dialog and an AlertDialog, which still open', () => {
    uninstall = installDialogPlatform();
    const ref = createRef<HTMLDialogElement>();
    const alertRef = createRef<HTMLDialogElement>();
    render(
      <>
        <Dialog ref={ref} trigger={(bag) => <Button {...bag}>Rename</Button>}>
          <Dialog.Title>Rename this view</Dialog.Title>
        </Dialog>
        <AlertDialog ref={alertRef} trigger={(bag) => <Button {...bag}>Delete</Button>}>
          <AlertDialog.Title>Delete this view?</AlertDialog.Title>
        </AlertDialog>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(ref.current?.tagName).toBe('DIALOG');
    expect(ref.current?.open).toBe(true);
    expect(alertRef.current?.open).toBe(true);
  });

  it('reaches the layer a Tooltip bubble sits in, as one on an Overlay does', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Tooltip ref={ref} content="Saves the draft" defaultOpen>
        {(trigger) => <Button {...trigger}>Save</Button>}
      </Tooltip>,
    );

    expect(ref.current).toContainElement(screen.getByRole('tooltip'));
  });

  it('reaches a Slider, a DashboardGrid and the panels of a Tabs', () => {
    const slider = createRef<HTMLDivElement>();
    const grid = createRef<HTMLDivElement>();
    const panels = createRef<HTMLDivElement>();
    render(
      <>
        <Slider ref={slider} label="Volume" defaultValue={40} />
        <DashboardGrid ref={grid} label="Board">
          <Widget id="revenue" title="Revenue" />
        </DashboardGrid>
        <Tabs defaultValue="a">
          <Tabs.List label="Parts">
            <Tabs.Tab value="a">A</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panels ref={panels}>
            <Tabs.Panel value="a">Part A</Tabs.Panel>
          </Tabs.Panels>
        </Tabs>
      </>,
    );

    expect(slider.current).toContainElement(screen.getByRole('slider', { name: 'Volume' }));
    expect(grid.current).toBe(screen.getByRole('list', { name: 'Board' }));
    expect(panels.current).toContainElement(screen.getByRole('tabpanel'));
  });
});
