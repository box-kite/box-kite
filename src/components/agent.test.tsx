import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApprovalCard, ApprovalDecision, Reasoning, ToolCallCard } from './agent';

describe('ToolCallCard', () => {
  afterEach(cleanup);

  const header = () => screen.getByRole('button');

  it('names the call and says where it got to, in a word', () => {
    render(<ToolCallCard name="searchOrders" status="running" input={{ query: 'refunds' }} />);

    expect(header()).toHaveTextContent('searchOrders');
    expect(header()).toHaveTextContent('Running');
  });

  it('reports aria-busy only while it is running', () => {
    const { container, rerender } = render(<ToolCallCard name="searchOrders" status="running" input={{}} />);
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');

    rerender(<ToolCallCard name="searchOrders" status="success" input={{}} />);
    expect(container.firstElementChild).not.toHaveAttribute('aria-busy');
  });

  it('opens and closes on the header, wiring aria-expanded to the body it controls', () => {
    render(<ToolCallCard name="searchOrders" input={{ query: 'refunds' }} />);

    expect(header()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(header());
    expect(header()).toHaveAttribute('aria-expanded', 'true');

    const body = document.getElementById(header().getAttribute('aria-controls')!);
    expect(body).toHaveTextContent('"query": "refunds"');
  });

  it('reports the change with a reason, and lets the consumer own it', () => {
    const onOpenChange = vi.fn();
    render(<ToolCallCard name="searchOrders" open={false} onOpenChange={onOpenChange} input={{}} />);

    fireEvent.click(header());

    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'trigger' }));
    // Controlled, so the card is still closed: the consumer decides.
    expect(header()).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders no control at all when there is nothing to disclose', () => {
    render(<ToolCallCard name="ping" status="success" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('ping')).toBeInTheDocument();
  });

  it('is a plain row when collapsible is off, however much it has to show', () => {
    render(<ToolCallCard name="ping" collapsible={false} input={{ a: 1 }} output={{ b: 2 }} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/"a": 1/)).toBeNull();
  });

  it('shows the three values under their own words, in order', () => {
    render(<ToolCallCard name="searchOrders" defaultOpen status="error" input={{ a: 1 }} output={{ b: 2 }} error="Rate limited" />);

    const labels = screen.getAllByText(/^(Input|Output|Error)$/).map((node) => node.textContent);

    expect(labels).toEqual(['Input', 'Output', 'Error']);
    expect(screen.getByText('Rate limited')).toBeInTheDocument();
  });

  it('leaves a falsy value in and an absent one out', () => {
    render(<ToolCallCard name="count" defaultOpen input={0} output={null} />);

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.queryByText('Output')).toBeNull();
  });

  it('cuts a value the model made too big, and says how much was left', () => {
    render(<ToolCallCard name="dump" defaultOpen output={'x'.repeat(40)} valueLimit={10} />);

    expect(screen.getByText('30 more characters, not shown')).toBeInTheDocument();
  });

  it('takes Box props and a style-tree key like every other component', () => {
    const { container } = render(<ToolCallCard name="ping" bgColor="sky-500" />);

    expect(container.firstElementChild!.className).toContain('bgColor-sky-500');
  });
});

describe('ApprovalCard', () => {
  afterEach(cleanup);

  const approve = () => screen.getByRole('button', { name: 'Approve' });
  const reject = () => screen.getByRole('button', { name: 'Reject' });

  it('is a group named by its title', () => {
    render(<ApprovalCard title="Refund order 4182" />);

    const group = screen.getByRole('group', { name: 'Refund order 4182' });

    expect(group).toBeInTheDocument();
  });

  it('reports the decision and which button made it', () => {
    const onDecisionChange = vi.fn();
    render(<ApprovalCard title="Refund order 4182" onDecisionChange={onDecisionChange} />);

    fireEvent.click(approve());

    expect(onDecisionChange).toHaveBeenCalledWith('approved', expect.objectContaining({ reason: 'approve' }));
  });

  it('replaces the buttons with the answer once one has been pressed', () => {
    render(<ApprovalCard title="Refund order 4182" />);

    fireEvent.click(reject());

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Rejected');
  });

  it('keeps the live region in the DOM before there is anything to announce', () => {
    render(<ApprovalCard title="Refund order 4182" />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('disables both buttons and says so while the decision is in flight', () => {
    const { container } = render(<ApprovalCard title="Refund order 4182" busy />);

    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(approve()).toBeDisabled();
    expect(reject()).toBeDisabled();
  });

  it('shows the call it is gating, formatted the way a tool card shows its input', () => {
    render(<ApprovalCard title="Refund order 4182" input={{ orderId: 4182 }} />);

    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText(/"orderId": 4182/)).toBeInTheDocument();
  });

  it('lets the consumer own the decision', () => {
    function Controlled() {
      const [decision, setDecision] = useState<ApprovalDecision | null>(null);

      return <ApprovalCard title="Refund" decision={decision} onDecisionChange={(next) => setDecision(next)} />;
    }

    render(<Controlled />);
    fireEvent.click(approve());

    expect(screen.getByRole('status')).toHaveTextContent('Approved');
  });

  it('takes focus on mount only when it is asked to, and then on the least destructive button', () => {
    const { unmount } = render(<ApprovalCard title="Refund" />);
    expect(document.activeElement).toBe(document.body);
    unmount();

    render(<ApprovalCard title="Refund" autoFocus />);
    expect(document.activeElement).toBe(reject());
  });
});

describe('Reasoning', () => {
  afterEach(cleanup);

  const trigger = () => screen.getByRole('button');

  it('is closed by default, and opens on its header', () => {
    render(<Reasoning>The refund window closed on the 4th.</Reasoning>);

    expect(trigger()).toHaveTextContent('Reasoning');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('says it is thinking, and reports aria-busy, while the thought is still arriving', () => {
    const { container } = render(<Reasoning streaming>Half a th</Reasoning>);

    expect(trigger()).toHaveTextContent('Thinking…');
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
  });

  it('says how long it took, once it is over', () => {
    const { rerender } = render(<Reasoning streaming duration={4200} />);
    expect(trigger()).not.toHaveTextContent('Thought for');

    rerender(<Reasoning duration={4200} />);
    expect(trigger()).toHaveTextContent('Thought for 4.2s');
  });

  it('names the body it controls', () => {
    render(<Reasoning defaultOpen>The refund window closed on the 4th.</Reasoning>);

    const body = document.getElementById(trigger().getAttribute('aria-controls')!);

    expect(body).toHaveTextContent('The refund window closed on the 4th.');
  });
});
