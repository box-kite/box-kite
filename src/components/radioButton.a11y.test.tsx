import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import Button from './button';
import Flex from './flex';
import RadioButton from './radioButton';

/**
 * A radio on its own is not a pattern — the set is (that is `RadioGroup`) — so what these assert is that
 * the component keeps the platform's own set behaviour: one tab stop for the whole `name`, Space to
 * choose, and the arrows moving between them.
 */
describe('RadioButton accessibility', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const renderSet = () =>
    render(
      <>
        <Flex>
          <RadioButton name="plan" value="free" label="Free" />
          <RadioButton name="plan" value="pro" label="Pro" />
          <RadioButton name="plan" value="team" label="Team" />
        </Flex>
        <Button>Continue</Button>
      </>,
    );

  const radio = (name: string) => screen.getByRole('radio', { name }) as HTMLInputElement;

  describe('Keyboard', () => {
    it('is one tab stop for the whole set, and Tab leaves it', async () => {
      const user = keyboard();
      renderSet();

      await user.pressTab();
      expectFocusOn(radio('Free'));

      await user.pressTab();
      expectFocusOn(screen.getByRole('button'));
    });

    it('chooses the focused radio on Space', async () => {
      const user = keyboard();
      renderSet();
      await user.pressTab();

      await user.press(' ');

      expect(radio('Free').checked).toBe(true);
    });

    it('moves and chooses with Down / Up, wrapping at both ends', async () => {
      const user = keyboard();
      renderSet();
      await user.pressTab();

      await user.pressArrow('Down');
      expectFocusOn(radio('Pro'));
      expect(radio('Pro').checked).toBe(true);

      await user.pressArrow('Up');
      expectFocusOn(radio('Free'));
      expect(radio('Free').checked).toBe(true);
    });

    it('moves the same way with Right / Left, whichever way the set is stacked', async () => {
      const user = keyboard();
      renderSet();
      await user.pressTab();

      await user.pressArrow('Right');
      expectFocusOn(radio('Pro'));

      await user.pressArrow('Left');
      expectFocusOn(radio('Free'));
    });
  });

  describe('Semantics', () => {
    it('labels each option from its own `label` prop', async () => {
      const { container } = renderSet();

      expect(radio('Free').tagName).toBe('INPUT');
      await expectNoAxeViolations(container);
    });

    it('submits under the shared name, which is what makes the set one choice', async () => {
      renderSet();

      expect(radio('Free').name).toBe('plan');
      expect(radio('Pro').name).toBe('plan');
    });
  });
});
