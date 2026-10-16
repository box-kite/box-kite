import { BoxStyles } from '../../../types';

/**
 * The list layout's geometry, shared between its parts. The paint — colours, borders, states — is the
 * `datagrid.list` style tree, which every engine entry carries; this is only ever in the DataGrid's chunk.
 */
namespace DataGridListLayout {
  /** A square control a thumb can hit: 44px, the Apple and WCAG target. */
  export const ICON_BUTTON: BoxStyles = {
    display: 'inline-flex',
    ai: 'center',
    jc: 'center',
    width: 11,
    height: 11,
    flexShrink: 0,
    borderRadius: 999,
    cursor: 'pointer',
  };

  /** A pill in the toolbar: Sort, Filters, Select. */
  export const PILL: BoxStyles = {
    display: 'inline-flex',
    ai: 'center',
    gap: 1.5,
    flexShrink: 0,
    height: 10,
    px: 3.5,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 500,
    textWrap: 'nowrap',
    cursor: 'pointer',
  };

  /** One line of text that ends in an ellipsis rather than a second line. */
  export const TRUNCATE: BoxStyles = { textOverflow: 'ellipsis', overflow: 'hidden', textWrap: 'nowrap' };

  /** A full-width field in a sheet: 44px tall, and 16px type so a phone does not zoom in on focus. */
  export const INPUT: BoxStyles = { width: 'fit', height: 11, px: 3, borderRadius: 2, fontSize: 16 };

  /** A labelled value: the label small and muted over the value. */
  export const LABEL: BoxStyles = { fontSize: 12, lineHeight: 16 };

  /** The sheet's big buttons, at the bottom where a thumb is. */
  export const SHEET_BUTTON: BoxStyles = { height: 12, px: 4, borderRadius: 3, fontSize: 16, fontWeight: 500, cursor: 'pointer' };
}

export default DataGridListLayout;
