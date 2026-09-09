import { cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../../dev/a11y/keyboard';
import useIdentifier from '../identity/useIdentifier';
import useControllableState from './useControllableState';
import useDismiss from './useDismiss';
import useFocusReturn from './useFocusReturn';
import useRovingFocus from './useRovingFocus';

/**
 * The five primitives assembled into the pattern they exist for — a select-only combobox — driven from the
 * keyboard. Each hook is unit-tested next door; this asserts what unit tests cannot, that they compose: a
 * dismissal firing while the list takes focus, focus returning to a trigger the roving index has moved
 * past, an id regenerated per render. Nothing here ships — it is the proof a consumer can build their own.
 */
describe('the behaviour primitives, composed', () => {
  afterEach(() => {
    cleanup();
  });

  const names = ['Ada', 'Grace', 'Alan'];

  function Select(props: { onPick?: (name: string) => void }) {
    const id = useIdentifier('select');
    const trigger = useRef<HTMLButtonElement>(null);
    const listbox = useRef<HTMLUListElement>(null);

    const [open, setOpen] = useControllableState<boolean, 'trigger' | 'select' | 'escape' | 'outside-pointer'>({
      defaultValue: false,
    });
    const [selected, setSelected] = useControllableState<string | null>({ defaultValue: null });

    const roving = useRovingFocus({
      count: names.length,
      focusItems: false,
      textOf: (index) => names[index],
      onSelect: (index, event) => {
        setSelected(names[index], { reason: 'keyboard' });
        props.onPick?.(names[index]);
        setOpen(false, { reason: 'select', event });
      },
    });

    useDismiss({
      enabled: open,
      inside: [trigger, listbox],
      onDismiss: (reason, event) => setOpen(false, { reason, event }),
    });

    useFocusReturn({ enabled: open, returnTo: trigger });

    return (
      <>
        <span id={`${id}-label`}>Owner</span>
        <button
          ref={trigger}
          role="combobox"
          id={`${id}-trigger`}
          aria-labelledby={`${id}-label ${id}-trigger`}
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          aria-activedescendant={open && roving.activeIndex !== -1 ? `${id}-option-${roving.activeIndex}` : undefined}
          onClick={(event) => setOpen((value) => !value, { reason: 'trigger', event })}
          onKeyDown={roving.onKeyDown}
        >
          {selected ?? 'Choose'}
        </button>
        {open && (
          <ul ref={listbox} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}>
            {names.map((name, index) => (
              <li key={name} id={`${id}-option-${index}`} role="option" aria-selected={name === selected} {...roving.itemProps(index)}>
                {name}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const trigger = () => screen.getByRole('combobox');
  const listbox = () => screen.queryByRole('listbox');

  it('opens from the trigger and leaves focus on it', async () => {
    const user = keyboard();
    render(<Select />);

    await user.click(trigger());

    expect(listbox()).toBeInTheDocument();
    expectFocusOn(trigger());
  });

  it('names the highlighted option without moving focus to it', async () => {
    const user = keyboard();
    render(<Select />);
    await user.click(trigger());

    await user.pressArrow('Down');

    expectFocusOn(trigger());
    expect(trigger()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Grace' }).id);
  });

  it('picks with Enter, closes, and shows what was picked', async () => {
    const user = keyboard();
    render(<Select />);
    await user.click(trigger());

    await user.pressArrow('Down');
    await user.press('Enter');

    expect(listbox()).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent('Grace');
    expectFocusOn(trigger());
  });

  it('finds an option by typing at it', async () => {
    const user = keyboard();
    render(<Select />);
    await user.click(trigger());

    await user.type('gr');

    expect(trigger()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Grace' }).id);
  });

  it('closes on Escape with nothing picked, focus still on the trigger', async () => {
    const user = keyboard();
    render(<Select />);
    await user.click(trigger());

    await user.press('Escape');

    expect(listbox()).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent('Choose');
    expectFocusOn(trigger());
  });

  it('closes on a press outside', async () => {
    const user = keyboard();
    render(
      <>
        <Select />
        <button>Elsewhere</button>
      </>,
    );
    await user.click(trigger());

    await user.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(listbox()).not.toBeInTheDocument();
  });

  it('stays open when the press is on one of its own parts', async () => {
    const user = keyboard();
    render(<Select />);
    await user.click(trigger());

    await user.click(screen.getByRole('option', { name: 'Alan' }));

    expect(listbox()).toBeInTheDocument();
  });

  it('has no axe violations, open or closed', async () => {
    const user = keyboard();
    render(<Select />);

    await expectNoAxeViolations(document.body);

    await user.click(trigger());

    await expectNoAxeViolations(document.body);
  });
});
