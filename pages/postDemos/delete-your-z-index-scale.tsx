import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Dropdown from '../../src/components/dropdown';
import Flex from '../../src/components/flex';
import Menu from '../../src/components/menu';
import Popover from '../../src/components/popover';
import Tooltip from '../../src/components/tooltip';

// The article's own snippets, run: an image named `filter-card.png` is replaced by `FilterCard`. Keep each identical to its code block.
export function FilterCard() {
  return (
    <Box>
      <Box overflow="hidden" translateY={-1} p={4} b={1} borderColor="base-300" borderRadius={3}>
        <Popover label="Filters" align="start" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
          <Flex d="column" gap={2}>
            <Checkbox label="Only mine" />
            <Checkbox label="Has attachments" />
          </Flex>
        </Popover>
      </Box>
      <Box position="relative" css={{ zIndex: 9999 }} mt={2} p={3} borderRadius={2} bgColor="red-500" color="white" textAlign="end">
        A sibling with z-index: 9999
      </Box>
    </Box>
  );
}

export function Toolbar() {
  return (
    <Box.Theme use="local" theme="dark">
      <Flex gap={2} p={4} borderRadius={3} overflow="hidden" translateY={-1} bgColor="slate-900">
        <Popover label="Filters" align="start" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
          <Dropdown label="Owner" defaultValue="ada">
            <Dropdown.Item value="ada">Ada</Dropdown.Item>
            <Dropdown.Item value="grace">Grace</Dropdown.Item>
          </Dropdown>
        </Popover>
        <Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>
        <Menu trigger={(trigger) => <Button {...trigger}>Actions</Button>}>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu>
      </Flex>
    </Box.Theme>
  );
}
