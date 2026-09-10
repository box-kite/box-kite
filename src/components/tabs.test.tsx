import { cleanup, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyboard } from '../../dev/a11y/keyboard';
import Button from './button';
import Tabs, { TabsReason } from './tabs';

/**
 * What the component owns: the roles and the ARIA, the selection and its reasons, which panels are
 * rendered, and where the tab sequence points. The keyboard map itself is in `tabs.a11y.test.tsx`.
 */
describe('Tabs', () => {
  afterEach(() => {
    cleanup();
  });

  function Example(props: React.ComponentProps<typeof Tabs>) {
    return (
      <Tabs {...props}>
        <Tabs.List label="Project">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="settings" disabled>
            Settings
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview">Who is on it</Tabs.Panel>
        <Tabs.Panel value="activity">What changed</Tabs.Panel>
        <Tabs.Panel value="settings">Who may change it</Tabs.Panel>
      </Tabs>
    );
  }

  const tab = (name: string) => screen.getByRole('tab', { name });
  const panel = () => screen.getByRole('tabpanel');

  describe('roles and naming', () => {
    it('renders the tablist, its tabs and the selected panel', () => {
      render(<Example defaultValue="overview" />);

      expect(screen.getByRole('tablist')).toHaveAccessibleName('Project');
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(panel()).toHaveTextContent('Who is on it');
    });

    it('names the tablist after an element already on the page', () => {
      render(
        <>
          <span id="heading">Views</span>
          <Tabs defaultValue="one">
            <Tabs.List labelledBy="heading">
              <Tabs.Tab value="one">One</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="one">First</Tabs.Panel>
          </Tabs>
        </>,
      );

      expect(screen.getByRole('tablist')).toHaveAccessibleName('Views');
    });

    it('reports the selected tab and wires it to its panel', () => {
      render(<Example defaultValue="activity" />);

      expect(tab('Activity')).toHaveAttribute('aria-selected', 'true');
      expect(tab('Overview')).toHaveAttribute('aria-selected', 'false');
      expect(tab('Activity')).toHaveAttribute('aria-controls', panel().id);
      expect(panel()).toHaveAttribute('aria-labelledby', tab('Activity').id);
    });

    it('leaves aria-controls off a tab whose panel is not rendered', () => {
      render(<Example defaultValue="overview" />);

      // A reference to an element that is not there names nothing, and axe reads it as a broken one.
      expect(tab('Activity')).not.toHaveAttribute('aria-controls');
    });

    it('puts the panel in the tab sequence, as APG asks', () => {
      render(<Example defaultValue="overview" />);

      expect(panel()).toHaveAttribute('tabindex', '0');
    });

    it('carries the orientation on the tablist', () => {
      render(<Example defaultValue="overview" orientation="vertical" />);

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('turns the indicator with the list, not just the list', () => {
      render(<Example defaultValue="overview" orientation="vertical" />);

      // The indicator is a border on the *tab*, so the tab needs the orientation too. Without this the
      // list turned and every tab kept its underline — a browser-only symptom, so it is asserted here
      // as the variant reaching all three parts.
      expect(screen.getByRole('tablist').className).toContain('be-1');
      expect(tab('Overview').className).toContain('be-2');
      expect(tab('Overview').className).not.toContain('bb-2');
    });

    it('gives every instance its own ids', () => {
      render(
        <>
          <Example defaultValue="overview" />
          <Example defaultValue="overview" />
        </>,
      );

      const [first, second] = screen.getAllByRole('tab', { name: 'Overview' });
      expect(first.id).not.toBe(second.id);
    });

    it('keeps a value that is not id-safe out of the ids it builds', () => {
      render(
        <Tabs defaultValue="a b">
          <Tabs.List label="Odd">
            <Tabs.Tab value="a b">Spaced</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="a b">Content</Tabs.Panel>
        </Tabs>,
      );

      // A space would make `aria-controls` name two elements rather than one.
      expect(tab('Spaced').getAttribute('aria-controls')).not.toContain(' ');
      expect(document.getElementById(tab('Spaced').getAttribute('aria-controls')!)).toBe(panel());
    });
  });

  describe('selection', () => {
    it('shows nothing until a tab is chosen', () => {
      render(<Example />);

      expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
      expect(screen.getAllByRole('tab').every((element) => element.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    it('selects on a press, and reports why', async () => {
      const keys = keyboard();
      const onValueChange = vi.fn<(value: string | undefined, details: { reason: TabsReason }) => void>();
      render(<Example defaultValue="overview" onValueChange={onValueChange} />);

      await keys.click(tab('Activity'));

      expect(panel()).toHaveTextContent('What changed');
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe('activity');
      expect(onValueChange.mock.calls[0][1].reason).toBe('click');
    });

    it('does not fire again for the tab already selected', async () => {
      const keys = keyboard();
      const onValueChange = vi.fn();
      render(<Example defaultValue="overview" onValueChange={onValueChange} />);

      await keys.click(tab('Overview'));

      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('cannot be moved onto a disabled tab', async () => {
      const keys = keyboard();
      render(<Example defaultValue="overview" />);

      await keys.click(tab('Settings'));

      expect(panel()).toHaveTextContent('Who is on it');
    });

    it('follows a controlled value the consumer changes elsewhere', async () => {
      const keys = keyboard();

      function Controlled() {
        const [value, setValue] = useState('overview');

        return (
          <>
            <Button onClick={() => setValue('activity')}>Jump</Button>
            <Example value={value} onValueChange={(next) => next && setValue(next)} />
          </>
        );
      }

      render(<Controlled />);
      await keys.click(screen.getByRole('button', { name: 'Jump' }));

      expect(panel()).toHaveTextContent('What changed');
      // The tab sequence follows the selection, or Tab would enter the list at a tab whose panel is hidden.
      expect(tab('Activity')).toHaveAttribute('tabindex', '0');
      expect(tab('Overview')).toHaveAttribute('tabindex', '-1');
    });

    it('refuses a value it never held when the consumer controls it', async () => {
      const keys = keyboard();
      render(<Example value="overview" />);

      await keys.click(tab('Activity'));

      // Controlled and the consumer ignored the change: the panel on screen is still the one it named.
      expect(panel()).toHaveTextContent('Who is on it');
    });
  });

  describe('mounting', () => {
    it('renders only the selected panel', () => {
      render(<Example defaultValue="overview" />);

      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      expect(screen.queryByText('What changed')).not.toBeInTheDocument();
    });

    it('renders every panel when told to keep them, hiding the rest', () => {
      render(<Example defaultValue="overview" keepMounted />);

      // Hidden is the `hidden` attribute *and* a rule, since every Box carries `display: block`.
      const hidden = screen.getByText('What changed');
      expect(hidden).toHaveAttribute('hidden');
      expect(screen.getByText('Who is on it')).not.toHaveAttribute('hidden');
      // Only one is in the accessibility tree, which is what `getByRole` reads.
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    });

    it('names every panel from its tab once they are all mounted', () => {
      render(<Example defaultValue="overview" keepMounted />);

      expect(tab('Activity')).toHaveAttribute('aria-controls', screen.getByText('What changed').id);
    });

    it('keeps what a mounted panel held across a switch', async () => {
      const keys = keyboard();
      render(
        <Tabs defaultValue="one" keepMounted>
          <Tabs.List label="Form">
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two">Two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">
            <input aria-label="Name" />
          </Tabs.Panel>
          <Tabs.Panel value="two">Second</Tabs.Panel>
        </Tabs>,
      );

      await keys.type('Ada');
      const field = screen.getByLabelText('Name') as HTMLInputElement;
      field.value = 'Ada';

      await keys.click(tab('Two'));
      await keys.click(tab('One'));

      expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ada');
    });
  });

  describe('the tab sequence', () => {
    it('puts exactly one tab in it', () => {
      render(<Example defaultValue="activity" />);

      const stops = screen.getAllByRole('tab').filter((element) => element.getAttribute('tabindex') === '0');
      expect(stops).toHaveLength(1);
      expect(stops[0]).toBe(tab('Activity'));
    });

    it('falls back to the first selectable tab when nothing is selected', () => {
      render(
        <Tabs>
          <Tabs.List label="Project">
            <Tabs.Tab value="overview" disabled>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="activity">Activity</Tabs.Tab>
          </Tabs.List>
        </Tabs>,
      );

      expect(tab('Activity')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('composition', () => {
    it('takes Box props on every part', () => {
      render(
        <Tabs defaultValue="one" gap={8} props={{ 'data-testid': 'root' }}>
          <Tabs.List label="Styled" px={4}>
            <Tabs.Tab value="one" fontWeight={700}>
              One
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one" p={6}>
            First
          </Tabs.Panel>
        </Tabs>,
      );

      expect(screen.getByTestId('root').className).toContain('gap-8');
      expect(screen.getByRole('tablist').className).toContain('px-4');
      expect(tab('One').className).toContain('fontWeight-700');
      expect(panel().className).toContain('p-6');
    });

    it('navigates a tab a consumer wrapped in something of their own', async () => {
      const keys = keyboard();
      render(
        <Tabs defaultValue="one">
          <Tabs.List label="Wrapped">
            <Tabs.Tab value="one">One</Tabs.Tab>
            <div>
              <Tabs.Tab value="two">Two</Tabs.Tab>
            </div>
          </Tabs.List>
          <Tabs.Panel value="one">First</Tabs.Panel>
          <Tabs.Panel value="two">Second</Tabs.Panel>
        </Tabs>,
      );

      tab('One').focus();
      await keys.pressArrow('Right');

      expect(panel()).toHaveTextContent('Second');
    });

    it('leaves a nested set of tabs to itself', async () => {
      const keys = keyboard();
      render(
        <Tabs defaultValue="outer1">
          <Tabs.List label="Outer">
            <Tabs.Tab value="outer1">Outer one</Tabs.Tab>
            <Tabs.Tab value="outer2">Outer two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="outer1">
            <Tabs defaultValue="inner1">
              <Tabs.List label="Inner">
                <Tabs.Tab value="inner1">Inner one</Tabs.Tab>
                <Tabs.Tab value="inner2">Inner two</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="inner1">Inner first</Tabs.Panel>
              <Tabs.Panel value="inner2">Inner second</Tabs.Panel>
            </Tabs>
          </Tabs.Panel>
          <Tabs.Panel value="outer2">Outer second</Tabs.Panel>
        </Tabs>,
      );

      tab('Inner one').focus();
      await keys.pressArrow('Right');

      // The inner list moved; the outer selection did not.
      expect(screen.getByText('Inner second')).toBeInTheDocument();
      expect(tab('Outer one')).toHaveAttribute('aria-selected', 'true');
    });

    it('says which part was rendered outside a Tabs', () => {
      expect(() => render(<Tabs.Tab value="one">One</Tabs.Tab>)).toThrow(/inside a <Tabs>/);
    });
  });
});
