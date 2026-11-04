# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A DataGrid grouped two levels deep numbered its rows wrongly once an inner group was open** — the row-number column repeated and skipped numbers, and every "Select row N" label followed it. The rows are now numbered in the order they appear, group rows included, with inner groups open or shut in any combination; copying a group row's row-number cell copies the number it shows instead of a blank.
- **Resizing a DataGrid column widened the row number, row selection and row detail columns.** The space a resize freed was shared out to them along with the data columns, so the checkbox column grew with every drag. Those three now keep their own width, and the space goes to the data columns.
- **A fast wheel scroll through a DataGrid showed blank body.** About one frame in five had rows missing under 800px wheel steps, because the rows a scroll revealed were drawn a frame after the scroll. They are now drawn in the same frame: measured on the docs demo, 0 blank frames where there were 19–21%.
- **After a filter, the DataGrid's scrollbar thumb slid to its new size instead of jumping there.** The spacers that give the scrollbar its range picked up every Box's 250ms transition, so a reader scrolled deep was dragged back over a quarter of a second. They resize at once now, and a scroll left past the end of a shortened list draws its last rows rather than an empty window.
- **Every DataGrid cell's text was a scroll container**, which could draw a stray scrollbar on Windows and catch the mouse wheel when a cell's content overflowed. It clips instead, as the grouping cell of a group row now does too.
- **A DataGrid re-rendered whenever the component holding it did**, even with the same props. It is memoized now, and its totals row no longer redraws on every scroll frame.
- **A DataGrid fed by a `dataSource` restarted its row numbers inside every open group, and inside every open row of a lazy tree** — a row's number was its place in the block the server sent. It is now its place on screen, the same count a grid grouped in the browser gives, and it follows when a group above it opens or shuts.
