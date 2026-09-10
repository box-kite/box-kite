import { fireEvent, screen } from '@testing-library/react';
import { Sun } from 'lucide-react';
import BaseSvg from '../../src/components/baseSvg';
import Button from '../../src/components/button';
import { ChartContainer, Gauge, MiniDonut, ProgressRing, Sparkline } from '../../src/components/chart';
import Checkbox from '../../src/components/checkbox';
import DataGrid from '../../src/components/dataGrid';
import Dialog, { AlertDialog } from '../../src/components/dialog';
import Dropdown from '../../src/components/dropdown';
import Flex from '../../src/components/flex';
import Form from '../../src/components/form';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import Menu from '../../src/components/menu';
import Overlay from '../../src/components/overlay';
import Popover from '../../src/components/popover';
import RadioButton from '../../src/components/radioButton';
import RadioGroup from '../../src/components/radioGroup';
import Select from '../../src/components/select';
import { H1, Img, Link, Nav, P } from '../../src/components/semantics';
import { Circle, Polyline, Svg, SvgText } from '../../src/components/svg';
import Switch from '../../src/components/switch';
import Textarea from '../../src/components/textarea';
import Textbox from '../../src/components/textbox';
import Tooltip from '../../src/components/tooltip';
import VisuallyHidden from '../../src/components/visuallyHidden';

/**
 * One render per shipped component, in the smallest form its docs show — the thing a consumer copies;
 * `src/components/a11y.test.tsx` puts each through axe. A fixture may not wire up accessibility the
 * component still owes, though it must supply content no library could guess (an `<Img>` needs its
 * `alt`). They live in `dev/` because `src/components/*` is the build's entry glob.
 */
export interface A11yFixture {
  /** How the fixture is named in the test report. */
  name: string;
  /** The component the way the docs tell you to use it — what a consumer copy-pastes. */
  render(): React.ReactElement;
  /** Reach the state under test: open the popup, focus the trigger. Runs after render. */
  setup?(): void;
  /**
   * The rules that fail today, each mapped to the step that owns the fix. The sweep fails on a rule that is
   * *not* listed and on a listed rule that has stopped firing, so the ledger cannot rot into excuses.
   */
  knownViolations?: Record<string, string>;
}

interface Person {
  id: number;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: 1, name: 'Ada', age: 36 },
  { id: 2, name: 'Grace', age: 45 },
  { id: 3, name: 'Alan', age: 41 },
];

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
}

const departments = ['Engineering', 'Design', 'Sales'];

/**
 * Ten thousand rows, which is the point: virtualization is where a grid's ARIA usually breaks,
 * because the row numbers in the DOM stop being the row numbers in the grid.
 */
const employees: Employee[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: index + 1,
  name: `Employee ${index + 1}`,
  department: departments[index % departments.length],
  salary: 40_000 + (index % 50) * 1_000,
}));

const openPopup = () => fireEvent.click(screen.getByRole('combobox'));

