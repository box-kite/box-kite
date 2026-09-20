import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ApprovalCard, Reasoning, ToolCallCard } from './agent';
import Button from './button';

/**
 * The agent chrome from the keyboard. None of the three is a composite widget — a transcript is a list of
 * independent cards, so each control is its own tab stop and there are no arrow keys to answer for.
 * What is asserted here is the disclosure pattern on the two cards that have one
 * (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/), and that a decision can be reached and made
 * without a pointer.
 */
describe('Agent chrome accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('ToolCallCard', () => {
    it('is one tab stop, and opens on Enter and on Space', async () => {
      const kb = keyboard();
      render(
        <>
          <Button>Before</Button>
          <ToolCallCard name="searchOrders" input={{ query: 'refunds' }} />
          <Button>After</Button>
        </>,
      );

      const header = screen.getByRole('button', { name: /searchOrders/ });

      await kb.pressTab();
      await kb.pressTab();
      expectFocusOn(header);

      await kb.press('Enter');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      await kb.press(' ');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      await kb.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'After' }));
    });

    it('puts nothing in the tab sequence when there is nothing to open', async () => {
      const kb = keyboard();
      render(
        <>
          <Button>Before</Button>
          <ToolCallCard name="ping" status="success" />
          <Button>After</Button>
        </>,
      );

      await kb.pressTab();
      await kb.pressTab();

      expectFocusOn(screen.getByRole('button', { name: 'After' }));
    });

    it('passes the sweep in every status, open and closed', async () => {
      const { container } = render(
        <>
          <ToolCallCard name="pending" status="pending" />
          <ToolCallCard name="running" status="running" input={{ query: 'refunds' }} />
          <ToolCallCard name="success" status="success" defaultOpen output={[{ id: 1 }]} />
          <ToolCallCard name="failed" status="error" defaultOpen error="Rate limited" />
        </>,
      );

      await expectNoAxeViolations(container);
    });
  });

  describe('ApprovalCard', () => {
    it('reaches both buttons in order and decides from the keyboard', async () => {
      const kb = keyboard();
      render(<ApprovalCard title="Refund order 4182" />);

      const reject = screen.getByRole('button', { name: 'Reject' });
      const approve = screen.getByRole('button', { name: 'Approve' });

      await kb.pressTab();
      expectFocusOn(reject);

      await kb.pressTab();
      expectFocusOn(approve);

      await kb.press('Enter');
      expect(screen.getByRole('status')).toHaveTextContent('Approved');
    });

    it('steps over both buttons while the decision is in flight', async () => {
      const kb = keyboard();
      render(
        <>
          <ApprovalCard title="Refund order 4182" busy />
          <Button>After</Button>
        </>,
      );

      await kb.pressTab();

      expectFocusOn(screen.getByRole('button', { name: 'After' }));
    });

    it('passes the sweep undecided, decided and busy', async () => {
      const { container } = render(
        <>
          <ApprovalCard title="Refund order 4182" description="6,400 MDL back to the customer." input={{ orderId: 4182 }} />
          <ApprovalCard title="Delete the view" defaultDecision="rejected" />
          <ApprovalCard title="Send the report" busy />
        </>,
      );

      await expectNoAxeViolations(container);
    });
  });

  describe('Reasoning', () => {
    it('is one tab stop whose header opens the thought', async () => {
      const kb = keyboard();
      render(
        <>
          <Button>Before</Button>
          <Reasoning>The refund window closed on the 4th.</Reasoning>
          <Button>After</Button>
        </>,
      );

      const trigger = screen.getByRole('button', { name: /Reasoning/ });

      await kb.pressTab();
      await kb.pressTab();
      expectFocusOn(trigger);

      await kb.press('Enter');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await kb.pressTab();
      expectFocusOn(screen.getByRole('button', { name: 'After' }));
    });

    it('passes the sweep streaming, closed and open', async () => {
      const { container } = render(
        <>
          <Reasoning streaming>Half a th</Reasoning>
          <Reasoning duration={4200}>The refund window closed on the 4th.</Reasoning>
          <Reasoning defaultOpen duration={900}>
            Nothing matched, so the search widened.
          </Reasoning>
        </>,
      );

      await expectNoAxeViolations(container);
    });
  });
});
