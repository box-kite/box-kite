import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import List from './list';
import Switch from './switch';

/**
 * A list is not a composite widget, so these are the platform's keys on the platform's elements — and the test
 * is that nothing here took them over: one stop per action, then one per control of the item's own.
 */
describe('List accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  function Settings({ onOpen }: { onOpen?: () => void }) {
    return (
      <List>
        <List.Item>
          <List.Content>
            <List.Title>
              <List.Action onClick={onOpen}>Notifications</List.Action>
            </List.Title>
          </List.Content>
          <List.Actions>
            <Switch props={{ 'aria-label': 'Notifications on' }} />
          </List.Actions>
        </List.Item>
        <List.Item>
          <List.Title>
            <List.Action props={{ href: '#privacy' }}>Privacy</List.Action>
          </List.Title>
        </List.Item>
      </List>
    );
  }

  describe('Keyboard', () => {
    it('stops at each action, then at each control the item has of its own', async () => {
      const user = keyboard();
      render(<Settings />);

      await user.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'Notifications' }));

      await user.pressTab();
      expectFocusOn(screen.getByRole('switch', { name: 'Notifications on' }));

      await user.pressTab();
      expectFocusOn(screen.getByRole('link', { name: 'Privacy' }));
    });

    it('presses the action on Enter', async () => {
      const user = keyboard();
      const onOpen = vi.fn();
      render(<Settings onOpen={onOpen} />);
      await user.pressTab();

      await user.press('Enter');

      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Semantics', () => {
    it('names each action by its own text, not by the whole item', async () => {
      const { container } = render(
        <List>
          <List.Item>
            <List.Content>
              <List.Title>
                <List.Action props={{ href: '#ada' }}>Ada Lovelace</List.Action>
              </List.Title>
              <List.Description>The engine might compose music.</List.Description>
            </List.Content>
            <List.End>
              €42
              <List.Meta>Total</List.Meta>
            </List.End>
          </List.Item>
        </List>,
      );

      expect(screen.getByRole('link')).toHaveAccessibleName('Ada Lovelace');
      await expectNoAxeViolations(container);
    });

    it('nests a group as a list of its own under its label', async () => {
      const { container } = render(
        <List>
          <List.Group label="Today" level={2}>
            <List.Item>Standup</List.Item>
          </List.Group>
        </List>,
      );

      expect(screen.getAllByRole('list')).toHaveLength(2);
      expect(screen.getByRole('heading', { level: 2, name: 'Today' })).toBeInTheDocument();
      await expectNoAxeViolations(container);
    });
  });
});
