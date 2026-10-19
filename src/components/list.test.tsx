import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Checkbox from './checkbox';
import List from './list';

describe('List', () => {
  afterEach(cleanup);

  it('is a list of items a reader can count, with the role spelled out for Safari', () => {
    render(
      <List>
        <List.Item>One</List.Item>
        <List.Item>Two</List.Item>
      </List>,
    );

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('role', 'list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('becomes an ordered list on `tag="ol"`', () => {
    render(
      <List tag="ol">
        <List.Item>First</List.Item>
      </List>,
    );

    expect(screen.getByRole('list').tagName).toBe('OL');
  });

  it('keeps the attributes it is given beside the role', () => {
    render(
      <List props={{ 'aria-label': 'Inbox' }}>
        <List.Item>One</List.Item>
      </List>,
    );

    expect(screen.getByRole('list', { name: 'Inbox' })).toBeInTheDocument();
  });

  describe('List.Action', () => {
    it('is a link when it has somewhere to go, named by its own text', () => {
      render(
        <List>
          <List.Item>
            <List.Content>
              <List.Title>
                <List.Action props={{ href: '/inbox/42' }}>Ada Lovelace</List.Action>
              </List.Title>
              <List.Description>The engine might compose music.</List.Description>
            </List.Content>
          </List.Item>
        </List>,
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName('Ada Lovelace');
      expect(link).toHaveAttribute('href', '/inbox/42');
      expect(link).toHaveAttribute('data-list-action');
    });

    it('is a button that submits nothing when it has nowhere to go', () => {
      const onClick = vi.fn();
      render(
        <List>
          <List.Item>
            <List.Title>
              <List.Action onClick={onClick}>Open</List.Action>
            </List.Title>
          </List.Item>
        </List>,
      );

      const button = screen.getByRole('button', { name: 'Open' });
      expect(button).toHaveAttribute('type', 'button');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is the label of the checkbox it names, so a press anywhere on the item ticks it', () => {
      render(
        <List>
          <List.Item>
            <List.Actions>
              <Checkbox id="pick-ada" />
            </List.Actions>
            <List.Title>
              <List.Action props={{ htmlFor: 'pick-ada' }}>Ada Lovelace</List.Action>
            </List.Title>
          </List.Item>
        </List>,
      );

      const checkbox = screen.getByRole('checkbox', { name: 'Ada Lovelace' });
      expect(checkbox).not.toBeChecked();
      fireEvent.click(screen.getByText('Ada Lovelace'));
      expect(checkbox).toBeChecked();
    });

    it('lets a caller choose the element outright', () => {
      render(
        <List>
          <List.Item>
            <List.Title>
              <List.Action tag="a" props={{ role: 'link', 'aria-disabled': true }}>
                Archived
              </List.Action>
            </List.Title>
          </List.Item>
        </List>,
      );

      expect(screen.getByRole('link', { name: 'Archived' }).tagName).toBe('A');
    });
  });

  it('ends a drill-in item with a chevron a reader is not told about', () => {
    const { container } = render(
      <List>
        <List.Item chevron>Settings</List.Item>
      </List>,
    );

    const chevron = container.querySelector('li > [aria-hidden="true"]');
    expect(chevron).not.toBeNull();
    expect(chevron?.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('listitem')).toHaveTextContent('Settings');
  });

  it('pairs every value with its label in a description list', () => {
    render(
      <List>
        <List.Item>
          <List.Fields>
            <List.Field label="Status">Paid</List.Field>
            <List.Field label="Total">€42.00</List.Field>
          </List.Fields>
        </List.Item>
      </List>,
    );

    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');
    expect(terms.map((term) => term.textContent)).toEqual(['Status', 'Total']);
    expect(definitions.map((definition) => definition.textContent)).toEqual(['Paid', '€42.00']);
    expect(terms[0].parentElement?.tagName).toBe('DIV');
    expect(terms[0].parentElement?.parentElement?.tagName).toBe('DL');
  });

  describe('List.Group', () => {
    it('is an item holding its label and a list of its own', () => {
      render(
        <List>
          <List.Group label="Today">
            <List.Item>Standup</List.Item>
            <List.Item>Review</List.Item>
          </List.Group>
        </List>,
      );

      const [outer, inner] = screen.getAllByRole('list');
      expect(within(outer).getAllByRole('listitem')[0]).toHaveTextContent('Today');
      expect(within(inner).getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByRole('heading')).toBeNull();
    });

    it('makes its label a heading of the level it is given', () => {
      render(
        <List>
          <List.Group label="Yesterday" level={3}>
            <List.Item>Planning</List.Item>
          </List.Group>
        </List>,
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Yesterday' })).toBeInTheDocument();
    });

    it('sticks its label only when asked', () => {
      render(
        <List>
          <List.Group label="Pinned" sticky>
            <List.Item>One</List.Item>
          </List.Group>
          <List.Group label="Others">
            <List.Item>Two</List.Item>
          </List.Group>
        </List>,
      );

      expect(screen.getByText('Pinned').className).toContain('position-sticky');
      expect(screen.getByText('Others').className).not.toContain('position-sticky');
    });
  });

  describe('how far text runs', () => {
    it('ends one line in an ellipsis and clamps two or three', () => {
      render(
        <List>
          <List.Item>
            <List.Title lines={1}>One</List.Title>
            <List.Description lines={2}>Two</List.Description>
            <List.Overline lines={3}>Three</List.Overline>
          </List.Item>
        </List>,
      );

      expect(screen.getByText('One').className).toContain('textOverflow-ellipsis');
      expect(screen.getByText('Two').className).toContain('WebkitLineClamp-2');
      expect(screen.getByText('Three').className).toContain('WebkitLineClamp-3');
    });

    it('wraps when it is told nothing', () => {
      render(
        <List>
          <List.Item>
            <List.Title>A long name that wraps</List.Title>
          </List.Item>
        </List>,
      );

      expect(screen.getByText('A long name that wraps').className).not.toMatch(/textOverflow|WebkitLineClamp/);
    });

    it('is a span, so a title can sit inside a link or a button', () => {
      render(
        <List>
          <List.Item>
            <List.Action>
              <List.Title>Inside</List.Title>
            </List.Action>
          </List.Item>
        </List>,
      );

      expect(screen.getByText('Inside').tagName).toBe('SPAN');
    });
  });

  describe('an item and a row', () => {
    it('wrap their parts onto a new line when asked, and only then', () => {
      render(
        <List>
          <List.Item wrap>
            <List.Row wrap>Tags</List.Row>
            <List.Row>Plain</List.Row>
          </List.Item>
        </List>,
      );

      expect(screen.getByRole('listitem').className).toContain('flexWrap-wrap');
      expect(screen.getByText('Tags').className).toContain('flexWrap-wrap');
      expect(screen.getByText('Plain').className).not.toContain('flexWrap-wrap');
    });

    it('take their size, a selection tint and a secondary row as variants beside the caller’s own', () => {
      render(
        <List>
          <List.Item size="sm" selected>
            <List.Row secondary>Muted</List.Row>
          </List.Item>
          <List.Item size="lg">Roomy</List.Item>
        </List>,
      );

      const [small, large] = screen.getAllByRole('listitem');
      expect(small.className).toContain('minHeight-11');
      expect(small.className).toContain('bgColor-accent-500/10');
      expect(large.className).toContain('minHeight-18');
      expect(screen.getByText('Muted').className).toContain('fontSize-14');
    });

    it('lets a prop beat the component’s own spacing', () => {
      render(
        <List>
          <List.Item py={1}>Tight</List.Item>
        </List>,
      );

      const item = screen.getByRole('listitem');
      expect(item.className).toContain('py-1');
      expect(item.className).not.toContain('py-3');
    });
  });

  it('renders on a server, with no effect to wait for', () => {
    const html = renderToString(
      <List variant="card">
        <List.Group label="Today" sticky>
          <List.Item chevron>
            <List.Media variant="avatar">AL</List.Media>
            <List.Content>
              <List.Row>
                <List.Title lines={1}>
                  <List.Action props={{ href: '/a' }}>Ada</List.Action>
                </List.Title>
                <List.Meta>9:41</List.Meta>
              </List.Row>
            </List.Content>
            <List.End>€42</List.End>
          </List.Item>
        </List.Group>
      </List>,
    );

    expect(html).toContain('role="list"');
    expect(html).toContain('href="/a"');
    expect(html).toContain('€42');
  });
});
