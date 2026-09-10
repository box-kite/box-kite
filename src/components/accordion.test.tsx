import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Accordion, { Collapsible, DisclosureReason } from './accordion';
import Button from './button';

/**
 * What the component owns: the heading and the roles, which panels are open and why, and the two classes
 * the height animation is made of. The keyboard map itself is in `accordion.a11y.test.tsx`.
 */
describe('Accordion', () => {
  afterEach(() => {
    cleanup();
  });

  function Example(props: Partial<React.ComponentProps<typeof Accordion>>) {
    return (
      <Accordion {...props}>
        <Accordion.Item value="shipping">
          <Accordion.Trigger>Shipping</Accordion.Trigger>
          <Accordion.Panel>Two to four working days</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="returns">
          <Accordion.Trigger>Returns</Accordion.Trigger>
          <Accordion.Panel>Thirty days</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="warranty" disabled>
          <Accordion.Trigger>Warranty</Accordion.Trigger>
          <Accordion.Panel>Two years</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  }

  const header = (name: string) => screen.getByRole('button', { name });
  const panelOf = (name: string) => document.getElementById(header(name).getAttribute('aria-controls')!)!;
  /** The bare grid item that clips the panel — the panel's own parent. */
  const clipOf = (name: string) => panelOf(name).parentElement!;
  /** The grid whose track animates, one above the clip. */
  const trackOf = (name: string) => clipOf(name).parentElement!;

  describe('roles and naming', () => {
    it('puts every header in a heading, as APG asks', () => {
      render(<Example />);

      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
      expect(header('Shipping').closest('h3')).not.toBeNull();
    });

    it('takes the heading level from the accordion, and lets one header differ', () => {
      render(
        <Accordion level={2}>
          <Accordion.Item value="a">
            <Accordion.Trigger>Two</Accordion.Trigger>
            <Accordion.Panel>Body</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="b">
            <Accordion.Trigger level={4}>Four</Accordion.Trigger>
            <Accordion.Panel>Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Two');
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Four');
    });

    it('reports the open state on the header and wires it to its panel', () => {
      render(<Example defaultValue={['returns']} />);

      expect(header('Returns')).toHaveAttribute('aria-expanded', 'true');
      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
      expect(panelOf('Returns')).toHaveAttribute('aria-labelledby', header('Returns').id);
    });

    it('makes the open panel a region named by its header, and leaves the closed ones out of the tree', () => {
      render(<Example defaultValue={['shipping']} />);

      // Every panel is in the DOM, but `visibility: hidden` is what keeps the closed ones out of the
      // accessibility tree and the tab order — so exactly one region is reachable.
      expect(screen.getAllByRole('region')).toHaveLength(1);
      expect(panelOf('Shipping')).toHaveAccessibleName('Shipping');
      expect(panelOf('Returns')).toHaveAttribute('role', 'region');
    });

    it('lets a long accordion drop the landmark, which is APG’s own caveat', () => {
      render(
        <Accordion>
          <Accordion.Item value="a">
            <Accordion.Trigger>One</Accordion.Trigger>
            <Accordion.Panel props={{ role: undefined }}>Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      expect(screen.queryByRole('region')).toBeNull();
    });

    it('says nothing to a screen reader with the chevron, since aria-expanded already has', () => {
      render(<Example />);

      const chevron = header('Shipping').querySelector('[aria-hidden="true"]');
      expect(chevron).not.toBeNull();
    });

    it('leaves the chevron out when the consumer draws their own affordance', () => {
      render(
        <Accordion>
          <Accordion.Item value="a">
            <Accordion.Trigger arrow={false}>One</Accordion.Trigger>
            <Accordion.Panel>Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      expect(header('One').querySelector('[aria-hidden="true"]')).toBeNull();
    });

    it('gives every instance its own ids', () => {
      render(
        <>
          <Example />
          <Example />
        </>,
      );

      const [first, second] = screen.getAllByRole('button', { name: 'Shipping' });
      expect(first.id).not.toBe(second.id);
      expect(first.getAttribute('aria-controls')).not.toBe(second.getAttribute('aria-controls'));
    });

    it('builds its ids without touching the value, so any string is safe in one', () => {
      render(
        <Accordion defaultValue={['a b/c']}>
          <Accordion.Item value="a b/c">
            <Accordion.Trigger>Odd</Accordion.Trigger>
            <Accordion.Panel>Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      // A space would make `aria-controls` name two elements rather than one, and a slash would break a
      // selector: the ids come from the item, not from what the item stands for.
      expect(header('Odd').getAttribute('aria-controls')).not.toMatch(/[ /]/);
      expect(panelOf('Odd')).toHaveTextContent('Body');
    });
  });

  describe('opening and closing', () => {
    it('starts with everything shut', () => {
      render(<Example />);

      expect(screen.getAllByRole('button').every((each) => each.getAttribute('aria-expanded') === 'false')).toBe(true);
    });

    it('opens on a press, and reports why', () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);

      fireEvent.click(header('Shipping'));

      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'true');
      expect(onValueChange).toHaveBeenCalledWith(['shipping'], expect.objectContaining({ reason: 'trigger' satisfies DisclosureReason }));
    });

    it('closes the one that is open, so nothing has to stand open', () => {
      render(<Example defaultValue={['shipping']} />);

      fireEvent.click(header('Shipping'));

      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the last one when only one may stand open', () => {
      render(<Example defaultValue={['shipping']} />);

      fireEvent.click(header('Returns'));

      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
      expect(header('Returns')).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps the others open when several may', () => {
      render(<Example multiple defaultValue={['shipping']} />);

      fireEvent.click(header('Returns'));

      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'true');
      expect(header('Returns')).toHaveAttribute('aria-expanded', 'true');
    });

    it('will not open a disabled section', () => {
      const onValueChange = vi.fn();
      render(<Example onValueChange={onValueChange} />);

      fireEvent.click(header('Warranty'));

      expect(header('Warranty')).toHaveAttribute('aria-expanded', 'false');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('follows a controlled value the consumer changes elsewhere', () => {
      function Controlled() {
        const [value, setValue] = useState<string[]>([]);

        return (
          <>
            <Button onClick={() => setValue(['returns'])}>Open returns</Button>
            <Example value={value} onValueChange={setValue} />
          </>
        );
      }

      render(<Controlled />);
      fireEvent.click(screen.getByRole('button', { name: 'Open returns' }));

      expect(header('Returns')).toHaveAttribute('aria-expanded', 'true');
    });

    it('refuses a state the consumer never asked for when they own the value', () => {
      render(<Example value={[]} />);

      fireEvent.click(header('Shipping'));

      expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('the height animation', () => {
    it('is a class rather than a measurement, so nothing is written per instance', () => {
      render(<Example defaultValue={['shipping']} />);

      // The open panel's grid track is `1fr`, the closed one's is `0fr`, and neither carries an inline
      // height: two shared rules do the whole animation.
      expect(trackOf('Shipping').className).toContain('css-gridTemplateRows-1fr');
      expect(trackOf('Returns').className).toContain('css-gridTemplateRows-0fr');
      expect(trackOf('Shipping').getAttribute('style')).toBeNull();
    });

    it('hides a closed panel with visibility, which is what takes it out of the tab order', () => {
      render(<Example defaultValue={['shipping']} />);

      // `visibility` rather than `display`: it is animatable, so it flips to hidden only once the track
      // has closed, and back the instant it opens — which is also why the entrance needs no
      // `@starting-style` and a server-rendered open panel does not animate itself open on load.
      expect(trackOf('Returns').className).toContain('visibility-hidden');
      expect(trackOf('Shipping').className).not.toContain('visibility-hidden');
    });

    it('clips on the mechanism, never on the panel a consumer styles', () => {
      render(<Example defaultValue={['shipping']} />);

      expect(clipOf('Shipping').className).toContain('overflow-hidden');
      expect(clipOf('Shipping').className).toContain('minHeight-0');
      expect(panelOf('Shipping').className).not.toContain('overflow');
    });

    it('keeps every size off the grid item, which is what lets the track reach zero', () => {
      render(
        <Accordion defaultValue={['a']}>
          <Accordion.Item value="a">
            <Accordion.Trigger>One</Accordion.Trigger>
            <Accordion.Panel p={4}>Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      // Bug #142: **padding cannot be squeezed**, so a grid item carrying any floors the `0fr` track at
      // exactly that much — measured in Chrome as a permanent 24px stub under every closed section, and
      // as a stretch of the transition where the height had stopped but the text was still painted.
      // The panel is inside the clip rather than being the item, so its padding costs the track nothing.
      // jsdom computes no layout, but the wiring this rests on is exactly what can be asserted.
      expect(clipOf('One').className).not.toMatch(/(^|\s)(p|px|py|pt|pb|ps|pe|b|bt|bb|height|minHeight)-(?!0\b)/);
      expect(panelOf('One').className).toContain('p-4');
      expect(clipOf('One').contains(panelOf('One'))).toBe(true);
    });

    it('turns the chevron over rather than swapping it, which is what animates it', () => {
      render(<Example defaultValue={['shipping']} />);

      const chevron = (name: string) => header(name).querySelector('[aria-hidden="true"]')!;

      expect(chevron('Shipping').className).toContain('rotate--45');
      expect(chevron('Returns').className).toContain('rotate-135');
    });

    it('keeps a closed panel in the DOM, so what is in it survives being shut', () => {
      render(<Example />);

      // The exit has to have something to animate, and a half-filled form in a panel has to survive it.
      expect(panelOf('Shipping')).toHaveTextContent('Two to four working days');
    });

    it('keeps what a closed panel held', () => {
      render(
        <Accordion defaultValue={['a']}>
          <Accordion.Item value="a">
            <Accordion.Trigger>One</Accordion.Trigger>
            <Accordion.Panel>
              <input aria-label="Note" defaultValue="" />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'typed' } });
      fireEvent.click(header('One'));
      fireEvent.click(header('One'));

      expect(screen.getByLabelText('Note')).toHaveValue('typed');
    });
  });

  describe('composition', () => {
    it('takes Box props on every part', () => {
      render(
        <Accordion p={4} defaultValue={['a']}>
          <Accordion.Item value="a" bgColor="gray-50">
            <Accordion.Trigger fontSize={18}>One</Accordion.Trigger>
            <Accordion.Panel color="gray-500">Body</Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      expect(header('One').className).toContain('fontSize-18');
      expect(panelOf('One').className).toContain('color-gray-500');
      expect(header('One').closest('[class*="bgColor-gray-50"]')).not.toBeNull();
    });

    it('leaves a nested accordion to itself', () => {
      render(
        <Accordion defaultValue={['outer']}>
          <Accordion.Item value="outer">
            <Accordion.Trigger>Outer</Accordion.Trigger>
            <Accordion.Panel>
              <Accordion>
                <Accordion.Item value="inner">
                  <Accordion.Trigger>Inner</Accordion.Trigger>
                  <Accordion.Panel>Deep</Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>,
      );

      fireEvent.click(header('Inner'));

      expect(header('Inner')).toHaveAttribute('aria-expanded', 'true');
      expect(header('Outer')).toHaveAttribute('aria-expanded', 'true');
    });

    it('says which part was rendered outside an Accordion', () => {
      const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Accordion.Trigger>Loose</Accordion.Trigger>)).toThrow(/inside an <Accordion>/);
      expect(() =>
        render(
          <Accordion>
            <Accordion.Trigger>Loose</Accordion.Trigger>
          </Accordion>,
        ),
      ).toThrow(/inside an <Accordion.Item>/);

      quiet.mockRestore();
    });
  });
});

/** One disclosure with no heading, no group and no arrow keys: the same mechanism, none of the pattern. */
describe('Collapsible', () => {
  afterEach(() => {
    cleanup();
  });

  function Example(props: Partial<React.ComponentProps<typeof Collapsible>>) {
    return (
      <Collapsible trigger={(trigger) => <Button {...trigger}>Details</Button>} {...props}>
        What is in the box
      </Collapsible>
    );
  }

  const trigger = () => screen.getByRole('button', { name: 'Details' });
  const panel = () => document.getElementById(trigger().getAttribute('aria-controls')!)!;

  it('wires the trigger to the panel', () => {
    render(<Example />);

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(panel()).toHaveTextContent('What is in the box');
  });

  it('opens and closes on a press, and reports why', () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' satisfies DisclosureReason }));

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts open when it is told to', () => {
    render(<Example defaultOpen />);

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(panel().parentElement!.parentElement!.className).toContain('css-gridTemplateRows-1fr');
  });

  it('refuses a state the consumer never asked for when they own it', () => {
    render(<Example open={false} />);

    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens in the same grid an accordion panel does', () => {
    render(<Example />);

    expect(panel().parentElement!.parentElement!.className).toContain('css-gridTemplateRows-0fr');
    expect(panel().parentElement!.parentElement!.className).toContain('visibility-hidden');
    expect(panel().parentElement!.className).toContain('minHeight-0');
  });

  it('leaves the content without a role, since a region wants a name', () => {
    render(<Example defaultOpen />);

    expect(panel()).not.toHaveAttribute('role');
  });

  it('hands the trigger to a plain element as well as a Box one', () => {
    render(<Collapsible trigger={(bag) => <button {...bag.props}>Raw</button>}>Body</Collapsible>);

    fireEvent.click(screen.getByRole('button', { name: 'Raw' }));

    expect(screen.getByRole('button', { name: 'Raw' })).toHaveAttribute('aria-expanded', 'true');
  });
});
