# Components reference

Which component replaces which `<Box tag>`, and the three that carry a pattern of their own. Read this when choosing a component or wiring a Dropdown, a Select or a DataGrid.

## Component Shortcuts

| Instead of…                          | Use                                    | Import                                                           |
| ------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| `<Box display="flex/grid">`          | `<Flex>`/`<Grid>`                      | `components/flex`, `components/grid`                             |
| `<Box tag="button/input/textarea">`  | `<Button>`/`<Textbox>`/`<Textarea>`    | `components/button`, `components/textbox`, `components/textarea` |
| `<Box tag="a/img/label">`            | `<Link>`/`<Img>`/`<Label>`             | `components/semantics`                                           |
| `<Box tag="h1..h6/p/span">`          | `<H1>..<H6>`/`<P>`/`<Span>`            | `components/semantics`                                           |
| `<Box tag="ul/ol/li">`               | `<Ul>`/`<Ol>`/`<Li>`                   | `components/semantics`                                           |
| `<Box tag="nav/header/footer/main">` | `<Nav>`/`<Header>`/`<Footer>`/`<Main>` | `components/semantics`                                           |
| `<Box tag="section/article/aside">`  | `<Section>`/`<Article>`/`<Aside>`      | `components/semantics`                                           |
| `<Box tag="form">`                   | `<Form>`                               | `components/form`                                                |
| `<Box tag="svg/path/circle/rect">`   | `<Svg>`/`<Path>`/`<Circle>`/`<Rect>`   | `components/svg`                                                 |
| a menu button and its menu           | `<Menu>`                               | `components/menu`                                                |
| a lucide/Tabler icon, styled         | `<Icon>`                               | `components/icon`                                                |
| a sparkline, ring, gauge or donut    | `<Sparkline>`/`<ProgressRing>`/…       | `components/chart`                                               |
| a themed Recharts (or any) chart     | `<ChartContainer>`                     | `components/chart`                                               |

Also: `Mark`, `Figure`, `Figcaption`, `Details`, `Summary`, `MenuList` (the semantic `<menu>`; the menu **button** is `Menu` from `components/menu`), `Time`. All from `@box-kite/react/components/...`.

`<Form<T> onSubmit={(values, e) => …}>` reads its own named fields on submit (after `preventDefault()`): a value per
named input, a boolean for a lone checkbox/radio, an array for a repeated name, and `name="a.b"` nests. `T` is the shape you
expect, not a check against the fields.

## Dropdown

The APG combobox — select-only by default, the editable one with `isSearchable`. **Always pass `label`** (or your own `aria-label` via `props`) — a combobox is
not named by its content, so without one it has no accessible name. Never add `role="combobox"`/`role="option"`
by hand; the component supplies the whole pattern.

```tsx
import Dropdown from '@box-kite/react/components/dropdown';
<Dropdown<string> label="Fruit" defaultValue="a" onChange={(value, values) => {}}>
  <Dropdown.Unselect>Pick...</Dropdown.Unselect>
  <Dropdown.Item value="a">Alpha</Dropdown.Item>
</Dropdown>;
// Multiple: <Dropdown label="Fruit" multiple showCheckbox isSearchable searchPlaceholder="Search...">
//   <Dropdown.SelectAll>All</Dropdown.SelectAll> <Dropdown.EmptyItem>No results</Dropdown.EmptyItem>
//   <Dropdown.Display>{(values) => `${values.length} selected`}</Dropdown.Display>
```

**Props**: `label`/`labelProps`, `value`/`defaultValue`, `multiple`, `isSearchable`, `searchPlaceholder`, `hideIcon`, `showCheckbox`, `name`, `onChange`, `itemsProps`, `iconProps`, `variant` (propagates to children). All BoxProps.
**Sub-components**: `Item<T>` (requires `value`; `disabled` is skipped by the arrows), `Unselect`, `SelectAll`, `EmptyItem`, `Display` (static or `(values, isOpen) => ReactNode`).
**Keyboard (select-only)**: closed — Down/Up/Enter/Space/Home/End open, a printable character opens at the first match. Open — arrows move, Home/End jump, typing searches, Enter/Space choose, Escape closes unchanged, Tab chooses then leaves. DOM focus stays on the trigger throughout (`aria-activedescendant`).
**Keyboard (`isSearchable`)**: the `<input>` is the combobox, so printable keys type (no typeahead), Space types a space, Home/End and Left/Right move the caret and drop the highlight, only Down/Up reach the listbox, Enter chooses the highlighted option, and Escape closes before a second Escape clears the field. The field shows the selection as its value, unless a `Dropdown.Display` is drawing it.
**Style tree**: `dropdown` > `items`, `item` (variants: compact, multiple, highlighted), `unselect`, `selectAll`, `emptyItem`, `icon`.

## Select

Data-driven dropdown — `data` + `def` instead of children. Shares `dropdown.*` style tree.

```tsx
import Select from '@box-kite/react/components/select';
<Select<User, number>
  label="User"
  data={users}
  def={{ valueKey: 'id', displayKey: 'name', placeholder: 'Pick...' }}
  value={selected}
  onChange={(value) => setSelected(value!)}
/>;
```

**SelectDef**: `valueKey` (required), `displayKey`, `display` (`(row) => ReactNode`), `selectedDisplay` (`(rows, isOpen) => ReactNode`), `placeholder`, `selectAllText`, `emptyText`.
Also: `data`, `label`/`labelProps`, `value`/`defaultValue`, `multiple`, `isSearchable`, `searchPlaceholder`, `showCheckbox`, `hideIcon`, `name`, `onChange`, `itemsProps`, `iconProps`, `variant`, BoxProps. Same combobox pattern as Dropdown — including needing a name, and `isSearchable` switching it to the editable one.

