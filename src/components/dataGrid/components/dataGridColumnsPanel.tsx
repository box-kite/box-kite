import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '../../../box';
import SearchIcon from '../../../icons/searchIcon';
import { QuietInteractions } from '../../../react/interactions/interactions';
import Button from '../../button';
import Flex from '../../flex';
import Popover from '../../popover';
import { Path, Svg } from '../../svg';
import Switch from '../../switch';
import Textbox from '../../textbox';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/** Past this many columns the panel offers a search field. */
const SEARCH_THRESHOLD = 6;

/**
 * The columns button and its panel: a non-modal dialog with a search field, the count and the two bulk
 * actions, and one switch per column under its header group's name.
 */
export default function DataGridColumnsPanel<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { columnVisibility, localeText, componentName } = grid;
  const { visibleCount, total, hasHidden } = columnVisibility;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  }, []);

  return (
    <QuietInteractions>
      <Popover
        label={localeText.columnsMenu}
        side="bottom"
        align="end"
        open={open}
        onOpenChange={handleOpenChange}
        // The panel moves focus itself, onto the search field rather than onto the panel.
        autoFocus={false}
        p={0}
        overflow="visible"
        trigger={(trigger) => (
          <Button
            {...trigger}
            component={`${componentName}.topBar.columnVisibility` as never}
            props={{
              ...trigger.props,
              'aria-label': hasHidden ? localeText.columnsMenuLabel(visibleCount, total) : undefined,
            }}
          >
            <Svg viewBox="0 0 20 20" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6}>
              <Path d="M4.5 3.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM8 3.5v13M12 3.5v13" />
            </Svg>
            {localeText.columnsMenu}
            {hasHidden && (
              <Box
                component={`${componentName}.topBar.columnVisibility.badge` as never}
                tag="span"
                variant={{ empty: visibleCount === 0 } as never}
                props={{ 'aria-hidden': true }}
              >
                {visibleCount}/{total}
              </Box>
            )}
          </Button>
        )}
      >
        {/* Not gated on `open`: unmounting the focused field as the panel closes leaves the browser no focus to return. */}
        <ColumnsPanelContent grid={grid} open={open} query={query} onQueryChange={setQuery} />
      </Popover>
    </QuietInteractions>
  );
}

(DataGridColumnsPanel as React.FunctionComponent).displayName = 'DataGridColumnsPanel';

interface ContentProps<TRow> extends Props<TRow> {
  open: boolean;
  query: string;
  onQueryChange: (query: string) => void;
}

function ColumnsPanelContent<TRow>({ grid, open, query, onQueryChange }: ContentProps<TRow>) {
  const { columnVisibility, localeText, componentName } = grid;
  const name = `${componentName}.topBar.columnVisibility`;
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const searchable = columnVisibility.total > SEARCH_THRESHOLD;
  const matches = columnVisibility.search(query);
  const sections = columnVisibility.sections(matches);
  const allShown = matches.every((e) => e.visible);
  const allHidden = matches.every((e) => !e.visible);

  // A controlled panel is shown by the layer's layout effect, so by this passive one it can take focus.
  useEffect(() => {
    if (open) (searchRef.current ?? panelRef.current?.querySelector<HTMLElement>('input'))?.focus();
  }, [open]);

  // A list of switches, so the arrows walk it the way they walk a menu; Tab still reaches each one.
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key) || !panelRef.current) return;

    const inputs = Array.from(panelRef.current.querySelectorAll<HTMLInputElement>('input[role="switch"]'));
    const target = event.target as HTMLElement;
    // Home and End belong to the search field's caret.
    if (inputs.length === 0 || (target === searchRef.current && event.key !== 'ArrowDown')) return;

    const index = inputs.indexOf(target as HTMLInputElement);
    const next = {
      ArrowDown: inputs[Math.min(index + 1, inputs.length - 1)],
      ArrowUp: index <= 0 ? (searchRef.current ?? inputs[0]) : inputs[index - 1],
      Home: inputs[0],
      End: inputs.at(-1),
    }[event.key];

    event.preventDefault();
    next?.focus();
  }, []);

  return (
    <Flex ref={panelRef} component={`${name}.panel` as never} props={{ onKeyDown: handleKeyDown }}>
      {searchable && (
        <Flex component={`${name}.search` as never}>
          <Flex component={`${name}.searchIcon` as never}>
            <SearchIcon fill="currentColor" width="14px" />
          </Flex>
          <Textbox
            ref={searchRef}
            component={`${name}.searchInput` as never}
            value={query}
            placeholder={localeText.columnsMenuSearchPlaceholder}
            onChange={(e) => onQueryChange(e.target.value)}
            props={{ 'aria-label': localeText.columnsMenuSearchPlaceholder, autoComplete: 'off', spellCheck: false }}
          />
        </Flex>
      )}

      <Flex component={`${name}.toolbar` as never}>
        <Box component={`${name}.count` as never}>{localeText.columnsMenuShown(columnVisibility.visibleCount, columnVisibility.total)}</Box>
        <Flex gap={1}>
          <Button component={`${name}.action` as never} disabled={allShown} onClick={() => columnVisibility.setAll(true, matches)}>
            {localeText.columnsMenuShowAll}
          </Button>
          <Button component={`${name}.action` as never} disabled={allHidden} onClick={() => columnVisibility.setAll(false, matches)}>
            {localeText.columnsMenuHideAll}
          </Button>
        </Flex>
      </Flex>

      <Flex component={`${name}.list` as never}>
        {sections.map((section, index) => (
          <Flex
            key={`${section.group ?? ''}-${index}`}
            component={`${name}.section` as never}
            variant={{ divided: index > 0 && !section.group } as never}
            props={section.group ? { role: 'group', 'aria-label': section.group } : undefined}
          >
            {section.group && (
              <Box component={`${name}.group` as never} props={{ 'aria-hidden': true }}>
                {section.group}
              </Box>
            )}
            {section.entries.map((entry) => (
              <Switch
                key={entry.id}
                checked={entry.visible}
                onChange={() => entry.column.toggleVisibility()}
                label={entry.label}
                // `display` beside the tree: the label is an inline-flex `Flex`, and its flat prop outranks a component style.
                labelProps={{ component: `${name}.item` as never, display: 'flex' }}
              />
            ))}
          </Flex>
        ))}

        {matches.length === 0 && (
          <Box component={`${name}.empty` as never} props={{ role: 'status' }}>
            {localeText.columnsMenuNoMatch(query.trim())}
          </Box>
        )}
      </Flex>
    </Flex>
  );
}