export const fixtures: A11yFixture[] = [
  {
    name: 'Button',
    render: () => <Button>Save</Button>,
  },
  {
    name: 'Textbox',
    render: () => <Textbox name="email" placeholder="Email" />,
  },
  {
    name: 'Textarea',
    render: () => <Textarea name="bio" placeholder="Bio" />,
  },
  {
    name: 'Checkbox',
    render: () => <Checkbox name="terms" label="Accept the terms" />,
  },
  {
    // The mixed state is markup of its own — `aria-checked="mixed"` has to agree with the DOM
    // property, which axe checks, and only agrees because the effect setting it has run.
    name: 'Checkbox (indeterminate)',
    render: () => <Checkbox name="rows" label="Select all rows" indeterminate />,
  },
  {
    name: 'Switch',
    render: () => <Switch name="notify" label="Email notifications" />,
  },
  {
    name: 'RadioButton',
    render: () => (
      <Flex>
        <RadioButton name="plan" value="free" label="Free" />
        <RadioButton name="plan" value="pro" label="Pro" />
      </Flex>
    ),
  },
  {
    name: 'RadioGroup',
    render: () => (
      <RadioGroup label="Plan" name="plan" defaultValue="free">
        <RadioGroup.Item value="free" label="Free" />
        <RadioGroup.Item value="pro" label="Pro" />
      </RadioGroup>
    ),
  },
  {
    name: 'Flex',
    render: () => (
      <Flex gap={2}>
        <P>One</P>
        <P>Two</P>
      </Flex>
    ),
  },
  {
    name: 'Grid',
    render: () => (
      <Grid gap={2}>
        <P>One</P>
        <P>Two</P>
      </Grid>
    ),
  },
  {
    name: 'Semantics',
    render: () => (
      <Nav>
        <H1>Title</H1>
        <P>Body text</P>
        <Link props={{ href: '/about' }}>About</Link>
        <Img props={{ src: 'logo.png', alt: 'Box Kite' }} />
      </Nav>
    ),
  },
  {
    // The component exists to be *read* and not seen, so the sweep checks the thing that makes it
    // worth having: the button's accessible name comes from content axe can still find.
    name: 'VisuallyHidden',
    render: () => (
      <Button>
        <VisuallyHidden tag="span">Delete the invoice</VisuallyHidden>
        <span aria-hidden>x</span>
      </Button>
    ),
  },
  {
    name: 'BaseSvg',
    render: () => (
      <BaseSvg>
        <path d="M4 12h16" />
      </BaseSvg>
    ),
  },
  {
    // The icon set a consumer already has, given a name. Anything else is decoration and hides.
    name: 'Icon',
    render: () => (
      <Icon size={5} color="sky-500" label="Sunny">
        <Sun />
      </Icon>
    ),
  },
  {
    name: 'Svg',
    render: () => (
      <Svg viewBox="0 0 48 48" width={48} label="Revenue, rising" fill="none" stroke="blue-500" strokeWidth={2}>
        <Polyline points="4,40 16,24 28,30 44,8" />
        <Circle cx={44} cy={8} r={3} fill="blue-500" />
      </Svg>
    ),
  },
  {
    // A chart is the case where "unnamed means decoration" earns its keep: a sparkline beside the
    // number it summarises must not be read out twice, and one that is a cell on its own must be.
    name: 'Sparkline',
    render: () => <Sparkline data={[4, 9, 6, 12, 10, 15]} label="Revenue, last six months" />,
  },
  {
    name: 'Sparkline (decoration)',
    render: () => (
      <P>
        Revenue is up 12% <Sparkline data={[4, 9, 6, 12]} width="4rem" />
      </P>
    ),
  },
  {
    name: 'ProgressRing',
    render: () => <ProgressRing value={0.62} label="62% complete" />,
  },
  {
    name: 'Gauge',
    render: () => (
      <Gauge value={0.4} label="Load: 40%">
        <SvgText x={50} y={56} textAnchor="middle" fontSize={18} fill="gray-700" stroke="none">
          40%
        </SvgText>
      </Gauge>
    ),
  },
  {
    name: 'MiniDonut',
    render: () => <MiniDonut data={[5, 3, 2]} label="Sales by region" />,
  },
  {
    // A container declares variables and nothing else — no role, no name — so the drawing inside it
    // is still the only thing in the accessibility tree. That is the claim worth a fixture.
    name: 'ChartContainer',
    render: () => (
      <ChartContainer series={['revenue']}>
        <Sparkline data={[3, 8, 5, 11]} stroke="var(--color-revenue)" label="Revenue, last four quarters" />
      </ChartContainer>
    ),
  },
  {
    name: 'Form',
    render: () => (
      <Form onSubmit={() => {}}>
        <Textbox name="email" placeholder="Email" />
        <Button type="submit">Send</Button>
      </Form>
    ),
  },
  {
    name: 'Dropdown (closed)',
    render: () => (
      <Dropdown<string> label="Fruit" defaultValue="a">
        <Dropdown.Item value="a">Alpha</Dropdown.Item>
        <Dropdown.Item value="b">Beta</Dropdown.Item>
      </Dropdown>
    ),
  },
  {
    name: 'Dropdown (open)',
    render: () => (
      <Dropdown<string> label="Fruit" defaultValue="a">
        <Dropdown.Item value="a">Alpha</Dropdown.Item>
        <Dropdown.Item value="b">Beta</Dropdown.Item>
      </Dropdown>
    ),
    setup: openPopup,
  },
  {
    name: 'Dropdown (searchable, open)',
    render: () => (
      <Dropdown<string> label="Fruit" isSearchable searchPlaceholder="Search">
        <Dropdown.Item value="a">Alpha</Dropdown.Item>
        <Dropdown.Item value="b">Beta</Dropdown.Item>
      </Dropdown>
    ),
    // A6 made the input the combobox, so the search box no longer sits inside a `<button>` and
    // bug #47 is closed. Nothing here has ever fired: `nested-interactive` stopped applying the
    // moment A5 gave the trigger a combobox role, which is why the proof lives in
    // `dropdown.a11y.test.tsx` instead — this fixture only guards against a new violation.
    setup: openPopup,
  },
  {
    name: 'Select (open)',
    render: () => <Select<Person, number> label="Person" data={people} def={{ valueKey: 'id', displayKey: 'name' }} />,
    setup: openPopup,
  },
  {
    name: 'Tooltip',
    render: () => <Tooltip content="Deletes the row">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>,
  },
  {
    name: 'Tooltip (open)',
    render: () => (
      <Tooltip content="Deletes the row" defaultOpen>
        {(trigger) => <Button {...trigger}>Delete</Button>}
      </Tooltip>
    ),
  },
  {
    // The positioning primitive on its own carries no ARIA and should not: it is a place to render,
    // and the pattern belongs to whatever is rendered into it.
    name: 'Overlay',
    render: () => <Overlay>Anything, anywhere</Overlay>,
  },
  {
    name: 'Dialog (open)',
    render: () => (
      <Dialog defaultOpen trigger={(trigger) => <Button {...trigger}>Rename</Button>}>
        <Dialog.Title>Rename this view</Dialog.Title>
        <Dialog.Description>The name is only shown to you.</Dialog.Description>
        <Button>Save</Button>
      </Dialog>
    ),
  },
  {
    name: 'AlertDialog (open)',
    render: () => (
      <AlertDialog defaultOpen>
        <AlertDialog.Title>Delete this view?</AlertDialog.Title>
        <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
        <Button>Cancel</Button>
      </AlertDialog>
    ),
  },
  {
    name: 'Popover (open)',
    render: () => (
      <Popover label="Filters" defaultOpen trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
        <Checkbox label="Only mine" />
      </Popover>
    ),
  },
  {
    name: 'Menu (open)',
    render: () => (
      <Menu defaultOpen trigger={(trigger) => <Button {...trigger}>Actions</Button>}>
        <Menu.Item>Duplicate</Menu.Item>
        <Menu.Item disabled>Move</Menu.Item>
        <Menu.Separator />
        <Menu.Group label="View">
          <Menu.CheckboxItem defaultChecked>Compact rows</Menu.CheckboxItem>
        </Menu.Group>
        <Menu.RadioGroup label="Sort by" defaultValue="name">
          <Menu.RadioItem value="name">Name</Menu.RadioItem>
          <Menu.RadioItem value="date">Date</Menu.RadioItem>
        </Menu.RadioGroup>
        <Menu.Sub label="Share">
          <Menu.Item>Copy link</Menu.Item>
        </Menu.Sub>
      </Menu>
    ),
  },
  {
    name: 'DataGrid',
    render: () => (
      <DataGrid<Person>
        data={people}
        def={{
          rowKey: 'id',
          columns: [
            { key: 'name', header: 'Name' },
            { key: 'age', header: 'Age' },
          ],
        }}
      />
    ),
  },
  {
    // The flagship case, and the one every other grid library gets wrong: 10k rows behind a
    // virtualized window, grouped, selectable, filterable, with an expandable detail row. Every
    // ARIA number here describes rows and columns that are mostly *not* in the DOM.
    name: 'DataGrid (virtualized, grouped, selectable)',
    render: () => (
      <DataGrid<Employee>
        data={employees}
        def={{
          rowKey: 'id',
          title: 'Employees',
          rowSelection: true,
          showRowNumber: true,
          visibleRowsCount: 15,
          globalFilter: true,
          columns: [
            { key: 'name', header: 'Name', filterable: true },
            { key: 'department', header: 'Department', filterable: { type: 'multiselect' } },
            { key: 'salary', header: 'Salary', filterable: { type: 'number' } },
          ],
          rowDetail: {
            content: (row) => (
              <P>
                {row.name} sits in {row.department}.
              </P>
            ),
          },
        }}
      />
    ),
  },
];
