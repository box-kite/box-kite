import Box from '../../../box';
import BaseSvg from '../../baseSvg';
import Dropdown from '../../dropdown';
import Flex from '../../flex';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridTopBarContextMenu<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { columnVisibility } = grid;
  const { entries, selectedIds, total, hasHidden } = columnVisibility;

  const handleChange = (_value: string | undefined, values: string[]) => {
    columnVisibility.setVisibility(values);
  };

  return (
    <Dropdown<string>
      component={`${grid.componentName}.topBar.columnVisibility` as never}
      multiple
      showCheckbox
      hideIcon
      variant="compact"
      value={selectedIds}
      onChange={handleChange}
      isSearchable={entries.length > 6}
      searchPlaceholder={grid.localeText.columnsMenuSearchPlaceholder}
      display="inline-flex"
      // A combobox is never named by what it contains, and this one contains an icon: without a
      // name it announces as nothing at all, which is bug #50's half that A5 and A6 left behind.
      props={{ 'aria-label': grid.localeText.columnsMenu }}
    >
      <Dropdown.Display<string>>
        {(selected) => {
          const noneSelected = selected.length === 0;

          return (
            <Flex ai="center" gap={2}>
              {/* Columns icon - vertical bars representing table columns */}
              <BaseSvg viewBox="0 0 20 20" width="18" height="18">
                <rect x="2" y="3" width="4" height="14" rx="1" fill="currentColor" opacity={0.9} />
                <rect x="8" y="3" width="4" height="14" rx="1" fill="currentColor" opacity={0.6} />
                <rect x="14" y="3" width="4" height="14" rx="1" fill="currentColor" opacity={0.3} />
              </BaseSvg>
              {hasHidden && (
                <Box
                  component={`${grid.componentName}.topBar.columnVisibility.badge` as never}
                  tag="span"
                  fontSize={11}
                  lineHeight={16}
                  fontWeight={500}
                  px={2}
                  py={0.5}
                  borderRadius={1}
                  bgColor={noneSelected ? 'red-100' : 'amber-100'}
                  color={noneSelected ? 'red-700' : 'amber-700'}
                  theme={{
                    dark: {
                      bgColor: noneSelected ? 'red-900' : 'amber-900',
                      color: noneSelected ? 'red-300' : 'amber-300',
                    },
                  }}
                >
                  {selected.length}/{total}
                </Box>
              )}
            </Flex>
          );
        }}
      </Dropdown.Display>

      <Dropdown.SelectAll>{grid.localeText.columnsMenuShowAll}</Dropdown.SelectAll>
      <Dropdown.Unselect>{grid.localeText.columnsMenuHideAll}</Dropdown.Unselect>

      {entries.map((entry) => (
        <Dropdown.Item<string> key={entry.id} value={entry.id} textWrap="nowrap">
          {entry.label}
        </Dropdown.Item>
      ))}
    </Dropdown>
  );
}

(DataGridTopBarContextMenu as React.FunctionComponent).displayName = 'DataGridTopBarContextMenu';
