import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import RadioButton from './radioButton';
import RadioGroup, { RadioGroupReason } from './radioGroup';

/**
 * The API around the group — the value it holds and the wiring it hands its items.
 * `radioGroup.a11y.test.tsx` owns the keyboard pattern.
 */
describe('RadioGroup', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const radios = () => screen.getAllByRole('radio') as HTMLInputElement[];

  function renderGroup(props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) {
    return render(
      <RadioGroup label="Plan" {...props}>
        <RadioGroup.Item value="free" label="Free" />
        <RadioGroup.Item value="pro" label="Pro" />
        <RadioGroup.Item value="team" label="Team" />
      </RadioGroup>,
    );
  }

  it('is a radiogroup named by its own label', () => {
    renderGroup();

    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toBeInTheDocument();
  });

  it('carries no name of its own when there is no label to give it one', () => {
    render(
      <RadioGroup props={{ 'aria-label': 'Plan' }}>
        <RadioGroup.Item value="free" label="Free" />
      </RadioGroup>,
    );

    expect(screen.getByRole('radiogroup', { name: 'Plan' })).toBeInTheDocument();
  });

  it('gives every item the same generated name, so the set submits as one field', () => {
    renderGroup();

    const names = new Set(radios().map((radio) => radio.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it('uses the name it was given instead', () => {
    renderGroup({ name: 'plan' });

    expect(radios().every((radio) => radio.name === 'plan')).toBe(true);
  });

  it('checks the item matching defaultValue and nothing else', () => {
    renderGroup({ defaultValue: 'pro' });

    expect(radios().map((radio) => radio.checked)).toEqual([false, true, false]);
  });

  it('moves the selection when an item is clicked, and reports the value with a reason', () => {
    const onValueChange = vi.fn<(value: string | undefined, details: { reason: RadioGroupReason }) => void>();
    renderGroup({ defaultValue: 'free', onValueChange });

    fireEvent.click(radios()[2]);

    expect(radios().map((radio) => radio.checked)).toEqual([false, false, true]);
    expect(onValueChange).toHaveBeenCalledWith('team', expect.objectContaining({ reason: 'click' }));
  });

  it('still reports through the deprecated onChange, and through both at once', () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    renderGroup({ defaultValue: 'free', onValueChange, onChange });

    fireEvent.click(radios()[2]);

    expect(onValueChange).toHaveBeenCalledWith('team', expect.objectContaining({ reason: 'click' }));
    expect(onChange).toHaveBeenCalledWith('team', expect.objectContaining({ reason: 'click' }));
  });

  it('obeys a controlled value and does not move on its own', () => {
    const onValueChange = vi.fn();
    renderGroup({ value: 'free', onValueChange });

    fireEvent.click(radios()[1]);

    expect(onValueChange).toHaveBeenCalledWith('pro', expect.objectContaining({ reason: 'click' }));
    expect(radios().map((radio) => radio.checked)).toEqual([true, false, false]);
  });

  it('follows a controlled value that changes underneath it', () => {
    const { rerender } = render(
      <RadioGroup label="Plan" value="free">
        <RadioGroup.Item value="free" label="Free" />
        <RadioGroup.Item value="pro" label="Pro" />
      </RadioGroup>,
    );

    rerender(
      <RadioGroup label="Plan" value="pro">
        <RadioGroup.Item value="free" label="Free" />
        <RadioGroup.Item value="pro" label="Pro" />
      </RadioGroup>,
    );

    expect(radios().map((radio) => radio.checked)).toEqual([false, true]);
  });

  it('lays the radios out in a row when asked, without changing what the arrows do', () => {
    const { container } = render(
      <RadioGroup label="Plan" orientation="horizontal">
        <RadioGroup.Item value="free" label="Free" />
      </RadioGroup>,
    );

    expect(container.querySelector('[role="radiogroup"]')?.className).toContain('d-row');
  });

  it('renders an item outside a group as a plain radio', () => {
    render(<RadioGroup.Item value="free" label="Free" name="plan" />);

    const radio = screen.getByRole('radio', { name: 'Free' }) as HTMLInputElement;

    expect(radio.name).toBe('plan');
    expect(radio.checked).toBe(false);
  });

  it('leaves a plain RadioButton nested inside to its own name and state', () => {
    render(
      <RadioGroup label="Plan" name="group-name">
        <RadioButton name="own-name" value="free" label="Free" />
      </RadioGroup>,
    );

    expect((screen.getByRole('radio') as HTMLInputElement).name).toBe('own-name');
  });
});
