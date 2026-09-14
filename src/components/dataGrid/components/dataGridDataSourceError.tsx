import Box from '../../../box';
import Button from '../../button';
import Flex from '../../flex';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * What a failed block says. One strip for the grid rather than a message per block: a reader cannot act
 * on "block 37 did not load", and Retry asks for every block that failed, which is the page in front of
 * them. An `Error`'s own message is shown when there is one — a datasource throws whatever its API threw,
 * and hiding it behind a generic line leaves nothing to debug from.
 */
export default function DataGridDataSourceError<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { error } = grid.source;

  if (error === undefined) return null;

  const message = error instanceof Error && error.message ? error.message : 'Could not load rows.';

  return (
    <Flex component={`${grid.componentName}.error` as never} props={{ role: 'alert' }}>
      <Box component={`${grid.componentName}.error.message` as never}>{message}</Box>
      <Button component={`${grid.componentName}.error.retry` as never} type="button" onClick={grid.source.retry}>
        Retry
      </Button>
    </Flex>
  );
}

(DataGridDataSourceError as React.FunctionComponent).displayName = 'DataGridDataSourceError';
