import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Checkbox from '@box-kite/react/components/checkbox';
import DataGrid from '@box-kite/react/components/dataGrid';
import Dialog from '@box-kite/react/components/dialog';
import Dropdown from '@box-kite/react/components/dropdown';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import RadioGroup from '@box-kite/react/components/radioGroup';
import { H1, H2, P } from '@box-kite/react/components/semantics';
import Slider from '@box-kite/react/components/slider';
import Switch from '@box-kite/react/components/switch';
import Tabs from '@box-kite/react/components/tabs';
import Textbox from '@box-kite/react/components/textbox';

const people = [
  { name: 'Ada Lovelace', role: 'Analyst', city: 'London', age: 36 },
  { name: 'Grace Hopper', role: 'Admiral', city: 'New York', age: 85 },
  { name: 'Alan Turing', role: 'Mathematician', city: 'Wilmslow', age: 41 },
  {
    name: 'Katherine Johnson',
    role: 'Mathematician',
    city: 'Hampton',
    age: 101,
  },
];

/** A page of the components a design reaches, to see the one you pasted in light and dark. */
export default function App() {
  const [theme, setTheme] = Box.useTheme();

  return (
    <Box maxWidth={240} mx="auto" px={6} py={12}>
      <Flex ai="center" jc="space-between" gap={4} mb={2}>
        <H1 fontSize={40} lineHeight={48}>
          Hello, Box Kite
        </H1>
        <Button variant="secondary" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light' : 'Dark'} mode
        </Button>
      </Flex>
      <P mb={10} color="base-500">
        Every component below is drawn by the design in src/design.tsx.
      </P>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={10}>
        <Flex d="column" gap={4}>
          <H2 fontSize={20}>Actions</H2>
          <Flex gap={3} flexWrap="wrap">
            <Button>Save changes</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">Skip</Button>
          </Flex>
          <Flex>
            <Dialog trigger={(trigger) => <Button {...trigger}>Open a dialog</Button>}>
              <Dialog.Title>Rename this view</Dialog.Title>
              <Dialog.Description>The name is only shown to you.</Dialog.Description>
              <Flex d="column" gap={4} mt={5}>
                <Textbox placeholder="Name" props={{ 'aria-label': 'Name' }} />
                <Flex jc="end">
                  <Button>Save</Button>
                </Flex>
              </Flex>
            </Dialog>
          </Flex>
        </Flex>

        <Flex d="column" gap={4}>
          <H2 fontSize={20}>Fields</H2>
          <Textbox placeholder="Your email" props={{ 'aria-label': 'Email' }} />
          <Dropdown label="Plan" defaultValue="pro" width="fit" labelProps={{ width: 'fit' }}>
            <Dropdown.Item value="free">Free</Dropdown.Item>
            <Dropdown.Item value="pro">Pro</Dropdown.Item>
            <Dropdown.Item value="team">Team</Dropdown.Item>
          </Dropdown>
        </Flex>

        <Flex d="column" gap={4}>
          <H2 fontSize={20}>Choices</H2>
          <Checkbox label="Accept the terms" defaultChecked />
          <Checkbox label="Select all rows" indeterminate />
          <Switch label="Email notifications" defaultChecked />
          <RadioGroup label="Billing" orientation="horizontal" defaultValue="monthly">
            <RadioGroup.Item value="monthly" label="Monthly" />
            <RadioGroup.Item value="yearly" label="Yearly" />
          </RadioGroup>
          <Slider label="Volume" defaultValue={40} />
        </Flex>

        <Flex d="column" gap={4}>
          <H2 fontSize={20}>Tabs</H2>
          <Tabs defaultValue="overview">
            <Tabs.List label="Project">
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="activity">Activity</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview">Who is on it, and what is left.</Tabs.Panel>
            <Tabs.Panel value="activity">What changed this week.</Tabs.Panel>
            <Tabs.Panel value="settings">Names, members and access.</Tabs.Panel>
          </Tabs>
        </Flex>
      </Grid>

      <H2 fontSize={20} mt={12} mb={4}>
        Data
      </H2>
      <DataGrid
        data={people}
        def={{
          rowKey: 'name',
          visibleRowsCount: 'all',
          rowSelection: true,
          columns: [
            {
              key: 'person',
              header: 'Person',
              columns: [
                { key: 'name', header: 'Name' },
                { key: 'role', header: 'Role' },
              ],
            },
            { key: 'city', header: 'City' },
            { key: 'age', header: 'Age', align: 'end' },
          ],
        }}
      />
    </Box>
  );
}
