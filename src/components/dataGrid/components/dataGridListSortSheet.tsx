import SortIcon from '../../../icons/sortIcon';
import Button from '../../button';
import Flex from '../../flex';
import RadioButton from '../../radioButton';
import GridModel from '../models/gridModel';
import DataGridListLayout from './dataGridListLayout';
import DataGridListSheet from './dataGridListSheet';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The Sort button and the sheet it opens. A list has no headers to press, so the sort is a choice of column
 * and a choice of direction — two radio groups, applied as they are picked, since a sort is one decision.
 */
export default function DataGridListSortSheet<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { list } = grid;
  const name = grid.componentName;
  const text = grid.localeText;
  const sorted = list.sortedColumn;
  const descending = grid.sortDirection === 'DESC';
  const groupName = `${grid.identifier}-sort`;
  const option = {
    component: `${name}.list.sheet.line`,
    display: 'flex',
    ai: 'center',
    gap: 3,
    minHeight: 12,
    fontSize: 16,
    cursor: 'pointer',
    bb: 1,
  } as never;

  return (
    <DataGridListSheet
      grid={grid}
      open={list.sheet === 'sort'}
      onClose={() => list.openSheet(null)}
      title={text.sortBy}
      onOpen={() => list.openSheet('sort')}
      trigger={({ ref, props: { onClick, ...attributes } }) => (
        <Button
          type="button"
          component={`${name}.list.toolbar.button` as never}
          variant={{ active: !!sorted } as never}
          {...DataGridListLayout.PILL}
          ref={ref}
          onClick={onClick}
          props={attributes}
        >
          <SortIcon width="16px" height="16px" fill="currentColor" rotate={descending ? 180 : 0} />
          {sorted ? text.sortedBy(String(sorted.header ?? sorted.key), descending) : text.sortBy}
        </Button>
      )}
      footer={
        <>
          {sorted && (
            <Button
              type="button"
              component={`${name}.list.sheet.button` as never}
              {...DataGridListLayout.SHEET_BUTTON}
              onClick={() => grid.setSortColumn(sorted.key, undefined)}
            >
              {text.clearSort}
            </Button>
          )}
          <Button
            type="button"
            component={`${name}.list.sheet.primary` as never}
            {...DataGridListLayout.SHEET_BUTTON}
            flex1
            fontWeight={600}
            onClick={() => list.openSheet(null)}
          >
            {text.close}
          </Button>
        </>
      }
    >
      <Flex tag="fieldset" d="column" b={0} m={0} p={0} props={{ 'aria-label': text.sortBy }}>
        {list.sortableColumns.map((column) => (
          <RadioButton
            key={column.key}
            name={groupName}
            checked={sorted === column}
            // A column picked keeps the direction already chosen; the direction is the second question, below.
            onChange={() => grid.setSortColumn(column.key, descending && sorted ? 'DESC' : 'ASC')}
            label={column.header ?? String(column.key)}
            labelProps={option}
          />
        ))}
      </Flex>

      {sorted && (
        <Flex tag="fieldset" d="column" b={0} m={0} p={0} pt={4} props={{ 'aria-label': `${text.sortBy}: ${sorted.header ?? sorted.key}` }}>
          {(['ASC', 'DESC'] as const).map((direction) => (
            <RadioButton
              key={direction}
              name={`${groupName}-direction`}
              checked={grid.sortDirection === direction}
              onChange={() => grid.setSortColumn(sorted.key, direction)}
              label={direction === 'ASC' ? text.ascending : text.descending}
              labelProps={option}
            />
          ))}
        </Flex>
      )}
    </DataGridListSheet>
  );
}

(DataGridListSortSheet as React.FunctionComponent).displayName = 'DataGridListSortSheet';
