import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import Button from './button';
import Slider from './slider';

/**
 * The slider pattern, end to end: https://www.w3.org/WAI/ARIA/apg/patterns/slider/ and the multi-thumb
 * one beside it. Every thumb is its own tab stop — a slider is not a composite widget with one way in —
 * and the value a key produces is asserted through `aria-valuenow`, which is the only thing a reader has.
 */
describe('Slider accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function Example(props: Partial<React.ComponentProps<typeof Slider>> = {}) {
    return (
      <>
        <Button>Before</Button>
        <Slider label="Volume" defaultValue={50} {...props} />
        <Button>After</Button>
      </>
    );
  }

  const thumb = (name = 'Volume') => screen.getByRole('slider', { name });
  const valueOf = (name?: string) => thumb(name).getAttribute('aria-valuenow');

  it('has no axe violations', async () => {
    const { container } = render(<Example />);

    await expectNoAxeViolations(container);
  });

  it('has no axe violations as a range, where the group and each thumb are named separately', async () => {
    const { container } = render(
      <Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} format={(value) => `${value} lei`} />,
    );

    await expectNoAxeViolations(container);
  });

  it('has no axe violations while disabled', async () => {
    const { container } = render(<Example disabled />);

    await expectNoAxeViolations(container);
  });

  it('Tab — the thumb is one tab stop, between whatever is either side of it', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Before' }));
    await keys.pressTab();
    expectFocusOn(thumb());
    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'After' }));
  });

  it('Tab — a range is two tab stops, in the order the thumbs are written', async () => {
    const keys = keyboard();
    render(<Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} />);

    await keys.pressTab();
    expectFocusOn(thumb('Lowest'));
    await keys.pressTab();
    expectFocusOn(thumb('Highest'));
  });

  it('Tab — a disabled slider is skipped altogether', async () => {
    const keys = keyboard();
    render(<Example disabled />);

    await keys.pressTab();
    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'After' }));
  });

  it('Right / Up — one step towards the maximum', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    await keys.pressTab();
    await keys.pressArrow('Right');
    expect(valueOf()).toBe('51');
    await keys.pressArrow('Up');
    expect(valueOf()).toBe('52');
  });

  it('Left / Down — one step towards the minimum', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    await keys.pressTab();
    await keys.pressArrow('Left');
    expect(valueOf()).toBe('49');
    await keys.pressArrow('Down');
    expect(valueOf()).toBe('48');
  });

  it('PageUp / PageDown — ten steps at a time', async () => {
    const keys = keyboard();
    render(<Example step={2} />);

    await keys.pressTab();
    await keys.pressTab();
    await keys.press('PageUp');
    expect(valueOf()).toBe('70');
    await keys.press('PageDown');
    expect(valueOf()).toBe('50');
  });

  it('Home / End — the ends of the range themselves', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    await keys.pressTab();
    await keys.press('End');
    expect(valueOf()).toBe('100');
    await keys.press('Home');
    expect(valueOf()).toBe('0');
  });

  it('the arrows move the thumb they arrived on, and it stops at the one beside it', async () => {
    const keys = keyboard();
    render(<Slider label="Price" defaultValue={[20, 22]} thumbLabels={['Lowest', 'Highest']} step={2} />);

    await keys.pressTab();
    expectFocusOn(thumb('Lowest'));
    await keys.pressArrow('Right');
    expect(valueOf('Lowest')).toBe('22');
    await keys.pressArrow('Right');
    expect(valueOf('Lowest')).toBe('22');
    expect(valueOf('Highest')).toBe('22');
  });

  it('the keyboard reaches nothing while disabled, and the value stays put', async () => {
    const keys = keyboard();
    render(<Example disabled />);

    thumb().focus();
    await keys.pressArrow('Right');
    expect(valueOf()).toBe('50');
  });
});
