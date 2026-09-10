// size-limit fixture: one entry importing every public export so shared chunks are
// counted once (listing the entries directly in size-limit sums the shared core per file).
// Add a line here when a new component entry is added to the build.
//
// The engine comes from its own package now, so this measures what a React consumer actually
// downloads: @box-kite/react plus the @box-kite/core it depends on.
import * as box from '../dist/box.mjs';
import * as a11y from '../dist/a11y.mjs';
import * as anchor from '../dist/anchor.mjs';
import * as core from '@box-kite/core';
import * as ssg from '../dist/ssg.mjs';
import * as accordion from '../dist/components/accordion.mjs';
import * as baseSvg from '../dist/components/baseSvg.mjs';
import * as button from '../dist/components/button.mjs';
import * as chart from '../dist/components/chart.mjs';
import * as checkbox from '../dist/components/checkbox.mjs';
import * as dataGrid from '../dist/components/dataGrid.mjs';
import * as dialog from '../dist/components/dialog.mjs';
import * as dropdown from '../dist/components/dropdown.mjs';
import * as flex from '../dist/components/flex.mjs';
import * as form from '../dist/components/form.mjs';
import * as grid from '../dist/components/grid.mjs';
import * as icon from '../dist/components/icon.mjs';
import * as menu from '../dist/components/menu.mjs';
import * as overlay from '../dist/components/overlay.mjs';
import * as popover from '../dist/components/popover.mjs';
import * as presence from '../dist/components/presence.mjs';
import * as radioButton from '../dist/components/radioButton.mjs';
import * as radioGroup from '../dist/components/radioGroup.mjs';
import * as select from '../dist/components/select.mjs';
import * as semantics from '../dist/components/semantics.mjs';
import * as svg from '../dist/components/svg.mjs';
import * as switchControl from '../dist/components/switch.mjs';
import * as tabs from '../dist/components/tabs.mjs';
import * as textarea from '../dist/components/textarea.mjs';
import * as textbox from '../dist/components/textbox.mjs';
import * as tooltip from '../dist/components/tooltip.mjs';
import * as visuallyHidden from '../dist/components/visuallyHidden.mjs';

console.log(
  box,
  a11y,
  anchor,
  core,
  ssg,
  accordion,
  baseSvg,
  button,
  chart,
  checkbox,
  dataGrid,
  dialog,
  dropdown,
  flex,
  form,
  grid,
  icon,
  menu,
  overlay,
  popover,
  presence,
  radioButton,
  radioGroup,
  select,
  semantics,
  svg,
  switchControl,
  tabs,
  textarea,
  textbox,
  tooltip,
  visuallyHidden,
);
