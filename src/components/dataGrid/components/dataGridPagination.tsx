import { useCallback, useState } from 'react';
import Box from '../../../box';
import Button from '../../button';
import Flex from '../../flex';
import { Path, Svg } from '../../svg';
import Textbox from '../../textbox';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridPagination<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { pagination } = grid;
  const state = pagination.state;

  const goFirst = useCallback(() => pagination.firstPage(), [pagination]);
  const goPrev = useCallback(() => pagination.prevPage(), [pagination]);
  const goNext = useCallback(() => pagination.nextPage(), [pagination]);
  const goLast = useCallback(() => pagination.lastPage(), [pagination]);

  if (!state) return null;

  const { canGoPrev, canGoNext, totalPages } = pagination;

  return (
    <Flex component={`${grid.componentName}.bottomBar.pagination` as never} gap={0.5} ai="center">
      <PageSizeSelector grid={grid} pageSize={state.pageSize} />
      <PaginationButton componentName={grid.componentName} label="First page" onClick={goFirst} disabled={!canGoPrev}>
        <ChevronDoubleLeft />
      </PaginationButton>
      <PaginationButton componentName={grid.componentName} label="Previous page" onClick={goPrev} disabled={!canGoPrev}>
        <ChevronLeft />
      </PaginationButton>
      <Flex ai="center" gap={1.5} px={2} userSelect="none">
        <PageJumpInput grid={grid} page={state.page} totalPages={totalPages} />
        <Box component={`${grid.componentName}.bottomBar.pagination.info` as never} fontSize={12} opacity={0.7}>
          of {totalPages}
        </Box>
      </Flex>
      <PaginationButton componentName={grid.componentName} label="Next page" onClick={goNext} disabled={!canGoNext}>
        <ChevronRight />
      </PaginationButton>
      <PaginationButton componentName={grid.componentName} label="Last page" onClick={goLast} disabled={!canGoNext}>
        <ChevronDoubleRight />
      </PaginationButton>
    </Flex>
  );
}

(DataGridPagination as React.FunctionComponent).displayName = 'DataGridPagination';

function PageSizeSelector<TRow>({ grid, pageSize }: { grid: GridModel<TRow>; pageSize: number }) {
  const options = grid.pagination.pageSizeOptions;
  if (!options || options.length === 0) return null;

  return (
    <Flex ai="center" gap={1} me={1}>
      <Box
        component={`${grid.componentName}.bottomBar.pagination.pageSize` as never}
        tag="select"
        fontSize={12}
        borderRadius={4}
        cursor="pointer"
        props={{
          'aria-label': 'Rows per page',
          value: pageSize,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => grid.pagination.changePageSize(Number(e.target.value)),
        }}
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </Box>
    </Flex>
  );
}

function PageJumpInput<TRow>({ grid, page, totalPages }: { grid: GridModel<TRow>; page: number; totalPages: number }) {
  const [value, setValue] = useState(String(page));
  const [prevPage, setPrevPage] = useState(page);

  // Reset the editable value when the page prop changes (render-phase sync, no effect needed).
  if (page !== prevPage) {
    setPrevPage(page);
    setValue(String(page));
  }

  const commit = useCallback(() => {
    grid.pagination.jumpToPage(value);
    setValue(String(grid.pagination.page));
  }, [grid, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
      else if (e.key === 'Escape') setValue(String(page));
    },
    [commit, page],
  );

  return (
    <Textbox
      type="number"
      variant="compact"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      textAlign="center"
      fontSize={12}
      props={{ 'aria-label': 'Page number', onKeyDown: handleKeyDown, onBlur: commit, min: 1, max: totalPages }}
    />
  );
}

/** The chevrons are decorative, so the button says what it does — without a label it has no name at all. */
function PaginationButton(props: {
  componentName: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { componentName, label, onClick, disabled, children } = props;

  return (
    <Button
      component={`${componentName}.bottomBar.pagination.button` as never}
      props={{ 'aria-label': label, 'aria-disabled': disabled || undefined }}
      onClick={onClick}
      cursor={disabled ? 'default' : 'pointer'}
      p={1}
      borderRadius={4}
      opacity={disabled ? 0.3 : 0.7}
      hover={disabled ? undefined : { opacity: 1, bgColor: 'gray-100' }}
      theme={{ dark: { hover: disabled ? undefined : { bgColor: 'gray-700' } } }}
      transitionDuration={150}
    >
      {children}
    </Button>
  );
}

/**
 * One chevron. Stroked rather than filled, which is why it says `fill="none"`: the four of them
 * differ only in their path data, so the drawing lives here once.
 */
function Chevron(props: { d: string }) {
  return (
    <Svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={props.d} />
    </Svg>
  );
}

function ChevronLeft() {
  return <Chevron d="M15 18l-6-6 6-6" />;
}

function ChevronRight() {
  return <Chevron d="M9 18l6-6-6-6" />;
}

function ChevronDoubleLeft() {
  return <Chevron d="M18 18l-6-6 6-6M11 18l-6-6 6-6" />;
}

function ChevronDoubleRight() {
  return <Chevron d="M6 18l6-6-6-6M13 18l6-6-6-6" />;
}