## DataGrid

```tsx
import DataGrid from '@box-kite/react/components/dataGrid';
<DataGrid
  data={users}
  def={{
    rowKey: 'id',
    topBar: true,
    bottomBar: true,
    globalFilter: true,
    rowSelection: { pinned: true },
    showRowNumber: { pinned: true },
    rowHeight: 40,
    visibleRowsCount: 15,
    columns: [
      { key: 'name', header: 'Name', filterable: true },
      { key: 'age', header: 'Age', width: 80, align: 'right', filterable: { type: 'number' } },
      { key: 'status', header: 'Status', filterable: { type: 'multiselect' } },
      { key: 'country', header: 'Country', pin: 'END' },
      {
        key: 'actions',
        header: '',
        width: 80,
        sortable: false,
        contextMenu: false,
        Cell: ({ cell }) => <Button onClick={() => edit(cell.row.data)}>Edit</Button>,
      },
    ],
    rowDetail: { content: (row) => <Details row={row} />, expandOnRowClick: true, expandColumnHeader: 'Details' },
    contextMenu: { sort: true, pin: true, group: false },
    resizerStyle: 'hover',
  }}
  onSelectionChange={(e) => console.log(e.selectedRowKeys)}
/>;
```

**DataGridProps**: `data`, `def`, `component` (default `'datagrid'`), `loading`, `filters` (predicate[]), `page`/`onPageChange`, `onSortChange`, `onServerStateChange` (`{ page, pageSize, sortColumn, sortDirection, columnFilters, globalFilterValue }`), `onSelectionChange` (`{ action, selectedRowKeys, affectedRowKeys, isAllSelected }`), `expandedRowKeys`/`onExpandedRowKeysChange`, `globalFilterValue`/`onGlobalFilterChange`, `columnFilters`/`onColumnFiltersChange`.

**GridDefinition**: `columns` (required), `rowKey`, `rowHeight` (px, default 48), `visibleRowsCount` (number/`'all'`), `showRowNumber` (bool/`{ pinned?, width? }`), `rowSelection` (bool/`{ pinned? }`), `rowDetail` (`{ content, height?, expandOnRowClick?, pinned?, expandColumnWidth?, expandColumnHeader? }`), `pagination` (`{ totalCount, pageSize? }`), `topBar`/`bottomBar`, `title`/`topBarContent`, `globalFilter`, `globalFilterKeys`, `sortable`/`resizable` (default true), `contextMenu` (bool/`{ sort?, pin?, group? }`, default true), `resizerStyle` (`'visible'`/`'hover'`/`'hidden'`), `noDataComponent`.

**ColumnType**: `key`, `header`, `width` (px, default 200), `align` (`'start'`/`'end'`/`'center'`, or the physical `'left'`/`'right'`), `pin` (`'START'`/`'END'` — an edge of the **inline axis**, so a pinned column holds under either `dir`; `'LEFT'`/`'RIGHT'` are the older spelling of the same two), `columns` (grouped headers), `Cell` (`({ cell }) => ReactNode`), `sortable`/`resizable` (override grid), `flexible`, `filterable` (`true`=text, `{ type: 'number' }`, `{ type: 'multiselect' }`), `contextMenu` (override grid).

**Server-side**: `def={{ pagination: { totalCount }, bottomBar: true }}` + `page={page}` + `onServerStateChange={fetchData}`.

**Accessibility (A7, A10)**: the APG grid pattern, over a virtualized body — supplied whole, so add no roles and no `tabIndex`. The scrolling element is `role="grid"` (header and body are `rowgroup`s, rows `role="row"`, cells `role="gridcell"`/`columnheader`, scroll spacers `presentation`). `aria-rowcount`/`-colcount` describe the _whole_ grid and `aria-rowindex`/`-colindex` place each rendered cell in it, header rows first. Also `aria-sort` on sortable headers, `aria-selected` on rows only with `rowSelection`, `aria-busy` while `loading`, `aria-expanded` on group and expanded rows, and a live region announcing the selection count. Keyboard: one cell in the tab order; arrows move it, Home/End along the row, Ctrl+Home/End to the corners (scrolling to unrendered rows), PageUp/Down by a screenful, Enter/Space sorts a header or steps into the cell’s control, F2 always steps in, Escape steps back out. Down/Up keep the _column_ rather than the cell ordinal, so they land under where they started even through a grouped header. The column resizer is APG's window splitter — `role="separator"` with `aria-valuenow`/`-valuemin`/`-valuemax` in pixels; Tab or F2 reaches it, the arrows move it 16px, Home/End go to the narrowest the grid allows and to the grid's own width. Every control the grid draws names itself after what it acts on ("Select row 4", "Column options for Age"); the column menu is the APG menu button. **Give it `def.title`** — a grid is not named by its rows. Known gap: Tab does not yet stay inside the grid.

**Style tree**: `datagrid` > `content`, `topBar` > (`globalFilter` > `stats`, `columnGroups` > `icon`|`separator`|`item` > `icon`, `columnVisibility` > `badge`), `filter` > `cell` > `input`, `header` > `cell` > (`contextMenu` > `icon`|`tooltip` > `item` > `icon`|`separator`, `resizer`), `body` > (`cell` > `text`|`rowDetail`, `row`, `groupRow` > `expandButton`, `detailRow`, `empty`), `emptyColumns`, `bottomBar` > (`info`, `clearFilters`, `pagination` > `button`|`info`).
