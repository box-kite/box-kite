import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../../dev/tests';
import Button from '../../components/button';
import Dialog from '../../components/dialog';
import Menu from '../../components/menu';
import Overlay from '../../components/overlay';
import Popover from '../../components/popover';
import Textbox from '../../components/textbox';
import { LayerScope, LayerScopeProps } from './layerScope';

/** The surface behind the layers: a React handler on an ancestor, and a listener on `document`, the two places a scope reaches. */
function Surface({ scope, children }: { scope?: LayerScopeProps; children: React.ReactNode }) {
  const content = scope ? <LayerScope {...scope}>{children}</LayerScope> : children;

  return (
    <div data-testid="surface" onKeyDown={surface.key} onPointerDown={surface.pointer} onClick={surface.click} onWheel={surface.wheel}>
      {content}
    </div>
  );
}

const surface = { key: vi.fn(), pointer: vi.fn(), click: vi.fn(), wheel: vi.fn(), documentKey: vi.fn() };

function OpenPopover() {
  return (
    <Popover label="Filters" defaultOpen trigger={(bag) => <Button {...bag}>Filters</Button>}>
      <Button>Only mine</Button>
      <Textbox props={{ 'aria-label': 'Search' }} />
    </Popover>
  );
}

const REACT_FLOW = { className: 'nodrag nowheel nokey', isolate: ['pointer', 'wheel', 'key'] } as const;

describe('LayerScope', () => {
  ignoreLogs();

  let uninstall: () => void;

  beforeEach(() => {
    uninstall = installPopoverApi();
    Object.values(surface).forEach((spy) => spy.mockClear());
    document.addEventListener('keydown', surface.documentKey);
  });

  afterEach(() => {
    cleanup();
    uninstall();
    document.removeEventListener('keydown', surface.documentKey);
  });

  const panel = () => screen.getByRole('dialog', { name: 'Filters' });

  it('changes nothing outside a scope', () => {
    render(
      <Surface>
        <OpenPopover />
      </Surface>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Only mine' }), { key: 'Backspace' });

    expect(panel()).not.toHaveClass('nokey');
    expect(surface.key).toHaveBeenCalledTimes(1);
    expect(surface.documentKey).toHaveBeenCalledTimes(1);
  });

  it("puts the surface's opt-out classes and attributes on every layer root", () => {
    render(
      <Surface scope={{ className: 'nodrag nokey', props: { 'data-no-pan': '' } }}>
        <OpenPopover />
        <Menu label="Actions" defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.Item>Duplicate</Menu.Item>
        </Menu>
        <Dialog label="Rename" defaultOpen>
          Name
        </Dialog>
        <Overlay data-testid="overlay">Hint</Overlay>
      </Surface>,
    );

    const roots = [panel(), screen.getByRole('menu'), screen.getByRole('dialog', { name: 'Rename', hidden: true })];
    roots.push(screen.getByText('Hint').parentElement as HTMLElement);

    roots.forEach((root) => {
      expect(root).toHaveClass('nodrag', 'nokey');
      expect(root).toHaveAttribute('data-no-pan', '');
    });
    // The layer's own attributes win over the scope's.
    expect(panel()).toHaveAttribute('role', 'dialog');
  });

  it('keeps keys inside, after the layer has had them', () => {
    const onSelect = vi.fn();
    render(
      <Surface scope={REACT_FLOW}>
        <Menu label="Actions" defaultOpen trigger={(bag) => <Button {...bag}>Actions</Button>}>
          <Menu.Item onSelect={onSelect}>Duplicate</Menu.Item>
          <Menu.Item>Delete</Menu.Item>
        </Menu>
      </Surface>,
    );
    const [first, second] = screen.getAllByRole('menuitem');
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    fireEvent.keyDown(second, { key: 'Delete' });

    expect(second).toHaveFocus();
    expect(surface.key).not.toHaveBeenCalled();
    expect(surface.documentKey).not.toHaveBeenCalled();
  });

  it('cancels a Backspace nothing editable consumed, which WebKit would take as Back (bug #232)', () => {
    render(
      <Surface scope={REACT_FLOW}>
        <OpenPopover />
      </Surface>,
    );

    const onButton = fireEvent.keyDown(screen.getByRole('button', { name: 'Only mine' }), { key: 'Backspace' });
    const inField = fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search' }), { key: 'Backspace' });

    expect(onButton).toBe(false);
    expect(inField).toBe(true);
    expect(surface.key).not.toHaveBeenCalled();
  });

  it('keeps presses and wheels inside, and still delivers them within the layer', () => {
    const onClick = vi.fn();
    render(
      <Surface scope={REACT_FLOW}>
        <Popover label="Filters" defaultOpen trigger={(bag) => <Button {...bag}>Filters</Button>}>
          <Button onClick={onClick}>Only mine</Button>
        </Popover>
      </Surface>,
    );
    const button = screen.getByRole('button', { name: 'Only mine' });

    fireEvent.pointerDown(button);
    fireEvent.click(button);
    fireEvent.wheel(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(surface.pointer).not.toHaveBeenCalled();
    expect(surface.click).not.toHaveBeenCalled();
    expect(surface.wheel).not.toHaveBeenCalled();
  });

  it('isolates only what it is asked to', () => {
    render(
      <Surface scope={{ isolate: ['key'] }}>
        <OpenPopover />
      </Surface>,
    );
    const button = screen.getByRole('button', { name: 'Only mine' });

    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'a' });

    expect(surface.click).toHaveBeenCalledTimes(1);
    expect(surface.key).not.toHaveBeenCalled();
  });

  it('is cleared by an empty scope inside it', () => {
    render(
      <Surface scope={REACT_FLOW}>
        <LayerScope>
          <OpenPopover />
        </LayerScope>
      </Surface>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Only mine' }), { key: 'x' });

    expect(panel()).not.toHaveClass('nokey');
    expect(surface.key).toHaveBeenCalledTimes(1);
  });

  it('lets Escape reach the dismissal of a portalled layer', () => {
    uninstall();
    uninstall = () => {};
    render(
      <Surface scope={REACT_FLOW}>
        <OpenPopover />
      </Surface>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Only mine' }), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
