import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import Button from './button';
import Tabs from './tabs';

/**
 * The tabs pattern, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 *
 * Both activation modes, both axes and the reading order, asserted as *where focus went* and *which panel
 * is showing* rather than on a dispatched event — the two questions the pattern is about.
 */
describe('Tabs accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  function Example(props: React.ComponentProps<typeof Tabs>) {
    return (
      <>
        <Button>Before</Button>
        <Tabs {...props}>
          <Tabs.List label="Project">
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="activity">Activity</Tabs.Tab>
            <Tabs.Tab value="settings" disabled>
              Settings
            </Tabs.Tab>
            <Tabs.Tab value="members">Members</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">Who is on it</Tabs.Panel>
          <Tabs.Panel value="activity">What changed</Tabs.Panel>
          <Tabs.Panel value="settings">Who may change it</Tabs.Panel>
          <Tabs.Panel value="members">Who is allowed in</Tabs.Panel>
        </Tabs>
        <Button>After</Button>
      </>
    );
  }

  const tab = (name: string) => screen.getByRole('tab', { name });
  const panel = () => screen.getByRole('tabpanel');

  it('has no axe violations', async () => {
    const { container } = render(<Example defaultValue="overview" />);

    await expectNoAxeViolations(container);
  });

  it('has no axe violations with a vertical list and every panel mounted', async () => {
    const { container } = render(<Example defaultValue="activity" orientation="vertical" keepMounted />);

    await expectNoAxeViolations(container);
  });

  describe('Tab', () => {
    it('enters the list once, landing on the selected tab', async () => {
      const keys = keyboard();
      render(<Example defaultValue="activity" />);

      await keys.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'Before' }));

      await keys.pressTab();
      expectFocusOn(tab('Activity'));
    });

    it('leaves the list for the panel, not for the next tab', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" />);

      tab('Overview').focus();
      await keys.pressTab();

      // One tab stop for the whole list, and the panel is the next one — APG's roving tabindex.
      expectFocusOn(panel());
    });

    it('comes back to the tab it left, in manual activation', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" activation="manual" />);

      tab('Overview').focus();
      await keys.pressArrow('Right');
      expectFocusOn(tab('Activity'));

      await keys.pressTab();
      await keys.pressShiftTab();

      // Focus moved without selecting, and the tab sequence followed the focus, as APG's own example does.
      expectFocusOn(tab('Activity'));
      expect(panel()).toHaveTextContent('Who is on it');
    });
  });

  describe('the arrows, in a horizontal list', () => {
    it('moves to the next and previous tab, selecting as it goes', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" />);

      tab('Overview').focus();
      await keys.pressArrow('Right');

      expectFocusOn(tab('Activity'));
      expect(panel()).toHaveTextContent('What changed');

      await keys.pressArrow('Left');

      expectFocusOn(tab('Overview'));
      expect(panel()).toHaveTextContent('Who is on it');
    });

    it('steps over a disabled tab', async () => {
      const keys = keyboard();
      render(<Example defaultValue="activity" />);

      tab('Activity').focus();
      await keys.pressArrow('Right');

      expectFocusOn(tab('Members'));
      expect(panel()).toHaveTextContent('Who is allowed in');
    });

    it('wraps at both ends', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" />);

      tab('Overview').focus();
      await keys.pressArrow('Left');
      expectFocusOn(tab('Members'));

      await keys.pressArrow('Right');
      expectFocusOn(tab('Overview'));
    });

    it('stops at the ends when told not to wrap', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" loop={false} />);

      tab('Overview').focus();
      await keys.pressArrow('Left');

      expectFocusOn(tab('Overview'));
      expect(panel()).toHaveTextContent('Who is on it');
    });

    it('leaves the off-axis arrows to the page', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" />);

      tab('Overview').focus();
      await keys.pressArrow('Down');

      expectFocusOn(tab('Overview'));
    });
  });

  describe('the arrows, in a vertical list', () => {
    it('moves on the block axis', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" orientation="vertical" />);

      tab('Overview').focus();
      await keys.pressArrow('Down');

      expectFocusOn(tab('Activity'));
      expect(panel()).toHaveTextContent('What changed');

      await keys.pressArrow('Up');
      expectFocusOn(tab('Overview'));
    });

    it('leaves the reading axis to the page', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" orientation="vertical" />);

      tab('Overview').focus();
      await keys.pressArrow('Right');

      expectFocusOn(tab('Overview'));
    });
  });

  describe('Home and End', () => {
    it('go to the first and last selectable tab', async () => {
      const keys = keyboard();
      render(<Example defaultValue="activity" />);

      tab('Activity').focus();
      await keys.press('End');

      expectFocusOn(tab('Members'));

      await keys.press('Home');
      expectFocusOn(tab('Overview'));
      expect(panel()).toHaveTextContent('Who is on it');
    });

    it('skip a disabled tab sitting at an end', async () => {
      const keys = keyboard();
      render(
        <Tabs defaultValue="two">
          <Tabs.List label="Edges">
            <Tabs.Tab value="one" disabled>
              One
            </Tabs.Tab>
            <Tabs.Tab value="two">Two</Tabs.Tab>
            <Tabs.Tab value="three" disabled>
              Three
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="two">Second</Tabs.Panel>
        </Tabs>,
      );

      tab('Two').focus();
      await keys.press('Home');
      expectFocusOn(tab('Two'));

      await keys.press('End');
      expectFocusOn(tab('Two'));
    });
  });

  describe('Enter and Space', () => {
    it('choose the focused tab in manual activation', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" activation="manual" />);

      tab('Overview').focus();
      await keys.pressArrow('Right');

      // Focus moved and the panel did not: that is what manual activation is.
      expectFocusOn(tab('Activity'));
      expect(panel()).toHaveTextContent('Who is on it');

      await keys.press('Enter');
      expect(panel()).toHaveTextContent('What changed');
    });

    it('take Space as well as Enter', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" activation="manual" />);

      tab('Overview').focus();
      await keys.pressArrow('Right');
      await keys.press(' ');

      expect(panel()).toHaveTextContent('What changed');
    });

    it('report the keyboard as the reason, not a press', async () => {
      const keys = keyboard();
      const reasons: string[] = [];
      render(<Example defaultValue="overview" activation="manual" onValueChange={(_, details) => reasons.push(details.reason)} />);

      tab('Overview').focus();
      await keys.pressArrow('Right');
      await keys.press('Enter');

      // The `<button>` would synthesize a click from Enter; the handler gets in front of it, so the
      // change arrives once and says where it came from.
      expect(reasons).toEqual(['keyboard']);
    });

    it('are already answered by automatic activation', async () => {
      const keys = keyboard();
      const reasons: string[] = [];
      render(<Example defaultValue="overview" onValueChange={(_, details) => reasons.push(details.reason)} />);

      tab('Overview').focus();
      await keys.pressArrow('Right');
      await keys.press('Enter');

      expect(reasons).toEqual(['keyboard']);
      expect(panel()).toHaveTextContent('What changed');
    });
  });
});
