import type { CatalogSchema } from '../../core';

/**
 * The layout's own shape, as a schema and the two numbers it quotes. Its own module because both the
 * dashboard and `catalog()` want it and only one of them wants the model around it: reaching it through
 * `dashboardUtils` would put the compaction, the drag arithmetic and the parser in the catalog entry.
 * Plain exports rather than a namespace, so neither entry carries a wrapper for four constants.
 */

/** The layout format's own version, bumped when its shape changes and never when a dashboard does. */
export const LAYOUT_VERSION = 1;

/** Both ends of the column space a layout may declare, so a generated `columns: 400` cannot be rendered. */
export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 24;

/**
 * The layout as JSON Schema — what a model generates a dashboard under, and the half of the contract a
 * prompt cannot carry. Deliberately inside the subset `catalog()` emits and `<SpecRenderer>` validates,
 * so a host can hand it to the same machinery: the schema says the shape and `parse` says the sense.
 */
export const LAYOUT_SCHEMA: CatalogSchema = {
  type: 'object',
  description: 'A dashboard layout: a column space and one place per widget, in cells.',
  required: ['version', 'columns', 'items'],
  additionalProperties: false,
  properties: {
    version: { type: 'integer', description: `The layout format's version. ${LAYOUT_VERSION} today.` },
    columns: { type: 'integer', description: `The column space the items are written in, ${MIN_COLUMNS} to ${MAX_COLUMNS}.` },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'x', 'y', 'w', 'h'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'The id of the widget this place belongs to.' },
          x: { type: 'integer', description: 'Column, zero-based.' },
          y: { type: 'integer', description: 'Row, zero-based.' },
          w: { type: 'integer', description: 'Columns spanned, at least 1.' },
          h: { type: 'integer', description: 'Rows spanned, at least 1.' },
          minW: { type: 'integer', description: 'The narrowest it may be resized to.' },
          minH: { type: 'integer', description: 'The shortest it may be resized to.' },
          maxW: { type: 'integer', description: 'The widest it may be resized to.' },
          maxH: { type: 'integer', description: 'The tallest it may be resized to.' },
          fixed: { type: 'boolean', description: 'Neither moved nor resized; everything else flows around it.' },
        },
      },
    },
  },
};
