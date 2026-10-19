import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Flex from '../../flex';
import GridModel from '../models/gridModel';
import DataGridListAggregate from './dataGridListAggregate';
import DataGridListLayout from './dataGridListLayout';

interface Props<TRow> {
  grid: GridModel<TRow>;
  /** How many rows are drawn — left out where groups or a tree make "of how many" a different question. */
  shown?: number;
}

/**
 * Under the items: the grand totals as one more summary block, then either the pager — when the host pages —
 * or "Show more". A button rather than an endless scroll, so the totals and whatever follows the grid on the
 * page stay reachable (NN/g), and a keyboard is never trapped above content that keeps arriving.
 */
export default function DataGridListFooter<TRow>(props: Props<TRow>) {
  const { grid, shown } = props;
  const { list, pagination, aggregation } = grid;
  const name = grid.componentName;
  const text = grid.localeText;
  const state = pagination.state;
  const totals = aggregation.hasFooter ? aggregation.footerCells.value.filter((cell) => cell.column.aggregate) : [];

  return (
    <>
      {totals.length > 0 && (
        <Box bgColor="currentColor/3" px={4} py={3}>
          <Box fontWeight={600} fontSize={14} mb={1}>
            {aggregation.footerLabel}
          </Box>
          <Box tag="dl" display="grid" gridTemplateColumns={2} columnGap={4} rowGap={2} m={0}>
            {totals.map((cell) => (
              <Box key={cell.column.key} minWidth={0}>
                <Box tag="dt" component="list.muted" fontSize={12} lineHeight={16}>
                  {cell.column.header ?? String(cell.column.key)}
                </Box>
                <Box tag="dd" m={0} fontSize={14} lineHeight={20} fontWeight={600}>
                  <DataGridListAggregate cell={cell} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {state ? (
        <Flex
          component="list.muted"
          d="column"
          gap={2}
          ai="center"
          px={4}
          py={4}
          fontSize={13}
          css={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <Flex ai="center" jc="space-between" gap={3} width="fit">
            <Button
              type="button"
              component={`${name}.list.button` as never}
              {...DataGridListLayout.ICON_BUTTON}
              borderRadius={3}
              disabled={!pagination.canGoPrev}
              onClick={pagination.prevPage}
              props={{ 'aria-label': text.previousPage }}
            >
              <ExpandIcon width="18px" height="18px" rotate={90} rtl={{ rotate: -90 }} />
            </Button>
            <Box textAlign="center">{text.pageRowRange(pagination.startItem, pagination.endItem, pagination.totalItems)}</Box>
            <Button
              type="button"
              component={`${name}.list.button` as never}
              {...DataGridListLayout.ICON_BUTTON}
              borderRadius={3}
              disabled={!pagination.canGoNext}
              onClick={pagination.nextPage}
              props={{ 'aria-label': text.nextPage }}
            >
              <ExpandIcon width="18px" height="18px" rotate={-90} rtl={{ rotate: 90 }} />
            </Button>
          </Flex>
        </Flex>
      ) : (
        (list.hasMore || shown !== undefined) && (
          <Flex
            component="list.muted"
            d="column"
            gap={2}
            ai="center"
            px={4}
            py={4}
            fontSize={13}
            css={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {list.hasMore && (
              <Button
                type="button"
                component={`${name}.list.button` as never}
                width="fit"
                height={11}
                borderRadius={3}
                fontSize={15}
                fontWeight={500}
                color="accent-600"
                cursor="pointer"
                theme={{ dark: { color: 'accent-300' } }}
                onClick={list.showMore}
              >
                {text.showMore(list.nextBatch)}
              </Button>
            )}
            {shown !== undefined && (
              <Box>{text.shownCount(shown, grid.source.enabled ? grid.totalRowCount : grid.filterStats.filtered)}</Box>
            )}
          </Flex>
        )
      )}
    </>
  );
}

(DataGridListFooter as React.FunctionComponent).displayName = 'DataGridListFooter';
