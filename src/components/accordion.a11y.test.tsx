import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import Accordion, { Collapsible } from './accordion';
import Button from './button';
import Textbox from './textbox';

/**
 * The accordion pattern, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 *
 * An accordion is not a composite widget — every header is its own tab stop, and Down and Up are the
 * shortcut rather than the only way in. Asserted as *where focus went* and *what is reachable*, since
 * what a closed panel must not be is tabbable.
 */
describe('Accordion accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function Example(props: Partial<React.ComponentProps<typeof Accordion>>) {
    return (
      <>
        <Button>Before</Button>
        <Accordion {...props}>
          <Accordion.Item value="shipping">
            <Accordion.Trigger>Shipping</Accordion.Trigger>
            <Accordion.Panel>
              <Textbox props={{ 'aria-label': 'Postcode' }} />
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="returns">
            <Accordion.Trigger>Returns</Accordion.Trigger>
            <Accordion.Panel>Thirty days</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="warranty" disabled>
            <Accordion.Trigger>Warranty</Accordion.Trigger>
            <Accordion.Panel>Two years</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="support">
            <Accordion.Trigger>Support</Accordion.Trigger>
            <Accordion.Panel>Weekdays</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        <Button>After</Button>
      </>
    );
  }

  const header = (name: string) => screen.getByRole('button', { name });

  it('has no axe violations with everything shut', async () => {
    const { container } = render(<Example />);

    await expectNoAxeViolations(container);
  });

  it('has no axe violations with a panel open', async () => {
    const { container } = render(<Example defaultValue={['shipping']} />);

    await expectNoAxeViolations(container);
  });

  it('has no axe violations with several open at once', async () => {
    const { container } = render(<Example multiple defaultValue={['shipping', 'returns']} />);

    await expectNoAxeViolations(container);
  });

  describe('Tab', () => {
    it('puts every header in the tab sequence — an accordion is not a composite widget', async () => {
      const keys = keyboard();
      render(<Example />);

      await keys.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'Before' }));

      await keys.pressTab();
      expectFocusOn(header('Shipping'));

      await keys.pressTab();
      expectFocusOn(header('Returns'));
    });

    it('steps over a disabled header, which the browser has already taken out of the sequence', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Returns').focus();
      await keys.pressTab();

      expectFocusOn(header('Support'));
    });

    it('reaches what is inside an open panel', async () => {
      const keys = keyboard();
      render(<Example defaultValue={['shipping']} />);

      header('Shipping').focus();
      await keys.pressTab();

      expectFocusOn(screen.getByLabelText('Postcode'));
    });

    it('cannot reach what is inside a closed one', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Shipping').focus();
      await keys.pressTab();

      // The whole reason a closed panel is hidden with `visibility` rather than merely clipped: content
      // behind a `0fr` track is still laid out, and clipped content is still tabbable.
      expectFocusOn(header('Returns'));
    });
  });

  describe('Enter and Space', () => {
    it('opens the focused section and closes it again', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Shipping').focus();
      await keys.press('Enter');
      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'true');

      await keys.press(' ');
      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Down and Up', () => {
    it('moves to the next and previous header', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Shipping').focus();
      await keys.pressArrow('Down');
      expectFocusOn(header('Returns'));

      await keys.pressArrow('Up');
      expectFocusOn(header('Shipping'));
    });

    it('moves focus without opening anything', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Shipping').focus();
      await keys.pressArrow('Down');

      expect(header('Returns')).toHaveAttribute('aria-expanded', 'false');
    });

    it('steps over a disabled header', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Returns').focus();
      await keys.pressArrow('Down');

      expectFocusOn(header('Support'));
    });

    it('wraps at the ends', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Support').focus();
      await keys.pressArrow('Down');
      expectFocusOn(header('Shipping'));

      await keys.pressArrow('Up');
      expectFocusOn(header('Support'));
    });

    it('stops at the ends when it is told not to wrap', async () => {
      const keys = keyboard();
      render(<Example loop={false} />);

      header('Support').focus();
      await keys.pressArrow('Down');

      expectFocusOn(header('Support'));
    });

    it('leaves the arrows alone inside a panel, so a field in one keeps its own', async () => {
      const keys = keyboard();
      render(<Example defaultValue={['shipping']} />);

      const field = screen.getByLabelText('Postcode');
      field.focus();
      await keys.pressArrow('Down');

      expectFocusOn(field);
    });

    it('leaves the sideways pair to the page', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Shipping').focus();
      await keys.pressArrow('Right');

      expectFocusOn(header('Shipping'));
    });
  });

  describe('Home and End', () => {
    it('goes to the first and the last header', async () => {
      const keys = keyboard();
      render(<Example />);

      header('Returns').focus();
      await keys.press('End');
      expectFocusOn(header('Support'));

      await keys.press('Home');
      expectFocusOn(header('Shipping'));
    });
  });

  describe('a nested accordion', () => {
    it('navigates itself rather than the one around it', async () => {
      const keys = keyboard();
      render(
        <Accordion defaultValue={['outer']}>
          <Accordion.Item value="outer">
            <Accordion.Trigger>Outer</Accordion.Trigger>
            <Accordion.Panel>
              <Accordion defaultValue={['first']}>
                <Accordion.Item value="first">
                  <Accordion.Trigger>First</Accordion.Trigger>
                  <Accordion.Panel>One</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="second">
                  <Accordion.Trigger>Second</Accordion.Trigger>
                  <Accordion.Panel>Two</Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      header('First').focus();
      await keys.pressArrow('Down');

      expectFocusOn(header('Second'));
    });
  });
});

describe('Collapsible accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function Example(props: Partial<React.ComponentProps<typeof Collapsible>>) {
    return (
      <Collapsible trigger={(trigger) => <Button {...trigger}>Details</Button>} {...props}>
        <Button>Inside</Button>
      </Collapsible>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Details' });

  it('has no axe violations, shut and open', async () => {
    const { container, rerender } = render(<Example />);
    await expectNoAxeViolations(container);

    rerender(<Example defaultOpen />);
    await expectNoAxeViolations(container);
  });

  it('opens from the keyboard, because the trigger is a real button', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    expectFocusOn(trigger());

    await keys.press('Enter');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('puts its content in the tab sequence only once it is open', async () => {
    const keys = keyboard();
    render(<Example />);
    const panel = () => document.getElementById(trigger().getAttribute('aria-controls')!)!;

    trigger().focus();
    await keys.pressTab();
    // Queried through the DOM rather than by role: a closed panel is out of the accessibility tree
    // altogether, which is the property under test.
    expect(panel().contains(document.activeElement)).toBe(false);

    await keys.click(trigger());
    await keys.pressTab();

    expectFocusOn(screen.getByRole('button', { name: 'Inside' }));
  });
});
